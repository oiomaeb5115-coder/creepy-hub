"use client";

import { useEffect } from "react";

const SESSION_KEY = "creepyhub_impressions";

export default function WikiReadTracker({ id }: { id: string }) {
  useEffect(() => {
    try {
      const key = `wiki-${id}`;
      const raw = sessionStorage.getItem(SESSION_KEY);
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (set.includes(key)) return;
      set.push(key);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(set));
    } catch {
      // sessionStorage unavailable — still count
    }
    fetch(`/api/wiki-page/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  return null;
}
