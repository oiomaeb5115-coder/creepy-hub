import Link from "next/link";
import { searchAll } from "@/lib/search";
import SearchBox from "@/components/SearchBox";
import BackButton from "@/components/BackButton";

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

type StoryRow = {
  id: number;
  title: string | null;
  content: string | null;
  view_count: number | null;
};

type WikiRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  view_count: number | null;
};

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params;
  const { q = "" } = await searchParams;

  const { stories, wiki, storyError, wikiError } = q.trim()
    ? await searchAll(q.trim(), locale)
    : { stories: [], wiki: [], storyError: null, wikiError: null };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #07111f 0%, #020812 100%)",
        color: "#e8edf7",
        padding: "32px 20px 72px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <BackButton />
        <header style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              letterSpacing: "0.12em",
              color: "#8fa2bf",
            }}
          >
            SEARCH
          </p>

          <h1 style={{ margin: 0, fontSize: "clamp(34px, 5vw, 54px)" }}>
            検索
          </h1>

          <p style={{ marginTop: 12, color: "#a9b9cf" }}>
            投稿とWikiをまとめて検索できます
          </p>
        </header>

        <div style={{ marginBottom: 28 }}>
          <SearchBox locale={locale} />
        </div>

        <p style={{ color: "#b8c5d7" }}>
          検索語: {q.trim() ? q : "未入力"}
        </p>

        <section style={{ marginTop: 30 }}>
          <h2>Stories</h2>

          {storyError ? (
            <p>Storiesの検索に失敗しました: {storyError.message}</p>
          ) : stories.length === 0 ? (
            <p>該当する投稿はありません。</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {(stories as StoryRow[]).map((post) => (
                <Link
                  key={post.id}
                  href={`/${locale}/story/${post.id}`}
                  style={{
                    display: "block",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(104, 128, 165, 0.24)",
                    background: "rgba(7, 14, 25, 0.94)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px" }}>{post.title ?? "無題"}</h3>
                  <p style={{ margin: "0 0 10px", color: "#c8d3e4" }}>
                    {(post.content ?? "").slice(0, 120)}
                  </p>
                  <span style={{ color: "#8ea4c2", fontSize: 13 }}>
                    👁 {post.view_count ?? 0}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 40 }}>
          <h2>Wiki</h2>

          {wikiError ? (
            <p>Wikiの検索に失敗しました: {wikiError.message}</p>
          ) : wiki.length === 0 ? (
            <p>該当するWikiはありません。</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {(wiki as WikiRow[]).map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/wiki/${item.slug}`}
                  style={{
                    display: "block",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(104, 128, 165, 0.24)",
                    background: "rgba(7, 14, 25, 0.94)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px" }}>{item.title}</h3>
                  <p style={{ margin: "0 0 10px", color: "#c8d3e4" }}>
                    {item.summary ?? "概要はまだ設定されていません。"}
                  </p>
                  <span style={{ color: "#8ea4c2", fontSize: 13 }}>
                    👁 {item.view_count ?? 0}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}