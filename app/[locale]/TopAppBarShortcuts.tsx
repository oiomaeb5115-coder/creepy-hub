"use client";

import Link from "next/link";
import { MAP_PUBLIC_TO_WEB } from "@/lib/isCreepyHubApp";
import styles from "./top-app-bar-shortcuts.module.css";

const NOVEL_BGM_AUDIO = "/audio/novel/bgm/mirror-hall.mp3";
const NOVEL_BGM_ARMED_KEY = "creepyhub_novel_bgm_armed";

type WindowWithNovelBgm = Window & {
  __creepyhubNovelBgmAudio?: HTMLAudioElement;
};

const armNovelBgmPermission = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOVEL_BGM_ARMED_KEY, String(Date.now()));
  } catch {}
  const novelWindow = window as WindowWithNovelBgm;
  const audio = novelWindow.__creepyhubNovelBgmAudio ?? new Audio(NOVEL_BGM_AUDIO);
  novelWindow.__creepyhubNovelBgmAudio = audio;
  audio.preload = "auto";
  audio.volume = 0;
  audio.muted = false;
  if ("playsInline" in audio) {
    audio.playsInline = true;
  }
  audio.play().catch(() => {});
};

export default function TopAppBarShortcuts({
  locale,
  isAppShell = false,
}: {
  locale: string;
  isAppShell?: boolean;
}) {
  // Native shell handles avatar/novel/map in its own toolbar.
  if (isAppShell) return null;

  const showMap = MAP_PUBLIC_TO_WEB;

  return (
    <div className={styles.row}>
      <Link
        href={`/${locale}/novel`}
        onClick={armNovelBgmPermission}
        onPointerDown={armNovelBgmPermission}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            armNovelBgmPermission();
          }
        }}
        className={styles.iconBtn}
        aria-label="Novel"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </Link>
      {showMap && (
        <Link
          href={`/${locale}/map`}
          className={styles.iconBtn}
          aria-label="Spot Map"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </Link>
      )}
    </div>
  );
}
