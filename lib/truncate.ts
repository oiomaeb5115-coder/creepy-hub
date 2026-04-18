export function truncate(text: string | null | undefined, max = 250): string {
  if (!text) return "";
  const plain = text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const sliced = plain.slice(0, max);
  const lastPunct = Math.max(
    sliced.lastIndexOf("。"),
    sliced.lastIndexOf("、"),
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf(", "),
  );
  return lastPunct > max - 40 ? sliced.slice(0, lastPunct + 1) : sliced + "…";
}

export function isTruncated(text: string | null | undefined, max = 250): boolean {
  if (!text) return false;
  const plain = text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max;
}
