import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "../../page.module.css";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

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
  post_votes?: VoteRow[];
  post_comments?: CommentRow[];
};

export default async function HotPage({ params }: Props) {
  const { locale } = await params;

  const { data } = await supabase
    .from("post")
    .select(`
      id,
      title,
      content,
      created_at,
      image_url,
      view_count,
      post_votes(vote_type),
      post_comments(id)
    `)
    .eq("is_published", true)
    .limit(30);

  const posts = ((data ?? []) as StoryPost[])
    .map((post) => {
      const score = (post.post_votes ?? []).reduce(
        (sum, v) => sum + (v.vote_type ?? 0),
        0
      );

      const commentCount = (post.post_comments ?? []).length;

      const created = post.created_at
        ? new Date(post.created_at).getTime()
        : Date.now();

      const hours = (Date.now() - created) / 3600000;

      const hotScore = score / Math.pow(hours + 2, 1.5);

      return {
        ...post,
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
        <h1 className={styles.archiveTitle}>HOT怪談</h1>

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
                      <span className={styles.postCardCategory}>怪談</span>

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