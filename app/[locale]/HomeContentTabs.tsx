"use client";

import React, { useState } from "react";
import Link from "next/link";
import InlineVoteButtons from "@/components/InlineVoteButtons";
import PopularPeriodDropdown from "@/components/PopularPeriodDropdown";
import CommentIcon from "@/components/icons/CommentIcon";
import ViewIcon from "@/components/icons/ViewIcon";
import InlineWikiVoteButtons from "@/components/InlineWikiVoteButtons";
import { postUrl } from "@/lib/postUrl";
import ImpressionTracker from "@/components/ImpressionTracker";
import styles from "./page.module.css";
import NinjaAd from "@/components/NinjaAd";

type AuthorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  view_count: number | null;
  slug: string | null;
  vote_score: number | null;
  comment_count: number | null;
  author?: AuthorProfile | null;
};

type WikiPost = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  updated_at: string | null;
  view_count: number | null;
  image_url: string | null;
  vote_score: number | null;
  show_author: boolean;
  author?: AuthorProfile | null;
};

type Labels = {
  tabPosts: string;
  tabFiles: string;
  latestStories: string;
  latestWiki: string;
  noStories: string;
  noWiki: string;
  tabNew: string;
  tabPopular: string;
  periodToday: string;
  period3days: string;
  periodWeek: string;
  periodMonth: string;
  storyLabel: string;
  unknownDate: string;
  noSummary: string;
  viewAll: string;
};

type Props = {
  latestStories: StoryPost[];
  latestWiki: WikiPost[];
  locale: string;
  isPopular: boolean;
  isWikiPopular: boolean;
  currentPeriod: string;
  labels: Labels;
};

