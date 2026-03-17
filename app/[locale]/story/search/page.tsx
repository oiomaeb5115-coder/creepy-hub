import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../page.module.css";
import BackButton from "@/components/BackButton";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

type StoryPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  view_count: number | null;
};

export default async function StorySearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  const dict = await getDictionary(locale);
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const keyword = `%${q}%`;

  let posts: StoryPost[] = [];

  if (q) {
    if (locale === "en") {
      // EN: search in post_translations
      const { data } = await supabase
        .from("post")
        .select("id, title, content, created_at, image_url, view_count, post_translations!inner(title, content)")
        .eq("is_published", true)
        .eq("post_translations.locale", "en")
        .or(`post_translations.title.ilike.${keyword},post_translations.content.ilike.${keyword}`)
        .order("view_count", { ascending: false })
        .limit(30);

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
        .select("id,title,content,created_at,image_url,view_count")
        .eq("is_published", true)
        .or(`title.ilike.${keyword},content.ilike.${keyword}`)
        .order("view_count", { ascending: false })
        .limit(30);

      posts = (data ?? []) as StoryPost[];
    }
  }

  return (
    <main className={styles.storyPage}>
      <div className={styles.storyShell}>
        <BackButton />
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>HORROR POST / SEARCH</p>
            <h1 className={styles.pageTitle}>{dict.story.headerTitle} — {dict.search.title}</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>{dict.common.home}</Link>
            <Link href={`/${locale}/story`} className={styles.topLink}>{dict.nav.stories}</Link>
          </div>
        </header>

        <form action={`/${locale}/story/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={dict.story.searchPlaceholder}
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
            {q ? dict.search.noResults : dict.story.searchPlaceholder}
          </p>
        ) : (
          <div className={styles.feed}>
            {posts.map((post) => {
              const safeTitle = post.title ?? dict.story.untitled;
              const safeContent = post.content ?? "";
              const dateStr = post.created_at
                ? new Date(post.created_at).toLocaleDateString(dateLocale)
                : dict.story.unknownDate;

              return (
                <Link
                  key={post.id}
                  href={`/${locale}/story/${post.id}`}
                  className={styles.postRow}
                >
                  <div className={styles.scoreCol}>
                    <span className={styles.scoreIcon}>👁</span>
                    <span className={styles.scoreNum}>{post.view_count ?? 0}</span>
                  </div>

                  <div className={styles.postContent}>
                    <div className={styles.postMeta}>
                      <span className={styles.badge}>{dict.story.label}</span>
                      <span className={styles.postDate}>{dateStr}</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    <p className={styles.postExcerpt}>
                      {safeContent.length > 150
                        ? `${safeContent.slice(0, 150)}...`
                        : safeContent}
                    </p>
                    <div className={styles.postFooter}>
                      <span>👁 {post.view_count ?? 0} {dict.story.views}</span>
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
    </main>
  );
}
