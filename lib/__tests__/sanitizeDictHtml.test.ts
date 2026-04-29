import { describe, it, expect } from "vitest";
import { sanitizeDictHtml } from "@/lib/sanitizeDictHtml";

describe("sanitizeDictHtml", () => {
  it("strips <script> tags entirely", () => {
    const input = `<p>safe</p><script>alert(1)</script>`;
    expect(sanitizeDictHtml(input)).toBe("<p>safe</p>");
  });

  it("strips inline event handlers", () => {
    const input = `<p onclick="alert(1)">x</p>`;
    expect(sanitizeDictHtml(input)).toBe("<p>x</p>");
  });

  it("removes javascript: hrefs from anchors", () => {
    const input = `<a href="javascript:alert(1)">x</a>`;
    const out = sanitizeDictHtml(input);
    expect(out).not.toContain("javascript:");
  });

  it("preserves https hrefs", () => {
    const input = `<a href="https://example.com">x</a>`;
    expect(sanitizeDictHtml(input)).toContain('href="https://example.com"');
  });

  it("preserves mailto hrefs", () => {
    const input = `<a href="mailto:a@example.com">x</a>`;
    expect(sanitizeDictHtml(input)).toContain('href="mailto:a@example.com"');
  });

  it("rejects http hrefs (not in allowedSchemes)", () => {
    const input = `<a href="http://example.com">x</a>`;
    const out = sanitizeDictHtml(input);
    expect(out).not.toContain("http://example.com");
  });

  it("preserves allowed inline tags", () => {
    const input = `<p><strong>bold</strong> and <em>italic</em></p>`;
    expect(sanitizeDictHtml(input)).toBe(
      "<p><strong>bold</strong> and <em>italic</em></p>"
    );
  });

  it("preserves allowed list/section tags", () => {
    const input = `<section><h2>t</h2><ul><li>a</li></ul></section>`;
    expect(sanitizeDictHtml(input)).toBe(
      "<section><h2>t</h2><ul><li>a</li></ul></section>"
    );
  });

  it("strips disallowed tags but keeps text", () => {
    const input = `<iframe src="x"></iframe><p>kept</p>`;
    const out = sanitizeDictHtml(input);
    expect(out).not.toContain("<iframe");
    expect(out).toContain("<p>kept</p>");
  });

  it("strips disallowed attributes on allowed tags", () => {
    const input = `<p style="color:red" id="x">t</p>`;
    expect(sanitizeDictHtml(input)).toBe("<p>t</p>");
  });

  it("preserves class attribute on span and div", () => {
    const input = `<div class="dict-block"><span class="hl">t</span></div>`;
    expect(sanitizeDictHtml(input)).toBe(
      '<div class="dict-block"><span class="hl">t</span></div>'
    );
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeDictHtml("")).toBe("");
  });
});
