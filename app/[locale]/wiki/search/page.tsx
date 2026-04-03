import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../wiki.module.css";
import BackButton from "@/components/BackButton";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return { title: dict.meta.wikiSearchTitle };
}

type WikiPage = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  updated_at: string | null;
  view_count: number | null;
};

export default async function WikiSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const rawQ = sp.q;
  const q = (rawQ ?? "").trim();

  // 空クエリでフォーム送信された場合はクリーンなURLにリダイレクト
  if (rawQ !== undefined && q === "") {
    redirect(`/${locale}/wiki/search`);
  }

  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const safeQ = q
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const keyword = `%${safeQ}%`;

  const { data } = q
    ? await supabaseAdmin
        .from("wiki_pages")
        .select("id,slug,title,summary,updated_at,view_count")
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
            <h1 className={styles.wikiTitle}>{dict.wiki.listTitle} — {dict.search.title}</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>{dict.wiki.home}</Link>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>{dict.wiki.listTitle}</Link>
          </div>
        </header>

        <form action={`/${locale}/wiki/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={dict.wiki.searchPlaceholder}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>{dict.home.searchButton}</button>
        </form>

        {q && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8a7870" }}>
            &ldquo;{q}&rdquo; — {pages.length} {locale === "en" ? "results" : "件"}
          </p>
        )}

        <div className={styles.card}>
          {pages.length === 0 ? (
            <p className={styles.emptyText}>
              {q ? dict.search.noResults : dict.wiki.searchPlaceholder}
            </p>
          ) : (
            <div className={styles.feed}>
              {pages.map((page) => {
                const dateStr = page.updated_at
                  ? new Date(page.updated_at).toLocaleDateString(dateLocale)
                  : dict.post.unknownDate;

                return (
                  <Link
                    key={page.id}
                    href={`/${locale}/wiki/${page.slug}`}
                    className={styles.feedRow}
                  >
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
