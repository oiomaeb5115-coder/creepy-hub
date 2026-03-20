"use client";

import sanitizeHtml from "sanitize-html";

type Props = {
  html: string;
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "a", "img", "strong", "em"],
  allowedAttributes: {
    a: ["href", "class", "target", "rel"],
    img: ["src", "alt", "style"],
  },
  allowedStyles: {
    img: {
      "max-width": [/.*/],
      width: [/.*/],
      margin: [/.*/],
      display: [/.*/],
      border: [/.*/],
    },
  },
};

export default function AutoLinkedWikiContent({ html }: Props) {
  const clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
