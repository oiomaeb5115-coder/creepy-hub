"use client";

import Link from "next/link";
import { MAP_PUBLIC_TO_WEB } from "@/lib/isCreepyHubApp";
import { isIOSApp } from "@/lib/isIOSApp";

/**
 * 左上アバターの下に固定表示する地図ショートカットアイコン。
 *
 * SidebarWrapper から切り出した目的：
 * - SidebarWrapper の useState/useEffect/HMR/SPA遷移サイクルから完全独立させる
 * - ログイン状態 (loggedIn) に一切依存させない
 * - MAP_PUBLIC_TO_WEB=true の間は Web/iOS/Android すべてで常時表示
 *
 * 戻すときは MAP_PUBLIC_TO_WEB=false にして、本コンポーネントを layout から外すだけ。
 */
export default function MapShortcutIcon({ locale }: { locale: string }) {
  // SSR時は MAP_PUBLIC_TO_WEB のみで判定（window 参照不可）。
  // クライアントマウント後でも window フラグは「OR の補助」なので評価順序問題なし。
  const isAppShell =
    typeof window !== "undefined" &&
    ((window as Record<string, unknown>).__CREEPYHUB_IOS__ === true ||
      (window as Record<string, unknown>).__CREEPYHUB_ANDROID__ === true ||
      isIOSApp());

  if (!MAP_PUBLIC_TO_WEB && !isAppShell) return null;

  return (
    <Link
      href={`/${locale}/map`}
      style={{
        position: "fixed",
        top: 162,
        left: 14,
        zIndex: 100,
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
      aria-label="Spot Map"
    >
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
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </Link>
  );
}
