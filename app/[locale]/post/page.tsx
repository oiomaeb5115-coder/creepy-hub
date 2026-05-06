import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import { postUrl } from "@/lib/postUrl";
import { truncate, isTruncated } from "@/lib/truncate";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import CategorySidebar from "@/components/CategorySidebar";
import FavoriteSidebar from "@/components/FavoriteSidebar";
import InlineVoteButtons from "@/components/InlineVoteButtons";
import InlineCommentForm from "@/components/InlineCommentForm";
import ViewIcon from "@/components/icons/ViewIcon";
import ImpressionTracker from "@/components/ImpressionTracker";

export const revalidate = 300;

type Sort = "new" | "hot" | "top" | "viewed";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: { absolute: dict.meta.postTitle },
    description: dict.meta.postDescription,
  };
}

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
  stream_video_id: string | null;
  view_count: number | null;
  slug: string | null;
  vote_score: number | null;
  comment_count: number | null;
  author?: AuthorProfile | null;
};

type StoryCategoryRow = {
  id: number;
  slug: string;
  name: string;
  name_en: string | null;
  icon_url: string | null;
};

function normalizeSort(s: string | undefined): Sort {
  if (s === "hot" || s === "top" || s === "viewed" || s === "new") return s;
  // Backward compatibility — "popular" → "top"
  if (s === "popular") return "top";
  return "new";
}