function StoryCardGrid({
  post,
  locale,
  storyLabel,
  unknownDate,
}: {
  post: StoryPost;
  locale: string;
  storyLabel: string;
  unknownDate: string;
}) {
  const safeTitle = post.title ?? storyLabel;
  const safeContent = post.content ?? "";
  const safeCreatedAt = post.created_at ?? "";
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const score = post.vote_score ?? 0;
  const commentCount = post.comment_count ?? 0;

  const imageUrls = [post.image_url, post.image_url_2, post.image_url_3]
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  const authorName = post.author?.display_name || post.author?.username || null;

  return (
    <Link href={postUrl(locale, post.id, post.slug)} className={styles.gridCardLink}>
      <ImpressionTracker type="post" id={post.id}>
      <article className={styles.gridCard}>
        <div className={styles.gridCardBody}>
          <div className={styles.gridCardAuthorRow}>
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className={styles.gridCardAvatar} />
            ) : (
              <span className={styles.gridCardAvatarPlaceholder} />
            )}
            <span className={styles.gridCardAuthorName}>
              {authorName ? `@${post.author?.username ?? authorName}` : (locale === "en" ? "Anonymous" : "匿名")}
            </span>
            <span className={styles.gridCardDate}>
              {safeCreatedAt
                ? new Date(safeCreatedAt).toLocaleDateString(dateLocale)
                : unknownDate}
            </span>
          </div>
          <h3 className={styles.gridCardTitle}>{safeTitle}</h3>
          <p className={styles.gridCardExcerpt}>
            {safeContent.length > 400 ? `${safeContent.slice(0, 400)}...` : safeContent}
          </p>
        </div>

        {imageUrls.length > 0 && (
          <div className={`${styles.gridCardImageWrap} ${imageUrls.length >= 2 ? styles.gridCardImageGrid : ""}`}>
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${safeTitle} ${i + 1}`}
                className={styles.gridCardImage}
                loading="lazy"
              />
            ))}
          </div>
        )}

        <div className={styles.gridCardFooter}>
          <InlineVoteButtons postId={post.id} initialScore={score} />
          <span className="stat-icon"><CommentIcon /> {commentCount}</span>
          <span className="stat-icon"><ViewIcon /> {post.view_count ?? 0}</span>
        </div>
      </article>
      </ImpressionTracker>
    </Link>
  );
}

function WikiCardGrid({
  item,
  locale,
  unknownDate,
  noSummary,
}: {
  item: WikiPost;
  locale: string;
  unknownDate: string;
  noSummary: string;
}) {
  const safeUpdatedAt = item.updated_at ?? "";
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const showAuthor = item.show_author;
  const authorName = showAuthor ? (item.author?.display_name || item.author?.username || null) : null;

  return (
    <Link href={`/${locale}/wiki/${item.slug}`} className={styles.gridCardLink}>
      <ImpressionTracker type="wiki" id={item.id}>
      <article className={styles.gridCard}>
        <div className={styles.gridCardBody}>
          <div className={styles.gridCardAuthorRow}>
            {showAuthor ? (
              <>
                {item.author?.avatar_url ? (
                  <img src={item.author.avatar_url} alt="" className={styles.gridCardAvatar} />
                ) : (
                  <span className={styles.gridCardAvatarPlaceholder} />
                )}
                <span className={styles.gridCardAuthorName}>
                  {authorName ? `@${item.author?.username ?? authorName}` : (locale === "en" ? "Anonymous" : "匿名")}
                </span>
              </>
            ) : (
              <>
                <span className={styles.gridCardAvatarPlaceholder} />
                <span className={styles.gridCardAuthorName}>FILE</span>
              </>
            )}
            <span className={styles.gridCardDate}>
              {safeUpdatedAt
                ? new Date(safeUpdatedAt).toLocaleDateString(dateLocale)
                : unknownDate}
            </span>
          </div>
          <h3 className={styles.gridCardTitle}>{item.title}</h3>
          <p className={styles.gridCardExcerpt}>
            {item.summary ?? noSummary}
          </p>
        </div>

        {item.image_url && (
          <div className={styles.gridCardImageWrap}>
            <img
              src={item.image_url}
              alt={item.title}
              className={styles.gridCardImage}
              loading="lazy"
            />
          </div>
        )}

        <div className={styles.gridCardFooter}>
          <InlineWikiVoteButtons wikiId={item.id} initialScore={item.vote_score ?? 0} />
          <span className="stat-icon"><ViewIcon /> {item.view_count ?? 0}</span>
        </div>
      </article>
      </ImpressionTracker>
    </Link>
  );
}

export default function HomeContentTabs({
  latestStories,
  latestWiki,
  locale,
  isPopular,
  isWikiPopular,
  currentPeriod,
  labels,
}: Props) {
  const [activeTab, setActiveTab] = useState<"posts" | "files">("posts");

  return (
    <>
      <div className={styles.mainTabs}>
        <button
          className={`${styles.mainTab} ${activeTab === "posts" ? styles.mainTabActive : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          {labels.tabPosts}
        </button>
        <button
          className={`${styles.mainTab} ${activeTab === "files" ? styles.mainTabActive : ""}`}
          onClick={() => setActiveTab("files")}
        >
          {labels.tabFiles}
        </button>
      </div>

      {activeTab === "posts" && (
        <section className={styles.contentSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.textSectionTitle}>
              <span className={styles.textSectionTitleEn}>CREEPY POSTS</span>
              <span className={styles.textSectionTitleJa}>{labels.latestStories}</span>
            </div>
            <Link href={`/${locale}/post`} className={styles.seeAllLink}>
              {labels.viewAll} →
            </Link>
          </div>

          <div className={styles.homeSortTabs}>
            <Link
              href={`/${locale}`}
              className={`${styles.homeSortTab} ${!isPopular ? styles.homeSortTabActive : ""}`}
            >
              {labels.tabNew}
            </Link>
            <div className={styles.homeSortTabWithDropdown}>
              <Link
                href={`/${locale}?sort=popular`}
                className={`${styles.homeSortTab} ${isPopular ? styles.homeSortTabActive : ""}`}
              >
                {labels.tabPopular}
              </Link>
              {isPopular && (
                <PopularPeriodDropdown
                  locale={locale}
                  currentPeriod={currentPeriod}
                  labels={{
                    today: labels.periodToday,
                    "3days": labels.period3days,
                    week: labels.periodWeek,
                    month: labels.periodMonth,
                  }}
                />
              )}
            </div>
          </div>

          {latestStories.length === 0 ? (
            <p className={styles.emptyText}>{labels.noStories}</p>
          ) : (
            <div className={styles.cardGrid}>
              {latestStories.map((post, index) => (
                <React.Fragment key={post.id}>
                  {index > 0 && index % 4 === 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <NinjaAd type="sp-banner" />
                    </div>
                  )}
                  <StoryCardGrid
                    post={post}
                    locale={locale}
                    storyLabel={labels.storyLabel}
                    unknownDate={labels.unknownDate}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "files" && (
        <section className={styles.contentSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.textSectionTitle}>
              <span className={styles.textSectionTitleEn}>OCCULT FILES</span>
              <span className={styles.textSectionTitleJa}>{labels.latestWiki}</span>
            </div>
            <Link href={`/${locale}/wiki`} className={styles.seeAllLink}>
              {labels.viewAll} →
            </Link>
          </div>

          <div className={styles.homeSortTabs}>
            <Link
              href={`/${locale}?wiki_sort=new`}
              className={`${styles.homeSortTab} ${!isWikiPopular ? styles.homeSortTabActive : ""}`}
            >
              {labels.tabNew}
            </Link>
            <Link
              href={`/${locale}?wiki_sort=popular`}
              className={`${styles.homeSortTab} ${isWikiPopular ? styles.homeSortTabActive : ""}`}
            >
              {labels.tabPopular}
            </Link>
          </div>

          {latestWiki.length === 0 ? (
            <p className={styles.emptyText}>{labels.noWiki}</p>
          ) : (
            <div className={styles.cardGrid}>
              {latestWiki.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && index % 4 === 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <NinjaAd type="sp-banner" />
                    </div>
                  )}
                  <WikiCardGrid
                    item={item}
                    locale={locale}
                    unknownDate={labels.unknownDate}
                    noSummary={labels.noSummary}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
