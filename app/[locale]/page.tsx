import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./page.module.css";
import HomeAuthButtons from "./HomeAuthButtons";
import BottomNavProfileLink from "./BottomNavProfileLink";

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

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  view_count: number | null;
  post_votes?: VoteRow[];
  post_comments?: CommentRow[];
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
      action={`/${locale}/story/search`}
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

function StoryCard({
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

  return (
    <Link href={`/${locale}/story/${post.id}`} className={styles.scrollCardLink}>
      <article className={styles.scrollCard}>
        <div className={styles.scrollCardImageWrap}>
          {post.image_url ? (
            <img
              src={post.image_url}
              alt={safeTitle}
              className={styles.scrollCardImage}
              loading="lazy"
            />
          ) : (
            <div
              className={`${styles.scrollCardImage} ${styles.scrollCardImagePlaceholder}`}
            >
              NO IMAGE
            </div>
          )}
        </div>

        <div className={styles.scrollCardBody}>
          <div className={styles.scrollCardMeta}>
            <span>{storyLabel}</span>
            <span>
              {safeCreatedAt
                ? new Date(safeCreatedAt).toLocaleDateString(dateLocale)
                : unknownDate}
            </span>
          </div>

          <h3 className={styles.scrollCardTitle}>{safeTitle}</h3>

          <p className={styles.scrollCardExcerpt}>
            {safeContent.length > 80 ? `${safeContent.slice(0, 80)}...` : safeContent}
          </p>

          <div className={styles.scrollCardFooter}>
            <span>▲ {score}</span>
            <span>💬 {commentCount}</span>
            <span>👁 {post.view_count ?? 0}</span>
          </div>
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

  const [latestStoriesResult, latestWikiResult, storyCategoriesResult] = await Promise.all([
    supabase
      .from("post")
      .select(`
        id,
        title,
        content,
        created_at,
        image_url,
        view_count,
        post_votes(vote_type),
        post_comments(id)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, updated_at, view_count, image_url")
      .eq("locale", locale)
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(12),

    supabase
      .from("story_categories")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20),
  ]);

  const latestStories = (latestStoriesResult.data ?? []) as StoryPost[];
  const latestWiki = (latestWikiResult.data ?? []) as WikiPost[];
  const storyCategories = (storyCategoriesResult.data ?? []) as StoryCategoryRow[];

  return (
    <main className={styles.homePage}>
      <div className={styles.pageFrame}>
        <section className={styles.heroSection}>
          <div className={styles.heroTopButtons}>
            <HomeAuthButtons locale={locale} />
          </div>

          <div className={styles.heroInner}>
            <div className={styles.siteTitleWrap}>
              <h1 className={styles.siteTitleText}>
                CREEPY<span className={styles.siteTitleDot}>.</span>HUB
              </h1>
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

        <section className={styles.contentSection}>
          <div className={styles.textSectionTitle}>
            <span className={styles.textSectionTitleEn}>CREEPY POSTS</span>
            <span className={styles.textSectionTitleJa}>{dict.home.latestStories}</span>
          </div>

          {latestStories.length === 0 ? (
            <p className={styles.emptyText}>{dict.home.noStories}</p>
          ) : (
            <div className={styles.horizontalScrollRow}>
              {latestStories.map((post) => (
                <StoryCard
                  key={post.id}
                  post={post}
                  locale={locale}
                  storyLabel={dict.story.label}
                  unknownDate={dict.story.unknownDate}
                />
              ))}
            </div>
          )}
        </section>

        <section className={styles.contentSection}>
          <div className={styles.textSectionTitle}>
            <span className={styles.textSectionTitleEn}>OCCULT WIKI</span>
            <span className={styles.textSectionTitleJa}>{dict.home.latestWiki}</span>
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
                  unknownDate={dict.story.unknownDate}
                  noSummary={dict.wiki.noSummary}
                />
              ))}
            </div>
          )}
        </section>

        {/* Category section */}
        <section className={styles.contentSection}>
          <div className={styles.textSectionTitle}>
            <span className={styles.textSectionTitleEn}>CATEGORIES</span>
            <span className={styles.textSectionTitleJa}>{dict.home.categories}</span>
          </div>

          <div className={styles.categoryBlock}>
            <p className={styles.categoryBlockLabel}>CREEPY POSTS</p>
            <div className={styles.categoryChipRow}>
              {storyCategories.length === 0 ? (
                <span className={styles.categoryEmpty}>{dict.home.noCategory}</span>
              ) : (
                storyCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/${locale}/story/category/${cat.slug}`}
                    className={styles.categoryChip}
                  >
                    {cat.name}
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className={styles.categoryBlock}>
            <p className={styles.categoryBlockLabel}>OCCULT WIKI</p>
            <div className={styles.categoryChipRow}>
              {wikiPageTypeKeys.map((key) => (
                <Link
                  key={key}
                  href={`/${locale}/wiki/category/${key}`}
                  className={styles.categoryChip}
                >
                  {dict.pageType[key]}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <nav className={styles.bottomNav}>
          <Link href={`/${locale}`} className={styles.bottomNavItem}>
            <span className={styles.bottomNavLabel}>
              <span className={styles.bottomNavLabelEn}>HOME</span>
              <span className={styles.bottomNavLabelJa}>{dict.nav.home}</span>
            </span>
          </Link>

          <Link href={`/${locale}/story`} className={styles.bottomNavItem}>
            <span className={styles.bottomNavLabel}>
              <span className={styles.bottomNavLabelEn}>CREEPY POSTS</span>
              <span className={styles.bottomNavLabelJa}>{dict.nav.stories}</span>
            </span>
          </Link>

          <Link href={`/${locale}/wiki`} className={styles.bottomNavItem}>
            <span className={styles.bottomNavLabel}>
              <span className={styles.bottomNavLabelEn}>WIKI</span>
              <span className={styles.bottomNavLabelJa}>{dict.nav.wiki}</span>
            </span>
          </Link>

          <BottomNavProfileLink locale={locale} />
        </nav>
      </div>

      <Link href={`/${locale}/post`} className={styles.floatingPostButton}>
        <Image src="/images/ui/post.png" alt="POST" width={68} height={68} />
      </Link>
    </main>
  );
}
