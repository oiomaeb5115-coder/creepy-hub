"use client";

import { useEffect } from "react";

const STORAGE_KEY = "creepyhub_read_posts";
const MAX_STORED = 500;

export default function PostReadTracker({ id }: { id: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(id)) {
        const updated = [...list, id].slice(-MAX_STORED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Increment server-side view count
        fetch(`/api/post/${id}/view`, { method: "POST" }).catch(() => {});
      }
    } catch {
      // localStorage unavailable — still try to count the view
      fetch(`/api/post/${id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [id]);

  return null;
}
