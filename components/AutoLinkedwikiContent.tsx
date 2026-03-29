"use client";

import sanitizeHtml from "sanitize-html";

type Props = {
  html: string;
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "a", "img", "strong", "em"],
  allowedSchemes: ["https"],
  allowedAttributes: {
    a: ["href", "class", "target", "rel"],
    img: ["src", "alt", "style"],
  },
  allowedStyles: {
    img: {
      "max-width": [/^\d+(\.\d+)?(%|px|em|rem|vw|vh)$/],
      width: [/^\d+(\.\d+)?(%|px|em|rem|vw|vh)$/],
      margin: [/^(0|auto|[\d.]+(px|em|rem)(\s+(0|auto|[\d.]+(px|em|rem))){0,3})$/],
      display: [/^(block|inline|inline-block|flex|none)$/],
      border: [/^\d+(\.\d+)?px\s+(solid|dashed|dotted|none)\s+(#[0-9a-fA-F]{3,8}|[a-z]+)$/],
    },
  },
};

export default function AutoLinkedWikiContent({ html }: Props) {
  const clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
