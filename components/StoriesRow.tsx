"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./StoriesRow.module.css";

type StoryItem = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  duration_ms: number | null;
  text_overlays: { text: string }[];
  created_at: string;
};

type StoryUser = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  stories: StoryItem[];
};

type FlatItem = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  text_overlays: { text: string }[];
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  locale: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor(diff / (1000 * 60));
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "now";
}

export default function StoriesRow({ locale }: Props) {
  const [items, setItems] = useState<FlatItem[]>([]);

  useEffect(() => {
    fetch("/api/stories")
      .then((res) => res.json())
      .then((data) => {
        const users: StoryUser[] = data.users ?? [];
        const flat: FlatItem[] = [];
        for (const u of users) {
          for (const s of u.stories) {
            flat.push({
              id: s.id,
              media_url: s.media_url,
              media_type: s.media_type,
              created_at: s.created_at,
              text_overlays: s.text_overlays ?? [],
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
      .catch(console.error);
  }, []);

  return (
    <section className={styles.storiesSection}>
      {/* セクションヘッダー */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          <span className={styles.sectionTitleEn}>STREAM</span>
          <span className={styles.sectionTitleJa}>
            {locale === "en" ? "Short videos & images" : "ショート動画・画像"}
          </span>
        </div>
        <Link href={`/${locale}/stream`} className={styles.seeAllLink}>
          {locale === "en" ? "See all →" : "すべて見る →"}
        </Link>
      </div>

      {/* 横スクロールカード行 */}
      <div className={styles.storiesScroll}>
        {/* ＋追加カード（常時表示） */}
        <Link href={`/${locale}/story/new`} className={styles.addStoryCard}>
          <div className={styles.addIcon}>+</div>
          <span className={styles.addLabel}>
            {locale === "en" ? "Add" : "追加"}
          </span>
        </Link>

        {/* ストリームカード — タップでstreamページへ */}
        {items.map((item) => {
          const firstOverlay = item.text_overlays?.[0];

          return (
            <Link
              key={item.id}
              href={`/${locale}/stream`}
              className={styles.storyCard}
            >
              {/* サムネイル（9:16） */}
              {item.media_type === "image" ? (
                <img
                  src={item.media_url}
                  alt=""
                  className={styles.cardMedia}
                  loading="lazy"
                />
              ) : (
                <video
                  src={item.media_url}
                  className={styles.cardMedia}
                  muted
                  playsInline
                  preload="metadata"
                />
              )}

              {/* 動画アイコン */}
              {item.media_type === "video" && (
                <span className={styles.videoIndicator}>▶</span>
              )}

              {/* テキストプレビュー */}
              {firstOverlay && (
                <span className={styles.cardTextPreview}>
                  {firstOverlay.text}
                </span>
              )}

              {/* 下部グラデーション */}
              <div className={styles.cardGradient} />

              {/* ユーザー情報 */}
              <div className={styles.cardUserInfo}>
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt=""
                    className={styles.cardAvatar}
                  />
                ) : (
                  <div className={styles.cardAvatarPlaceholder}>
                    {(item.display_name || item.username || "?")[0]}
                  </div>
                )}
                <span className={styles.cardUsername}>
                  {item.display_name ||
                    item.username ||
                    (locale === "en" ? "Anonymous" : "匿名")}
                </span>
                <span className={styles.cardTime}>
                  {timeAgo(item.created_at)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
