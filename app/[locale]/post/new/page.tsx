"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";
import { generateSlug, sanitizeSlug } from "@/lib/slug";
import { postUrl } from "@/lib/postUrl";
import { uploadImage } from "@/lib/uploadImage";
import BackButton from "@/components/BackButton";
import StoryCreator from "@/components/StoryCreator";
import { getDictionary } from "@/lib/getDictionary";
import type { Dictionary } from "@/lib/getDictionary";
import tabStyles from "./page.module.css";

export default function PostNewPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();

  // ── タブ管理 ──
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0=POST, 1=STREAM
  const scrollRef = useRef<HTMLDivElement>(null);

  // スクロール位置からアクティブタブを検知
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ratio = el.scrollLeft / el.clientWidth;
    const idx = ratio > 0.5 ? 1 : 0;
    setActiveTab(idx as 0 | 1);
  }, []);

  // タブクリック → スクロール
  const scrollToTab = useCallback((idx: 0 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setActiveTab(idx);
  }, []);

  // ── POST フォーム state ──
  const [labels, setLabels] = useState<Dictionary["postDrawer"] | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; name_en: string | null }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [imageUrl1, setImageUrl1] = useState<string | null>(null);
  const [imageUrl2, setImageUrl2] = useState<string | null>(null);
  const [imageUrl3, setImageUrl3] = useState<string | null>(null);
  const [newImage1, setNewImage1] = useState<File | null>(null);
  const [newImage2, setNewImage2] = useState<File | null>(null);
  const [newImage3, setNewImage3] = useState<File | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load dictionary
  useEffect(() => {
    getDictionary(locale).then((dict) => setLabels(dict.postDrawer));
  }, [locale]);

  // Auth check + categories fetch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });

    supabase
      .from("story_categories")
      .select("id, name, name_en")
      .eq("is_active", true)
      .or("is_user_created.eq.false,approved.eq.true")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data as { id: number; name: string; name_en: string | null }[]);
      });
  }, []);

  // Draft restoration
  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(`draft_post_${userId}`);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.body === "string") setBody(draft.body);
      if (typeof draft.categoryId === "string" || typeof draft.categoryId === "number") {
        setCategoryId(String(draft.categoryId));
      }
      if (typeof draft.slugInput === "string") {
        setSlugInput(draft.slugInput);
        if (draft.slugInput) setSlugManuallyEdited(true);
      }
      const hasContent = draft.title || draft.body || draft.categoryId || draft.slugInput;
      if (hasContent) setDraftRestored(true);
    } catch { /* ignore */ }
  }, [userId]);

  // Auto-save draft
  useEffect(() => {
    if (!userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(`draft_post_${userId}`, JSON.stringify({ categoryId, title, body, slugInput }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [userId, categoryId, title, body, slugInput]);

  const deleteDraft = () => {
    if (!userId) return;
    localStorage.removeItem(`draft_post_${userId}`);
    setDraftRestored(false);
    setCategoryId(""); setTitle(""); setBody(""); setSlugInput(""); setSlugManuallyEdited(false);
    setNewImage1(null); setNewImage2(null); setNewImage3(null);
    setImageUrl1(null); setImageUrl2(null); setImageUrl3(null);
  };

  const saveDraftManually = () => {
    if (!userId) return;
    localStorage.setItem(`draft_post_${userId}`, JSON.stringify({ categoryId, title, body, slugInput }));
    setIsSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labels) return;
    if (!title.trim()) { alert(labels.alertTitleRequired); return; }
    if (!body.trim()) { alert(labels.alertBodyRequired); return; }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { alert(labels.alertSessionExpired); return; }

      const [imageUrlUp1, imageUrlUp2, imageUrlUp3] = await Promise.all([
        uploadImage(newImage1, user.id, "1"),
        uploadImage(newImage2, user.id, "2"),
        uploadImage(newImage3, user.id, "3"),
      ]).catch((err) => {
        alert(`${labels.alertImageFailed}${err.message}`);
        throw err;
      });

      const rawSlug = sanitizeSlug(slugInput.trim());
      const slug = rawSlug || generateSlug(title.trim());

      const { data, error } = await supabase
        .from("post")
        .insert([{
          title: title.trim(),
          content: body.trim(),
          user_id: user.id,
          category_id: categoryId ? Number(categoryId) : null,
          view_count: 0,
          is_published: true,
          image_url: imageUrlUp1,
          image_url_2: imageUrlUp2,
          image_url_3: imageUrlUp3,
          slug,
        }])
        .select()
        .single();

      if (error) {
        console.error("[PostNew] INSERT failed:", error.code, error.message, error.details);
        alert(`${labels.alertPostFailed}${error.message}`);
        return;
      }

      if (locale === "en" && data) {
        await supabase.from("post_translations").insert([{
          post_id: data.id,
          locale: "en",
          title: title.trim(),
          content: body.trim(),
        }]);
      }

      if (userId) localStorage.removeItem(`draft_post_${userId}`);
      const redirectUrl = postUrl(locale, data.id, data.slug);
      window.location.href = redirectUrl;
    } catch {
      // already alerted
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageSlots = [
    { label: labels?.image1 ?? "画像 1", url: imageUrl1, newFile: newImage1, setUrl: setImageUrl1, setFile: setNewImage1 },
    { label: labels?.image2 ?? "画像 2", url: imageUrl2, newFile: newImage2, setUrl: setImageUrl2, setFile: setNewImage2 },
    { label: labels?.image3 ?? "画像 3", url: imageUrl3, newFile: newImage3, setUrl: setImageUrl3, setFile: setNewImage3 },
  ];

  // ── ローディング中 ──
  if (!authChecked || !labels) {
    return (
      <div className={tabStyles.pageWrap}>
        <div style={{ padding: 40, textAlign: "center", color: "#8a7870" }}>
          {labels?.checkingAuth ?? "読み込み中..."}
        </div>
      </div>
    );
  }

  // ── 未ログイン ──
  if (!isLoggedIn) {
    return (
      <div className={tabStyles.pageWrap}>
        <div style={{ maxWidth: 800, margin: "0 auto", paddingTop: 60, textAlign: "center" }}>
          <p style={{ color: "rgba(200,150,140,0.4)", fontFamily: '"装甲明朝","Soukou Mincho",serif' }}>
            {labels.loginRequired}
          </p>
          <Link
            href={`/${locale}?modal=login`}
            style={{ ...linkStyle, display: "inline-block", marginTop: 20 }}
          >
            {labels.loginLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={tabStyles.pageWrap}>
      {/* ── タブバー ── */}
      <div className={tabStyles.tabBar}>
        <button
          className={`${tabStyles.tabItem} ${activeTab === 0 ? tabStyles.tabItemActive : ""}`}
          onClick={() => scrollToTab(0)}
          type="button"
        >
          <span className={tabStyles.tabLabelEn}>POST</span>
          <span className={tabStyles.tabLabelJa}>
            {locale === "en" ? "Article" : "記事投稿"}
          </span>
          <span className={tabStyles.tabIndicator} />
        </button>
        <button
          className={`${tabStyles.tabItem} ${activeTab === 1 ? tabStyles.tabItemActive : ""}`}
          onClick={() => scrollToTab(1)}
          type="button"
        >
          <span className={tabStyles.tabLabelEn}>STREAM</span>
          <span className={tabStyles.tabLabelJa}>
            {locale === "en" ? "Short video" : "ショート動画"}
          </span>
          <span className={tabStyles.tabIndicator} />
        </button>
      </div>

      {/* ── 横スクロールコンテナ ── */}
      <div
        ref={scrollRef}
        className={tabStyles.scrollContainer}
        onScroll={handleScroll}
      >
        {/* ── パネル 1: POST フォーム ── */}
        <div className={`${tabStyles.panel} ${tabStyles.postPanel}`}>
          <div style={shellStyle}>
            <BackButton />
            <header style={headerStyle}>
              <div>
                <p style={breadcrumbStyle}>ARCHIVE / STORY / NEW POST</p>
                <h1 style={titleFontStyle}>{locale === "en" ? "New Post" : "新規投稿"}</h1>
              </div>
              <Link href={`/${locale}/post`} style={linkStyle}>
                {locale === "en" ? "Cancel" : "キャンセル"}
              </Link>
            </header>

            <section style={cardStyle}>
              <form onSubmit={handleSubmit} style={formStyle}>
                <p style={{ fontSize: 10, color: "rgba(200,150,140,0.3)", letterSpacing: "0.1em", margin: 0 }}>
                  {labels.postedAs}
                </p>

                <div style={draftNoticeStyle}>{labels.draftNotice}</div>

                {/* カテゴリー */}
                <div style={groupStyle}>
                  <label style={labelStyle}>{labels.genre}</label>
                  <select style={controlStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">{labels.selectGenre}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {locale === "en" ? (cat.name_en ?? cat.name) : cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* タイトル */}
                <div style={groupStyle}>
                  <label style={labelStyle}>{labels.titleLabel}</label>
                  <input
                    style={controlStyle}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTitle(val);
                      if (!slugManuallyEdited) {
                        const auto = generateSlug(val);
                        setSlugInput(auto ?? "");
                      }
                    }}
                  />
                </div>

                {/* スラッグ */}
                <div style={groupStyle}>
                  <label style={labelStyle}>{labels.slugLabel}</label>
                  <input
                    style={controlStyle}
                    type="text"
                    value={slugInput}
                    onChange={(e) => {
                      const v = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .replace(/\s+/g, "-")
                        .replace(/-+/g, "-");
                      setSlugInput(v);
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="e.g. shisaki-eiko"
                  />
                  <small style={slugHintStyle}>{labels.slugHint}</small>
                </div>

                {/* 画像 */}
                <div style={groupStyle}>
                  <label style={labelStyle}>{locale === "en" ? "Images (up to 3)" : "画像（最大3枚）"}</label>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {imageSlots.map((slot, idx) => (
                      <div key={idx} style={imageSlotStyle}>
                        {(slot.newFile || slot.url) ? (
                          <div style={{ position: "relative" }}>
                            <img
                              src={slot.newFile ? URL.createObjectURL(slot.newFile) : slot.url!}
                              alt={slot.label}
                              style={imagePreviewStyle}
                            />
                            <button
                              type="button"
                              style={imageRemoveBtn}
                              onClick={() => { slot.setUrl(null); slot.setFile(null); }}
                              title={locale === "en" ? "Remove image" : "画像を削除"}
                            >
                              &times;
                            </button>
                          </div>
                        ) : (
                          <label style={imageAddLabel}>
                            <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                            <span style={{ fontSize: 11 }}>{slot.label}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                if (f) slot.setFile(f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 本文 */}
                <div style={groupStyle}>
                  <label style={labelStyle}>{labels.bodyLabel}</label>
                  <textarea
                    style={{ ...controlStyle, minHeight: 200, resize: "vertical" }}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="..."
                  />
                </div>

                {/* ボタン行 */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" style={secondaryBtn} onClick={saveDraftManually} disabled={isSubmitting}>
                    {isSaved ? labels.draftSaved : labels.saveDraft}
                  </button>
                  <button type="submit" style={primaryBtn} disabled={isSubmitting}>
                    {isSubmitting ? labels.posting : labels.publish}
                  </button>
                </div>

                {/* 下書き復元通知 */}
                {draftRestored && (
                  <div style={draftRestoredRowStyle}>
                    <span style={{ fontSize: 9, color: "rgba(100,180,120,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      {labels.draftRestored}
                    </span>
                    <button type="button" style={draftDeleteBtnStyle} onClick={deleteDraft}>
                      {labels.deleteDraft}
                    </button>
                  </div>
                )}
              </form>
            </section>
          </div>
        </div>

        {/* ── パネル 2: STREAM (StoryCreator) ── */}
        <div className={`${tabStyles.panel} ${tabStyles.streamPanel}`}>
          <StoryCreator locale={locale} embedded />
        </div>
      </div>
    </div>
  );
}

// ── Styles (matching edit page) ──────────────────────────────
const shellStyle: React.CSSProperties = { maxWidth: 800, margin: "0 auto", paddingTop: 24 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(180,100,110,0.25)", paddingBottom: 20, marginBottom: 32 };
const breadcrumbStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "#7a6a60", marginBottom: 4 };
const titleFontStyle: React.CSSProperties = { fontSize: 22, fontWeight: 600, color: "#e8d8d0", margin: 0 };
const linkStyle: React.CSSProperties = { fontSize: 13, color: "#b08888", textDecoration: "none", border: "1px solid rgba(180,100,110,0.3)", padding: "6px 14px", borderRadius: 4 };
const cardStyle: React.CSSProperties = { background: "rgba(30, 10, 15, 0.6)", border: "1px solid rgba(180,100,110,0.2)", borderRadius: 6, padding: 24 };
const formStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const groupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#a09080", letterSpacing: "0.05em" };
const controlStyle: React.CSSProperties = { background: "rgba(20,8,10,0.8)", border: "1px solid rgba(180,100,110,0.3)", color: "#e0d0c8", borderRadius: 4, padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { padding: "10px 24px", background: "#6b1a22", border: "1px solid #8b3a42", color: "#f0e0e0", borderRadius: 4, cursor: "pointer", fontSize: 14 };
const secondaryBtn: React.CSSProperties = { padding: "8px 16px", background: "rgba(40,10,15,0.8)", border: "1px solid rgba(245,200,100,0.25)", color: "rgba(245,200,100,0.6)", borderRadius: 4, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em" };
const slugHintStyle: React.CSSProperties = { fontSize: 10, color: "rgba(200,150,140,0.35)", lineHeight: 1.5, letterSpacing: "0.03em" };
const draftNoticeStyle: React.CSSProperties = { fontSize: 10, color: "rgba(245,200,100,0.5)", background: "rgba(245,200,100,0.04)", border: "1px solid rgba(245,200,100,0.12)", padding: "8px 12px", letterSpacing: "0.04em", lineHeight: 1.5 };
const draftRestoredRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "rgba(100,180,120,0.04)", border: "1px solid rgba(100,180,120,0.12)" };
const draftDeleteBtnStyle: React.CSSProperties = { background: "none", border: "1px solid rgba(200,60,60,0.25)", color: "rgba(200,60,60,0.45)", fontSize: 9, padding: "2px 8px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" };
const imageSlotStyle: React.CSSProperties = { width: 100, height: 100, borderRadius: 6, overflow: "hidden", flexShrink: 0 };
const imagePreviewStyle: React.CSSProperties = { width: 100, height: 100, objectFit: "cover", display: "block", borderRadius: 6 };
const imageRemoveBtn: React.CSSProperties = { position: "absolute", top: 2, right: 2, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, lineHeight: "20px", textAlign: "center", padding: 0 };
const imageAddLabel: React.CSSProperties = { width: 100, height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", borderRadius: 6, color: "#a09080", cursor: "pointer" };
