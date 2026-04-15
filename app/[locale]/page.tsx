import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./page.module.css";
import HomeAuthButtons from "./HomeAuthButtons";
import HomeContentTabs from "./HomeContentTabs";
import AdminPendingSection from "@/components/AdminPendingSection";
import { ResponsiveAd } from "@/components/NinjaAd";
import HeroLogo from "./HeroLogo";


export const revalidate = 300;

type HomePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string; period?: string; wiki_sort?: string }>;
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
  stream_video_id: string | null;
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


export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  const { sort, period, wiki_sort } = await searchParams;
  const isPopular = sort === "popular";
  const isWikiPopular = wiki_sort === "popular";
  const currentPeriod = (period === "today" || period === "3days" || period === "week" || period === "month") ? period : "today";
  const dict = await getDictionary(locale);

  const periodMs: Record<string, number> = {
    today: 24 * 60 * 60 * 1000,
    "3days": 3 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = new Date(Date.now() - periodMs[currentPeriod]).toISOString();

  let storiesQuery = supabaseAdmin
    .from("post_with_counts")
    .select(`
      id,
      title,
      content,
      created_at,
      image_url,
      image_url_2,
      image_url_3,
      stream_video_id,
      view_count,
      user_id,
      slug,
      vote_score,
      comment_count
    `)
    .eq("is_published", true);

  if (isPopular) {
    storiesQuery = storiesQuery
      .gte("created_at", cutoff)
      .order("vote_score", { ascending: false })
      .order("view_count", { ascending: false })
      .limit(12);
  } else {
    storiesQuery = storiesQuery
      .order("created_at", { ascending: false })
      .limit(12);
  }

  const [latestStoriesResult, latestWikiResult, storyCategoriesResult, wikiCategoriesResult] = await Promise.all([
    storiesQuery,

    supabaseAdmin
      .from("wiki_pages")
      .select("id, slug, title, summary, updated_at, view_count, image_url, author_id, vote_score, show_author")
      .eq("locale", locale)
      .eq("is_published", true)
      .order(isWikiPopular ? "vote_score" : "created_at", { ascending: false })
      .order(isWikiPopular ? "view_count" : "created_at", { ascending: false })
      .limit(12),

    supabaseAdmin
      .from("story_categories")
      .select("id, slug, name, name_en")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20),

    supabaseAdmin
      .from("categories")
      .select("id, slug, name")
      .eq("locale", locale)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const postsData = latestStoriesResult.data ?? [];
  const wikiData = latestWikiResult.data ?? [];
  const storyPostIds = postsData.map((p: any) => p.id);
  const postUserIds = postsData.map((p: any) => p.user_id).filter(Boolean);
  const wikiAuthorIds = wikiData.map((p: any) => p.author_id).filter(Boolean);
  const userIds = [...new Set([...postUserIds, ...wikiAuthorIds])] as string[];

  // 翻訳クエリとプロフィールクエリを並列実行
  const [translationsResult, profilesResult] = await Promise.all([
    locale === "en" && storyPostIds.length > 0
      ? supabaseAdmin
          .from("post_translations")
          .select("post_id, title, content")
          .eq("locale", "en")
          .in("post_id", storyPostIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabaseAdmin
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const storyTranslationsMap: Record<number, { title: string; content: string }> = {};
  for (const tr of translationsResult.data ?? []) {
    storyTranslationsMap[tr.post_id] = { title: tr.title, content: tr.content };
  }

  const profilesMap: Record<string, AuthorProfile> = {};
  for (const p of profilesResult.data ?? []) {
    profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
  }

  const latestStories = postsData.map((p: any) => {
    const tr = storyTranslationsMap[p.id] ?? null;
    return {
      id: p.id,
      title: tr?.title ?? p.title,
      content: tr?.content ?? p.content,
      created_at: p.created_at,
      image_url: p.image_url,
      image_url_2: p.image_url_2,
      image_url_3: p.image_url_3,
      stream_video_id: p.stream_video_id,
      view_count: p.view_count,
      slug: p.slug as string | null,
      user_id: p.user_id as string | null,
      vote_score: p.vote_score,
      comment_count: p.comment_count,
      author: p.user_id ? (profilesMap[p.user_id] ?? null) : null,
    };
  }) as StoryPost[];
  const latestWiki = wikiData.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    updated_at: p.updated_at,
    view_count: p.view_count,
    image_url: p.image_url,
    vote_score: p.vote_score,
    show_author: p.show_author ?? true,
    author: p.author_id ? (profilesMap[p.author_id] ?? null) : null,
  })) as WikiPost[];
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
            <HeroLogo />
            <div className={styles.siteTitleWrap}>
              <h1 className={styles.siteTitleText}>
                CREEPY HUB
              </h1>
              <p className={styles.heroTagline}>{dict.meta.description}</p>
            </div>

          </div>
        </section>

        {/* Ad */}
        <ResponsiveAd pc="leaderboard" sp="sp-banner" />

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className={styles.twoColLayout}>
          {/* ── MAIN COLUMN ── */}
          <div className={styles.mainCol}>
            <HomeContentTabs
              latestStories={latestStories}
              latestWiki={latestWiki}
              locale={locale}
              isPopular={isPopular}
              isWikiPopular={isWikiPopular}
              currentPeriod={currentPeriod}
              labels={{
                tabPosts: dict.home.tabPosts,
                tabFiles: dict.home.tabFiles,
                latestStories: dict.home.latestStories,
                latestWiki: dict.home.latestWiki,
                noStories: dict.home.noStories,
                noWiki: dict.home.noWiki,
                tabNew: dict.home.tabNew,
                tabPopular: dict.home.tabPopular,
                periodToday: dict.home.periodToday,
                period3days: dict.home.period3days,
                periodWeek: dict.home.periodWeek,
                periodMonth: dict.home.periodMonth,
                storyLabel: dict.post.label,
                unknownDate: dict.post.unknownDate,
                noSummary: dict.wiki.noSummary,
                viewAll: locale === "en" ? "VIEW ALL" : "すべて見る",
              }}
            />
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
              <p className={styles.sidePanelSub}>OCCULT FILES</p>
              <div className={styles.sideCategoryList}>
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
