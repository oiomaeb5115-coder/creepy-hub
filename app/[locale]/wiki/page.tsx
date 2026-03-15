import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./wiki.module.css";
import BackButton from "@/components/BackButton";

type WikiIndexPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

type WikiPageRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  page_type: string;
  locale: string;
  view_count: number | null;
  updated_at: string | null;
  is_published: boolean;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

const pageTypeLabels: Record<string, string> = {
  general: "一般",
  urban_legend: "都市伝説",
  incident: "怪事件",
  work: "作品",
  term: "用語",
  person: "人物",
  region: "地域",
};

export default async function WikiIndexPage({ params, searchParams }: WikiIndexPageProps) {
  const { locale } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";
  const orderCol = isPopular ? "view_count" : "updated_at";

  const [
    mainResult,
    categoriesResult,
    urbanLegendResult,
    incidentResult,
    workResult,
    termResult,
    personResult,
    regionResult,
  ] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .order(orderCol, { ascending: false })
      .limit(10),

    supabase
      .from("categories")
      .select("id, slug, name, description")
      .eq("locale", locale)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(8),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .eq("page_type", "urban_legend")
      .order(orderCol, { ascending: false })
      .limit(4),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .eq("page_type", "incident")
      .order(orderCol, { ascending: false })
      .limit(4),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .eq("page_type", "work")
      .order(orderCol, { ascending: false })
      .limit(4),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .eq("page_type", "term")
      .order(orderCol, { ascending: false })
      .limit(4),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .eq("page_type", "person")
      .order(orderCol, { ascending: false })
      .limit(4),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, locale, view_count, updated_at, is_published")
      .eq("locale", locale)
      .eq("is_published", true)
      .eq("page_type", "region")
      .order(orderCol, { ascending: false })
      .limit(4),
  ]);

  const mainItems = (mainResult.data ?? []) as WikiPageRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const pageTypeSections = [
    { key: "urban_legend", label: pageTypeLabels.urban_legend, items: (urbanLegendResult.data ?? []) as WikiPageRow[] },
    { key: "incident",     label: pageTypeLabels.incident,     items: (incidentResult.data ?? []) as WikiPageRow[] },
    { key: "work",         label: pageTypeLabels.work,         items: (workResult.data ?? []) as WikiPageRow[] },
    { key: "term",         label: pageTypeLabels.term,         items: (termResult.data ?? []) as WikiPageRow[] },
    { key: "person",       label: pageTypeLabels.person,       items: (personResult.data ?? []) as WikiPageRow[] },
    { key: "region",       label: pageTypeLabels.region,       items: (regionResult.data ?? []) as WikiPageRow[] },
  ];

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
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div>
            <p className={styles.wikiBreadcrumb}>OCCULT WIKI / ARCHIVE</p>
            <h1 className={styles.wikiTitle}>Occult Wiki</h1>
            <p className={styles.wikiSubtitle}>
              オカルト・都市伝説・怪事件・作品・人物・用語を整理する情報アーカイブ
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>ホーム</Link>
            <Link href={`/${locale}/wiki/random`} className={styles.topLink}>ランダム</Link>
            <Link href={`/${locale}/wiki/submit`} className={styles.topLink}>Wiki作成</Link>
          </div>
        </header>

        {/* Category filter */}
        <div className={styles.categoryBar}>
          <Link href={`/${locale}/wiki`} className={styles.categoryChip}>
            すべて
          </Link>
          {Object.entries(pageTypeLabels)
            .filter(([key]) => key !== "general")
            .map(([key, label]) => (
              <Link
                key={key}
                href={`/${locale}/wiki/category/${key}`}
                className={styles.categoryChip}
              >
                {label}
              </Link>
            ))}
        </div>

        {/* Search */}
        <form action={`/${locale}/wiki/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            placeholder="Wikiを検索..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>検索</button>
        </form>

        {/* Main feed with sort toggle */}
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Wiki 記事</h2>
          </div>

          <div className={styles.sortTabs}>
            <Link
              href={`/${locale}/wiki?sort=new`}
              className={`${styles.sortTab} ${!isPopular ? styles.sortTabActive : ""}`}
            >
              新着順
            </Link>
            <Link
              href={`/${locale}/wiki?sort=popular`}
              className={`${styles.sortTab} ${isPopular ? styles.sortTabActive : ""}`}
            >
              人気順
            </Link>
          </div>

          {mainItems.length === 0 ? (
            <p className={styles.emptyText}>公開中の wiki 記事はまだありません。</p>
          ) : (
            <div className={styles.feed}>
              {mainItems.map((item) => (
                <Link key={item.id} href={`/${locale}/wiki/${item.slug}`} className={styles.feedRow}>
                  <div className={styles.feedLeft}>
                    <span className={styles.typeBadge}>
                      {pageTypeLabels[item.page_type] ?? item.page_type}
                    </span>
                  </div>
                  <div className={styles.feedContent}>
                    <h3 className={styles.feedTitle}>{item.title}</h3>
                    <p className={styles.feedSummary}>
                      {item.summary ?? "概要はまだ設定されていません。"}
                    </p>
                    <div className={styles.feedMeta}>
                      <span>👁 {item.view_count ?? 0}</span>
                    </div>
                  </div>
                  <div className={styles.feedRight}>
                    <span className={styles.feedDate}>
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString("ja-JP")
                        : "—"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Type sections */}
        {pageTypeSections.map((section) =>
          section.items.length === 0 ? null : (
            <section className={styles.card} key={section.key}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{section.label}</h2>
                <span className={styles.sectionDescription}>
                  {isPopular ? "人気順" : "新着順"}
                </span>
              </div>
              <div className={styles.feed}>
                {section.items.map((item) => (
                  <Link key={item.id} href={`/${locale}/wiki/${item.slug}`} className={styles.feedRow}>
                    <div className={styles.feedLeft}>
                      <span className={styles.typeBadge}>{section.label}</span>
                    </div>
                    <div className={styles.feedContent}>
                      <h3 className={styles.feedTitle}>{item.title}</h3>
                      <p className={styles.feedSummary}>
                        {item.summary ?? "概要はまだ設定されていません。"}
                      </p>
                      <div className={styles.feedMeta}>
                        <span>👁 {item.view_count ?? 0}</span>
                      </div>
                    </div>
                    <div className={styles.feedRight}>
                      <span className={styles.feedDate}>
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString("ja-JP")
                          : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        )}

        {/* Categories — bottom */}
        {categories.length > 0 && (
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>カテゴリ</h2>
              <span className={styles.sectionDescription}>分類から探す</span>
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
                    {category.description ?? "カテゴリ説明はまだありません。"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
