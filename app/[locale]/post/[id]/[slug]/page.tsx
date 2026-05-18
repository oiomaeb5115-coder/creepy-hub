import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import { postUrl } from "@/lib/postUrl";
import PostImageGallery from "@/components/PostImageGallery";
import styles from "./page.module.css";
import PostComments from "@/components/PostComments";
import PostVoteButtons from "@/components/PostVoteButtons";
import PostBookmarkButton from "@/components/PostBookmarkButton";
import TranslateButton from "@/components/TranslateButton";
import PostActionButtons from "@/components/PostActionButtons";
import AdminSensitiveToggle from "@/components/AdminSensitiveToggle";
import PostReadTracker from "@/components/PostReadTracker";
import PostMiniMap from "@/components/map/PostMiniMap";
import type { SpotCategory } from "@/lib/mapPalettes";
import ReportButton from "@/components/ReportButton";
import { escapeHtml, linkifyUrls } from "@/lib/linkify-urls";
import AutoLinkedWikiContent from "@/components/AutoLinkedwikiContent";
import PersonIcon from "@/components/icons/PersonIcon";
import { ResponsiveAd } from "@/components/AdSenseAd";
import SidebarAd from "@/components/SidebarAd";
import InArticleAd from "@/components/InArticleAd";

export const revalidate = 300;

const BASE_URL = "https://creepyhub.com";

type StoryPageProps = {
  params: Promise<{ locale: string; id: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { locale, id } = await params;

  // is_sensitive はマイグレーション未適用のDBでも動くよう個別クエリで取得（失敗時は false 扱い）
  const sensitiveQuery = supabaseAdmin
    .from("post")
    .select("is_sensitive")
    .eq("id", id)
    .maybeSingle()
    .then((r) => (r.error ? { data: null } : r));

  const [{ data: post }, { data: sensRow }] = await Promise.all([
    supabaseAdmin
      .from("post")
      .select("title, content, image_url, slug")
      .eq("id", id)
      .eq("is_published", true)
      .single(),
    Promise.resolve(sensitiveQuery).catch(() => ({ data: null })),
  ]);
  const isSensitiveMeta = (sensRow as { is_sensitive?: boolean | null } | null)?.is_sensitive ?? false;

  if (!post) return {};

  let title = post.title ?? undefined;
  let description: string | undefined = post.content
    ? post.content.replace(/\n+/g, " ").trim().slice(0, 160)
    : undefined;

  let fullContentLength = (post.content ?? "").length;

  if (locale === "en") {
    const { data: tr } = await supabaseAdmin
      .from("post_translations")
      .select("title, content")
      .eq("post_id", id)
      .eq("locale", "en")
      .single();

    if (!tr) {
      return {
        robots: { index: false, follow: true },
        alternates: {
          canonical: `${BASE_URL}${postUrl("ja", id, post.slug)}`,
        },
      };
    }

    if (tr.title) title = tr.title;
    if (tr.content) {
      description = tr.content.replace(/\n+/g, " ").trim().slice(0, 160);
      fullContentLength = tr.content.length;
    }
  }

  let hasEnTranslation = false;
  if (locale !== "en") {
    const { data: trCheck } = await supabaseAdmin
      .from("post_translations")
      .select("post_id")
      .eq("post_id", id)
      .eq("locale", "en")
      .single();
    hasEnTranslation = !!trCheck;
  }

  const url = `${BASE_URL}${postUrl(locale, id, post.slug)}`;

  // 本文 200 文字未満の投稿は薄いコンテンツとして noindex（Google「クロール済み・インデックス未登録」対策）
  const MIN_INDEXABLE_CONTENT_LENGTH = 200;
  const isThinContent = fullContentLength < MIN_INDEXABLE_CONTENT_LENGTH;

  return {
    title: title ?? undefined,
    description,
    ...(isThinContent ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: url,
      languages: hasEnTranslation || locale === "en"
        ? {
            ja: `${BASE_URL}${postUrl("ja", id, post.slug)}`,
            en: `${BASE_URL}${postUrl("en", id, post.slug)}`,
          }
        : {
            ja: `${BASE_URL}${postUrl("ja", id, post.slug)}`,
          },
    },
    openGraph: {
      title: title ?? undefined,
      description,
      url,
      type: "article",
      locale: locale === "en" ? "en_US" : "ja_JP",
      ...(post.image_url && !isSensitiveMeta ? { images: [{ url: post.image_url }] } : {}),
    },
  };
}

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  video_url: string | null;
  stream_video_id: string | null;
  is_published: boolean | null;
  view_count: number | null;
  user_id: string | null;
  slug: string | null;
  is_sensitive: boolean | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  map_category: string | null;
};

