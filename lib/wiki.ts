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
      if (!line.trim()) return "<br />";
      return `<p>${line}</p>`;
    })
    .join("");

  return result;
}