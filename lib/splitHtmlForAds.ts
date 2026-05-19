/**
 * Splits an HTML string at a paragraph boundary roughly in the middle.
 * Returns null if the content is too short to be worth splitting (< 4 paragraphs).
 */
export function splitHtmlAtParagraph(html: string): [string, string] | null {
  if (!html) return null
  const lower = html.toLowerCase()
  const closings: number[] = []
  let pos = 0
  while ((pos = lower.indexOf('</p>', pos)) !== -1) {
    closings.push(pos + 4)
    pos += 4
  }
  if (closings.length < 4) return null
  const midIndex = Math.floor(closings.length / 2) - 1
  const cut = closings[midIndex]
  return [html.slice(0, cut), html.slice(cut)]
}
