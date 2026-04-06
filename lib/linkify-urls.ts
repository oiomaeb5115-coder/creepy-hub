/**
 * Shared HTML-escape utility and URL auto-linkification.
 *
 * Both functions operate on plain text that has already been
 * HTML-escaped, so they are safe to use inside pipelines that
 * ultimately pass through `sanitize-html`.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Detect bare `https://` URLs in HTML-escaped text and wrap them
 * in `<a>` tags.  Existing `<a>` tags (e.g. wiki internal links)
 * are left untouched.
 */
export function linkifyUrls(escapedHtml: string): string {
  // Split around existing <a ...>...</a> so we never touch them.
  const parts = escapedHtml.split(/(<a\s[^>]*>.*?<\/a>)/g);

  const urlRe = /https:\/\/[^\s<>&"']+/g;

  return parts
    .map((part) => {
      // Odd-indexed parts are the captured <a> tags — keep as-is.
      if (part.startsWith("<a ")) return part;

      return part.replace(
        urlRe,
        (url) =>
          `<a href="${url}" class="external-link" target="_blank" rel="noopener noreferrer">${url}</a>`
      );
    })
    .join("");
}
