type WikiLinkItem = {
  slug: string;
  title: string;
};

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAutoLinkedHtml(
  content: string,
  locale: string,
  wikiItems: WikiLinkItem[]
) {
  // Step 1: 行ごとに HTML エスケープ＆タグ変換
  //   先にエスケープしてから wiki リンクを適用することで、
  //   <a> タグが二重エスケープされるのを防ぐ
  let result = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) {
        return `<h2>${escapeHtml(line.replace("## ", ""))}</h2>`;
      }

      // Image markdown: ![alt](url)
      const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        const safeAlt = escapeHtml(imgMatch[1]);
        const rawSrc = imgMatch[2];
        // https: のみ許可（javascript: data: などをブロック）
        if (!rawSrc.startsWith("https://")) {
          return "";
        }
        const safeSrc = escapeHtml(rawSrc);
        return `<img src="${safeSrc}" alt="${safeAlt}" style="max-width:100%;width:100%;margin:1.2em 0;display:block;border:1px solid rgba(161,102,108,0.18);" />`;
      }

      if (!line.trim()) {
        return "<br/>";
      }

      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");

  // Step 2: HTML エスケープ済みのテキストに対して wiki 自動リンクを適用
  //   タイトル側も escapeHtml して検索パターンを合わせる
  for (const item of wikiItems) {
    const escapedTitle = escapeHtml(item.title);
    const pattern = new RegExp(escapeRegExp(escapedTitle), "g");
    const safeSlug = encodeURIComponent(item.slug);

    result = result.replace(
      pattern,
      `<a href="/${locale}/wiki/${safeSlug}">${escapedTitle}</a>`
    );
  }

  return result;
}