import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import CategoryReportButton from "@/components/CategoryReportButton";
import CategoryEditButton from "@/components/CategoryEditButton";
import CategoryDeleteButton from "@/components/CategoryDeleteButton";
import FavoriteCategoryButton from "@/components/FavoriteCategoryButton";
import InlineVoteButtons from "@/components/InlineVoteButtons";
import ViewIcon from "@/components/icons/ViewIcon";
import ImpressionTracker from "@/components/ImpressionTracker";

export const revalidate = 300;

type StoryCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: StoryCategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data: cat } = await supabaseAdmin
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

type AuthorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type VoteRow = {
  vote_type: number | null;
};

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  stream_video_id: string | null;
  view_count: number | null;
  category_id: number | null;
  slug: string | null;
  post_votes: VoteRow[];
  author: AuthorProfile | null;
};

export default async function StoryCategoryPage({
  params,
  searchParams,
}: StoryCategoryPageProps) {
  const { locale, slug } = await params;
  const { sort = "new" } = await searchParams;
  const isPopular = sort === "popular";
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const orderCol = isPopular ? "view_count" : "created_at";

  const { data: categoryData, error: categoryError } = await supabaseAdmin
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

  const { data: postsData } = await supabaseAdmin
    .from("post")
    .select("id, title, content, created_at, image_url, image_url_2, image_url_3, stream_video_id, view_count, category_id, slug, user_id, post_votes(vote_type)")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order(orderCol, { ascending: false })
    .limit(50);

  const postIds = (postsData ?? []).map((p: any) => p.id);
  let translationsMap: Record<number, { title: string; content: string }> = {};
  if (locale === "en" && postIds.length > 0) {
    const { data: trData } = await supabaseAdmin
      .from("post_translations")
      .select("post_id, title, content")
      .eq("locale", "en")
      .in("post_id", postIds);
    for (const tr of trData ?? []) {
      translationsMap[tr.post_id] = { title: tr.title, content: tr.content };
    }
  }

  // Batch fetch author profiles
  const userIds = [...new Set((postsData ?? []).map((p: any) => p.user_id).filter(Boolean))] as string[];
  let profilesMap: Record<string, AuthorProfile> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profilesData ?? []) {
      profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }

  const posts: PostRow[] = (postsData ?? []).map((p: any) => {
    const tr = translationsMap[p.id] ?? null;
    return {
      id: p.id,
      title: tr?.title ?? p.title,
      content: tr?.content ?? p.content,
      created_at: p.created_at,
      image_url: p.image_url,
      image_url_2: p.image_url_2,
      image_url_3: p.image_url_3,
      view_count: p.view_count,
      category_id: p.category_id,
      slug: p.slug as string | null,
      post_votes: p.post_votes ?? [],
      author: p.user_id ? (profilesMap[p.user_id] ?? null) : null,
    };
  });

  const hasHero = Boolean(category.header_image_url);

  return (
    <main className={styles.categoryPage}>
      {hasHero && (
        <div className={styles.heroImage}>
          <img
            src={category.header_image_url!}
            alt={`${categoryName} header`}
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay} />
        </div>
      )}

      <div className={styles.categoryShell}>
        {!hasHero && (
          <>
            <img src="/images/ui/auth-logo_2.webp" alt="" className={styles.pageTopLogo} />
            <h1 className={styles.pageLogoTitle}>{categoryName}</h1>
          </>
        )}
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
              <div className={styles.favoriteBelowDesc}>
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
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
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

        {/* Sort tabs */}
        <div className={styles.sortTabs}>
          <Link
            href={`/${locale}/post/category/${slug}?sort=new`}
            className={`${styles.sortTab} ${!isPopular ? styles.sortTabActive : ""}`}
          >
            {dict.post.newest}
          </Link>
          <Link
            href={`/${locale}/post/category/${slug}?sort=popular`}
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
                  <ImpressionTracker type="post" id={post.id}>
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
                    {imageUrls.length > 0 ? (
                      <div className={`${styles.postImageWrap} ${imageUrls.length >= 2 ? styles.postImageGrid : ""}`} style={{ position: "relative" }}>
                        {imageUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${safeTitle} ${i + 1}`}
                            className={styles.postImage}
                            loading="lazy"
                          />
                        ))}
                        {post.stream_video_id && (
                          <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, lineHeight: 1 }}>▶ 動画</span>
                        )}
                      </div>
                    ) : post.stream_video_id ? (
                      <div className={styles.postImageWrap} style={{ position: "relative" }}>
                        <img
                          src={`https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${post.stream_video_id}/thumbnails/thumbnail.jpg?width=400&height=225&fit=crop`}
                          alt={safeTitle}
                          className={styles.postImage}
                          loading="lazy"
                        />
                        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>▶</span>
                      </div>
                    ) : null}
                    <div className={styles.postFooter}>
                      <InlineVoteButtons postId={post.id} initialScore={score} />
                      <span className="stat-icon"><ViewIcon /> {post.view_count ?? 0} {dict.post.views}</span>
                    </div>
                  </div>
                  </ImpressionTracker>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
