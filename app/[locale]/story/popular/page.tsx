import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
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

export default async function PopularPage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  let rawData: any[] = [];

  if (locale === "en") {
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
        post_comments(id),
        post_translations!inner(title, content)
      `)
      .eq("is_published", true)
      .eq("post_translations.locale", "en")
      .limit(30);
    rawData = data ?? [];
  } else {
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
    rawData = data ?? [];
  }

  const posts = rawData
    .map((post) => {
      const score = (post.post_votes ?? []).reduce(
        (sum: number, v: VoteRow) => sum + (v.vote_type ?? 0),
        0
      );

      const commentCount = (post.post_comments ?? []).length;

      const title =
        locale === "en"
          ? (post.post_translations?.[0]?.title ?? post.title)
          : post.title;
      const content =
        locale === "en"
          ? (post.post_translations?.[0]?.content ?? post.content)
          : post.content;

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
          {dict.story.popular} {dict.story.label}
        </h1>

        <div className={styles.postGrid}>
          {posts.map((post) => {
            const safeTitle = post.title ?? dict.story.untitled;
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
                        {dict.story.label}
                      </span>

                      <span className={styles.postCardDate}>
                        {safeCreatedAt
                          ? new Date(safeCreatedAt).toLocaleDateString(dateLocale)
                          : dict.story.unknownDate}
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
