"use client";

import { useEffect, useRef } from "react";

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
            fetch(`/api/${type === "post" ? "post" : "wiki-page"}/${id}/view`, {
              method: "POST",
            }).catch(() => {});
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
