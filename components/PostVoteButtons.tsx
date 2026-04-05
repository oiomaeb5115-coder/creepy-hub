"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";

type Labels = {
  rateLoginRequired?: string;
  rateRevokeFailed?: string;
  rateFailed?: string;
  upvote?: string;
};

type PostVoteButtonsProps = {
  postId: number;
  initialScore: number;
  labels?: Labels;
};

type SessionUser = {
  id: string;
};

export default function PostVoteButtons({
  postId,
  initialScore,
  labels,
}: PostVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [currentVote, setCurrentVote] = useState<1 | 0>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  const t = {
    rateLoginRequired: labels?.rateLoginRequired ?? "評価するにはログインが必要です。",
    rateRevokeFailed: labels?.rateRevokeFailed ?? "評価の取り消しに失敗しました: ",
    rateFailed: labels?.rateFailed ?? "評価に失敗しました: ",
    upvote: labels?.upvote ?? "高く評価",
  };

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

      if (!error && data?.vote_type === 1) {
        setCurrentVote(1);
      }

      setLoading(false);
    };

    loadVoteState();
  }, [postId]);

  const applyVote = async () => {
    if (!currentUser) {
      alert(t.rateLoginRequired);
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      if (currentVote === 1) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUser.id);

        if (error) {
          alert(`${t.rateRevokeFailed}${error.message}`);
          return;
        }

        setScore((prev) => prev - 1);
        setCurrentVote(0);
        return;
      }

      const { error } = await supabase.from("post_votes").upsert([
        {
          post_id: postId,
          user_id: currentUser.id,
          vote_type: 1,
        },
      ]);

      if (error) {
        alert(`${t.rateFailed}${error.message}`);
        return;
      }

      setScore((prev) => {
        const newScore = prev + 1;
        // スコアが丁度5に達した瞬間だけ自動翻訳を発火
        if (newScore === 5) {
          getAccessToken().then((token) => {
            if (!token) return;
            fetch("/api/translate/story-auto", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ postId }),
            }).catch(() => {});
          });
        }
        return newScore;
      });
      setCurrentVote(1);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = loading || submitting;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        padding: "4px 6px",
        borderRadius: "999px",
        border: "1px solid rgba(161, 102, 108, 0.28)",
        background: "rgba(14, 5, 7, 0.9)",
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => applyVote()}
        title={t.upvote}
        aria-label={t.upvote}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "999px",
          border: "none",
          background: "transparent",
          color: currentVote === 1 ? "#e05c6a" : "#8a7870",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          fontWeight: 700,
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,92,106,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        ▲
      </button>

      <span
        style={{
          minWidth: "28px",
          textAlign: "center",
          color: currentVote === 1 ? "#e05c6a" : "#c8b8b0",
          fontWeight: 700,
          fontSize: "14px",
          userSelect: "none",
        }}
      >
        {score}
      </span>
    </div>
  );
}
