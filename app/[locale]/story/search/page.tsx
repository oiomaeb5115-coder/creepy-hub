import Link from "next/link";
import { supabase } from "@/lib/supabase";
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

  const keyword = `%${q}%`;

  const { data } = q
    ? await supabase
        .from("post")
        .select("id,title,content,created_at,image_url,view_count")
        .eq("is_published", true)
        .or(`title.ilike.${keyword},content.ilike.${keyword}`)
        .order("view_count", { ascending: false })
        .limit(30)
    : { data: [] };

  const posts = (data ?? []) as StoryPost[];

  return (
    <main className={styles.storyPage}>
      <div className={styles.storyShell}>
        <BackButton />
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>HORROR POST / SEARCH</p>
            <h1 className={styles.pageTitle}>怪談検索</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>ホーム</Link>
            <Link href={`/${locale}/story`} className={styles.topLink}>一覧へ</Link>
          </div>
        </header>

        <form action={`/${locale}/story/search`} method="get" className={styles.searchBar}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="怪談を検索..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>検索</button>
        </form>

        {q && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8a7870" }}>
            「{q}」の検索結果：{posts.length} 件
          </p>
        )}

        {posts.length === 0 ? (
          <p className={styles.emptyText}>
            {q ? "該当する怪談が見つかりませんでした。" : "キーワードを入力して検索してください。"}
          </p>
        ) : (
          <div className={styles.feed}>
            {posts.map((post) => {
              const safeTitle = post.title ?? "無題";
              const safeContent = post.content ?? "";
              const dateStr = post.created_at
                ? new Date(post.created_at).toLocaleDateString("ja-JP")
                : "日付不明";

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
                      <span className={styles.badge}>怪談</span>
                      <span className={styles.postDate}>{dateStr}</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    <p className={styles.postExcerpt}>
                      {safeContent.length > 150
                        ? `${safeContent.slice(0, 150)}...`
                        : safeContent}
                    </p>
                    <div className={styles.postFooter}>
                      <span>👁 {post.view_count ?? 0} 閲覧</span>
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
