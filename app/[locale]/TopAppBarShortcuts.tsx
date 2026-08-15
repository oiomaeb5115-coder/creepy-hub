"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NOVEL_PUBLIC_ACCESS_ENABLED } from "@/lib/features";
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

export default function TopAppBarShortcuts({ locale }: { locale: string }) {
  const [authButtonsVisible, setAuthButtonsVisible] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;
    let observer: MutationObserver | null = null;

    const updateAuthButtonVisibility = () => {
      rafId = null;
      const authButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-home-auth-button='true']"));
      setAuthButtonsVisible(
        authButtons.some((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
        })
      );
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateAuthButtonVisibility);
    };

    scheduleUpdate();
    const initialTimer = window.setTimeout(scheduleUpdate, 500);
    observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.clearTimeout(initialTimer);
      observer?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const showMap = MAP_PUBLIC_TO_WEB;

  return (
    <>
      {NOVEL_PUBLIC_ACCESS_ENABLED && (
        <Link
          href={`/${locale}/novel`}
          onClick={armNovelBgmPermission}
          onPointerDown={armNovelBgmPermission}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              armNovelBgmPermission();
            }
          }}
          className={`${styles.iconBtn} ${styles.novelBtn} ${authButtonsVisible ? styles.novelBtnLower : ""}`}
          aria-label="映子ノベル"
        >
          <img
            src="/images/inakuro eiko _eye.png"
            alt=""
            className={styles.novelImage}
          />
        </Link>
      )}
      {showMap && (
        <Link
          href={`/${locale}/map`}
          className={`${styles.iconBtn} ${styles.mapBtn}`}
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
    </>
  );
}
