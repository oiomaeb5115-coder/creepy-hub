import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import { postUrl } from "@/lib/postUrl";
import styles from "./page.module.css";
import HomeAuthButtons from "./HomeAuthButtons";
import AdminPendingSection from "@/components/AdminPendingSection";
import InlineVoteButtons from "@/components/InlineVoteButtons";

export const revalidate = 60;

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

type VoteRow = {
  vote_type: number | null;
};

type CommentRow = {
  id: number;
};

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
  post_votes?: VoteRow[];
  post_comments?: CommentRow[];
  author?: AuthorProfile | null;
};

type WikiPost = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  page_type: string;
  updated_at: string | null;
  view_count: number | null;
  image_url: string | null;
};

type StoryCategoryRow = {
  id: number;
  slug: string;
  name: string;
  name_en: string | null;
};

type WikiCategoryRow = {
  id: number;
  slug: string;
  name: string;
};

const wikiPageTypeKeys = [
  "urban_legend",
  "incident",
  "work",
  "term",
  "person",
  "region",
] as const;

function StorySearchBox({
  locale,
  placeholder,
  buttonLabel,
}: {
  locale: string;
  placeholder: string;
  buttonLabel: string;
}) {
  return (
    <form
      action={`/${locale}/post/search`}
      method="get"
      className={styles.searchForm}
    >
      <input
        type="text"
        name="q"
        placeholder={placeholder}
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchButton}>
        {buttonLabel}
      </button>
    </form>
  );
}

function WikiSearchBox({
  locale,
  placeholder,
  buttonLabel,
}: {
  locale: string;
  placeholder: string;
  buttonLabel: string;
}) {
  return (
    <form
      action={`/${locale}/wiki/search`}
      method="get"
      className={styles.searchForm}
    >
      <input
        type="text"
        name="q"
        placeholder={placeholder}
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchButton}>
        {buttonLabel}
      </button>
    </form>
  );
}

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

  const score = (post.post_votes ?? []).reduce(
    (sum: number, vote: VoteRow) => sum + (vote.vote_type ?? 0),
    0
  );

  const commentCount = (post.post_comments ?? []).length;

  const imageUrls = [post.image_url, post.image_url_2, post.image_url_3]
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  const authorName = post.author?.display_name || post.author?.username || null;

  return (
    <Link href={postUrl(locale, post.id, post.slug)} className={styles.gridCardLink}>
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
          <span>💬 {commentCount}</span>
          <span>👁 {post.view_count ?? 0}</span>
        </div>
      </article>
    </Link>
  );
}

