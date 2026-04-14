"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { postUrl } from "@/lib/postUrl";
import styles from "./page.module.css";

const PostComments = dynamic(() => import("@/components/PostComments"), { ssr: false });

type StreamPostItem = {
  id: number;
  video_url: string | null;
  stream_video_id: string | null;
  title: string | null;
  created_at: string;
  user_id: string;
  slug: string | null;
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

/**
 * Cloudflare Stream URL から subdomain と video UID を抽出する。
 * 例: https://customer-xxx.cloudflarestream.com/abc123/manifest/video.m3u8
 *   → { subdomain: "customer-xxx", uid: "abc123" }
 */
function parseCfStreamUrl(url: string | null): { subdomain: string; uid: string } | null {
  if (!url) return null;
  const m = url.match(/^https:\/\/([^.]+)\.cloudflarestream\.com\/([^/]+)\//);
  return m ? { subdomain: m[1], uid: m[2] } : null;
}

function StreamItemView({
  item,
  isVisible,
  locale,
}: {
  item: StreamPostItem;
  isVisible: boolean;
  locale: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // stream_video_id または video_url から Cloudflare Stream 情報を取得
  const cfInfo = parseCfStreamUrl(item.video_url);
  const streamUid = item.stream_video_id || cfInfo?.uid;
  const streamSubdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN || cfInfo?.subdomain;
  const useIframe = !!streamUid && !!streamSubdomain;

  // いいね（post_votes テーブル）
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // コメント数 + ドロワー
  const [commentCount, setCommentCount] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);

  // 共有
  const [shareLabel, setShareLabel] = useState("共有");

  // 動画のオートプレイ/ポーズ（<video> 用）
  useEffect(() => {
    if (useIframe || !videoRef.current) return;
    if (isVisible) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, useIframe]);

  // いいね・コメント数の初期化
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 投票スコア取得
      const { data: votes } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", item.id);
      if (cancelled) return;
      const score = (votes ?? []).reduce((sum, v) => sum + (v.vote_type ?? 0), 0);
      setLikeCount(score);

      // ユーザーのいいね状態
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", item.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setLiked(data?.vote_type === 1);
    };

    const initComments = async () => {
      const { count } = await supabase
        .from("post_comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", item.id)
        .or("is_deleted.eq.false,is_deleted.is.null");
      if (!cancelled) setCommentCount(count ?? 0);
    };

    init();
    initComments();
    return () => { cancelled = true; };
  }, [item.id]);

  // いいねトグル
  const applyVote = async () => {
    if (!currentUserId) {
      alert("評価するにはログインが必要です。");
      return;
    }
    if (likeSubmitting) return;
    setLikeSubmitting(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", item.id)
          .eq("user_id", currentUserId);
        if (error) return;
        setLikeCount((prev) => prev - 1);
        setLiked(false);
      } else {
        const { error } = await supabase.from("post_votes").upsert([
          { post_id: item.id, user_id: currentUserId, vote_type: 1 },
        ]);
        if (error) return;
        setLikeCount((prev) => prev + 1);
        setLiked(true);
      }
    } finally {
      setLikeSubmitting(false);
    }
  };

  // コメントドロワー: Escape で閉じる
  useEffect(() => {
    if (!commentOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCommentOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commentOpen]);

  // 共有
  const handleShare = async () => {
    const url = `${window.location.origin}${postUrl(locale, item.id, item.slug)}`;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // share cancelled
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

  const detailHref = postUrl(locale, item.id, item.slug);

  const iframeSrc = useIframe
    ? `https://${streamSubdomain}.cloudflarestream.com/${streamUid}/iframe?autoplay=${isVisible}&loop=true&muted=${muted}&controls=false&preload=true`
    : undefined;

  return (
    <div className={styles.streamItem}>
      {useIframe ? (
        <iframe
          src={iframeSrc}
          className={styles.streamIframe}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : item.video_url ? (
        <video
          ref={videoRef}
          src={item.video_url}
          className={styles.streamMedia}
          playsInline
          muted={muted}
          loop
          preload="metadata"
        />
      ) : null}

      {/* 下部グラデーション */}
      <div className={styles.streamGradient} />

      {/* 右サイドアクションバー */}
      <div className={styles.actionBar}>
        {/* いいね（インライン投票） */}
        <div className={styles.actionItem}>
          <button
            type="button"
            className={`${styles.actionBtn} ${liked ? styles.actionBtnActive : ""}`}
            onClick={applyVote}
            disabled={likeSubmitting}
          >
            <ThumbUpIcon />
          </button>
          <span className={styles.actionLabel}>{likeCount > 0 ? likeCount : "--"}</span>
        </div>

        {/* コメント（ドロワーを開く） */}
        <div className={styles.actionItem}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setCommentOpen(true)}
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

        {/* ミュートトグル */}
        <div className={styles.actionItem}>
          <button
            className={styles.actionBtn}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (videoRef.current) videoRef.current.muted = next;
            }}
            type="button"
          >
            {muted ? <MuteIcon /> : <VolumeIcon />}
          </button>
        </div>
      </div>

      {/* ユーザー情報 + タイトル */}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className={styles.streamUserName}>
            {item.display_name || item.username || "Anonymous"}
            <span className={styles.streamUserTime}>
              {timeAgo(item.created_at)}
            </span>
          </span>
          {item.title && (
            <Link
              href={detailHref}
              style={{
                fontSize: 13,
                color: "rgba(245,241,235,0.85)",
                textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                textDecoration: "none",
                lineHeight: 1.3,
                maxWidth: "calc(100% - 100px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {item.title}
            </Link>
          )}
        </div>
      </div>

      {/* コメントドロワー */}
      {commentOpen && (
        <>
          <div
            className={styles.commentOverlay}
            onClick={() => setCommentOpen(false)}
          />
          <div className={styles.commentDrawer}>
            <div className={styles.commentDrawerHandle}>
              <div className={styles.commentDrawerBar} />
            </div>
            <div className={styles.commentDrawerBody}>
              <PostComments postId={item.id} locale={locale} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StreamPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [items, setItems] = useState<StreamPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // データ取得
  useEffect(() => {
    fetch("/api/stream/posts")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.posts ?? []);
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
            まだ動画投稿がありません
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
