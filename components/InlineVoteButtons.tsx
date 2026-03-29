"use client";

import PostVoteButtons from "./PostVoteButtons";

type Props = {
  postId: number;
  initialScore: number;
};

export default function InlineVoteButtons({ postId, initialScore }: Props) {
  return (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <PostVoteButtons postId={postId} initialScore={initialScore} />
    </span>
  );
}
