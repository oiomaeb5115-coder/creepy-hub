"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin, getAccessToken } from "@/lib/auth";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import { uploadImage } from "@/lib/uploadImage";
import { uploadPostVideo } from "@/lib/uploadPostVideo";
import { validateVideoFile } from "@/lib/validateVideoFile";
import { getVideoDuration } from "@/lib/getVideoDuration";

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

export default function StoryEditPage() {
  const params = useParams<{ locale: string; id: string }>();
  const locale = params?.locale ?? "ja";
  const postId = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([{ id: 1, title: "", body: "" }]);
  const [postSlug, setPostSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 画像関連 state
  const [imageUrl1, setImageUrl1] = useState<string | null>(null);
  const [imageUrl2, setImageUrl2] = useState<string | null>(null);
  const [imageUrl3, setImageUrl3] = useState<string | null>(null);
  const [newImage1, setNewImage1] = useState<File | null>(null);
  const [newImage2, setNewImage2] = useState<File | null>(null);
  const [newImage3, setNewImage3] = useState<File | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: post, error } = await supabase
        .from("post")
        .select("id, title, content, category_id, user_id, slug, image_url, image_url_2, image_url_3, video_url")
        .eq("id", postId)
        .single();

      if (error || !post) { router.replace(`/${locale}`); return; }

      const isAuthor = post.user_id === session.user.id;
      const isAdmin = await getIsAdmin();
      if (!isAuthor && !isAdmin) { router.replace(postUrl(locale, postId!, post.slug)); return; }

      const { data: cats } = await supabase
        .from("story_categories")
        .select("id, name")
        .eq("is_active", true)
        .or("is_user_created.eq.false,approved.eq.true")
        .order("sort_order", { ascending: true });

      setCategories(cats ?? []);
      setAuthorized(true);
      setPostSlug(post.slug ?? null);
      setTitle(post.title ?? "");
      setCategoryId(post.category_id ? String(post.category_id) : "");
      setChapters(parseChapters(post.content ?? ""));
      setImageUrl1(post.image_url ?? null);
      setImageUrl2(post.image_url_2 ?? null);
      setImageUrl3(post.image_url_3 ?? null);
      setVideoUrl(post.video_url ?? null);
      setLoading(false);
    };
    init();
  }, [locale, postId, router]);

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
    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { alert("セッションが切れました。再ログインしてください。"); return; }

      // 新しい画像をアップロード
      const [uploaded1, uploaded2, uploaded3] = await Promise.all([
        uploadImage(newImage1, user.id, "1"),
        uploadImage(newImage2, user.id, "2"),
        uploadImage(newImage3, user.id, "3"),
      ]).catch((err) => {
        alert(`画像アップロードに失敗しました: ${err.message}`);
        throw err;
      });

      // 動画アップロード
      let uploadedVideo: string | null = null;
      if (newVideo) {
        uploadedVideo = await uploadPostVideo(newVideo, user.id).catch((err) => {
          alert(`動画アップロードに失敗しました: ${err.message}`);
          throw err;
        });
      }

      // 新しい画像がアップロードされた場合はそのURL、そうでなければ現在のURL
      const finalImageUrl1 = uploaded1 ?? imageUrl1;
      const finalImageUrl2 = uploaded2 ?? imageUrl2;
      const finalImageUrl3 = uploaded3 ?? imageUrl3;
      const finalVideoUrl = uploadedVideo ?? videoUrl;

      const mergedContent = chapters
        .map((ch) => {
          const title = ch.title.trim();
          const heading = title ? `## ${title}\n\n` : "";
          return `${heading}${ch.body.trim()}`;
        })
        .join("\n\n");

      const token = await getAccessToken();
      const res = await fetch(`/api/post/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          content: mergedContent,
          category_id: categoryId ? Number(categoryId) : null,
          image_url: finalImageUrl1,
          image_url_2: finalImageUrl2,
          image_url_3: finalImageUrl3,
          video_url: finalVideoUrl,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(`更新失敗: ${json.error ?? res.statusText}`);
        return;
      }
      router.push(postUrl(locale, postId!, postSlug));
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

  const imageSlots = [
    { label: "画像 1", url: imageUrl1, newFile: newImage1, setUrl: setImageUrl1, setFile: setNewImage1 },
    { label: "画像 2", url: imageUrl2, newFile: newImage2, setUrl: setImageUrl2, setFile: setNewImage2 },
    { label: "画像 3", url: imageUrl3, newFile: newImage3, setUrl: setImageUrl3, setFile: setNewImage3 },
  ];

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <BackButton />
        <header style={headerStyle}>
          <div>
            <p style={breadcrumbStyle}>ARCHIVE / STORY / EDIT</p>
            <h1 style={titleStyle}>記事を編集</h1>
          </div>
          <Link href={postUrl(locale, postId!, postSlug)} style={linkStyle}>キャンセル</Link>
        </header>

        <section style={cardStyle}>
          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>カテゴリー</label>
              <select style={controlStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">選択してください</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>記事タイトル</label>
              <input style={controlStyle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* 画像アップロード */}
            <div style={groupStyle}>
              <label style={labelStyle}>画像（最大3枚）</label>
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
                          title="画像を削除"
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

            {/* 動画アップロード */}
            <div style={groupStyle}>
              <label style={labelStyle}>動画 (9:16)</label>
              <small style={{ fontSize: 10, color: "rgba(200,150,140,0.35)", lineHeight: 1.5 }}>
                MP4/WebM、3分以内、50MB以内
              </small>
              {(videoPreviewUrl || videoUrl) ? (
                <div style={{ position: "relative", width: 135, aspectRatio: "9/16", borderRadius: 6, overflow: "hidden", background: "#000" }}>
                  <video
                    src={videoPreviewUrl || videoUrl!}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    playsInline
                    muted
                  />
                  <button
                    type="button"
                    style={imageRemoveBtn}
                    onClick={() => {
                      setNewVideo(null);
                      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                      setVideoPreviewUrl(null);
                      setVideoUrl(null);
                    }}
                    title="動画を削除"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <label style={{ ...imageAddLabel, width: 135, height: 240, aspectRatio: "9/16" }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>▶</span>
                  <span style={{ fontSize: 11 }}>動画 (9:16)</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (!f) return;
                      if (!["video/mp4", "video/webm", "video/quicktime"].includes(f.type)) {
                        alert("動画はMP4、WebMまたはMOV形式のみ対応しています"); return;
                      }
                      if (f.size > 75 * 1024 * 1024) {
                        alert("動画ファイルは75MB以内にしてください"); return;
                      }
                      const valid = await validateVideoFile(f);
                      if (!valid) { alert("動画はMP4、WebMまたはMOV形式のみ対応しています"); return; }
                      const dur = await getVideoDuration(f);
                      if (dur > 180000) { alert("動画は3分以内にしてください"); return; }
                      setNewVideo(f);
                      setVideoPreviewUrl(URL.createObjectURL(f));
                    }}
                  />
                </label>
              )}
            </div>

            <div style={{ ...groupStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#c8b8b0" }}>章構成</h3>
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
                  <input style={controlStyle} type="text" value={ch.title} onChange={(e) => updateChapter(i, "title", e.target.value)} placeholder={`章${i + 1}`} />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>本文</label>
                  <textarea style={{ ...controlStyle, height: 180, resize: "vertical" }} value={ch.body} onChange={(e) => updateChapter(i, "body", e.target.value)} />
                </div>
              </div>
            ))}

            <button type="button" style={{ ...secondaryBtn, marginTop: 12 }} onClick={addChapter}>章を追加</button>

            <div style={{ textAlign: "right", marginTop: 16 }}>
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
const shellStyle: React.CSSProperties = { maxWidth: 800, margin: "0 auto", paddingTop: 110 };
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

// 画像スロット用スタイル
const imageSlotStyle: React.CSSProperties = { width: 100, height: 100, borderRadius: 6, overflow: "hidden", flexShrink: 0 };
const imagePreviewStyle: React.CSSProperties = { width: 100, height: 100, objectFit: "cover", display: "block", borderRadius: 6 };
const imageRemoveBtn: React.CSSProperties = { position: "absolute", top: 2, right: 2, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, lineHeight: "20px", textAlign: "center", padding: 0 };
const imageAddLabel: React.CSSProperties = { width: 100, height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", borderRadius: 6, color: "#a09080", cursor: "pointer" };
