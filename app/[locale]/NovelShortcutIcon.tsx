"use client";

import Link from "next/link";

export default function NovelShortcutIcon({ locale }: { locale: string }) {
  return (
    <Link
      href={`/${locale}/novel`}
      style={{
        position: "fixed",
        top: 114,
        left: 14,
        zIndex: 120,
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "2px solid rgba(var(--accent-rgb, 198, 40, 40), 0.4)",
        background: "var(--bg-surface, #1a0a0d)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        color: "var(--accent, #c62828)",
        fontSize: 18,
        transition: "border-color 0.2s, box-shadow 0.2s",
        pointerEvents: "auto",
      }}
      aria-label="Novel"
    >
      {/* 本のアイコン */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    </Link>
  );
}
