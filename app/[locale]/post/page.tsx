import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import FavoriteSidebar from "@/components/FavoriteSidebar";
import PostRandomButton from "@/components/PostRandomButton";

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
  name_en: string | null;
};

export default async function StoryIndex({ params, searchParams }: Props) {
  const { locale } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const orderCol = isPopular ? "view_count" : "created_at";

  let posts: StoryPost[] = [];

  if (locale === "en") {
    // 英語翻訳済みの記事のみ取得（post_translations と inner join）
    const { data } = await supabase
      .from("post")
      .select("id, title, content, created_at, image_url, view_count, post_translations!inner(title, content)")
      .eq("is_published", true)
      .eq("post_translations.locale", "en")
      .order(orderCol, { ascending: false })
      .limit(50);

    posts = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.post_translations?.[0]?.title ?? p.title,
      content: p.post_translations?.[0]?.content ?? p.content,
      created_at: p.created_at,
      image_url: p.image_url,
      view_count: p.view_count,
    }));
  } else {
    const { data } = await supabase
      .from("post")
      .select("id, title, content, created_at, image_url, view_count")
      .eq("is_published", true)
      .order(orderCol, { ascending: false })
      .limit(50);

    posts = (data ?? []) as StoryPost[];
  }

  const { data: categoriesData } = await supabase
    .from("story_categories")
    .select("id, slug, name, name_en")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(20);

  const categories = (categoriesData ?? []) as StoryCategoryRow[];

  return (
    <main className={styles.storyPage}>
      <div className={styles.pageLayout}>
      <FavoriteSidebar
        type="story"
        locale={locale}
        labels={{ title: dict.common.favoriteSidebar, empty: dict.common.favoriteNone }}
      />
      <div className={styles.storyShell}>
        <BackButton />
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>HORROR POST / ARCHIVE</p>
            <h1 className={styles.pageTitle}>Horror Post</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>{dict.nav.home}</Link>
            <PostRandomButton
              locale={locale}
              label={dict.post.random}
              className={`${styles.topLink} ${styles.topLinkAccent}`}
            />
          </div>
        </header>

        {/* Search */}
        <form action={`/${locale}/post/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            placeholder={dict.post.searchPlaceholder}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>{dict.home.searchButton}</button>
        </form>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className={styles.categoryBar}>
            <Link href={`/${locale}/post`} className={styles.categoryChip}>
              {dict.post.all}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/post/category/${cat.slug}`}
                className={styles.categoryChip}
              >
                {locale === "en" ? (cat.name_en ?? cat.name) : cat.name}
              </Link>
            ))}
            <Link href={`/${locale}/category/create`} className={styles.categoryChipNew}>
              {dict.post.createCategory}
            </Link>
          </div>
        )}

        {/* Sort tabs */}
        <div className={styles.sortTabs}>
          <Link
            href={`/${locale}/post?sort=new`}
            className={`${styles.sortTab} ${!isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.post.newest}
          </Link>
          <Link
            href={`/${locale}/post?sort=popular`}
            className={`${styles.sortTab} ${isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.post.popular}
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className={styles.emptyText}>{dict.post.empty}</p>
        ) : (
          <div className={styles.feed}>
            {posts.map((post) => {
              const safeTitle = post.title ?? dict.post.untitled;
              const safeContent = post.content ?? "";
              const dateStr = post.created_at
                ? new Date(post.created_at).toLocaleDateString(dateLocale)
                : dict.post.unknownDate;

              return (
                <Link
                  key={post.id}
                  href={`/${locale}/post/${post.id}`}
                  className={styles.postRow}
                >
                  <div className={styles.scoreCol}>
                    <span className={styles.scoreIcon}>👁</span>
                    <span className={styles.scoreNum}>{post.view_count ?? 0}</span>
                  </div>

                  <div className={styles.postContent}>
                    <div className={styles.postMeta}>
                      <span className={styles.badge}>{dict.post.label}</span>
                      <span className={styles.postDate}>{dateStr}</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    <p className={styles.postExcerpt}>
                      {safeContent.length > 150
                        ? `${safeContent.slice(0, 150)}...`
                        : safeContent}
                    </p>
                    <div className={styles.postFooter}>
                      <span>👁 {post.view_count ?? 0} {dict.post.views}</span>
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
      </div>
    </main>
  );
}
