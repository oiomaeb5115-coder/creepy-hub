"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Labels = {
  loginRequired?: string;
  save?: string;
  saved?: string;
  bookmark?: string;
  unbookmark?: string;
};

export default function PostBookmarkButton({
  postId,
  labels,
}: {
  postId: number;
  labels?: Labels;
}) {
  const [bookmarked, setBookmarked] = useState(false);

  const t = {
    loginRequired: labels?.loginRequired ?? "ログインしてください",
    save: labels?.save ?? "保存",
    saved: labels?.saved ?? "保存済み",
    bookmark: labels?.bookmark ?? "ブックマーク",
    unbookmark: labels?.unbookmark ?? "ブックマーク解除",
  };

  useEffect(() => {
    checkBookmark();
  }, []);

  async function checkBookmark() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("user_bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    setBookmarked(!!data);
  }

  async function toggleBookmark() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(t.loginRequired);
      return;
    }

    if (bookmarked) {
      await supabase
        .from("user_bookmarks")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      setBookmarked(false);
    } else {
      await supabase.from("user_bookmarks").insert({
        post_id: postId,
        user_id: user.id,
      });

      setBookmarked(true);
    }
  }

  return (
    <button
      onClick={toggleBookmark}
      title={bookmarked ? t.saved : t.save}
      aria-label={bookmarked ? t.unbookmark : t.bookmark}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        height: "40px",
        borderRadius: "999px",
        border: "1px solid rgba(161, 102, 108, 0.28)",
        background: bookmarked ? "rgba(224,92,106,0.14)" : "rgba(14, 5, 7, 0.9)",
        color: bookmarked ? "#e05c6a" : "#8a7870",
        fontWeight: 700,
        fontSize: "14px",
        cursor: "pointer",
        transition: "color 0.15s, background 0.15s, border-color 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!bookmarked) {
          (e.currentTarget as HTMLButtonElement).style.color = "#c49090";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,92,106,0.07)";
        }
      }}
      onMouseLeave={(e) => {
        if (!bookmarked) {
          (e.currentTarget as HTMLButtonElement).style.color = "#8a7870";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(14, 5, 7, 0.9)";
        }
      }}
    >
      <span style={{ fontSize: "15px" }}>{bookmarked ? "★" : "☆"}</span>
      {bookmarked ? t.saved : t.save}
    </button>
  );
}
