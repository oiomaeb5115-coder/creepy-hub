import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./wiki.module.css";
import BackButton from "@/components/BackButton";
import CategorySidebar from "@/components/CategorySidebar";
import FavoriteSidebar from "@/components/FavoriteSidebar";
import ViewIcon from "@/components/icons/ViewIcon";
import ImpressionTracker from "@/components/ImpressionTracker";
import InlineWikiVoteButtons from "@/components/InlineWikiVoteButtons";

export const revalidate = 300;

type WikiIndexPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: WikiIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: { absolute: dict.meta.wikiTitle },
    description: dict.meta.wikiDescription,
  };
}

type AuthorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type WikiPageRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  locale: string;
  view_count: number | null;
  updated_at: string | null;
  is_published: boolean;
  image_url: string | null;
  author_id: string | null;
  vote_score: number | null;
  show_author: boolean;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
};

export default async function WikiIndexPage({ params, searchParams }: WikiIndexPageProps) {
  const { locale } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  let wikiQuery = supabaseAdmin
    .from("wiki_pages")
    .select("id, slug, title, summary, locale, view_count, updated_at, is_published, image_url, author_id, vote_score, show_author")
    .eq("locale", locale)
    .eq("is_published", true);

  if (isPopular) {
    wikiQuery = wikiQuery
      .order("vote_score", { ascending: false })
      .order("view_count", { ascending: false });
  } else {
    wikiQuery = wikiQuery.order("updated_at", { ascending: false });
  }

  const [mainResult, categoriesResult] = await Promise.all([
    wikiQuery.limit(20),

    supabaseAdmin
      .from("categories")
      .select("id, slug, name, description, icon_url")
      .eq("locale", locale)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(30),
  ]);

  const mainItems = (mainResult.data ?? []) as WikiPageRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const authorIds = [...new Set(mainItems.map((p) => p.author_id).filter(Boolean))] as string[];
  const profilesResult = authorIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds)
    : { data: [] };
  const profilesMap: Record<string, AuthorProfile> = {};
  for (const p of profilesResult.data ?? []) {
    profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
  }

  if (mainResult.error) {
    return (
      <main className={styles.wikiPage}>
        <div className={styles.wikiShell}>
          <div className={styles.errorBox}>
            wiki の一覧取得に失敗しました: {mainResult.error.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wikiPage}>
      <div className={styles.pageHero}>
        <img src="/images/ui/auth-logo_2.webp" alt="" className={styles.pageTopLogo} />
        <h1 className={styles.wikiTitle}>Occult Files</h1>
        <p className={styles.wikiSubtitle}>{dict.wiki.subtitle}</p>
        <p className={styles.wikiInvitation}>{dict.wiki.invitation}</p>
      </div>
      <div className={styles.pageLayout}>
      <CategorySidebar
        title="OCCULT FILES"
        categories={categories.map((cat) => ({
          slug: cat.slug,
          name: cat.name,
          icon_url: cat.icon_url,
          href: `/${locale}/wiki/category/${cat.slug}`,
        }))}
      >
        <div style={{ marginTop: 8 }}>
          <FavoriteSidebar
            type="wiki"
            locale={locale}
            labels={{ title: dict.common.favoriteSidebar, empty: dict.common.favoriteNone }}
            embedded
          />
        </div>
      </CategorySidebar>
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div>
            <p className={styles.wikiBreadcrumb}>OCCULT FILES / ARCHIVE</p>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki/submit`} className={styles.topLink}>{dict.wiki.submit}</Link>
          </div>
        </header>

        {/* Search */}
        <form action={`/${locale}/wiki/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            placeholder={dict.wiki.searchPlaceholder}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>{dict.home.searchButton}</button>
        </form>

        {/* Category filter */}
        <div className={styles.categoryBar}>
          <Link href={`/${locale}/wiki`} className={styles.categoryChip}>
            {dict.wiki.all}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/wiki/category/${cat.slug}`}
              className={styles.categoryChip}
            >
              {cat.name}
            </Link>
          ))}
          <Link href={`/${locale}/wiki/categories`} className={styles.categoryChipMore}>
            {dict.wiki.allCategories}
          </Link>
        </div>
        <div style={{ marginTop: "8px" }}>
          <Link href={`/${locale}/wiki/category/create`} className={styles.categoryChipNew}>
            {dict.wiki.createCategory}
          </Link>
        </div>

        {/* Sort toggle */}
        <div className={styles.sortTabs}>
          <Link
            href={`/${locale}/wiki?sort=new`}
            className={`${styles.sortTab} ${!isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.wiki.newest}
          </Link>
          <Link
            href={`/${locale}/wiki?sort=popular`}
            className={`${styles.sortTab} ${isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.wiki.popular}
          </Link>
        </div>

        {/* Main feed */}
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{dict.wiki.listTitle}</h2>
          </div>

          {mainItems.length === 0 ? (
            <p className={styles.emptyText}>{dict.wiki.empty}</p>
          ) : (
            <div className={styles.feed}>
              {mainItems.map((item) => {
                const dateStr = item.updated_at
                  ? new Date(item.updated_at).toLocaleDateString(dateLocale)
                  : "—";
                const showAuthor = item.show_author;
                const author = showAuthor && item.author_id ? (profilesMap[item.author_id] ?? null) : null;
                const authorName = author?.display_name || author?.username || null;
                return (
                  <Link key={item.id} href={`/${locale}/wiki/${item.slug}`} className={styles.feedRow}>
                    <ImpressionTracker type="wiki" id={item.id}>
                    <div className={styles.feedContent}>
                      {showAuthor ? (
                        <div className={styles.feedAuthorRow}>
                          {author?.avatar_url ? (
                            <img src={author.avatar_url} alt="" className={styles.feedAvatar} />
                          ) : (
                            <span className={styles.feedAvatarPlaceholder} />
                          )}
                          <span className={styles.feedAuthorName}>
                            {authorName ? `@${author?.username ?? authorName}` : (locale === "en" ? "Anonymous" : "匿名")}
                          </span>
                          <span className={styles.feedDate}>{dateStr}</span>
                        </div>
                      ) : (
                        <span className={styles.feedDate}>{dateStr}</span>
                      )}
                      <h3 className={styles.feedTitle}>{item.title}</h3>
                      <p className={styles.feedSummary}>
                        {item.summary ?? dict.wiki.noSummary}
                      </p>
                      {item.image_url && (
                        <div className={styles.feedImageWrap}>
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className={styles.feedImage}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className={styles.feedFooter}>
                        <InlineWikiVoteButtons wikiId={item.id} initialScore={item.vote_score ?? 0} />
                        <span className="stat-icon"><ViewIcon /> {item.view_count ?? 0} {dict.post.views}</span>
                      </div>
                    </div>
                    </ImpressionTracker>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{dict.wiki.categories}</h2>
              <span className={styles.sectionDescription}>{dict.wiki.browseByCategory}</span>
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${locale}/wiki/category/${category.slug}`}
                  className={styles.categoryLink}
                >
                  <p className={styles.categoryName}>{category.name}</p>
                  <p className={styles.categoryDesc}>
                    {category.description ?? dict.wiki.noCategoryDesc}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
        <div className={styles.bottomRandom}>
          <Link href={`/${locale}/wiki/random`}>{dict.wiki.random}</Link>
        </div>
      </div>
      </div>
    </main>
  );
}
