import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import { makePostgrestIlikePattern } from "@/lib/postgrestFilter";
import ViewIcon from "@/components/icons/ViewIcon";
import ImpressionTracker from "@/components/ImpressionTracker";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return { title: dict.meta.postSearchTitle, robots: { index: false, follow: true } };
}

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  stream_video_id: string | null;
  view_count: number | null;
  slug: string | null;
};

export default async function StorySearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const rawQ = sp.q;
  const q = (rawQ ?? "").trim();

  // 空クエリでフォーム送信された場合はクリーンなURLにリダイレクト
  if (rawQ !== undefined && q === "") {
    redirect(`/${locale}/post/search`);
  }

  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const keyword = makePostgrestIlikePattern(q.slice(0, 200));

  let posts: StoryPost[] = [];

  if (q) {
    const { data, error: postError } = await supabaseAdmin
      .from("post")
      .select("id, title, content, created_at, image_url, stream_video_id, view_count, slug")
      .eq("is_published", true)
      .or(`title.ilike.${keyword},content.ilike.${keyword}`)
      .order("view_count", { ascending: false })
      .limit(30);

    if (postError) console.error("[SearchPosts] query error:", postError.message);

    const postIds = (data ?? []).map((p: any) => p.id);
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

    posts = (data ?? []).map((p: any) => {
      const tr = translationsMap[p.id] ?? null;
      return {
        id: p.id,
        title: tr?.title ?? p.title,
        content: tr?.content ?? p.content,
        created_at: p.created_at,
        image_url: p.image_url,
        stream_video_id: p.stream_video_id,
        view_count: p.view_count,
        slug: p.slug,
      };
    });
  }

  return (
    <main className={styles.storyPage}>
      <div className={styles.storyShell}>
        <BackButton />
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>HORROR POST / SEARCH</p>
            <h1 className={styles.pageTitle}>{dict.post.headerTitle} — {dict.search.title}</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>{dict.common.home}</Link>
            <Link href={`/${locale}/post`} className={styles.topLink}>{dict.nav.stories}</Link>
          </div>
        </header>

        <form action={`/${locale}/post/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={dict.post.searchPlaceholder}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>{dict.home.searchButton}</button>
        </form>

        {q && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8a7870" }}>
            &ldquo;{q}&rdquo; — {posts.length} {locale === "en" ? "results" : "件"}
          </p>
        )}

        {posts.length === 0 ? (
          <p className={styles.emptyText}>
            {q ? dict.search.noResults : dict.post.searchPlaceholder}
          </p>
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
                  href={postUrl(locale, post.id, post.slug)}
                  className={styles.postRow}
                >
                  <ImpressionTracker type="post" id={post.id}>
                  <div className={styles.scoreCol}>
                    <span className={`${styles.scoreIcon} stat-icon`}><ViewIcon /></span>
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
                      <span className="stat-icon"><ViewIcon /> {post.view_count ?? 0} {dict.post.views}</span>
                    </div>
                  </div>

                  <div className={styles.thumbCol} style={{ position: "relative" }}>
                    {post.image_url ? (
                      <>
                        <img
                          src={post.image_url}
                          alt={safeTitle}
                          className={styles.thumb}
                        />
                        {post.stream_video_id && (
                          <span style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 3, padding: "1px 4px", fontSize: 10, lineHeight: 1 }}>▶</span>
                        )}
                      </>
                    ) : post.stream_video_id ? (
                      <>
                        <img
                          src={`https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${post.stream_video_id}/thumbnails/thumbnail.jpg?width=200&height=200&fit=crop`}
                          alt={safeTitle}
                          className={styles.thumb}
                        />
                        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>▶</span>
                      </>
                    ) : (
                      <div className={styles.thumbPlaceholder}>NO IMAGE</div>
                    )}
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
