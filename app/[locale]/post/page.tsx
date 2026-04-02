import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import { postUrl } from "@/lib/postUrl";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import CategorySidebar from "@/components/CategorySidebar";
import FavoriteSidebar from "@/components/FavoriteSidebar";
import PostRandomButton from "@/components/PostRandomButton";
import InlineVoteButtons from "@/components/InlineVoteButtons";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: { absolute: dict.meta.postTitle },
    description: dict.meta.postDescription,
  };
}

type AuthorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type VoteRow = {
  vote_type: number | null;
};

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  view_count: number | null;
  slug: string | null;
  post_votes?: VoteRow[];
  author?: AuthorProfile | null;
};

type StoryCategoryRow = {
  id: number;
  slug: string;
  name: string;
  name_en: string | null;
  icon_url: string | null;
};

export default async function StoryIndex({ params, searchParams }: Props) {
  const { locale } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const orderCol = isPopular ? "view_count" : "created_at";

  let rawPosts: { id: number; title: string | null; content: string | null; created_at: string | null; image_url: string | null; image_url_2: string | null; image_url_3: string | null; view_count: number | null; slug: string | null; user_id: string | null; post_votes?: VoteRow[] }[] = [];

  if (locale === "en") {
    // 英語翻訳済みの記事のみ取得（post_translations と inner join）
    const { data } = await supabase
      .from("post")
      .select("id, title, content, created_at, image_url, image_url_2, image_url_3, view_count, user_id, slug, post_votes(vote_type), post_translations!inner(title, content)")
      .eq("is_published", true)
      .eq("post_translations.locale", "en")
      .order(orderCol, { ascending: false })
      .limit(50);

    rawPosts = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.post_translations?.[0]?.title ?? p.title,
      content: p.post_translations?.[0]?.content ?? p.content,
      created_at: p.created_at,
      image_url: p.image_url,
      image_url_2: p.image_url_2,
      image_url_3: p.image_url_3,
      view_count: p.view_count,
      slug: p.slug as string | null,
      user_id: p.user_id as string | null,
      post_votes: p.post_votes,
    }));
  } else {
    const { data } = await supabase
      .from("post")
      .select("id, title, content, created_at, image_url, image_url_2, image_url_3, view_count, user_id, slug, post_votes(vote_type)")
      .eq("is_published", true)
      .order(orderCol, { ascending: false })
      .limit(50);

    rawPosts = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      created_at: p.created_at,
      image_url: p.image_url,
      image_url_2: p.image_url_2,
      image_url_3: p.image_url_3,
      view_count: p.view_count,
      slug: p.slug as string | null,
      user_id: p.user_id as string | null,
      post_votes: p.post_votes,
    }));
  }

  // Batch fetch profiles
  const userIds = [...new Set(rawPosts.map((p) => p.user_id).filter(Boolean))] as string[];
  let profilesMap: Record<string, AuthorProfile> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profilesData ?? []) {
      profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }

  const posts: StoryPost[] = rawPosts.map((p) => ({
    ...p,
    post_votes: p.post_votes,
    author: p.user_id ? (profilesMap[p.user_id] ?? null) : null,
  }));

  const { data: categoriesData } = await supabase
    .from("story_categories")
    .select("id, slug, name, name_en, icon_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(20);

  const categories = (categoriesData ?? []) as StoryCategoryRow[];

  return (
    <main className={styles.storyPage}>
      <div className={styles.pageLayout}>
      <CategorySidebar
        title="CREEPY POSTS"
        categories={categories.map((cat) => ({
          slug: cat.slug,
          name: locale === "en" ? (cat.name_en ?? cat.name) : cat.name,
          icon_url: cat.icon_url,
          href: `/${locale}/post/category/${cat.slug}`,
        }))}
      >
        <div style={{ marginTop: 8 }}>
          <FavoriteSidebar
            type="story"
            locale={locale}
            labels={{ title: dict.common.favoriteSidebar, empty: dict.common.favoriteNone }}
            embedded
          />
        </div>
      </CategorySidebar>
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
        <div className={styles.categoryBar}>
          <Link href={`/${locale}/post`} className={styles.categoryChip}>
            {dict.post.all}
          </Link>
          <Link href={`/${locale}/post/following`} className={styles.categoryChip}>
            {dict.post.following}
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
              const imageUrls = [post.image_url, post.image_url_2, post.image_url_3]
                .filter((url): url is string => Boolean(url))
                .slice(0, 4);
              const authorName = post.author?.display_name || post.author?.username || null;
              const score = (post.post_votes ?? []).reduce(
                (sum: number, v: VoteRow) => sum + (v.vote_type ?? 0),
                0
              );

              return (
                <Link
                  key={post.id}
                  href={postUrl(locale, post.id, post.slug)}
                  className={styles.postRow}
                >
                  <div className={styles.postContent}>
                    <div className={styles.postAuthorRow}>
                      {post.author?.avatar_url ? (
                        <img src={post.author.avatar_url} alt="" className={styles.postAvatar} />
                      ) : (
                        <span className={styles.postAvatarPlaceholder} />
                      )}
                      <span className={styles.postAuthorName}>
                        {authorName ? `@${post.author?.username ?? authorName}` : (locale === "en" ? "Anonymous" : "匿名")}
                      </span>
                      <span className={styles.postDate}>{dateStr}</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    <p className={styles.postExcerpt}>
                      {safeContent.length > 400
                        ? `${safeContent.slice(0, 400)}...`
                        : safeContent}
                    </p>
                    {imageUrls.length > 0 && (
                      <div className={`${styles.postImageWrap} ${imageUrls.length >= 2 ? styles.postImageGrid : ""}`}>
                        {imageUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${safeTitle} ${i + 1}`}
                            className={styles.postImage}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                    <div className={styles.postFooter}>
                      <InlineVoteButtons postId={post.id} initialScore={score} />
                      <span>👁 {post.view_count ?? 0} {dict.post.views}</span>
                    </div>
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
