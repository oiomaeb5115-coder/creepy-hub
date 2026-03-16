import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import CategoryReportButton from "@/components/CategoryReportButton";
import CategoryEditButton from "@/components/CategoryEditButton";
import CategoryDeleteButton from "@/components/CategoryDeleteButton";

type StoryCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type StoryCategoryRow = {
  id: number;
  slug: string;
  name: string;
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
};

export default async function StoryCategoryPage({
  params,
}: StoryCategoryPageProps) {
  const { locale, slug } = await params;

  const { data: categoryData, error: categoryError } = await supabase
    .from("story_categories")
    .select("id, slug, name, description, is_active, is_user_created, created_by, icon_url, header_image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const category = categoryData as StoryCategoryRow | null;

  if (categoryError || !category) {
    notFound();
  }

  const { data: postsData, error: postsError } = await supabase
    .from("post")
    .select("id, title, content, created_at, image_url, view_count, category_id")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order("created_at", { ascending: false });

  const posts = (postsData ?? []) as PostRow[];

  return (
    <main className={styles.categoryPage}>
      {/* ヘッダー画像 */}
      {category.header_image_url && (
        <div className={styles.heroImage}>
          <img
            src={category.header_image_url}
            alt={`${category.name} ヘッダー画像`}
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
                alt={`${category.name} アイコン`}
                className={styles.categoryIcon}
              />
            )}
            <div>
              <p className={styles.categoryBreadcrumb}>STORIES / CATEGORY</p>
              <h1 className={styles.categoryTitle}>{category.name}</h1>
              <p className={styles.categorySubtitle}>
                {category.description ?? "このカテゴリの怪談・投稿一覧です。"}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>
              ホーム
            </Link>
            <CategoryEditButton
              categoryId={category.id}
              createdBy={category.created_by}
              slug={category.slug}
              locale={locale}
            />
            {category.is_user_created && (
              <CategoryReportButton categoryId={category.id} />
            )}
            <CategoryDeleteButton
              categoryId={category.id}
              deleteApiPath={`/api/category/${category.id}/delete`}
              redirectTo={`/${locale}/story`}
            />
          </div>
        </header>

        <section className={styles.cardSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>投稿一覧</h2>
            <p className={styles.sectionDescription}>
              カテゴリ「{category.name}」に属する投稿です。
            </p>
          </div>

          {postsError ? (
            <p className={styles.emptyText}>
              投稿の取得に失敗しました: {postsError.message}
            </p>
          ) : posts.length === 0 ? (
            <p className={styles.emptyText}>このカテゴリにはまだ投稿がありません。</p>
          ) : (
            <div className={styles.postGrid}>
              {posts.map((post) => {
                const safeTitle = post.title ?? "無題";
                const safeContent = post.content ?? "";
                const safeCreatedAt = post.created_at ?? "";

                return (
                  <Link
                    href={`/${locale}/story/${post.id}`}
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
                            {category.name}
                          </span>
                          <span className={styles.postCardDate}>
                            {safeCreatedAt
                              ? new Date(safeCreatedAt).toLocaleDateString("ja-JP")
                              : "日付不明"}
                          </span>
                        </div>

                        <h3 className={styles.postCardTitle}>{safeTitle}</h3>

                        <p className={styles.postCardExcerpt}>
                          {safeContent.length > 100
                            ? `${safeContent.slice(0, 100)}...`
                            : safeContent}
                        </p>

                        <div className={styles.postCardFooter}>
                          <span className={styles.postCardViews}>
                            閲覧: {post.view_count ?? 0}
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
