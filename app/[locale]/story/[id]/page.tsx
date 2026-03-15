import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import StoryImageGallery from "@/components/StoryImageGallery";
import styles from "./page.module.css";
import PostComments from "@/components/PostComments";
import PostVoteButtons from "@/components/PostVoteButtons";
import CommentTree from "@/components/CommentTree";
import PostBookmarkButton from "@/components/PostBookmarkButton";
import BackButton from "@/components/BackButton";
import TranslateButton from "@/components/TranslateButton";
import StoryActionButtons from "@/components/StoryActionButtons";

type StoryPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  is_published: boolean | null;
  view_count: number | null;
  user_id: string | null;
};

type ProfileRow = {
  username: string | null;
  display_name: string | null;
};

type CommentRow = {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
  }[];
};

type TranslationRow = {
  title: string | null;
  content: string | null;
};

export default async function StoryDetailPage({ params }: StoryPageProps) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale);

  const { data, error } = await supabase
    .from("post")
    .select(
      "id, title, content, created_at, image_url, image_url_2, image_url_3, is_published, view_count, user_id"
    )
    .eq("id", id)
    .eq("is_published", true)
    .single();

  const post = data as PostRow | null;

  if (error || !post) {
    notFound();
  }

  await supabase.rpc("increment_post_view", { p_post_id: post.id });

  let author: ProfileRow | null = null;

  if (post.user_id) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", post.user_id)
      .single();

    author = (profileData as ProfileRow | null) ?? null;
  }

  // 翻訳データ取得
  const { data: translationData } = await supabase
    .from("post_translations")
    .select("title, content")
    .eq("post_id", post.id)
    .eq("locale", "en")
    .single();

  const translation = translationData as TranslationRow | null;
  const hasEnglishTranslation = !!translation;

  // locale=en の場合は翻訳テキストを使用
  const displayTitle =
    locale === "en" && translation?.title
      ? translation.title
      : (post.title ?? dict.story.label);

  const displayContent =
    locale === "en" && translation?.content
      ? translation.content
      : (post.content ?? "");

  const safeCreatedAt = post.created_at ?? "";
  const contentLines = displayContent.split("\n");

  const imageUrls: string[] = [
    post.image_url,
    post.image_url_2,
    post.image_url_3,
  ].filter((url): url is string => Boolean(url));

  const displayedViewCount = (post.view_count ?? 0) + 1;

  const { data: voteRows } = await supabase
    .from("post_votes")
    .select("vote_type")
    .eq("post_id", post.id);

  const initialScore =
    (voteRows ?? []).reduce((sum, row) => sum + (row.vote_type ?? 0), 0);

  const { data: commentsData } = await supabase
    .from("post_comments")
    .select(`
      id,
      post_id,
      parent_id,
      content,
      created_at,
      profiles(username)
    `)
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });

  const comments = (commentsData ?? []) as CommentRow[];

  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  return (
    <main className={styles.archivePage}>
      <div className={styles.archiveShell}>
        <BackButton />
        <header className={styles.archiveHeader}>
          <div>
            <p className={styles.archiveBreadcrumb}>ARCHIVE / OCCULT DATABASE</p>
            <h1 className={styles.archiveTitle}>{dict.story.headerTitle}</h1>
            <p className={styles.archiveSubtitle}>{dict.story.headerSubtitle}</p>
          </div>

          <div className={styles.archiveActions}>
            <Link href={`/${locale}`} className={styles.archiveTopLink}>
              {dict.nav.home}
            </Link>
            <Link href={`/${locale}/post`} className={styles.archiveTopLink}>
              {dict.nav.post}
            </Link>
          </div>
        </header>

        <section className={styles.archiveContentCard}>
          <div className={styles.storyDetailMetaRow}>
            <Link href={`/${locale}`} className={styles.storyBackButton}>
              {dict.story.backToHome}
            </Link>

            {author?.username ? (
              <Link
                href={`/${locale}/u/${author.username}`}
                className={styles.storyAuthor}
              >
                @{author.username}
              </Link>
            ) : (
              <span className={styles.storyAuthor}>{dict.story.unknownAuthor}</span>
            )}

            <PostVoteButtons postId={post.id} initialScore={initialScore} />
            <PostBookmarkButton postId={post.id} />

            <div className={styles.storyViewCount}>
              {dict.story.views}: {displayedViewCount}
            </div>

            <TranslateButton
              type="story"
              id={post.id}
              locale={locale}
              hasTranslation={hasEnglishTranslation}
              labels={dict.story}
            />
            <StoryActionButtons
              postId={post.id}
              authorId={post.user_id}
              locale={locale}
            />
          </div>

          <p className={styles.storyDetailMeta}>
            {safeCreatedAt
              ? new Date(safeCreatedAt).toLocaleString(dateLocale)
              : dict.story.unknownDate}
          </p>

          <h2 className={styles.storyDetailTitle}>{displayTitle}</h2>

          <StoryImageGallery imageUrls={imageUrls} title={displayTitle} />

          <div className={styles.storyDetailContent}>
            {contentLines.map((line: string, index: number) => {
              if (line.startsWith("## ")) {
                return (
                  <h3 key={index} className={styles.storySectionTitle}>
                    {line.replace("## ", "")}
                  </h3>
                );
              }

              if (!line.trim()) {
                return <br key={index} />;
              }

              return <p key={index}>{line}</p>;
            })}
          </div>

          <PostComments postId={post.id} />

          <section style={{ marginTop: 30 }}>
            <h3>{dict.story.comments}</h3>

            <CommentTree
              comments={comments}
              postId={post.id}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
