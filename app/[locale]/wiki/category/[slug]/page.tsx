import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "../../wiki.module.css";
import BackButton from "@/components/BackButton";

type WikiCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
};

type JoinRow = {
  wiki_page_id: number;
};

type WikiRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  page_type: string;
};

export default async function WikiCategoryPage({
  params,
}: WikiCategoryPageProps) {
  const { locale, slug } = await params;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name, description, locale")
    .eq("locale", locale)
    .eq("slug", slug)
    .single();

  if (categoryError || !category) {
    notFound();
  }

  const safeCategory = category as CategoryRow;

  const { data: joins, error: joinError } = await supabase
    .from("wiki_page_categories")
    .select("wiki_page_id")
    .eq("category_id", safeCategory.id);

  const wikiIds = ((joins ?? []) as JoinRow[]).map((item) => item.wiki_page_id);

  let items: WikiRow[] = [];
  let wikiErrorMessage = "";

  if (joinError) {
    wikiErrorMessage = joinError.message;
  } else if (wikiIds.length > 0) {
    const { data: wikiItems, error: wikiError } = await supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type")
      .eq("locale", locale)
      .eq("is_published", true)
      .in("id", wikiIds);

    if (wikiError) {
      wikiErrorMessage = wikiError.message;
    } else {
      items = (wikiItems ?? []) as WikiRow[];
    }
  }

  return (
    <main className={styles.wikiPage}>
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div>
            <p className={styles.wikiBreadcrumb}>ARCHIVE / WIKI / CATEGORY</p>
            <h1 className={styles.wikiTitle}>{safeCategory.name}</h1>
            <p className={styles.wikiSubtitle}>
              {safeCategory.description ?? "カテゴリ別の wiki 一覧です。"}
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>
              Wiki 一覧
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>所属ページ</h2>
            <p className={styles.sectionDescription}>
              このカテゴリに紐づいた wiki 記事を表示しています。
            </p>
          </div>

          {wikiErrorMessage ? (
            <div className={styles.errorBox}>{wikiErrorMessage}</div>
          ) : items.length === 0 ? (
            <p className={styles.emptyText}>まだ記事がありません。</p>
          ) : (
            <div className={styles.list}>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/wiki/${item.slug}`}
                  className={styles.listLink}
                >
                  <article className={styles.listItem}>
                    <p className={styles.smallMeta}>{item.page_type}</p>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <p className={styles.itemText}>
                      {item.summary ?? "概要はまだ設定されていません。"}
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}