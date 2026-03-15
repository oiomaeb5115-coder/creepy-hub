import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  view_count: number | null;
};

type StoryCategoryRow = {
  id: number;
  slug: string;
  name: string;
};

export default async function StoryIndex({ params, searchParams }: Props) {
  const { locale } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";

  const [postsResult, categoriesResult] = await Promise.all([
    supabase
      .from("post")
      .select("id,title,content,created_at,image_url,view_count")
      .eq("is_published", true)
      .order(isPopular ? "view_count" : "created_at", { ascending: false })
      .limit(50),

    supabase
      .from("story_categories")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20),
  ]);

  const posts = (postsResult.data ?? []) as StoryPost[];
  const categories = (categoriesResult.data ?? []) as StoryCategoryRow[];

  return (
    <main className={styles.storyPage}>
      <div className={styles.storyShell}>
        <BackButton />
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>HORROR POST / ARCHIVE</p>
            <h1 className={styles.pageTitle}>Horror Post</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>ホーム</Link>
            <Link href={`/${locale}/post`} className={styles.topLink}>投稿する</Link>
          </div>
        </header>

        {/* Search */}
        <form action={`/${locale}/story/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            placeholder="怪談を検索..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>検索</button>
        </form>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className={styles.categoryBar}>
            <Link href={`/${locale}/story`} className={styles.categoryChip}>
              すべて
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/story/category/${cat.slug}`}
                className={styles.categoryChip}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Sort tabs */}
        <div className={styles.sortTabs}>
          <Link
            href={`/${locale}/story?sort=new`}
            className={`${styles.sortTab} ${!isPopular ? styles.sortTabActive : ""}`}
          >
            新着順
          </Link>
          <Link
            href={`/${locale}/story?sort=popular`}
            className={`${styles.sortTab} ${isPopular ? styles.sortTabActive : ""}`}
          >
            人気順
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className={styles.emptyText}>まだ怪談記事がありません。</p>
        ) : (
          <div className={styles.feed}>
            {posts.map((post) => {
              const safeTitle = post.title ?? "無題";
              const safeContent = post.content ?? "";
              const dateStr = post.created_at
                ? new Date(post.created_at).toLocaleDateString("ja-JP")
                : "日付不明";

              return (
                <Link
                  key={post.id}
                  href={`/${locale}/story/${post.id}`}
                  className={styles.postRow}
                >
                  <div className={styles.scoreCol}>
                    <span className={styles.scoreIcon}>👁</span>
                    <span className={styles.scoreNum}>{post.view_count ?? 0}</span>
                  </div>

                  <div className={styles.postContent}>
                    <div className={styles.postMeta}>
                      <span className={styles.badge}>怪談</span>
                      <span className={styles.postDate}>{dateStr}</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    <p className={styles.postExcerpt}>
                      {safeContent.length > 150
                        ? `${safeContent.slice(0, 150)}...`
                        : safeContent}
                    </p>
                    <div className={styles.postFooter}>
                      <span>👁 {post.view_count ?? 0} 閲覧</span>
                    </div>
                  </div>

                  <div className={styles.thumbCol}>
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={safeTitle}
                        className={styles.thumb}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>NO IMAGE</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
