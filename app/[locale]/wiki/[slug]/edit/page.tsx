"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";
import BackButton from "@/components/BackButton";

type PageType = "general" | "urban_legend" | "incident" | "work" | "region" | "term" | "person";
type Chapter = { id: number; title: string; body: string };

function parseChapters(content: string): Chapter[] {
  if (!content.trim()) return [{ id: 1, title: "", body: "" }];
  const parts = content.split(/\n\n(?=## )/);
  return parts.map((part, i) => {
    const lines = part.split("\n");
    const titleLine = lines[0] ?? "";
    const title = titleLine.startsWith("## ") ? titleLine.slice(3) : "";
    const body = lines.slice(title ? 2 : 0).join("\n").trim();
    return { id: i + 1, title, body };
  });
}

export default function WikiEditPage() {
  const params = useParams<{ locale: string; slug: string }>();
  const locale = params?.locale ?? "ja";
  const slug = params?.slug ?? "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pageType, setPageType] = useState<PageType>("general");
  const [chapters, setChapters] = useState<Chapter[]>([{ id: 1, title: "", body: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: page, error } = await supabase
        .from("wiki_pages")
        .select("title, subtitle, summary, content, page_type, author_id")
        .eq("slug", slug)
        .eq("locale", "ja")
        .single();

      if (error || !page) { router.replace(`/${locale}/wiki`); return; }

      const isAuthor = page.author_id === session.user.id;
      const isAdmin = await getIsAdmin();
      if (!isAuthor && !isAdmin) { router.replace(`/${locale}/wiki/${slug}`); return; }

      setAuthorized(true);
      setTitle(page.title ?? "");
      setSubtitle(page.subtitle ?? "");
      setSummary(page.summary ?? "");
      setPageType((page.page_type as PageType) ?? "general");
      setChapters(parseChapters(page.content ?? ""));
      setLoading(false);
    };
    init();
  }, [locale, slug, router]);

  const addChapter = () =>
    setChapters((prev) => [...prev, { id: Date.now(), title: "", body: "" }]);

  const removeChapter = (id: number) => {
    if (chapters.length === 1) { alert("章は最低1つ必要です。"); return; }
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setChapters((prev) => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };

  const moveDown = (i: number) => {
    if (i === chapters.length - 1) return;
    setChapters((prev) => { const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; });
  };

  const updateChapter = (i: number, key: "title" | "body", val: string) =>
    setChapters((prev) => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert("タイトルを入力してください。"); return; }
    if (!summary.trim()) { alert("概要を入力してください。"); return; }
    setIsSubmitting(true);
    try {
      const content = chapters
        .map((ch, i) => `## ${ch.title.trim() || `章${i + 1}`}\n\n${ch.body.trim()}`)
        .join("\n\n");

      const { error } = await supabase
        .from("wiki_pages")
        .update({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          summary: summary.trim(),
          content,
          page_type: pageType,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", slug)
        .eq("locale", "ja");

      if (error) { alert(`更新失敗: ${error.message}`); return; }
      router.push(`/${locale}/wiki/${slug}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !authorized) {
    return (
      <main style={pageStyle}>
        <div style={{ padding: 40, textAlign: "center", color: "#8a7870" }}>
          {loading ? "読み込み中..." : "権限がありません"}
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <BackButton />
        <header style={headerStyle}>
          <div>
            <p style={breadcrumbStyle}>ARCHIVE / WIKI / EDIT</p>
            <h1 style={titleStyle}>Wiki を編集</h1>
          </div>
          <Link href={`/${locale}/wiki/${slug}`} style={linkStyle}>キャンセル</Link>
        </header>

        <section style={cardStyle}>
          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>タイトル</label>
              <input style={controlStyle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>サブタイトル</label>
              <input style={controlStyle} type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>ページ種別</label>
              <select style={controlStyle} value={pageType} onChange={(e) => setPageType(e.target.value as PageType)}>
                <option value="general">一般</option>
                <option value="urban_legend">都市伝説</option>
                <option value="incident">怪事件</option>
                <option value="work">作品</option>
                <option value="region">地域</option>
                <option value="term">用語</option>
                <option value="person">人物</option>
              </select>
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>概要</label>
              <textarea style={{ ...controlStyle, height: 80, resize: "vertical" }} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#c8b8b0" }}>章構成</h3>
              <button type="button" style={secondaryBtn} onClick={addChapter}>章を追加</button>
            </div>

            {chapters.map((ch, i) => (
              <div key={ch.id} style={chapterCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "#a09080" }}>章 {i + 1}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" style={miniBtn} onClick={() => moveUp(i)}>上へ</button>
                    <button type="button" style={miniBtn} onClick={() => moveDown(i)}>下へ</button>
                    <button type="button" style={{ ...miniBtn, color: "#e08080", borderColor: "rgba(180,60,60,0.4)" }} onClick={() => removeChapter(ch.id)}>削除</button>
                  </div>
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>章タイトル</label>
                  <input style={controlStyle} type="text" value={ch.title} onChange={(e) => updateChapter(i, "title", e.target.value)} />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>本文</label>
                  <textarea style={{ ...controlStyle, height: 180, resize: "vertical" }} value={ch.body} onChange={(e) => updateChapter(i, "body", e.target.value)} />
                </div>
              </div>
            ))}

            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button type="submit" style={primaryBtn} disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "変更を保存"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#0d0808", color: "#c8b8b0", padding: "0 16px 80px" };
const shellStyle: React.CSSProperties = { maxWidth: 800, margin: "0 auto", paddingTop: 24 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(180,100,110,0.25)", paddingBottom: 20, marginBottom: 32 };
const breadcrumbStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "#7a6a60", marginBottom: 4 };
const titleStyle: React.CSSProperties = { fontSize: 22, fontWeight: 600, color: "#e8d8d0", margin: 0 };
const linkStyle: React.CSSProperties = { fontSize: 13, color: "#b08888", textDecoration: "none", border: "1px solid rgba(180,100,110,0.3)", padding: "6px 14px", borderRadius: 4 };
const cardStyle: React.CSSProperties = { background: "rgba(30, 10, 15, 0.6)", border: "1px solid rgba(180,100,110,0.2)", borderRadius: 6, padding: 24 };
const formStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const groupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#a09080", letterSpacing: "0.05em" };
const controlStyle: React.CSSProperties = { background: "rgba(20,8,10,0.8)", border: "1px solid rgba(180,100,110,0.3)", color: "#e0d0c8", borderRadius: 4, padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" };
const chapterCard: React.CSSProperties = { background: "rgba(20,5,10,0.5)", border: "1px solid rgba(180,100,110,0.15)", borderRadius: 4, padding: 16 };
const primaryBtn: React.CSSProperties = { padding: "10px 24px", background: "#6b1a22", border: "1px solid #8b3a42", color: "#f0e0e0", borderRadius: 4, cursor: "pointer", fontSize: 14 };
const secondaryBtn: React.CSSProperties = { padding: "6px 14px", background: "rgba(40,10,15,0.8)", border: "1px solid rgba(180,100,110,0.35)", color: "#c8a8b0", borderRadius: 4, cursor: "pointer", fontSize: 12 };
const miniBtn: React.CSSProperties = { padding: "3px 8px", background: "rgba(40,10,15,0.6)", border: "1px solid rgba(180,100,110,0.25)", color: "#a09080", borderRadius: 3, cursor: "pointer", fontSize: 11 };
