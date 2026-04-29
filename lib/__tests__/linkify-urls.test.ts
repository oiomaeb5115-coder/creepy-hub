import { describe, it, expect } from "vitest";
import { escapeHtml, linkifyUrls } from "@/lib/linkify-urls";

describe("escapeHtml", () => {
  it("escapes ampersand first to avoid double-escape", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("escapes the four primary HTML metacharacters", () => {
    expect(escapeHtml("<a>")).toBe("&lt;a&gt;");
    expect(escapeHtml(`"x"`)).toBe("&quot;x&quot;");
    expect(escapeHtml(`'x'`)).toBe("&#39;x&#39;");
  });

  it("escapes a script-injection payload", () => {
    const input = `<script>alert("xss")</script>`;
    const out = escapeHtml(input);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</script>");
    expect(out).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("does not double-escape an already escaped string when run once", () => {
    expect(escapeHtml("plain text")).toBe("plain text");
  });
});

describe("linkifyUrls", () => {
  it("wraps a bare https URL in an anchor with safe rel attributes", () => {
    const out = linkifyUrls("see https://example.com here");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('class="external-link"');
  });

  it("does NOT linkify http:// (only https is allowed)", () => {
    const out = linkifyUrls("see http://example.com here");
    expect(out).not.toContain("<a ");
  });

  it("does NOT linkify javascript: URLs", () => {
    const out = linkifyUrls("javascript:alert(1)");
    expect(out).not.toContain("<a ");
  });

  it("leaves existing <a> tags untouched (does not re-wrap)", () => {
    const input = `<a href="https://wiki.example.com" class="wiki-link">link</a>`;
    expect(linkifyUrls(input)).toBe(input);
  });

  it("leaves <img> tags untouched", () => {
    const input = `<img src="https://example.com/x.png" alt="x"/>`;
    expect(linkifyUrls(input)).toBe(input);
  });

  it("does not linkify a URL inside an existing <a> tag's href", () => {
    const input = `<a href="https://a.example">https://b.example</a>`;
    const out = linkifyUrls(input);
    expect(out).toBe(input);
  });

  it("linkifies a URL outside an <a> tag while leaving the <a> intact", () => {
    const input = `<a href="https://a.example">x</a> and https://b.example`;
    const out = linkifyUrls(input);
    expect(out).toContain(`<a href="https://a.example">x</a>`);
    expect(out).toContain(`<a href="https://b.example"`);
  });

  it("stops the URL match at HTML metacharacters", () => {
    const out = linkifyUrls("https://example.com&lt;br&gt;");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain("&lt;br&gt;");
  });

  it("stops the URL match at whitespace", () => {
    const out = linkifyUrls("a https://example.com b");
    expect(out).toContain('href="https://example.com"');
    expect(out).toMatch(/>https:\/\/example\.com<\/a> b/);
  });

  it("handles multiple URLs in one input", () => {
    const out = linkifyUrls("https://a.example and https://b.example");
    const matches = out.match(/<a /g) ?? [];
    expect(matches.length).toBe(2);
  });
});
