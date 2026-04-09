import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../../page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import CommentIcon from "@/components/icons/CommentIcon";
import ViewIcon from "@/components/icons/ViewIcon";
import ImpressionTracker from "@/components/ImpressionTracker";
import ThumbUpIcon from "@/components/icons/ThumbUpIcon";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return { title: dict.meta.popularTitle, robots: { index: false, follow: true } };
}

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  view_count: number | null;
  slug: string | null;
  vote_score: number | null;
  comment_count: number | null;
};

export default async function PopularPage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const { data: rawData, error: postError } = await supabaseAdmin
    .from("post_with_counts")
    .select(`
      id,
      title,
      content,
      created_at,
      image_url,
      view_count,
      slug,
      vote_score,
      comment_count
    `)
    .eq("is_published", true)
    .limit(30);

  if (postError) console.error("[PopularPosts] query error:", postError.message);

  const postIds = (rawData ?? []).map((p: any) => p.id);
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

  const posts = (rawData ?? [])
    .map((post: any) => {
      const score = post.vote_score ?? 0;
      const commentCount = post.comment_count ?? 0;

      const tr = translationsMap[post.id] ?? null;
      const title = tr?.title ?? post.title;
      const content = tr?.content ?? post.content;

      return {
        ...post,
        title,
        content,
        score,
        commentCount,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <main className={styles.archivePage}>
      <div className={styles.archiveShell}>
        <BackButton />
        <h1 className={styles.archiveTitle}>
          {dict.post.popular} {dict.post.label}
        </h1>

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
                <ImpressionTracker type="post" id={post.id}>
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
                        {dict.post.label}
                      </span>

                      <span className={styles.postCardDate}>
                        {safeCreatedAt
                          ? new Date(safeCreatedAt).toLocaleDateString(dateLocale)
                          : dict.post.unknownDate}
                      </span>
                    </div>

                    <h3 className={styles.postCardTitle}>{safeTitle}</h3>

                    <p className={styles.postCardExcerpt}>
                      {safeContent.length > 100
                        ? `${safeContent.slice(0, 100)}...`
                        : safeContent}
                    </p>

                    <div className={styles.postCardFooter}>
                      <span className={`${styles.postCardStat} stat-icon`}>
                        <ThumbUpIcon size={14} /> {post.score}
                      </span>

                      <span className={`${styles.postCardStat} stat-icon`}>
                        <CommentIcon /> {post.commentCount}
                      </span>

                      <span className={`${styles.postCardStat} stat-icon`}>
                        <ViewIcon /> {post.view_count ?? 0}
                      </span>
                    </div>
                  </div>
                </article>
                </ImpressionTracker>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
