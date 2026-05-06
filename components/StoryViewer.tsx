"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SensitiveImage from "./SensitiveImage";
import styles from "./StoryViewer.module.css";

type SensitiveDict = {
  reveal: string;
  hide: string;
  overlay: string;
  ageGatePrompt: string;
  ageGateConfirm: string;
  ageGateCancel: string;
};

type TextOverlay = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string | null;
  rotation: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  stroke?: string | null;
};

type StoryItem = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  duration_ms: number | null;
  text_overlays: TextOverlay[];
  created_at: string;
  is_sensitive?: boolean;
};

type StoryUser = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  stories: StoryItem[];
};

type Props = {
  users: StoryUser[];
  initialUserIndex: number;
  onClose: () => void;
  onStoryView: (storyId: string) => void;
  sensitiveDict?: SensitiveDict;
};

const IMAGE_DURATION = 5000; // 画像は5秒表示

export default function StoryViewer({ users, initialUserIndex, onClose, onStoryView, sensitiveDict }: Props) {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setCurrentUserId(session?.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // タッチスワイプ用
  const touchStartX = useRef(0);

  const currentUser = users[userIndex];
  const currentStory = currentUser?.stories[storyIndex];

  // ストーリー閲覧マーク
  useEffect(() => {
    if (currentStory) {
      onStoryView(currentStory.id);
    }
  }, [currentStory, onStoryView]);

  // 次のストーリーへ
  const goNext = useCallback(() => {
    if (!currentUser) return;
    if (storyIndex < currentUser.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (userIndex < users.length - 1) {
      setUserIndex((prev) => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentUser, storyIndex, userIndex, users.length, onClose]);

  // 前のストーリーへ
  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (userIndex > 0) {
      setUserIndex((prev) => prev - 1);
      const prevUser = users[userIndex - 1];
      setStoryIndex(prevUser.stories.length - 1);
    }
  }, [storyIndex, userIndex, users]);

  // 画像タイマー
  useEffect(() => {
    if (!currentStory || currentStory.media_type === "video" || paused) return;

    timerRef.current = setTimeout(goNext, IMAGE_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStory, paused, goNext, storyIndex, userIndex]);

  // 動画終了時に次へ
  const handleVideoEnded = () => {
    goNext();
  };

  // 一時停止/再開
  const togglePause = () => {
    setPaused((prev) => {
      const next = !prev;
      if (videoRef.current) {
        if (next) videoRef.current.pause();
        else videoRef.current.play().catch(() => {});
      }
      return next;
    });
  };

  // キーボード操作
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  // スワイプ
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 60) {
      if (delta < 0) {
        // 左スワイプ → 次のユーザー
        if (userIndex < users.length - 1) {
          setUserIndex((prev) => prev + 1);
          setStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        // 右スワイプ → 前のユーザー
        if (userIndex > 0) {
          setUserIndex((prev) => prev - 1);
          setStoryIndex(0);
        }
      }
    }
  };

  // 経過時間表示
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor(diff / (1000 * 60));
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return "now";
  };

  if (!currentUser || !currentStory) return null;

  const duration = currentStory.media_type === "video"
    ? (currentStory.duration_ms ?? 5000)
    : IMAGE_DURATION;

  return (
    <div
      className={styles.overlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.container}>
        {/* プログレスバー */}
        <div className={styles.progressBar}>
          {currentUser.stories.map((s, i) => (
            <div key={s.id} className={styles.progressSegment}>
              <div
                ref={i === storyIndex ? progressRef : undefined}
                className={`${styles.progressFill} ${
                  i < storyIndex
                    ? styles.progressFillDone
                    : i === storyIndex && !paused
                    ? styles.progressFillActive
                    : ""
                }`}
                style={
                  i === storyIndex && !paused
                    ? { animationDuration: `${duration}ms` }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* ヘッダー */}
        <div className={styles.header}>
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt="" className={styles.headerAvatar} />
          ) : (
            <div className={styles.headerAvatarPlaceholder}>
              {(currentUser.display_name || currentUser.username || "?")[0]}
            </div>
          )}
          <span className={styles.headerName}>
            {currentUser.display_name || currentUser.username || "Anonymous"}
            <span className={styles.headerTime}>{timeAgo(currentStory.created_at)}</span>
          </span>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            &times;
          </button>
        </div>

        {/* メディア */}
        <div className={styles.mediaWrap}>
          {currentStory.media_type === "image" ? (
            currentStory.is_sensitive && currentUser.user_id !== currentUserId && sensitiveDict ? (
              <SensitiveImage
                key={currentStory.id}
                src={currentStory.media_url}
                alt=""
                className={styles.mediaImage}
                style={{ width: "100%", height: "100%" }}
                dict={sensitiveDict}
              />
            ) : (
              <img
                key={currentStory.id}
                src={currentStory.media_url}
                alt=""
                className={styles.mediaImage}
              />
            )
          ) : (
            <video
              key={currentStory.id}
              ref={videoRef}
              src={currentStory.media_url}
              className={styles.mediaVideo}
              autoPlay
              playsInline
              muted={muted}
              onEnded={handleVideoEnded}
            />
          )}

          {/* テキストオーバーレイ */}
          {currentStory.text_overlays.map((overlay, i) => (
            <div
              key={i}
              className={styles.textOverlay}
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                fontSize: `${overlay.fontSize}px`,
                fontFamily: overlay.fontFamily,
                color: overlay.color,
                backgroundColor: overlay.backgroundColor || "transparent",
                transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
                fontWeight: overlay.fontWeight || "normal",
                fontStyle: overlay.fontStyle || "normal",
                WebkitTextStroke: overlay.stroke
                  ? `1.5px ${overlay.stroke}`
                  : undefined,
                paintOrder: overlay.stroke ? "stroke fill" : undefined,
              }}
            >
              {overlay.text}
            </div>
          ))}

          {/* タップゾーン */}
          <div className={styles.tapZoneLeft} onClick={goPrev} />
          <div className={styles.tapZoneCenter} onClick={togglePause} />
          <div className={styles.tapZoneRight} onClick={goNext} />

          {/* 一時停止インジケーター */}
          {paused && <div className={styles.pauseIndicator}>❚❚</div>}
        </div>

        {/* ミュートボタン（動画のみ） */}
        {currentStory.media_type === "video" && (
          <button
            className={styles.muteBtn}
            onClick={() => {
              setMuted((prev) => !prev);
              if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            }}
            type="button"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        )}
      </div>
    </div>
  );
}
