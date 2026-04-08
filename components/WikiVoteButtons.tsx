"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ThumbUpIcon from "@/components/icons/ThumbUpIcon";

type WikiVoteButtonsProps = {
  wikiId: number;
  initialScore: number;
};

type SessionUser = {
  id: string;
};

export default function WikiVoteButtons({
  wikiId,
  initialScore,
}: WikiVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [currentVote, setCurrentVote] = useState<1 | 0>(0);
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
        .from("wiki_votes")
        .select("vote_type")
        .eq("wiki_id", wikiId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error && data?.vote_type === 1) {
        setCurrentVote(1);
      }

      setLoading(false);
    };

    loadVoteState();
  }, [wikiId]);

  const applyVote = async () => {
    if (!currentUser) {
      alert("評価するにはログインが必要です。");
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      if (currentVote === 1) {
        const { error } = await supabase
          .from("wiki_votes")
          .delete()
          .eq("wiki_id", wikiId)
          .eq("user_id", currentUser.id);

        if (error) {
          alert(`評価の取り消しに失敗しました: ${error.message}`);
          return;
        }

        setScore((prev) => prev - 1);
        setCurrentVote(0);
        return;
      }

      const { error } = await supabase.from("wiki_votes").insert([
        {
          wiki_id: wikiId,
          user_id: currentUser.id,
          vote_type: 1,
        },
      ]);

      if (error) {
        alert(`評価に失敗しました: ${error.message}`);
        return;
      }

      setScore((prev) => prev + 1);
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
        title="高く評価"
        aria-label="高く評価"
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
        <ThumbUpIcon size={18} />
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
