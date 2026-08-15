import { describe, expect, it } from "vitest";
import { makePostgrestIlikePattern, sanitizePostgrestFilterValue } from "@/lib/postgrestFilter";

describe("postgrestFilter", () => {
  it("escapes LIKE wildcards", () => {
    expect(makePostgrestIlikePattern("100%_match*")).toBe("%100\\%\\_match\\*%");
  });

  it("removes PostgREST filter syntax delimiters", () => {
    const input = "x),id.gt.0,(title.ilike.'";
    expect(sanitizePostgrestFilterValue(input)).toBe("xidgt0titleilike");
  });
});
