"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY = "creepyhub_impressions";

function shouldCount(type: string, id: number): boolean {
  try {
    const key = `${type}-${id}`;
    const raw = sessionStorage.getItem(SESSION_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (set.includes(key)) return false;
    set.push(key);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(set));
    return true;
  } catch {
    return true;
  }
}

interface ImpressionTrackerProps {
  type: "post" | "wiki";
  id: number;
  children: React.ReactNode;
}

export default function ImpressionTracker({ type, id, children }: ImpressionTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(el);
            if (shouldCount(type, id)) {
              fetch(`/api/${type === "post" ? "post" : "wiki-page"}/${id}/view`, {
                method: "POST",
              }).catch(() => {});
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [type, id]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}
