import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import PostImageGallery from "@/components/PostImageGallery";
import styles from "./page.module.css";
import PostComments from "@/components/PostComments";
import PostVoteButtons from "@/components/PostVoteButtons";
import CommentTree from "@/components/CommentTree";
import PostBookmarkButton from "@/components/PostBookmarkButton";
import BackButton from "@/components/BackButton";
import TranslateButton from "@/components/TranslateButton";
import PostActionButtons from "@/components/PostActionButtons";

const BASE_URL = "https://creepyhub.com";

type StoryPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { locale, id } = await params;

  const { data: post } = await supabase
    .from("post")
    .select("title, content, image_url")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!post) return {};

  let title = post.title ?? undefined;
  let description: string | undefined = post.content
    ? post.content.slice(0, 120)
    : undefined;

  // EN の場合は翻訳タイトル・本文を優先
  if (locale === "en") {
    const { data: tr } = await supabase
      .from("post_translations")
      .select("title, content")
      .eq("post_id", id)
      .eq("locale", "en")
      .single();
    if (tr?.title) title = tr.title;
    if (tr?.content) description = tr.content.slice(0, 120);
  }

  const url = `${BASE_URL}/${locale}/post/${id}`;

  return {
    title: title ?? undefined,
    description,
    alternates: {
      canonical: url,
      languages: {
        ja: `${BASE_URL}/ja/post/${id}`,
        en: `${BASE_URL}/en/post/${id}`,
      },
    },
    openGraph: {
      title: title ?? undefined,
      description,
      url,
      type: "article",
      locale: locale === "en" ? "en_US" : "ja_JP",
      ...(post.image_url ? { images: [{ url: post.image_url }] } : {}),
    },
  };
}

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

type RelatedPostRow = {
  id: number;
  title: string | null;
  image_url: string | null;
  created_at: string | null;
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
      : (post.title ?? dict.post.label);

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

  const { data: relatedPostsData } = await supabase
    .from("post")
    .select("id, title, image_url, created_at")
    .eq("is_published", true)
    .neq("id", post.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const relatedPosts = (relatedPostsData ?? []) as RelatedPostRow[];

  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  return (
    <main className={styles.archivePage}>
      <div className={styles.archiveShell}>
        <BackButton />
        <header className={styles.archiveHeader}>
          <div>
            <p className={styles.archiveBreadcrumb}>ARCHIVE / OCCULT DATABASE</p>
            <h1 className={styles.archiveTitle}>{dict.post.headerTitle}</h1>
            <p className={styles.archiveSubtitle}>{dict.post.headerSubtitle}</p>
          </div>

          <div className={styles.archiveActions}>
            <Link href={`/${locale}`} className={styles.archiveTopLink}>
              {dict.nav.home}
            </Link>
          </div>
        </header>

        <section className={styles.archiveContentCard}>
          {/* 著者・閲覧数・ホームリンク */}
          <div className={styles.storyTopMeta}>
            {author?.username ? (
              <Link
                href={`/${locale}/u/${author.username}`}
                className={styles.storyAuthor}
              >
                @{author.username}
              </Link>
            ) : (
              <span className={styles.storyAuthor}>{dict.post.unknownAuthor}</span>
            )}
            <div className={styles.storyViewCount}>
              {dict.post.views}: {displayedViewCount}
            </div>
            <Link href={`/${locale}`} className={styles.storyBackButton}>
              {dict.post.backToHome}
            </Link>
          </div>

          <p className={styles.storyDetailMeta}>
            {safeCreatedAt
              ? new Date(safeCreatedAt).toLocaleString(dateLocale)
              : dict.post.unknownDate}
          </p>

          <h2 className={styles.storyDetailTitle}>{displayTitle}</h2>

          <PostImageGallery imageUrls={imageUrls} title={displayTitle} />

          {/* Reddit風アクションバー（画像の下） */}
          <div className={styles.storyActionBar}>
            <div className={styles.storyActionBarLeft}>
              <PostVoteButtons
                postId={post.id}
                initialScore={initialScore}
                labels={{
                  upvote: dict.common.upvote,
                  downvote: dict.common.downvote,
                  rateLoginRequired: dict.common.rateLoginRequired,
                  rateRevokeFailed: dict.common.rateRevokeFailed,
                  rateFailed: dict.common.rateFailed,
                  rateChangeFailed: dict.common.rateChangeFailed,
                }}
              />
              <PostBookmarkButton
                postId={post.id}
                labels={{
                  loginRequired: dict.common.loginRequired,
                  save: dict.common.save,
                  saved: dict.common.saved,
                  bookmark: dict.common.bookmark,
                  unbookmark: dict.common.unbookmark,
                }}
              />
              <TranslateButton
                type="story"
                id={post.id}
                locale={locale}
                hasTranslation={hasEnglishTranslation}
                labels={dict.post}
              />
              <PostActionButtons
                postId={post.id}
                authorId={post.user_id}
                locale={locale}
                labels={{
                  edit: dict.common.edit,
                  delete: dict.common.delete,
                  deleting: dict.common.deleting,
                  deleteConfirm: dict.common.deleteConfirmStory,
                  deleteFailed: dict.common.deleteFailed,
                }}
              />
            </div>
          </div>

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

          <PostComments
            postId={post.id}
            locale={locale}
            labels={{
              comment: dict.common.comment,
              commentSubtitle: dict.common.commentSubtitle,
              commentWritePlaceholder: dict.common.commentWritePlaceholder,
              commentLoginRequired: dict.common.commentLoginRequired,
              commentPosting: dict.common.commentPosting,
              commentSubmit: dict.common.commentSubmit,
              commentLoading: dict.common.commentLoading,
              noComments: dict.common.noComments,
              deletedComment: dict.common.deletedComment,
              reply: dict.common.reply,
              replyPlaceholder: dict.common.replyPlaceholder,
              cancel: dict.common.cancel,
              replyPosting: dict.common.replyPosting,
              replySubmit: dict.common.replySubmit,
            }}
          />

          {relatedPosts.length > 0 && (
            <section className={styles.relatedSection}>
              <h3 className={styles.relatedTitle}>
                {locale === "en" ? "Related Posts" : "関連記事"}
              </h3>
              <div className={styles.relatedGrid}>
                {relatedPosts.map((rp) => (
                  <Link key={rp.id} href={`/${locale}/post/${rp.id}`} className={styles.relatedCard}>
                    {rp.image_url ? (
                      <img src={rp.image_url} alt={rp.title ?? ""} className={styles.relatedCardImg} />
                    ) : (
                      <div className={styles.relatedCardImgPlaceholder} />
                    )}
                    <div className={styles.relatedCardBody}>
                      <h4 className={styles.relatedCardTitle}>{rp.title}</h4>
                      <p className={styles.relatedCardText}>
                        {rp.created_at
                          ? new Date(rp.created_at).toLocaleDateString(dateLocale)
                          : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
