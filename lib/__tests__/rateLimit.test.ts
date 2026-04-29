import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const cfg = (name: string) => ({
    name,
    windowMs: 60_000,
    maxRequests: 3,
  });

  it("allows the first request", () => {
    const r = checkRateLimit(cfg("rl-first"), "user-1");
    expect(r).toEqual({ allowed: true });
  });

  it("allows up to maxRequests then blocks", () => {
    const c = cfg("rl-cap");
    expect(checkRateLimit(c, "k")).toEqual({ allowed: true });
    expect(checkRateLimit(c, "k")).toEqual({ allowed: true });
    expect(checkRateLimit(c, "k")).toEqual({ allowed: true });
    const blocked = checkRateLimit(c, "k");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
      expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000);
    }
  });

  it("isolates different keys within the same store", () => {
    const c = cfg("rl-keys");
    for (let i = 0; i < 3; i++) checkRateLimit(c, "a");
    expect(checkRateLimit(c, "a").allowed).toBe(false);
    expect(checkRateLimit(c, "b").allowed).toBe(true);
  });

  it("isolates different store names", () => {
    const a = cfg("rl-store-a");
    const b = cfg("rl-store-b");
    for (let i = 0; i < 3; i++) checkRateLimit(a, "k");
    expect(checkRateLimit(a, "k").allowed).toBe(false);
    expect(checkRateLimit(b, "k").allowed).toBe(true);
  });

  it("resets after the window expires", () => {
    const c = cfg("rl-window");
    for (let i = 0; i < 3; i++) checkRateLimit(c, "k");
    expect(checkRateLimit(c, "k").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const r = checkRateLimit(c, "k");
    expect(r.allowed).toBe(true);
  });

  it("retryAfterMs decreases as time advances within a blocked window", () => {
    const c = cfg("rl-decay");
    for (let i = 0; i < 3; i++) checkRateLimit(c, "k");
    const first = checkRateLimit(c, "k");
    expect(first.allowed).toBe(false);

    vi.advanceTimersByTime(10_000);

    const second = checkRateLimit(c, "k");
    expect(second.allowed).toBe(false);
    if (!first.allowed && !second.allowed) {
      expect(second.retryAfterMs).toBeLessThan(first.retryAfterMs);
    }
  });
});
