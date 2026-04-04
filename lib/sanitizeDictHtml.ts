import sanitizeHtml from "sanitize-html";

const DICT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "a", "ul", "ol", "li", "h2", "h3", "h4",
    "span", "div", "section",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["class"],
    div: ["class"],
  },
  allowedSchemes: ["https", "mailto"],
};

/**
 * 辞書ファイルから読み込んだHTMLをサニタイズする。
 * 辞書が改ざんされた場合のXSSを防ぐ。
 */
export function sanitizeDictHtml(html: string): string {
  return sanitizeHtml(html, DICT_SANITIZE_OPTIONS);
}
