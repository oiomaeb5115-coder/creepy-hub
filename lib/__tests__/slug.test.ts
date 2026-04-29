import { describe, it, expect } from "vitest";
import { generateSlug, sanitizeSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it("returns null for empty input", () => {
    expect(generateSlug("")).toBeNull();
  });

  it("returns null when title contains no Latin letters", () => {
    expect(generateSlug("怪談話")).toBeNull();
    expect(generateSlug("123")).toBeNull();
    expect(generateSlug("！？")).toBeNull();
  });

  it("lowercases the result", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("a b c")).toBe("a-b-c");
  });

  it("collapses consecutive hyphens", () => {
    expect(generateSlug("a   b")).toBe("a-b");
    expect(generateSlug("a---b")).toBe("a-b");
  });

  it("strips non-alphanumeric, non-hyphen characters", () => {
    expect(generateSlug("hello, world!")).toBe("hello-world");
  });

  it("preserves digits", () => {
    expect(generateSlug("foo 123")).toBe("foo-123");
  });

  it("strips Japanese characters but keeps Latin parts", () => {
    expect(generateSlug("怖い hotel 物語")).toBe("hotel");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100);
    const out = generateSlug(long);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(80);
  });

  it("returns null when only stripped chars remain (no letters survive)", () => {
    expect(generateSlug("!@#")).toBeNull();
  });
});

describe("sanitizeSlug", () => {
  it("returns null for empty input", () => {
    expect(sanitizeSlug("")).toBeNull();
  });

  it("strips URL-unsafe characters", () => {
    expect(sanitizeSlug("foo/bar?baz=qux#frag")).toBe("foobarbazquxfrag");
  });

  it("strips colons (path separators)", () => {
    expect(sanitizeSlug("evil:path")).toBe("evilpath");
  });

  it("returns null when no allowed characters remain", () => {
    expect(sanitizeSlug("///")).toBeNull();
  });

  it("collapses spaces and hyphens", () => {
    expect(sanitizeSlug("a   b---c")).toBe("a-b-c");
  });

  it("truncates to 80 characters", () => {
    expect(sanitizeSlug("a".repeat(100))!.length).toBe(80);
  });
});
