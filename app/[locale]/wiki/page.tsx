import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./wiki.module.css";
import BackButton from "@/components/BackButton";
import CategorySidebar from "@/components/CategorySidebar";
import FavoriteSidebar from "@/components/FavoriteSidebar";

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
  const orderCol = isPopular ? "view_count" : "updated_at";
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const [mainResult, categoriesResult] = await Promise.all([
    supabaseAdmin
      .from("wiki_pages")
      .select("id, slug, title, summary, locale, view_count, updated_at, is_published, image_url")
      .eq("locale", locale)
      .eq("is_published", true)
      .order(orderCol, { ascending: false })
      .limit(20),

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
        <h1 className={styles.wikiTitle}>Occult Wiki</h1>
        <p className={styles.wikiSubtitle}>{dict.wiki.subtitle}</p>
      </div>
      <div className={styles.pageLayout}>
      <CategorySidebar
        title="OCCULT WIKI"
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
            <p className={styles.wikiBreadcrumb}>OCCULT WIKI / ARCHIVE</p>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki/random`} className={`${styles.topLink} ${styles.topLinkAccent}`}>{dict.wiki.random}</Link>
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
                return (
                  <Link key={item.id} href={`/${locale}/wiki/${item.slug}`} className={styles.feedRow}>
                    <div className={styles.feedContent}>
                      <span className={styles.feedDate}>{dateStr}</span>
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
                        <span>👁 {item.view_count ?? 0} {dict.post.views}</span>
                      </div>
                    </div>
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
      </div>
      </div>
    </main>
  );
}
