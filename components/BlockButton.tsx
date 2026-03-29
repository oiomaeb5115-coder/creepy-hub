"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  targetUserId: string;
  labels?: {
    block?: string;
    unblock?: string;
    blockConfirm?: string;
    loginRequired?: string;
  };
};

export default function BlockButton({ targetUserId, labels }: Props) {
  const [blocked, setBlocked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const t = {
    block: labels?.block ?? "ブロック",
    unblock: labels?.unblock ?? "ブロック中",
    blockConfirm: labels?.blockConfirm ?? "このユーザーをブロックしますか？",
    loginRequired: labels?.loginRequired ?? "ログインしてください",
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();

      setBlocked(!!data);
      setLoading(false);
    };
    init();
  }, [targetUserId]);

  const handleToggle = async () => {
    if (!currentUserId) {
      alert(t.loginRequired);
      return;
    }
    if (!blocked && !confirm(t.blockConfirm)) return;

    setToggling(true);
    try {
      if (blocked) {
        await supabase
          .from("blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", targetUserId);
        setBlocked(false);
      } else {
        await supabase.from("blocks").insert({
          blocker_id: currentUserId,
          blocked_id: targetUserId,
        });
        setBlocked(true);
      }
    } finally {
      setToggling(false);
    }
  };

  if (!loading && currentUserId === targetUserId) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading || toggling}
      style={{
        padding: "6px 18px",
        border: blocked
          ? "1px solid rgba(200, 60, 60, 0.6)"
          : "1px solid rgba(120, 100, 100, 0.4)",
        background: blocked ? "rgba(120, 20, 20, 0.7)" : "rgba(40, 18, 22, 0.5)",
        color: blocked ? "#ff9090" : "#9a8880",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        cursor: loading || toggling ? "default" : "pointer",
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {loading || toggling ? "…" : blocked ? t.unblock : t.block}
    </button>
  );
}
