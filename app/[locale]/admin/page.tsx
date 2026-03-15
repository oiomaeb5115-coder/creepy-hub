"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin, getAccessToken } from "@/lib/auth";
import BackButton from "@/components/BackButton";

type StoryRow = { id: number; title: string | null; created_at: string | null };
type WikiRow = { slug: string; title: string; updated_at: string | null };

type TranslateStatus = "idle" | "loading" | "done" | "error" | "exists";

export default function AdminPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [wikis, setWikis] = useState<WikiRow[]>([]);
  const [storyStatus, setStoryStatus] = useState<Record<number, TranslateStatus>>({});
  const [wikiStatus, setWikiStatus] = useState<Record<string, TranslateStatus>>({});

  useEffect(() => {
    const init = async () => {
      const isAdmin = await getIsAdmin();
      if (!isAdmin) {
        router.replace(`/${locale}`);
        return;
      }

      // 未翻訳ストーリーを取得
      const { data: allStories } = await supabase
        .from("post")
        .select("id, title, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: translatedStories } = await supabase
        .from("post_translations")
        .select("post_id")
        .eq("locale", "en");

      const translatedIds = new Set((translatedStories ?? []).map((t) => t.post_id));
      const untranslated = (allStories ?? []).filter((s) => !translatedIds.has(s.id));
      setStories(untranslated);

      // 未翻訳 Wiki を取得
      const { data: jaWikis } = await supabase
        .from("wiki_pages")
        .select("slug, title, updated_at")
        .eq("locale", "ja")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(100);

      const { data: enWikis } = await supabase
        .from("wiki_pages")
        .select("slug")
        .eq("locale", "en");

      const enSlugs = new Set((enWikis ?? []).map((w) => w.slug));
      const untranslatedWikis = (jaWikis ?? []).filter((w) => !enSlugs.has(w.slug));
      setWikis(untranslatedWikis);

      setChecking(false);
    };

    init();
  }, [locale, router]);

  const translateStory = async (postId: number) => {
    setStoryStatus((prev) => ({ ...prev, [postId]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/translate/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ postId }),
      });
      const json = await res.json();
      if (json.alreadyTranslated) {
        setStoryStatus((prev) => ({ ...prev, [postId]: "exists" }));
      } else if (!res.ok) {
        setStoryStatus((prev) => ({ ...prev, [postId]: "error" }));
      } else {
        setStoryStatus((prev) => ({ ...prev, [postId]: "done" }));
        setStories((prev) => prev.filter((s) => s.id !== postId));
      }
    } catch {
      setStoryStatus((prev) => ({ ...prev, [postId]: "error" }));
    }
  };

  const translateWiki = async (slug: string) => {
    setWikiStatus((prev) => ({ ...prev, [slug]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/translate/wiki", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (json.alreadyTranslated) {
        setWikiStatus((prev) => ({ ...prev, [slug]: "exists" }));
      } else if (!res.ok) {
        setWikiStatus((prev) => ({ ...prev, [slug]: "error" }));
      } else {
        setWikiStatus((prev) => ({ ...prev, [slug]: "done" }));
        setWikis((prev) => prev.filter((w) => w.slug !== slug));
      }
    } catch {
      setWikiStatus((prev) => ({ ...prev, [slug]: "error" }));
    }
  };

  if (checking) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>認証確認中...</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <BackButton />

        <header style={headerStyle}>
          <div>
            <p style={breadcrumbStyle}>ADMIN / DASHBOARD</p>
            <h1 style={titleStyle}>管理者ダッシュボード</h1>
            <p style={subtitleStyle}>翻訳・コンテンツ管理</p>
          </div>
          <Link href={`/${locale}`} style={topLinkStyle}>
            ホームへ
          </Link>
        </header>

        {/* ストーリー翻訳 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            未翻訳ストーリー（{stories.length}件）
          </h2>
          {stories.length === 0 ? (
            <p style={emptyStyle}>すべて翻訳済みです</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>タイトル</th>
                  <th style={thStyle}>投稿日</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => {
                  const st = storyStatus[story.id] ?? "idle";
                  return (
                    <tr key={story.id} style={trStyle}>
                      <td style={tdStyle}>
                        <Link
                          href={`/${locale}/story/${story.id}`}
                          style={linkStyle}
                        >
                          {story.title ?? `#${story.id}`}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        {story.created_at
                          ? new Date(story.created_at).toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <button
                          style={actionButtonStyle(st)}
                          disabled={st === "loading" || st === "done" || st === "exists"}
                          onClick={() => translateStory(story.id)}
                        >
                          {st === "loading"
                            ? "翻訳中..."
                            : st === "done"
                            ? "完了"
                            : st === "exists"
                            ? "翻訳済"
                            : st === "error"
                            ? "再試行"
                            : "英語翻訳"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Wiki 翻訳 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            未翻訳 Wiki（{wikis.length}件）
          </h2>
          {wikis.length === 0 ? (
            <p style={emptyStyle}>すべて翻訳済みです</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>タイトル</th>
                  <th style={thStyle}>更新日</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {wikis.map((wiki) => {
                  const st = wikiStatus[wiki.slug] ?? "idle";
                  return (
                    <tr key={wiki.slug} style={trStyle}>
                      <td style={tdStyle}>
                        <Link
                          href={`/${locale}/wiki/${wiki.slug}`}
                          style={linkStyle}
                        >
                          {wiki.title}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        {wiki.updated_at
                          ? new Date(wiki.updated_at).toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <button
                          style={actionButtonStyle(st)}
                          disabled={st === "loading" || st === "done" || st === "exists"}
                          onClick={() => translateWiki(wiki.slug)}
                        >
                          {st === "loading"
                            ? "翻訳中..."
                            : st === "done"
                            ? "完了"
                            : st === "exists"
                            ? "翻訳済"
                            : st === "error"
                            ? "再試行"
                            : "英語翻訳"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---- スタイル ---- */
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0d0808",
  color: "#c8b8b0",
  padding: "0 16px 80px",
};

const shellStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  paddingTop: 24,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  borderBottom: "1px solid rgba(180,100,110,0.25)",
  paddingBottom: 20,
  marginBottom: 32,
};

const breadcrumbStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.15em",
  color: "#7a6a60",
  marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "#e8d8d0",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a6a60",
  marginTop: 4,
};

const topLinkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#b08888",
  textDecoration: "none",
  border: "1px solid rgba(180,100,110,0.3)",
  padding: "6px 14px",
  borderRadius: 4,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 48,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#e0c8c0",
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: "1px solid rgba(180,100,110,0.15)",
};

const emptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a6a60",
  fontStyle: "italic",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  color: "#7a6a60",
  fontWeight: 500,
  borderBottom: "1px solid rgba(180,100,110,0.2)",
  fontSize: 12,
  letterSpacing: "0.08em",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(180,100,110,0.1)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};

const linkStyle: React.CSSProperties = {
  color: "#c8a8b0",
  textDecoration: "none",
};

const actionButtonStyle = (
  st: TranslateStatus
): React.CSSProperties => ({
  padding: "5px 12px",
  fontSize: 12,
  background:
    st === "done" || st === "exists"
      ? "rgba(40, 80, 40, 0.4)"
      : st === "error"
      ? "rgba(80, 20, 20, 0.5)"
      : "rgba(40, 10, 15, 0.85)",
  border: `1px solid ${
    st === "done" || st === "exists"
      ? "rgba(80, 160, 80, 0.4)"
      : st === "error"
      ? "rgba(200, 60, 60, 0.5)"
      : "rgba(180, 100, 110, 0.4)"
  }`,
  color:
    st === "done" || st === "exists"
      ? "#80c080"
      : st === "error"
      ? "#e08080"
      : "#d4a0a8",
  cursor: st === "loading" || st === "done" || st === "exists" ? "default" : "pointer",
  borderRadius: 4,
});
