import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  normalizePrecision,
  roundLocation,
} from "@/lib/roundLocation";

describe("normalizePrecision", () => {
  it("downgrades 'exact' to 'town'", () => {
    expect(normalizePrecision("exact")).toBe("town");
  });

  it("preserves 'town' as-is", () => {
    expect(normalizePrecision("town")).toBe("town");
  });

  it("preserves 'prefecture' as-is", () => {
    expect(normalizePrecision("prefecture")).toBe("prefecture");
  });
});

describe("roundLocation", () => {
  beforeEach(() => {
    // Pin Math.random so jitter is deterministic in tests.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downgrades 'exact' to town-level rounding (defense-in-depth)", () => {
    // Random=0.5 => jitter = (0.5 - 0.5) * 0.003 = 0 → no offset
    const out = roundLocation({
      lat: 35.689722,
      lng: 139.691667,
      precision: "exact",
    });
    // Town: round to 3 decimals → 35.690 / 139.692, then jitter=0
    expect(out.lat).toBeCloseTo(35.69, 2);
    expect(out.lng).toBeCloseTo(139.692, 2);
    // Result must NOT equal the original precise coords
    expect(out.lat).not.toBe(35.689722);
    expect(out.lng).not.toBe(139.691667);
  });

  it("rounds 'town' to 3 decimal places before jitter", () => {
    const out = roundLocation({
      lat: 34.123456,
      lng: 135.987654,
      precision: "town",
    });
    // With Math.random=0.5 jitter=0, result should be the rounded value
    expect(out.lat).toBeCloseTo(34.123, 3);
    expect(out.lng).toBeCloseTo(135.988, 3);
  });

  it("includes locationName when provided", () => {
    const out = roundLocation({
      lat: 35.0,
      lng: 139.0,
      precision: "town",
      locationName: "shibuya",
    });
    expect(out.locationName).toBe("shibuya");
  });

  it("returns null locationName when not provided for town/exact", () => {
    const out = roundLocation({
      lat: 35.0,
      lng: 139.0,
      precision: "town",
    });
    expect(out.locationName).toBeNull();
  });

  it("'prefecture' replaces input coords with the nearest prefectural centroid", () => {
    // Coordinates near central Tokyo → should resolve to 東京都
    const out = roundLocation({
      lat: 35.6895,
      lng: 139.6917,
      precision: "prefecture",
    });
    expect(out.locationName).toBe("東京都");
    expect(out.lat).toBe(35.6895);
    expect(out.lng).toBe(139.6917);
  });

  it("'prefecture' resolves correctly for far-flung input (Okinawa)", () => {
    const out = roundLocation({
      lat: 26.21,
      lng: 127.68,
      precision: "prefecture",
    });
    expect(out.locationName).toBe("沖縄県");
  });

  it("'prefecture' resolves correctly for Hokkaido", () => {
    const out = roundLocation({
      lat: 43.0,
      lng: 141.4,
      precision: "prefecture",
    });
    expect(out.locationName).toBe("北海道");
  });

  it("never preserves the exact input coords for 'exact' precision (privacy guarantee)", () => {
    vi.restoreAllMocks();
    // Use real randomness — across 20 iterations, jitter must move the coord
    let everEqual = false;
    for (let i = 0; i < 20; i++) {
      const out = roundLocation({
        lat: 35.689722,
        lng: 139.691667,
        precision: "exact",
      });
      if (out.lat === 35.689722 && out.lng === 139.691667) {
        everEqual = true;
        break;
      }
    }
    expect(everEqual).toBe(false);
  });

  it("applies bounded jitter (≤ ~330m) for town precision", () => {
    vi.restoreAllMocks();
    // Verify that jitter stays within ±0.0015 (half of 0.003) of the rounded value
    for (let i = 0; i < 50; i++) {
      const out = roundLocation({
        lat: 35.000,
        lng: 139.000,
        precision: "town",
      });
      expect(Math.abs(out.lat - 35.000)).toBeLessThan(0.0016);
      expect(Math.abs(out.lng - 139.000)).toBeLessThan(0.0016);
    }
  });
});
