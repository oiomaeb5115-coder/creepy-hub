import { describe, it, expect } from "vitest";
import { truncate, isTruncated } from "@/lib/truncate";

describe("truncate", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(truncate(null)).toBe("");
    expect(truncate(undefined)).toBe("");
    expect(truncate("")).toBe("");
  });

  it("returns the text unchanged when shorter than max", () => {
    expect(truncate("short text", 250)).toBe("short text");
  });

  it("strips markdown image references entirely (and collapses surrounding whitespace)", () => {
    expect(truncate("before ![alt](url) after")).toBe("before after");
  });

  it("keeps link text but drops the URL", () => {
    expect(truncate("see [docs](https://example.com) here")).toBe(
      "see docs here"
    );
  });

  it("strips markdown formatting characters (whitespace then collapses)", () => {
    expect(truncate("**bold** _italic_ `code` # heading > quote")).toBe(
      "bold italic code heading quote"
    );
  });

  it("collapses whitespace runs", () => {
    expect(truncate("a   b\n\nc")).toBe("a b c");
  });

  it("trims leading/trailing whitespace", () => {
    expect(truncate("  hello  ")).toBe("hello");
  });

  it("cuts at a Japanese full-stop close to the limit", () => {
    const text = "あ".repeat(50) + "。" + "い".repeat(60);
    const out = truncate(text, 60);
    expect(out.endsWith("。")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(60);
  });

  it("appends an ellipsis when no punctuation is near the limit", () => {
    const text = "a".repeat(300);
    const out = truncate(text, 100);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(101);
  });

  it("does not cut at punctuation that is more than 40 chars before the limit", () => {
    const text = "first." + "x".repeat(300);
    const out = truncate(text, 100);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("isTruncated", () => {
  it("returns false for empty/null input", () => {
    expect(isTruncated(null)).toBe(false);
    expect(isTruncated("")).toBe(false);
  });

  it("returns false when the cleaned text fits under the limit", () => {
    expect(isTruncated("short", 250)).toBe(false);
  });

  it("returns true when the cleaned text exceeds the limit", () => {
    expect(isTruncated("a".repeat(300), 250)).toBe(true);
  });

  it("counts cleaned (markdown-stripped) length, not raw length", () => {
    const noisy = "**" + "a".repeat(50) + "**";
    expect(isTruncated(noisy, 60)).toBe(false);
  });
});
