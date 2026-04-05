"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StoryMoreMenu from "@/components/StoryMoreMenu";
import StoryComments from "@/components/StoryComments";
import styles from "./page.module.css";

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

type FlatStoryItem = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  duration_ms: number | null;
  text_overlays: TextOverlay[];
  created_at: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor(diff / (1000 * 60));
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "now";
}

/* ── SVG アイコン ── */

const ThumbUpIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 22V11l5-9 1.5 1c1 .7 1.5 1.8 1.5 3v4h5a2 2 0 0 1 2 2.2l-1.2 7A2 2 0 0 1 18.8 21H7z" />
    <path d="M2 11h3v11H2z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const MuteIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const VolumeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

function StreamItemView({
  item,
  isVisible,
  locale,
}: {
  item: FlatStoryItem;
  isVisible: boolean;
  locale: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // いいね
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // コメント
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // 共有
  const [shareLabel, setShareLabel] = useState("共有");

  // 動画のオートプレイ/ポーズ
  useEffect(() => {
    if (item.media_type !== "video" || !videoRef.current) return;
    if (isVisible) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, item.media_type]);

  // いいね状態 + カウント初期化
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // カウント取得
      const countRes = await fetch(`/api/story/${item.id}/like`, { method: "HEAD" }).catch(() => null);
      // HEAD は未対応なので GET 的にカウントだけ別途取る
      // supabase client で直接取得
      const { count } = await supabase
        .from("story_likes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", item.id);
      if (cancelled) return;
      setLikeCount(count ?? 0);

      // ユーザーのいいね状態
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("story_likes")
        .select("id")
        .eq("story_id", item.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setLiked(!!data);
    };

    // コメント数取得
    const initComments = async () => {
      const res = await fetch(`/api/story/${item.id}/comments`).catch(() => null);
      if (!res || cancelled) return;
      const data = await res.json().catch(() => null);
      if (data?.comments && !cancelled) {
        setCommentCount(data.comments.filter((c: { is_deleted: boolean }) => !c.is_deleted).length);
      }
    };

    init();
    initComments();
    return () => { cancelled = true; };
  }, [item.id]);

  // いいねトグル
  const handleLike = async () => {
    if (likeLoading) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("いいねにはログインが必要です");
      return;
    }

    setLikeLoading(true);
    try {
      const res = await fetch(`/api/story/${item.id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch {
      // ignore
    } finally {
      setLikeLoading(false);
    }
  };

  // 共有
  const handleShare = async () => {
    const url = `${window.location.origin}/${locale}/stream`;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // share cancelled — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("コピー済み");
      setTimeout(() => setShareLabel("共有"), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.streamItem}>
      {item.media_type === "image" ? (
        <img
          src={item.media_url}
          alt=""
          className={styles.streamMedia}
          loading="lazy"
        />
      ) : (
        <video
          ref={videoRef}
          src={item.media_url}
          className={styles.streamMedia}
          playsInline
          muted={muted}
          loop
          preload="metadata"
        />
      )}

      {/* テキストオーバーレイ */}
      {item.text_overlays.map((overlay, i) => (
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

      {/* 下部グラデーション */}
      <div className={styles.streamGradient} />

      {/* 右上: 三点メニュー */}
      <StoryMoreMenu storyId={item.id} storyUserId={item.user_id} />

      {/* 右サイドアクションバー */}
      <div className={styles.actionBar}>
        {/* いいね */}
        <div className={styles.actionItem}>
          <button
            className={`${styles.actionBtn} ${liked ? styles.actionBtnActive : ""}`}
            onClick={handleLike}
            disabled={likeLoading}
            type="button"
          >
            <ThumbUpIcon />
          </button>
          <span className={styles.actionLabel}>{likeCount > 0 ? likeCount : "--"}</span>
        </div>

        {/* コメント */}
        <div className={styles.actionItem}>
          <button
            className={styles.actionBtn}
            onClick={() => setCommentOpen(true)}
            type="button"
          >
            <CommentIcon />
          </button>
          <span className={styles.actionLabel}>{commentCount > 0 ? commentCount : "--"}</span>
        </div>

        {/* 共有 */}
        <div className={styles.actionItem}>
          <button
            className={styles.actionBtn}
            onClick={handleShare}
            type="button"
          >
            <ShareIcon />
          </button>
          <span className={styles.actionLabel}>{shareLabel}</span>
        </div>

        {/* ミュートトグル（動画のみ） */}
        {item.media_type === "video" && (
          <div className={styles.actionItem}>
            <button
              className={styles.actionBtn}
              onClick={() => {
                setMuted((prev) => !prev);
                if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
              }}
              type="button"
            >
              {muted ? <MuteIcon /> : <VolumeIcon />}
            </button>
          </div>
        )}
      </div>

      {/* ユーザー情報 */}
      <div className={styles.streamUserInfo}>
        {item.avatar_url ? (
          <img
            src={item.avatar_url}
            alt=""
            className={styles.streamUserAvatar}
          />
        ) : (
          <div className={styles.streamUserAvatarPlaceholder}>
            {(item.display_name || item.username || "?")[0]}
          </div>
        )}
        <span className={styles.streamUserName}>
          {item.display_name || item.username || "Anonymous"}
          <span className={styles.streamUserTime}>
            {timeAgo(item.created_at)}
          </span>
        </span>
      </div>

      {/* コメントボトムシート */}
      <StoryComments
        storyId={item.id}
        isOpen={commentOpen}
        onClose={() => setCommentOpen(false)}
        onCountChange={setCommentCount}
      />
    </div>
  );
}

export default function StreamPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [items, setItems] = useState<FlatStoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // データ取得
  useEffect(() => {
    fetch("/api/stories")
      .then((res) => res.json())
      .then((data) => {
        const users = data.users ?? [];
        const flat: FlatStoryItem[] = [];
        for (const u of users) {
          for (const s of u.stories) {
            flat.push({
              ...s,
              text_overlays: s.text_overlays ?? [],
              user_id: u.user_id,
              username: u.username,
              display_name: u.display_name,
              avatar_url: u.avatar_url,
            });
          }
        }
        flat.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setItems(flat);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // IntersectionObserver で表示中アイテムを検知
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setVisibleIndex(idx);
          }
        }
      },
      { threshold: 0.7 }
    );

    itemRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [items]);

  const setItemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) itemRefs.current.set(index, el);
      else itemRefs.current.delete(index);
    },
    []
  );

  if (loading) {
    return (
      <div className={styles.streamPage}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📡</div>
          <p className={styles.emptyText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.streamPage}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📡</div>
          <p className={styles.emptyText}>
            まだストリームはありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.streamPage}>
      <div ref={containerRef} className={styles.streamContainer}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            ref={setItemRef(idx)}
            data-index={idx}
          >
            <StreamItemView item={item} isVisible={idx === visibleIndex} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
