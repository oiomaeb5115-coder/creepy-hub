type WikiLinkItem = {
  slug: string;
  title: string;
};

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildAutoLinkedHtml(
  content: string,
  locale: string,
  wikiItems: WikiLinkItem[]
) {
  let result = content;

  for (const item of wikiItems) {
    const pattern = new RegExp(escapeRegExp(item.title), "g");

    result = result.replace(
      pattern,
      `<a href="/${locale}/wiki/${item.slug}">${item.title}</a>`
    );
  }

  result = result
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) {
        return `<h2>${line.replace("## ", "")}</h2>`;
      }

      // Image markdown: ![alt](url)
      const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        return `<img src="${imgMatch[2]}" alt="${imgMatch[1]}" style="max-width:100%;width:100%;margin:1.2em 0;display:block;border:1px solid rgba(161,102,108,0.18);" />`;
      }

      if (!line.trim()) {
        return "<br/>";
      }

      return `<p>${line}</p>`;
    })
    .join("");

  return result;
}