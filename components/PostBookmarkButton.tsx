"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PostBookmarkButton({ postId }: { postId: number }) {
  const [bookmarked, setBookmarked] = useState(false);

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
      alert("ログインしてください");
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
    <button onClick={toggleBookmark}>
      {bookmarked ? "★ 保存済み" : "☆ 保存"}
    </button>
  );
}