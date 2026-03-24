"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "creepyhub_read_wikis";

type Props = {
  locale: string;
  label: string;
  className?: string;
};

export default function WikiRandomButton({ locale, label, className }: Props) {
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

      const res = await fetch(`/api/wiki/random-exclude?${params.toString()}`);
      if (res.ok) {
        const { slug } = await res.json();
        if (slug) {
          router.push(`/${locale}/wiki/${slug}`);
          return;
        }
      }
    } catch {
      // fall through to default random
    }

    // fallback: use existing server-side random route
    router.push(`/${locale}/wiki/random`);
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "…" : label}
    </button>
  );
}
