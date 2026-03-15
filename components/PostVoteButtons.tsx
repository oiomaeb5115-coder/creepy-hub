"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PostVoteButtonsProps = {
  postId: number;
  initialScore: number;
};

type SessionUser = {
  id: string;
};

export default function PostVoteButtons({
  postId,
  initialScore,
}: PostVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const loadVoteState = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setCurrentUser({ id: session.user.id });

      const { data, error } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", postId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error && data?.vote_type) {
        setCurrentVote(data.vote_type as 1 | -1);
      }

      setLoading(false);
    };

    loadVoteState();
  }, [postId]);

  const applyVote = async (nextVote: 1 | -1) => {
    if (!currentUser) {
      alert("評価するにはログインが必要です。");
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      if (currentVote === nextVote) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUser.id);

        if (error) {
          alert(`評価の取り消しに失敗しました: ${error.message}`);
          return;
        }

        setScore((prev) => prev - currentVote);
        setCurrentVote(0);
        return;
      }

      if (currentVote === 0) {
        const { error } = await supabase.from("post_votes").insert([
          {
            post_id: postId,
            user_id: currentUser.id,
            vote_type: nextVote,
          },
        ]);

        if (error) {
          alert(`評価に失敗しました: ${error.message}`);
          return;
        }

        setScore((prev) => prev + nextVote);
        setCurrentVote(nextVote);
        return;
      }

      const { error } = await supabase
        .from("post_votes")
        .update({ vote_type: nextVote })
        .eq("post_id", postId)
        .eq("user_id", currentUser.id);

      if (error) {
        alert(`評価変更に失敗しました: ${error.message}`);
        return;
      }

      setScore((prev) => prev - currentVote + nextVote);
      setCurrentVote(nextVote);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "999px",
        border: "1px solid rgba(104, 128, 165, 0.24)",
        background: "rgba(10, 18, 31, 0.8)",
      }}
    >
      <button
        type="button"
        disabled={loading || submitting}
        onClick={() => applyVote(1)}
        style={{
          minWidth: "34px",
          minHeight: "34px",
          borderRadius: "999px",
          border: "1px solid rgba(104, 128, 165, 0.24)",
          background:
            currentVote === 1 ? "rgba(84, 116, 163, 0.96)" : "rgba(11, 19, 32, 0.9)",
          color: "#eef4ff",
          cursor: loading || submitting ? "not-allowed" : "pointer",
          opacity: loading || submitting ? 0.7 : 1,
          fontWeight: 700,
        }}
        aria-label="高く評価"
      >
        ▲
      </button>

      <span
        style={{
          minWidth: "28px",
          textAlign: "center",
          color: "#eef4ff",
          fontWeight: 700,
        }}
      >
        {score}
      </span>

      <button
        type="button"
        disabled={loading || submitting}
        onClick={() => applyVote(-1)}
        style={{
          minWidth: "34px",
          minHeight: "34px",
          borderRadius: "999px",
          border: "1px solid rgba(104, 128, 165, 0.24)",
          background:
            currentVote === -1 ? "rgba(84, 116, 163, 0.96)" : "rgba(11, 19, 32, 0.9)",
          color: "#eef4ff",
          cursor: loading || submitting ? "not-allowed" : "pointer",
          opacity: loading || submitting ? 0.7 : 1,
          fontWeight: 700,
        }}
        aria-label="低く評価"
      >
        ▼
      </button>
    </div>
  );
}