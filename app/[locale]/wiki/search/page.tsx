import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "../wiki.module.css";
import BackButton from "@/components/BackButton";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

type WikiPage = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  page_type: string;
  updated_at: string | null;
  view_count: number | null;
};

export default async function WikiSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = await searchParams;

  const keyword = `%${q}%`;

  const { data } = q
    ? await supabase
        .from("wiki_pages")
        .select("id,slug,title,summary,page_type,updated_at,view_count")
        .eq("locale", locale)
        .eq("is_published", true)
        .or(`title.ilike.${keyword},summary.ilike.${keyword},content.ilike.${keyword}`)
        .order("view_count", { ascending: false })
        .limit(30)
    : { data: [] };

  const pages = (data ?? []) as WikiPage[];

  return (
    <main className={styles.wikiPage}>
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div>
            <p className={styles.wikiBreadcrumb}>ARCHIVE / WIKI / SEARCH</p>
            <h1 className={styles.wikiTitle}>Wiki 検索</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>ホーム</Link>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>Wiki一覧</Link>
          </div>
        </header>

        <form action={`/${locale}/wiki/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Wikiを検索..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>検索</button>
        </form>

        {q && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8a7870" }}>
            「{q}」の検索結果：{pages.length} 件
          </p>
        )}

        <div className={styles.card}>
          {pages.length === 0 ? (
            <p className={styles.emptyText}>
              {q ? "該当するWiki記事が見つかりませんでした。" : "キーワードを入力して検索してください。"}
            </p>
          ) : (
            <div className={styles.feed}>
              {pages.map((page) => {
                const dateStr = page.updated_at
                  ? new Date(page.updated_at).toLocaleDateString("ja-JP")
                  : "日付不明";

                return (
                  <Link
                    key={page.id}
                    href={`/${locale}/wiki/${page.slug}`}
                    className={styles.feedRow}
                  >
                    <div className={styles.feedLeft}>
                      <span className={styles.typeBadge}>{page.page_type}</span>
                    </div>

                    <div className={styles.feedContent}>
                      <h3 className={styles.feedTitle}>{page.title}</h3>
                      {page.summary && (
                        <p className={styles.feedSummary}>{page.summary}</p>
                      )}
                      <div className={styles.feedMeta}>
                        <span>{dateStr}</span>
                        <span>👁 {page.view_count ?? 0}</span>
                      </div>
                    </div>

                    <div className={styles.feedRight}>
                      <span className={styles.feedDate}>{dateStr}</span>
                      <span className={styles.feedViews}>👁 {page.view_count ?? 0}</span>
                    </div>
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
