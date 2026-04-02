import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import CategoryReportButton from "@/components/CategoryReportButton";
import CategoryEditButton from "@/components/CategoryEditButton";
import CategoryDeleteButton from "@/components/CategoryDeleteButton";
import FavoriteCategoryButton from "@/components/FavoriteCategoryButton";

type StoryCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: StoryCategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data: cat } = await supabase
    .from("story_categories")
    .select("name, name_en, description")
    .eq("slug", slug)
    .single();
  if (!cat) return {};
  const name = locale === "en" && cat.name_en ? cat.name_en : cat.name;
  return {
    title: name,
    description: cat.description ?? undefined,
  };
}

type StoryCategoryRow = {
  id: number;
  slug: string;
  name: string;
  name_en: string | null;
  description: string | null;
  is_active: boolean;
  is_user_created: boolean;
  created_by: string | null;
  icon_url: string | null;
  header_image_url: string | null;
};

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  view_count: number | null;
  category_id: number | null;
  slug: string | null;
};

export default async function StoryCategoryPage({
  params,
}: StoryCategoryPageProps) {
  const { locale, slug } = await params;
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const { data: categoryData, error: categoryError } = await supabase
    .from("story_categories")
    .select("id, slug, name, name_en, description, is_active, is_user_created, created_by, icon_url, header_image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const category = categoryData as StoryCategoryRow | null;

  if (categoryError || !category) {
    notFound();
  }

  const categoryName = locale === "en" ? (category.name_en ?? category.name) : category.name;

  let posts: PostRow[] = [];

  if (locale === "en") {
    const { data } = await supabase
      .from("post")
      .select("id, title, content, created_at, image_url, view_count, category_id, slug, post_translations!inner(title, content)")
      .eq("is_published", true)
      .eq("category_id", category.id)
      .eq("post_translations.locale", "en")
      .order("created_at", { ascending: false });

    posts = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.post_translations?.[0]?.title ?? p.title,
      content: p.post_translations?.[0]?.content ?? p.content,
      created_at: p.created_at,
      image_url: p.image_url,
      view_count: p.view_count,
      category_id: p.category_id,
      slug: p.slug,
    }));
  } else {
    const { data, error: postsError } = await supabase
      .from("post")
      .select("id, title, content, created_at, image_url, view_count, category_id, slug")
      .eq("is_published", true)
      .eq("category_id", category.id)
      .order("created_at", { ascending: false });

    if (postsError) {
      posts = [];
    } else {
      posts = (data ?? []) as PostRow[];
    }
  }

  return (
    <main className={styles.categoryPage}>
      {category.header_image_url && (
        <div className={styles.heroImage}>
          <img
            src={category.header_image_url}
            alt={`${categoryName} header`}
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay} />
        </div>
      )}

      <div className={styles.categoryShell}>
        <BackButton />
        <header className={styles.categoryHeader}>
          <div className={styles.categoryTitleRow}>
            {category.icon_url && (
              <img
                src={category.icon_url}
                alt={`${categoryName} icon`}
                className={styles.categoryIcon}
              />
            )}
            <div>
              <p className={styles.categoryBreadcrumb}>STORIES / CATEGORY</p>
              <h1 className={styles.categoryTitle}>{categoryName}</h1>
              <p className={styles.categorySubtitle}>
                {category.description ?? `${categoryName} — ${dict.post.label}`}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>
              {dict.common.home}
            </Link>
            <FavoriteCategoryButton
              type="story"
              slug={category.slug}
              name={categoryName}
              locale={locale}
              labels={{
                unfavorite: dict.common.favoriteRemove,
                favoriteAdd: dict.common.favoriteAdd,
                favorite: dict.common.favorite,
                unfavorited: dict.common.unfavorite,
              }}
            />
            <CategoryEditButton
              categoryId={category.id}
              createdBy={category.created_by}
              slug={category.slug}
              locale={locale}
              label={dict.common.imageSettings}
            />
            {category.is_user_created && (
              <CategoryReportButton
                categoryId={category.id}
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
              categoryId={category.id}
              deleteApiPath={`/api/category/${category.id}/delete`}
              redirectTo={`/${locale}/post`}
              labels={{
                deleteConfirm: dict.common.deleteConfirmCategory,
                deleteFailed: dict.common.deleteFailed,
                deleting: dict.common.deleting,
                deleted: dict.common.deleted,
              }}
            />
          </div>
        </header>

        <section className={styles.cardSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{dict.post.label}</h2>
            <p className={styles.sectionDescription}>
              {categoryName}
            </p>
          </div>

          {posts.length === 0 ? (
            <p className={styles.emptyText}>{dict.post.empty}</p>
          ) : (
            <div className={styles.postGrid}>
              {posts.map((post) => {
                const safeTitle = post.title ?? dict.post.untitled;
                const safeContent = post.content ?? "";
                const safeCreatedAt = post.created_at ?? "";

                return (
                  <Link
                    href={postUrl(locale, post.id, post.slug)}
                    key={post.id}
                    className={styles.postCardLink}
                  >
                    <article className={styles.postCard}>
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={safeTitle}
                          className={styles.postCardImage}
                        />
                      ) : (
                        <div
                          className={`${styles.postCardImage} ${styles.postCardImagePlaceholder}`}
                        >
                          NO IMAGE
                        </div>
                      )}

                      <div className={styles.postCardBody}>
                        <div className={styles.postCardMetaRow}>
                          <span className={styles.postCardCategory}>
                            {categoryName}
                          </span>
                          <span className={styles.postCardDate}>
                            {safeCreatedAt
                              ? new Date(safeCreatedAt).toLocaleDateString(dateLocale)
                              : dict.post.unknownDate}
                          </span>
                        </div>

                        <h3 className={styles.postCardTitle}>{safeTitle}</h3>

                        <p className={styles.postCardExcerpt}>
                          {safeContent.length > 400
                            ? `${safeContent.slice(0, 400)}...`
                            : safeContent}
                        </p>

                        <div className={styles.postCardFooter}>
                          <span className={styles.postCardViews}>
                            {dict.post.views}: {post.view_count ?? 0}
                          </span>
                        </div>
                      </div>
                    </article>
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