function WikiCard({
  item,
  locale,
  pageTypeLabel,
  unknownDate,
  noSummary,
}: {
  item: WikiPost;
  locale: string;
  pageTypeLabel: string;
  unknownDate: string;
  noSummary: string;
}) {
  const safeUpdatedAt = item.updated_at ?? "";
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  return (
    <Link href={`/${locale}/wiki/${item.slug}`} className={styles.scrollCardLink}>
      <article className={styles.scrollCard}>
        <div className={styles.scrollCardImageWrap}>
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className={styles.scrollCardImage}
              loading="lazy"
            />
          ) : (
            <div
              className={`${styles.scrollCardImage} ${styles.scrollCardImagePlaceholder}`}
            >
              WIKI
            </div>
          )}
        </div>

        <div className={styles.scrollCardBody}>
          <div className={styles.scrollCardMeta}>
            <span>{pageTypeLabel}</span>
            <span>
              {safeUpdatedAt
                ? new Date(safeUpdatedAt).toLocaleDateString(dateLocale)
                : unknownDate}
            </span>
          </div>

          <h3 className={styles.scrollCardTitle}>{item.title}</h3>

          <p className={styles.scrollCardExcerpt}>
            {item.summary ?? noSummary}
          </p>

          <div className={styles.scrollCardFooter}>
            <span>👁 {item.view_count ?? 0}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const storiesQuery = locale === "en"
    ? supabase
        .from("post")
        .select(`
          id,
          title,
          content,
          created_at,
          image_url,
          image_url_2,
          image_url_3,
          view_count,
          user_id,
          slug,
          post_votes(vote_type),
          post_comments(id),
          post_translations!inner(title, content)
        `)
        .eq("is_published", true)
        .eq("post_translations.locale", "en")
        .order("created_at", { ascending: false })
        .limit(12)
    : supabase
        .from("post")
        .select(`
          id,
          title,
          content,
          created_at,
          image_url,
          image_url_2,
          image_url_3,
          view_count,
          user_id,
          slug,
          post_votes(vote_type),
          post_comments(id)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(12);

  const [latestStoriesResult, latestWikiResult, storyCategoriesResult, wikiCategoriesResult] = await Promise.all([
    storiesQuery,

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, updated_at, view_count, image_url")
      .eq("locale", locale)
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(12),

    supabase
      .from("story_categories")
      .select("id, slug, name, name_en")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20),

    supabase
      .from("categories")
      .select("id, slug, name")
      .eq("locale", locale)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const rawStories = (latestStoriesResult.data ?? []).map((p: any) => ({
    id: p.id,
    title: locale === "en" ? (p.post_translations?.[0]?.title ?? p.title) : p.title,
    content: locale === "en" ? (p.post_translations?.[0]?.content ?? p.content) : p.content,
    created_at: p.created_at,
    image_url: p.image_url,
    image_url_2: p.image_url_2,
    image_url_3: p.image_url_3,
    view_count: p.view_count,
    slug: p.slug as string | null,
    user_id: p.user_id as string | null,
    post_votes: p.post_votes,
    post_comments: p.post_comments,
    author: null as AuthorProfile | null,
  }));

  // Batch fetch profiles
  const userIds = [...new Set(rawStories.map((p) => p.user_id).filter(Boolean))] as string[];
  let profilesMap: Record<string, AuthorProfile> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profilesData ?? []) {
      profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }

  const latestStories = rawStories.map((p) => ({
    ...p,
    author: p.user_id ? (profilesMap[p.user_id] ?? null) : null,
  })) as StoryPost[];
  const latestWiki = (latestWikiResult.data ?? []) as WikiPost[];
  const storyCategories = (storyCategoriesResult.data ?? []) as StoryCategoryRow[];
  const wikiCategories = (wikiCategoriesResult.data ?? []) as WikiCategoryRow[];

  return (
    <main className={styles.homePage}>
      <div className={styles.pageFrame}>
        {/* ── HERO ── */}
        <section className={styles.heroSection}>
          <div className={styles.heroTopButtons}>
            <HomeAuthButtons locale={locale} />
          </div>

          <div className={styles.heroInner}>
            <div className={styles.siteTitleWrap}>
              <h1 className={styles.siteTitleText}>
                CREEPY HUB
              </h1>
              <p className={styles.heroTagline}>{dict.meta.description}</p>
            </div>

            <div className={styles.topSearchRow}>
              <div className={styles.searchColumn}>
                <span className={styles.searchHeadingText}>{dict.home.storySearch}</span>
                <StorySearchBox
                  locale={locale}
                  placeholder={dict.home.storySearchPlaceholder}
                  buttonLabel={dict.home.searchButton}
                />
              </div>

              <div className={styles.searchColumn}>
                <span className={styles.searchHeadingText}>{dict.home.wikiSearch}</span>
                <WikiSearchBox
                  locale={locale}
                  placeholder={dict.home.wikiSearchPlaceholder}
                  buttonLabel={dict.home.searchButton}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className={styles.twoColLayout}>
          {/* ── MAIN COLUMN ── */}
          <div className={styles.mainCol}>
            {/* CREEPY POSTS - Card Grid */}
            <section className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.textSectionTitle}>
                  <span className={styles.textSectionTitleEn}>CREEPY POSTS</span>
                  <span className={styles.textSectionTitleJa}>{dict.home.latestStories}</span>
                </div>
                <Link href={`/${locale}/post`} className={styles.seeAllLink}>
                  {locale === "en" ? "VIEW ALL" : "すべて見る"} →
                </Link>
              </div>

              {latestStories.length === 0 ? (
                <p className={styles.emptyText}>{dict.home.noStories}</p>
              ) : (
                <div className={styles.cardGrid}>
                  {latestStories.map((post) => (
                    <StoryCardGrid
                      key={post.id}
                      post={post}
                      locale={locale}
                      storyLabel={dict.post.label}
                      unknownDate={dict.post.unknownDate}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* OCCULT WIKI - Horizontal Scroll */}
            <section className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.textSectionTitle}>
                  <span className={styles.textSectionTitleEn}>OCCULT WIKI</span>
                  <span className={styles.textSectionTitleJa}>{dict.home.latestWiki}</span>
                </div>
                <Link href={`/${locale}/wiki`} className={styles.seeAllLink}>
                  {locale === "en" ? "VIEW ALL" : "すべて見る"} →
                </Link>
              </div>

              {latestWiki.length === 0 ? (
                <p className={styles.emptyText}>{dict.home.noWiki}</p>
              ) : (
                <div className={styles.horizontalScrollRow}>
                  {latestWiki.map((item) => (
                    <WikiCard
                      key={item.id}
                      item={item}
                      locale={locale}
                      pageTypeLabel={
                        dict.pageType[item.page_type as keyof typeof dict.pageType] ??
                        item.page_type
                      }
                      unknownDate={dict.post.unknownDate}
                      noSummary={dict.wiki.noSummary}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── SIDEBAR ── */}
          <aside className={styles.sideCol}>
            {/* Story Categories */}
            <div className={styles.sidePanel}>
              <h3 className={styles.sidePanelTitle}>CATEGORIES</h3>
              <p className={styles.sidePanelSub}>CREEPY POSTS</p>
              <div className={styles.sideCategoryList}>
                {storyCategories.length === 0 ? (
                  <span className={styles.categoryEmpty}>{dict.home.noCategory}</span>
                ) : (
                  storyCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/${locale}/post/category/${cat.slug}`}
                      className={styles.sideCategoryItem}
                    >
                      {locale === "en" ? (cat.name_en ?? cat.name) : cat.name}
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Wiki Categories */}
            <div className={styles.sidePanel}>
              <p className={styles.sidePanelSub}>OCCULT WIKI</p>
              <div className={styles.sideCategoryList}>
                {wikiPageTypeKeys.map((key) => (
                  <Link
                    key={key}
                    href={`/${locale}/wiki/category/${key}`}
                    className={styles.sideCategoryItem}
                  >
                    {dict.pageType[key]}
                  </Link>
                ))}
                {wikiCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/${locale}/wiki/category/${cat.slug}`}
                    className={styles.sideCategoryItem}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <AdminPendingSection
          locale={locale}
          labels={{
            adminSection: dict.common.adminSection,
            adminLink: dict.common.adminLink,
            storyLabel: dict.admin.storyLabel,
            wikiLabel: dict.admin.wikiLabel,
          }}
        />
      </div>
    </main>
  );
}
