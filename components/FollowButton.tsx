"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Labels = {
  follow?: string;
  unfollow?: string;
  loginRequired?: string;
};

type Props = {
  targetUserId: string;
  labels?: Labels;
};

export default function FollowButton({ targetUserId, labels }: Props) {
  const [following, setFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const t = {
    follow: labels?.follow ?? "フォロー",
    unfollow: labels?.unfollow ?? "フォロー中",
    loginRequired: labels?.loginRequired ?? "ログインしてください",
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      setFollowing(!!data);
      setLoading(false);
    };

    init();
  }, [targetUserId]);

  const handleToggle = async () => {
    if (!currentUserId) {
      alert(t.loginRequired);
      return;
    }

    setToggling(true);
    try {
      if (following) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        setFollowing(false);
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        setFollowing(true);
      }
    } finally {
      setToggling(false);
    }
  };

  // 自分自身のプロフィールには表示しない
  if (!loading && currentUserId === targetUserId) return null;
  // 未ログインには表示しない
  if (!loading && !currentUserId) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading || toggling}
      style={{
        padding: "6px 18px",
        border: following
          ? "1px solid rgba(170, 108, 112, 0.5)"
          : "1px solid rgba(170, 108, 112, 0.8)",
        background: following ? "rgba(48, 18, 22, 0.6)" : "rgba(80, 28, 32, 0.8)",
        color: following ? "#a08080" : "#f0d0d2",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        cursor: loading || toggling ? "default" : "pointer",
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {loading || toggling ? "…" : following ? t.unfollow : t.follow}
    </button>
  );
}
