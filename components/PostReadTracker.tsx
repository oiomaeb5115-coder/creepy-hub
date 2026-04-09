"use client";

import { useEffect } from "react";

const SESSION_KEY = "creepyhub_impressions";

export default function PostReadTracker({ id }: { id: string }) {
  useEffect(() => {
    try {
      const key = `post-${id}`;
      const raw = sessionStorage.getItem(SESSION_KEY);
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (set.includes(key)) return;
      set.push(key);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(set));
    } catch {
      // sessionStorage unavailable — still count
    }
    fetch(`/api/post/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  return null;
}
