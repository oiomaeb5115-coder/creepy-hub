"use client";

import { useEffect } from "react";

export default function WikiReadTracker({ id }: { id: string }) {
  useEffect(() => {
    fetch(`/api/wiki-page/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  return null;
}
