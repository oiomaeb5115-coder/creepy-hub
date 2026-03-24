"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "creepyhub_read_posts";

type Props = {
  locale: string;
  label: string;
  className?: string;
};

export default function PostRandomButton({ locale, label, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      let exclude: string[] = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        exclude = raw ? JSON.parse(raw) : [];
      } catch {
        // ignore
      }

      const params = new URLSearchParams({ locale });
      if (exclude.length > 0) {
        params.set("exclude", exclude.join(","));
      }

      const res = await fetch(`/api/post/random-exclude?${params.toString()}`);
      if (res.ok) {
        const { id } = await res.json();
        if (id) {
          router.push(`/${locale}/post/${id}`);
          return;
        }
      }
    } catch {
      // fall through to default random
    }

    // fallback: use server-side random route
    router.push(`/${locale}/post/random`);
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "…" : label}
    </button>
  );
}
