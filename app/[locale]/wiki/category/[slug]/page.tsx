import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import WikiCategoryEditButton from "@/components/WikiCategoryEditButton";
import WikiCategoryReportButton from "@/components/WikiCategoryReportButton";
import CategoryDeleteButton from "@/components/CategoryDeleteButton";
import FavoriteCategoryButton from "@/components/FavoriteCategoryButton";
import ViewIcon from "@/components/icons/ViewIcon";

export const revalidate = 300;

type WikiCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: WikiCategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("name, description")
    .eq("locale", locale)
    .eq("slug", slug)
    .single();
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.description ?? undefined,
  };
}

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
  image_url: string | null;
  view_count: number | null;
  updated_at: string | null;
};

export default async function WikiCategoryPage({
  params,
  searchParams,
}: WikiCategoryPageProps) {
  const { locale, slug } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, description, locale, icon_url, header_image_url, is_user_created, created_by")
    .eq("locale", locale)
    .eq("slug", slug)
    .single();

  if (categoryError || !category) {
    notFound();
  }

  const safeCategory = category as CategoryRow;

  const { data: joins, error: joinError } = await supabaseAdmin
    .from("wiki_page_categories")
    .select("wiki_page_id")
    .eq("category_id", safeCategory.id);

  const wikiIds = ((joins ?? []) as JoinRow[]).map((item) => item.wiki_page_id);

  let items: WikiRow[] = [];
  let wikiErrorMessage = "";

  if (joinError) {
    wikiErrorMessage = joinError.message;
  } else if (wikiIds.length > 0) {
    let wikiQuery = supabaseAdmin
      .from("wiki_pages")
      .select("id, slug, title, summary, image_url, view_count, updated_at, vote_score")
      .eq("locale", locale)
      .eq("is_published", true)
      .in("id", wikiIds);

    if (isPopular) {
      wikiQuery = wikiQuery
        .order("vote_score", { ascending: false })
        .order("view_count", { ascending: false });
    } else {
      wikiQuery = wikiQuery.order("updated_at", { ascending: false });
    }

    const { data: wikiItems, error: wikiError } = await wikiQuery;

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
            alt={safeCategory.name}
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay} />
        </div>
      )}

      <div className={styles.categoryShell}>
        {!safeCategory.header_image_url && (
          <>
            <img src="/images/ui/auth-logo_2.webp" alt="" className={styles.pageTopLogo} />
            <h1 className={styles.pageLogoTitle}>{safeCategory.name}</h1>
          </>
        )}
        <BackButton />
        <header className={styles.categoryHeader}>
          <div className={styles.categoryTitleRow}>
            {safeCategory.icon_url && (
              <img
                src={safeCategory.icon_url}
                alt={`${safeCategory.name} icon`}
                className={styles.categoryIcon}
              />
            )}
            <div>
              <p className={styles.categoryBreadcrumb}>OCCULT FILES / CATEGORY</p>
              <p className={styles.categorySubtitle}>
                {safeCategory.description ?? dict.wiki.categoryDefaultDesc}
              </p>
              <div className={styles.favoriteBelowDesc}>
                <FavoriteCategoryButton
                  type="wiki"
                  slug={safeCategory.slug}
                  name={safeCategory.name}
                  locale={locale}
                  labels={{
                    unfavorite: dict.common.favoriteRemove,
                    favoriteAdd: dict.common.favoriteAdd,
                    favorite: dict.common.favorite,
                    unfavorited: dict.common.unfavorite,
                  }}
                />
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <WikiCategoryEditButton
              categoryId={safeCategory.id}
              createdBy={safeCategory.created_by}
              slug={safeCategory.slug}
              locale={locale}
              label={dict.common.imageSettings}
            />
            {safeCategory.is_user_created && (
              <WikiCategoryReportButton
                categoryId={safeCategory.id}
                labels={{
                  reportAccepted: dict.common.reportAccepted,
                  reportLoginRequired: dict.common.reportLoginRequired,
                  report: dict.common.report,
                  reporting: dict.common.reporting,
                  retry: dict.common.retry,
                }}
              />
            )}
            <CategoryDeleteButton
              categoryId={safeCategory.id}
              deleteApiPath={`/api/wiki-category/${safeCategory.id}/delete`}
              redirectTo={`/${locale}/wiki`}
              labels={{
                deleteConfirm: dict.common.deleteConfirmCategory,
                deleteFailed: dict.common.deleteFailed,
                deleting: dict.common.deleting,
                deleted: dict.common.deleted,
              }}
            />
          </div>
        </header>


        {/* Sort tabs */}
        <div className={styles.sortTabs}>
          <Link
            href={`/${locale}/wiki/category/${slug}?sort=new`}
            className={`${styles.sortTab} ${!isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.wiki.newest}
          </Link>
          <Link
            href={`/${locale}/wiki/category/${slug}?sort=popular`}
            className={`${styles.sortTab} ${isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.wiki.popular}
          </Link>
        </div>

        <section className={styles.cardSection}>

          {wikiErrorMessage ? (
            <p className={styles.emptyText}>
              {dict.wiki.categoryFetchFailed}{wikiErrorMessage}
            </p>
          ) : items.length === 0 ? (
            <p className={styles.emptyText}>{dict.wiki.categoryEmptyInCat}</p>
          ) : (
            <div className={styles.feed}>
              {items.map((item) => {
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
                        <span className="stat-icon"><ViewIcon /> {item.view_count ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
