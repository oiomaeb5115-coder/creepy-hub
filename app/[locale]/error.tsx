"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: "1.5rem",
        padding: "4rem 2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", letterSpacing: "0.1em" }}>
        エラーが発生しました
      </h2>
      <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>
        しばらくしてからもう一度お試しください。
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.6rem 2rem",
          border: "1px solid currentColor",
          background: "transparent",
          cursor: "pointer",
          letterSpacing: "0.05em",
          fontSize: "0.85rem",
        }}
      >
        再試行
      </button>
    </main>
  );
}
