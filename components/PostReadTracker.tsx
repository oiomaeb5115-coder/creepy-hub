"use client";

import { useEffect } from "react";

export default function PostReadTracker({ id }: { id: string }) {
  useEffect(() => {
    fetch(`/api/post/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  return null;
}
