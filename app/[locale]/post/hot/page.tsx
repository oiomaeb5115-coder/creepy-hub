import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../../page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return { title: dict.meta.hotTitle, robots: { index: false, follow: true } };
}

type VoteRow = {
  vote_type: number | null;
};

type CommentRow = {
  id: number;
};

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  view_count: number | null;
  slug: string | null;
  post_votes?: VoteRow[];
  post_comments?: CommentRow[];
};

export default async function HotPage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const { data: rawData, error: postError } = await supabaseAdmin
    .from("post")
    .select(`
      id,
      title,
      content,
      created_at,
      image_url,
      view_count,
      slug,
      post_votes(vote_type),
      post_comments(id)
    `)
    .eq("is_published", true)
    .limit(30);

  if (postError) console.error("[HotPosts] query error:", postError.message);

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
      const score = (post.post_votes ?? []).reduce(
        (sum: number, v: VoteRow) => sum + (v.vote_type ?? 0),
        0
      );

      const commentCount = (post.post_comments ?? []).length;

      const created = post.created_at
        ? new Date(post.created_at).getTime()
        : Date.now();

      const hours = (Date.now() - created) / 3600000;

      const hotScore = score / Math.pow(hours + 2, 1.5);

      const tr = translationsMap[post.id] ?? null;
      const title = tr?.title ?? post.title;
      const content = tr?.content ?? post.content;

      return {
        ...post,
        title,
        content,
        score,
        commentCount,
        hotScore,
      };
    })
    .sort((a, b) => b.hotScore - a.hotScore);

  return (
    <main className={styles.archivePage}>
      <div className={styles.archiveShell}>
        <BackButton />
        <h1 className={styles.archiveTitle}>
          HOT {dict.post.label}
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
                      <span className={styles.postCardStat}>
                        ▲ {post.score}
                      </span>

                      <span className={styles.postCardStat}>
                        💬 {post.commentCount}
                      </span>

                      <span className={styles.postCardStat}>
                        👁 {post.view_count ?? 0}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
