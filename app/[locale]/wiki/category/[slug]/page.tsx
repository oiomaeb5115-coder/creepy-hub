import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import WikiCategoryEditButton from "@/components/WikiCategoryEditButton";
import WikiCategoryReportButton from "@/components/WikiCategoryReportButton";
import CategoryDeleteButton from "@/components/CategoryDeleteButton";

type WikiCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  icon_url: string | null;
  header_image_url: string | null;
  is_user_created: boolean | null;
  created_by: string | null;
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
  image_url: string | null;
  view_count: number | null;
};

export default async function WikiCategoryPage({
  params,
}: WikiCategoryPageProps) {
  const { locale, slug } = await params;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name, description, locale, icon_url, header_image_url, is_user_created, created_by")
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
      .select("id, slug, title, summary, page_type, image_url, view_count")
      .eq("locale", locale)
      .eq("is_published", true)
      .in("id", wikiIds)
      .order("view_count", { ascending: false });

    if (wikiError) {
      wikiErrorMessage = wikiError.message;
    } else {
      items = (wikiItems ?? []) as WikiRow[];
    }
  }

  return (
    <main className={styles.categoryPage}>
      {/* ヘッダー画像 */}
      {safeCategory.header_image_url && (
        <div className={styles.heroImage}>
          <img
            src={safeCategory.header_image_url}
            alt={`${safeCategory.name} ヘッダー画像`}
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay} />
        </div>
      )}

      <div className={styles.categoryShell}>
        <BackButton />
        <header className={styles.categoryHeader}>
          <div className={styles.categoryTitleRow}>
            {safeCategory.icon_url && (
              <img
                src={safeCategory.icon_url}
                alt={`${safeCategory.name} アイコン`}
                className={styles.categoryIcon}
              />
            )}
            <div>
              <p className={styles.categoryBreadcrumb}>OCCULT WIKI / CATEGORY</p>
              <h1 className={styles.categoryTitle}>{safeCategory.name}</h1>
              <p className={styles.categorySubtitle}>
                {safeCategory.description ?? "このカテゴリの wiki 記事一覧です。"}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>
              Wiki 一覧
            </Link>
            <WikiCategoryEditButton
              categoryId={safeCategory.id}
              createdBy={safeCategory.created_by}
              slug={safeCategory.slug}
              locale={locale}
            />
            {safeCategory.is_user_created && (
              <WikiCategoryReportButton categoryId={safeCategory.id} />
            )}
            <CategoryDeleteButton
              categoryId={safeCategory.id}
              deleteApiPath={`/api/wiki-category/${safeCategory.id}/delete`}
              redirectTo={`/${locale}/wiki`}
            />
          </div>
        </header>

        <section className={styles.cardSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>所属ページ</h2>
            <p className={styles.sectionDescription}>
              カテゴリ「{safeCategory.name}」に属する wiki 記事です。
            </p>
          </div>

          {wikiErrorMessage ? (
            <p className={styles.emptyText}>
              記事の取得に失敗しました: {wikiErrorMessage}
            </p>
          ) : items.length === 0 ? (
            <p className={styles.emptyText}>このカテゴリにはまだ記事がありません。</p>
          ) : (
            <div className={styles.postGrid}>
              {items.map((item) => (
                <Link
                  href={`/${locale}/wiki/${item.slug}`}
                  key={item.id}
                  className={styles.postCardLink}
                >
                  <article className={styles.postCard}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className={styles.postCardImage}
                      />
                    ) : (
                      <div className={styles.postCardImagePlaceholder}>
                        NO IMAGE
                      </div>
                    )}

                    <div className={styles.postCardBody}>
                      <div className={styles.postCardMetaRow}>
                        <span className={styles.postCardType}>
                          {item.page_type}
                        </span>
                        <span className={styles.postCardViews}>
                          👁 {item.view_count ?? 0}
                        </span>
                      </div>

                      <h3 className={styles.postCardTitle}>{item.title}</h3>

                      <p className={styles.postCardExcerpt}>
                        {item.summary ?? "概要はまだ設定されていません。"}
                      </p>
                    </div>
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
