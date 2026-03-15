"use client";

import { useState } from "react";

export default function SearchBox({ locale }: { locale: string }) {
  const [q, setQ] = useState("");

  return (
    <form action={`/${locale}/search`} method="get">
      <input
        type="text"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="怪談・都市伝説・Wikiを検索"
        style={{
          width: "100%",
          minHeight: "48px",
          padding: "0 14px",
          borderRadius: "10px",
          border: "1px solid rgba(99, 124, 165, 0.28)",
          background: "rgba(3, 10, 19, 0.96)",
          color: "#eef4ff",
          boxSizing: "border-box",
        }}
      />
    </form>
  );
}