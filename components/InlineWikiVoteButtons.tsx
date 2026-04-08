"use client";

import WikiVoteButtons from "./WikiVoteButtons";

type Props = {
  wikiId: number;
  initialScore: number;
};

export default function InlineWikiVoteButtons({ wikiId, initialScore }: Props) {
  return (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <WikiVoteButtons wikiId={wikiId} initialScore={initialScore} />
    </span>
  );
}