type ProfileRow = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type TranslationRow = {
  title: string | null;
  content: string | null;
};

type RelatedPostRow = {
  id: number;
  title: string | null;
  image_url: string | null;
  created_at: string | null;
  slug: string | null;
};

function formatRelativeTime(dateStr: string, locale: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return locale === "en" ? `${diffSec}s` : `${diffSec}秒前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return locale === "en" ? `${diffMin}m` : `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return locale === "en" ? `${diffHour}h` : `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return locale === "en" ? `${diffDay}d` : `${diffDay}日前`;
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP");
}

export default async function StoryDetailPage({ params }: StoryPageProps) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale);

  const { data, error } = await supabaseAdmin
    .from("post")
    .select(
      "id, title, content, created_at, image_url, image_url_2, image_url_3, video_url, stream_video_id, is_published, view_count, user_id, slug, lat, lng, location_name, map_category"
    )
    .eq("id", id)
    .eq("is_published", true)
    .single();

  const post = data as PostRow | null;

  if (error || !post) {
    notFound();
  }

  // is_sensitive はマイグレーション未適用環境でも動くよう個別取得（カラム不在時は false）
  let postIsSensitive = false;
  try {
    const { data: s } = await supabaseAdmin
      .from("post")
      .select("is_sensitive")
      .eq("id", post.id)
      .maybeSingle();
    postIsSensitive = (s as { is_sensitive?: boolean | null } | null)?.is_sensitive ?? false;
  } catch {
    postIsSensitive = false;
  }
  post.is_sensitive = postIsSensitive;

  let author: ProfileRow | null = null;

  if (post.user_id) {
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", post.user_id)
      .single();

    author = (profileData as ProfileRow | null) ?? null;
  }

  const { data: translationData } = await supabaseAdmin
    .from("post_translations")
    .select("title, content")
    .eq("post_id", post.id)
    .eq("locale", "en")
    .single();

  const translation = translationData as TranslationRow | null;
  const hasEnglishTranslation = !!translation;

  const displayTitle =
    locale === "en" && translation?.title
      ? translation.title
      : (post.title ?? dict.post.label);

  const displayContent =
    locale === "en" && translation?.content
      ? translation.content
      : (post.content ?? "");

  const safeCreatedAt = post.created_at ?? "";
  const contentLines = displayContent.split("\n");

  const postHtml = linkifyUrls(
    contentLines
      .map((line: string) => {
        if (line.startsWith("## "))
          return `<h3>${escapeHtml(line.replace("## ", ""))}</h3>`;
        if (!line.trim()) return "<br/>";
        return `<p>${escapeHtml(line)}</p>`;
      })
      .join("")
  );

  const imageUrls: string[] = [
    post.image_url,
    post.image_url_2,
    post.image_url_3,
  ].filter((url): url is string => Boolean(url));

  const displayedViewCount = post.view_count ?? 0;

  const { data: voteRows } = await supabaseAdmin
    .from("post_votes")
    .select("vote_type")
    .eq("post_id", post.id);

  const initialScore =
    (voteRows ?? []).reduce((sum, row) => sum + (row.vote_type ?? 0), 0);

  const { data: commentCountData } = await supabaseAdmin
    .from("post_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post.id);

  const commentCount = commentCountData?.length ?? 0;

  const { data: relatedPostsData } = await supabaseAdmin
    .from("post")
    .select("id, title, image_url, created_at, slug")
    .eq("is_published", true)
    .neq("id", post.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const relatedPosts = (relatedPostsData ?? []) as RelatedPostRow[];

  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const relativeTime = safeCreatedAt ? formatRelativeTime(safeCreatedAt, locale) : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: displayTitle,
    description: displayContent.replace(/\n+/g, " ").trim().slice(0, 200) || undefined,
    datePublished: post.created_at ?? undefined,
    dateModified: post.created_at ?? undefined,
    author: author?.username
      ? { "@type": "Person", name: author.display_name ?? author.username }
      : { "@type": "Organization", name: "creepy hub" },
    publisher: {
      "@type": "Organization",
      name: "creepy hub",
      url: "https://creepyhub.com",
    },
    ...(post.image_url && !postIsSensitive ? { image: post.image_url } : {}),
    url: `${BASE_URL}${postUrl(locale, post.id, post.slug)}`,
    inLanguage: locale === "en" ? "en" : "ja",
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostReadTracker id={String(post.id)} />
      <SidebarAd />

      <div className={styles.shell}>
        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <Link href={`/${locale}`} className={styles.backBtn} aria-label="Back">
            ←
          </Link>
          <h1 className={styles.topBarTitle}>{displayTitle}</h1>
        </div>

        {/* ── Post body ── */}
        <div className={styles.postBody}>
          {/* Author row */}
          <div className={styles.authorRow}>
            {author?.avatar_url ? (
              <Link href={`/${locale}/u/${author.username}`}>
                <img
                  src={author.avatar_url}
                  alt={author.display_name ?? author.username ?? ""}
                  className={styles.authorAvatar}
                />
              </Link>
            ) : (
              <div className={styles.authorAvatarPlaceholder}><PersonIcon size={22} /></div>
            )}

            <div className={styles.authorInfo}>
              <div className={styles.authorNameRow}>
                {author?.username ? (
                  <>
                    <Link
                      href={`/${locale}/u/${author.username}`}
                      className={styles.authorDisplayName}
                    >
                      {author.display_name ?? author.username}
                    </Link>
                    <span className={styles.authorUsername}>
                      @{author.username}
                    </span>
                  </>
                ) : (
                  <span className={styles.authorDisplayName}>
                    {dict.post.unknownAuthor}
                  </span>
                )}
                {relativeTime && (
                  <span className={styles.authorTime}>・{relativeTime}</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <PostActionButtons
                postId={post.id}
                authorId={post.user_id}
                locale={locale}
                labels={{
                  edit: dict.common.edit,
                  delete: dict.common.delete,
                  deleting: dict.common.deleting,
                  deleteConfirm: dict.common.deleteConfirmStory,
                  deleteFailed: dict.common.deleteFailed,
                }}
              />
              <AdminSensitiveToggle
                postId={post.id}
                initialIsSensitive={post.is_sensitive ?? false}
                labels={{
                  adminLabel: dict.sensitive.adminLabel,
                  on: dict.sensitive.adminOn,
                  off: dict.sensitive.adminOff,
                  updating: dict.sensitive.adminUpdating,
                  updateError: dict.sensitive.adminUpdateError,
                }}
              />
            </div>
          </div>

          {/* Post title */}
          <h2 className={styles.postTitle}>{displayTitle}</h2>

          {/* Images */}
          {imageUrls.length > 0 && (
            <div className={styles.postImageWrap}>
              <PostImageGallery
                imageUrls={imageUrls}
                title={displayTitle}
                isSensitive={post.is_sensitive ?? false}
                ownerId={post.user_id}
                sensitiveDict={{
                  reveal: dict.sensitive.reveal,
                  hide: dict.sensitive.hide,
                  overlay: dict.sensitive.overlay,
                  ageGatePrompt: dict.sensitive.ageGatePrompt,
                  ageGateConfirm: dict.sensitive.ageGateConfirm,
                  ageGateCancel: dict.sensitive.ageGateCancel,
                }}
              />
            </div>
          )}

          {/* Video */}
          {post.stream_video_id ? (
            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
              <div style={{
                position: "relative",
                width: "100%",
                maxWidth: 340,
                aspectRatio: "9/16",
                borderRadius: 8,
                overflow: "hidden",
                background: "#000",
                border: "1px solid rgba(161,102,108,0.18)",
              }}>
                <iframe
                  src={`https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${post.stream_video_id}/iframe`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          ) : post.video_url ? (
            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
              <video
                src={post.video_url}
                controls
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  maxWidth: 340,
                  aspectRatio: "9/16",
                  borderRadius: 8,
                  background: "#000",
                  border: "1px solid rgba(161,102,108,0.18)",
                }}
              />
            </div>
          ) : null}

          {/* Post content */}
          <div className={styles.postContent}>
            <AutoLinkedWikiContent html={postHtml} />
          </div>

          <InArticleAd />

          {/* Stats row */}
          <div className={styles.statsRow}>
            <span>
              {safeCreatedAt
                ? new Date(safeCreatedAt).toLocaleString(dateLocale)
                : dict.post.unknownDate}
            </span>
            <span className={styles.statsDot}>・</span>
            <span>
              {dict.post.views}: {displayedViewCount}
            </span>
          </div>

          {/* Mini map (only if post has lat/lng) */}
          {post.lat != null && post.lng != null && (
            <PostMiniMap
              lat={post.lat}
              lng={post.lng}
              mapCategory={(post.map_category as SpotCategory | null) ?? "haunted"}
              locationName={post.location_name}
              mapHref={`/${locale}/map?focus=${post.id}&lat=${post.lat}&lng=${post.lng}`}
              openLabel={dict.post.viewOnMap}
            />
          )}

          {/* Action bar */}
          <div className={styles.actionBar}>
            <div className={styles.actionItem}>
              <PostVoteButtons
                postId={post.id}
                initialScore={initialScore}
                labels={{
                  upvote: dict.common.upvote,
                  rateLoginRequired: dict.common.rateLoginRequired,
                  rateRevokeFailed: dict.common.rateRevokeFailed,
                  rateFailed: dict.common.rateFailed,
                }}
              />
            </div>

            <div className={styles.actionItem}>
              <PostBookmarkButton
                postId={post.id}
                labels={{
                  loginRequired: dict.common.loginRequired,
                  save: dict.common.save,
                  saved: dict.common.saved,
                  bookmark: dict.common.bookmark,
                  unbookmark: dict.common.unbookmark,
                }}
              />
            </div>

            <div className={styles.actionItem}>
              <TranslateButton
                type="story"
                id={post.id}
                locale={locale}
                hasTranslation={hasEnglishTranslation}
                labels={dict.post}
                slug={post.slug ?? undefined}
              />
            </div>
          </div>

          {/* Management row (report) */}
          <div className={styles.mgmtRow}>
            <div className={styles.mgmtLeft}>
              <Link
                href={`/${locale}`}
                style={{
                  fontSize: "12px",
                  color: "rgba(180, 130, 110, 0.5)",
                  textDecoration: "none",
                }}
              >
                {dict.post.backToHome}
              </Link>
            </div>
            <div className={styles.mgmtRight}>
              <ReportButton
                reportUrl={`/api/post/${post.id}/report`}
                labels={{
                  report: dict.common.reportThisPost,
                  reportAccepted: dict.common.reportAccepted,
                  reportLoginRequired: dict.common.reportLoginRequired,
                  reporting: dict.common.reporting,
                  retry: dict.common.retry,
                }}
              />
            </div>
          </div>
        </div>

        {/* Ad */}
        <ResponsiveAd pc="rectangle" sp="sp-banner" />

        {/* Comments */}
        <div className={styles.commentsWrap}>
          <PostComments
            postId={post.id}
            locale={locale}
            labels={{
              comment: dict.common.comment,
              commentSubtitle: dict.common.commentSubtitle,
              commentWritePlaceholder: dict.common.commentWritePlaceholder,
              commentLoginRequired: dict.common.commentLoginRequired,
              commentPosting: dict.common.commentPosting,
              commentSubmit: dict.common.commentSubmit,
              commentLoading: dict.common.commentLoading,
              noComments: dict.common.noComments,
              reply: dict.common.reply,
              replyPlaceholder: dict.common.replyPlaceholder,
              cancel: dict.common.cancel,
              replyPosting: dict.common.replyPosting,
              replySubmit: dict.common.replySubmit,
            }}
          />
        </div>

        {relatedPosts.length > 0 && (
          <section className={styles.relatedSection}>
            <h3 className={styles.relatedTitle}>
              {locale === "en" ? "Related Posts" : "関連記事"}
            </h3>
            <div className={styles.relatedGrid}>
              {relatedPosts.map((rp) => (
                <Link key={rp.id} href={postUrl(locale, rp.id, rp.slug)} className={styles.relatedCard}>
                  {rp.image_url ? (
                    <img src={rp.image_url} alt={rp.title ?? ""} className={styles.relatedCardImg} />
                  ) : (
                    <div className={styles.relatedCardImgPlaceholder} />
                  )}
                  <div className={styles.relatedCardBody}>
                    <h4 className={styles.relatedCardTitle}>{rp.title}</h4>
                    <p className={styles.relatedCardText}>
                      {rp.created_at
                        ? new Date(rp.created_at).toLocaleDateString(dateLocale)
                        : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Ad */}
        <ResponsiveAd pc="leaderboard" sp="sp-banner" />
      </div>
    </main>
  );
}
