"use client";

import Link from "next/link";

type NovelPremiumLockProps = {
  locale: string;
  title: string;
  requiredMembership: string; // 'any' | 'youtube' | 'apple_iap' | 'google_play' | 'stripe'
  unlockNote: string | null;
  dict: {
    premiumLockedTitle?: string;
    premiumLockedDesc?: string;
    unlockViaYoutube?: string;
    unlockViaApp?: string;
    backToList: string;
  };
};

/**
 * 課金エピソードに非課金ユーザが到達した時のロック画面。
 *
 * Phase1 (Web先行): YouTube メンバーシップ導線を表示。
 * Phase2 (iOS/Android公開後): required_membership に応じて Apple IAP / Google Play / YouTube を出し分け。
 */
export default function NovelPremiumLock({
  locale,
  title,
  requiredMembership,
  unlockNote,
  dict,
}: NovelPremiumLockProps) {
  const lockedTitle =
    dict.premiumLockedTitle ?? (locale === "en" ? "Members-only Episode" : "メンバー限定エピソード");
  const lockedDesc =
    dict.premiumLockedDesc ??
    (locale === "en"
      ? "This episode is available to members. Please join to continue."
      : "このエピソードはメンバー限定です。ご視聴にはメンバーシップへのご参加が必要です。");
  const youtubeLabel =
    dict.unlockViaYoutube ?? (locale === "en" ? "Join via YouTube Membership" : "YouTubeメンバーシップで見る");
  const appLabel = dict.unlockViaApp ?? (locale === "en" ? "Subscribe in the app" : "アプリ内で購読する");

  // 現時点では YouTube 導線のみ実装（外部リンクは App Store 審査 3.1.1 対策で外部ブラウザにしない）。
  // アプリ内からは出さず、Web のみに YouTube リンクを表示する方針。
  const showYoutubeCta =
    requiredMembership === "youtube" || requiredMembership === "any" || requiredMembership === null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        width: "min(100vw, 430px, calc(100dvh * 9 / 16))",
        maxWidth: "100vw",
        aspectRatio: "9 / 16",
        maxHeight: "100dvh",
        transform: "translate(-50%, -50%)",
        background:
          "linear-gradient(135deg, rgba(10,5,8,0.98) 0%, rgba(30,10,15,0.96) 50%, rgba(10,5,8,0.98) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "'SoukouMincho', serif",
        zIndex: 1500,
        boxShadow: "0 0 0 100vmax #000, 0 24px 80px rgba(0,0,0,0.72)",
      }}
    >
      {/* 鍵アイコン */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px solid rgba(var(--accent-rgb, 200, 40, 50), 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent, #c62828)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>

      <h1 style={{ fontSize: 22, letterSpacing: 4, margin: "0 0 8px", textAlign: "center" }}>
        {lockedTitle}
      </h1>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "0 0 24px", textAlign: "center" }}>
        {title}
      </p>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.8,
          color: "rgba(255,255,255,0.75)",
          maxWidth: 420,
          textAlign: "center",
          margin: "0 0 16px",
        }}
      >
        {lockedDesc}
      </p>

      {unlockNote && (
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 420,
            textAlign: "center",
            margin: "0 0 28px",
            whiteSpace: "pre-wrap",
          }}
        >
          {unlockNote}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        {showYoutubeCta && (
          <a
            href="https://www.youtube.com/@inakuromystery/membership"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "14px 20px",
              background: "rgba(var(--accent-rgb, 200, 40, 50), 0.85)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 15,
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            {youtubeLabel}
          </a>
        )}

        {(requiredMembership === "apple_iap" || requiredMembership === "google_play") && (
          <div
            style={{
              padding: "14px 20px",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            {appLabel}
          </div>
        )}

        <Link
          href={`/${locale}/novel`}
          style={{
            display: "block",
            padding: "12px 20px",
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 8,
            textDecoration: "none",
            textAlign: "center",
            fontSize: 14,
            letterSpacing: 2,
          }}
        >
          &larr; {dict.backToList}
        </Link>
      </div>
    </div>
  );
}
