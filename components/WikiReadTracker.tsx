"use client";

import { useEffect } from "react";

const STORAGE_KEY = "creepyhub_read_wikis";
const MAX_STORED = 500;

export default function WikiReadTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(slug)) {
        const updated = [...list, slug].slice(-MAX_STORED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // localStorage unavailable — skip silently
    }
  }, [slug]);

  return null;
}