export default async function StoryIndex({ params, searchParams }: Props) {
  const { locale } = await params;
  const spRaw = await searchParams;
  const sort: Sort = normalizeSort(spRaw.sort);
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  // ── Build query by sort ──
  let query = supabaseAdmin
    .from("post_with_counts")
    .select(
      "id, title, content, created_at, image_url, image_url_2, image_url_3, stream_video_id, view_count, user_id, slug, vote_score, comment_count"
    )
    .eq("is_published", true);

  if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "top") {
    query = query.order("vote_score", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "viewed") {
    query = query.order("view_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "hot") {
    // 直近72時間のエントリから score 降順
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", cutoff).order("vote_score", { ascending: false });
  }

  const { data: rawData, error: postError } = await query.limit(50);
  if (postError) console.error("[PostList] query error:", postError.message);

  const postIds = (rawData ?? []).map((p: any) => p.id);
  let translationsMap: Record<number, { title: string; content: string }> = {};
  if (locale === "en" && postIds.length > 0) {
    const { data: trData } = await supabaseAdmin
      .from("post_translations")
      .select("post_id, title, content")
      .eq("locale", "en")
      .in("post_id", postIds);
    for (const tr of trData ?? []) {
      translationsMap[tr.post_id] = { title: tr.title, content: tr.content };
    }
  }

  const rawPosts = (rawData ?? []).map((p: any) => {
    const tr = translationsMap[p.id] ?? null;
    return {
      id: p.id as number,
      title: (tr?.title ?? p.title) as string | null,
      content: (tr?.content ?? p.content) as string | null,
      created_at: p.created_at as string | null,
      image_url: p.image_url as string | null,
      image_url_2: p.image_url_2 as string | null,
      image_url_3: p.image_url_3 as string | null,
      stream_video_id: p.stream_video_id as string | null,
      view_count: p.view_count as number | null,
      slug: p.slug as string | null,
      user_id: p.user_id as string | null,
      vote_score: p.vote_score as number | null,
      comment_count: p.comment_count as number | null,
    };
  });

  const userIds = [...new Set(rawPosts.map((p) => p.user_id).filter(Boolean))] as string[];
  let profilesMap: Record<string, AuthorProfile> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profilesData ?? []) {
      profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }

  const posts: StoryPost[] = rawPosts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    created_at: p.created_at,
    image_url: p.image_url,
    image_url_2: p.image_url_2,
    image_url_3: p.image_url_3,
    stream_video_id: p.stream_video_id,
    view_count: p.view_count,
    slug: p.slug,
    vote_score: p.vote_score,
    comment_count: p.comment_count,
    author: p.user_id ? (profilesMap[p.user_id] ?? null) : null,
  }));

  // ── Categories ──
  const { data: categoriesData } = await supabaseAdmin
    .from("story_categories")
    .select("id, slug, name, name_en, icon_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(20);

  const categories = (categoriesData ?? []) as StoryCategoryRow[];

  // ── Total count (header) ──
  const { count: totalCount } = await supabaseAdmin
    .from("post_with_counts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  const sorts: { key: Sort; label: string }[] = [
    { key: "new", label: dict.post.sortNew ?? "NEW" },
    { key: "hot", label: dict.post.sortHot ?? "HOT" },
    { key: "top", label: dict.post.sortTop ?? "TOP" },
    { key: "viewed", label: dict.post.sortViewed ?? "VIEWED" },
  ];

  return (
    <main className={styles.storyPage}>
      <div className={styles.pageHero}>
        <img src="/images/ui/auth-logo_2.webp" alt="" className={styles.pageTopLogo} />
        <h1 className={styles.pageTitle}>POST</h1>
        <p className={styles.pageSubtitle}>怖いもの、こと、お話、なんでも投稿していい場所</p>
      </div>
      <div className={styles.pageLayout}>
        <CategorySidebar
          title="CREEPY POSTS"
          categories={categories.map((cat) => ({
            slug: cat.slug,
            name: locale === "en" ? (cat.name_en ?? cat.name) : cat.name,
            icon_url: cat.icon_url,
            href: `/${locale}/post/category/${cat.slug}`,
          }))}
        >
          <div style={{ marginTop: 8 }}>
            <FavoriteSidebar
              type="story"
              locale={locale}
              labels={{ title: dict.common.favoriteSidebar, empty: dict.common.favoriteNone }}
              embedded
            />
          </div>
        </CategorySidebar>

        <div className={styles.storyShell}>
          <BackButton />

          {/* Header with TOTAL and NEW STORY CTA */}
          <header className={styles.pageHeader}>
            <div>
              <p className={styles.breadcrumb}>POST / ARCHIVE</p>
              <p className={styles.totalLine}>
                {dict.post.total ?? "TOTAL"}{" "}
                <strong>{(totalCount ?? 0).toLocaleString()}</strong>
              </p>
            </div>
            <Link href={`/${locale}/post/new`} className={styles.ctaButton}>
              {dict.post.newStoryCta ?? "+ NEW STORY"}
            </Link>
          </header>

          {/* Search */}
          <form action={`/${locale}/post/search`} method="get" className={styles.searchBar}>
            <input
              type="text"
              name="q"
              placeholder={dict.post.searchPlaceholder}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>{dict.home.searchButton}</button>
          </form>

          {/* Category filter with ALL tab */}
          <div className={styles.categoryBar}>
            <Link
              href={`/${locale}/post`}
              className={`${styles.categoryChip} ${styles.categoryChipActive}`}
              aria-current="page"
            >
              {dict.post.all_ ?? dict.post.all}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/post/category/${cat.slug}`}
                className={styles.categoryChip}
              >
                {locale === "en" ? (cat.name_en ?? cat.name) : cat.name}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "8px" }}>
            <Link href={`/${locale}/category/create`} className={styles.categoryChipNew}>
              {dict.post.createCategory}
            </Link>
          </div>

          {/* Sort bar: NEW / HOT / TOP / VIEWED */}
          <div className={styles.sortTabs}>
            {sorts.map((s) => (
              <Link
                key={s.key}
                href={`/${locale}/post?sort=${s.key}`}
                className={`${styles.sortTab} ${sort === s.key ? styles.sortTabActive : ""}`}
                aria-current={sort === s.key ? "page" : undefined}
              >
                {s.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/post/following`}
              className={styles.sortTab}
            >
              {dict.post.following}
            </Link>
            <span className={styles.visibleCount}>
              <strong>{posts.length}</strong> {dict.post.visibleCount ?? "件表示中"}
            </span>
          </div>

          {posts.length === 0 ? (
            <p className={styles.emptyText}>{dict.post.empty}</p>
          ) : (
            <div className={styles.feed}>
              {posts.map((post) => {
                const safeTitle = post.title ?? dict.post.untitled;
                const safeContent = post.content ?? "";
                const dateStr = post.created_at
                  ? new Date(post.created_at).toLocaleDateString(dateLocale)
                  : dict.post.unknownDate;
                const thumb =
                  post.image_url ||
                  post.image_url_2 ||
                  post.image_url_3 ||
                  (post.stream_video_id
                    ? `https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${post.stream_video_id}/thumbnails/thumbnail.jpg?width=200&height=200&fit=crop`
                    : null);
                const authorName = post.author?.display_name || post.author?.username || null;
                const score = post.vote_score ?? 0;
                const commentCount = post.comment_count ?? 0;
                const isHot = score >= 10;
                const preview = truncate(safeContent, 250);
                const showMore = isTruncated(safeContent, 250);

                return (
                  <Link
                    key={post.id}
                    href={postUrl(locale, post.id, post.slug)}
                    className={styles.postRow}
                  >
                    <ImpressionTracker type="post" id={post.id}>
                      <div className={styles.postCard}>
                        <div className={styles.postThumb}>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className={styles.postThumbImg}
                              loading="lazy"
                            />
                          ) : (
                            <span className={styles.postThumbPlaceholder}>IMG</span>
                          )}
                          {isHot && <span className={styles.hotPill}>HOT</span>}
                          {post.stream_video_id && !post.image_url && (
                            <span className={styles.playBadge}>▶</span>
                          )}
                        </div>

                        <div className={styles.postContent}>
                          <div className={styles.postAuthorRow}>
                            {post.author?.avatar_url ? (
                              <img src={post.author.avatar_url} alt="" className={styles.postAvatar} />
                            ) : (
                              <span className={styles.postAvatarPlaceholder} />
                            )}
                            <span className={styles.postAuthorName}>
                              {authorName
                                ? `@${post.author?.username ?? authorName}`
                                : locale === "en"
                                ? "Anonymous"
                                : "匿名"}
                            </span>
                            <span className={styles.postDate}>{dateStr}</span>
                          </div>

                          <h3 className={styles.postTitle}>{safeTitle}</h3>

                          <p className={styles.postExcerpt}>
                            {preview}
                            {showMore && (
                              <span className={styles.moreLabel}>
                                {" "}
                                {dict.post.more ?? "→ MORE"}
                              </span>
                            )}
                          </p>

                          <div className={styles.postFooter}>
                            <InlineVoteButtons postId={post.id} initialScore={score} />
                            <InlineCommentForm postId={post.id} locale={locale} initialCount={commentCount} postTitle={safeTitle} />
                            <span className="stat-icon">
                              <ViewIcon /> {post.view_count ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </ImpressionTracker>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
