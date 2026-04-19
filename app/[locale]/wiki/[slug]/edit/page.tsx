"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin, getAccessToken } from "@/lib/auth";
import { compressImage } from "@/lib/compressImage";
import { validateImageFile } from "@/lib/validateImageFile";
import BackButton from "@/components/BackButton";
import { roundLocation, normalizePrecision, type LocationPrecision } from "@/lib/roundLocation";
import LocationPickerModal from "@/components/map/LocationPickerModal";
import type { SpotCategory } from "@/lib/mapPalettes";
import { MAP_PUBLIC_TO_WEB } from "@/lib/isCreepyHubApp";

type Chapter = { id: number; title: string; body: string; imageFile: File | null; imagePreview: string; existingImageUrl: string };
type Category = { id: number; slug: string; name: string };

function parseChapters(content: string): Chapter[] {
  if (!content.trim()) return [{ id: 1, title: "", body: "", imageFile: null, imagePreview: "", existingImageUrl: "" }];
  const parts = content.split(/\n\n(?=## )/);
  return parts.map((part, i) => {
    const lines = part.split("\n");
    const titleLine = lines[0] ?? "";
    const title = titleLine.startsWith("## ") ? titleLine.slice(3) : "";
    let body = lines.slice(title ? 2 : 0).join("\n").trim();
    // 末尾の画像マークダウンを抽出
    const imgMatch = body.match(/\n\n!\[.*?\]\((https?:\/\/[^)]+)\)\s*$/);
    let existingImageUrl = "";
    if (imgMatch) {
      existingImageUrl = imgMatch[1];
      body = body.slice(0, imgMatch.index!).trim();
    }
    return { id: i + 1, title, body, imageFile: null, imagePreview: "", existingImageUrl };
  });
}

export default function WikiEditPage() {
  const params = useParams<{ locale: string; slug: string }>();
  const locale = params?.locale ?? "ja";
  const slug = decodeURIComponent(params?.slug ?? "");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([{ id: 1, title: "", body: "", imageFile: null, imagePreview: "", existingImageUrl: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  // サムネイル
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState("");

  // 位置情報
  const canPickLocation = MAP_PUBLIC_TO_WEB || (typeof window !== "undefined" && (
    (window as unknown as Record<string, unknown>).__CREEPYHUB_IOS__ === true ||
    (window as unknown as Record<string, unknown>).__CREEPYHUB_ANDROID__ === true
  ));
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [locName, setLocName] = useState<string | null>(null);
  const [locPrecision, setLocPrecision] = useState<LocationPrecision | null>(null);
  const [mapCategory, setMapCategory] = useState<SpotCategory | null>(null);
  const [locPickerOpen, setLocPickerOpen] = useState(false);
  const [locationDirty, setLocationDirty] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: page, error } = await supabase
        .from("wiki_pages")
        .select("id, title, subtitle, summary, content, author_id, image_url, lat, lng, location_name, location_precision, map_category")
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
      setChapters(parseChapters(page.content ?? ""));
      setExistingThumbnailUrl(page.image_url ?? "");
      setLocLat(page.lat ?? null);
      setLocLng(page.lng ?? null);
      setLocName(page.location_name ?? null);
      setLocPrecision((page.location_precision as LocationPrecision | null) ?? null);
      setMapCategory((page.map_category as SpotCategory | null) ?? null);

      const [joinsResult, catsResult] = await Promise.all([
        supabase.from("wiki_page_categories").select("category_id").eq("wiki_page_id", page.id),
        supabase.from("categories").select("id, slug, name").eq("locale", locale).eq("is_active", true).order("created_at", { ascending: true }),
      ]);
      setSelectedCategoryIds(((joinsResult.data ?? []) as { category_id: number }[]).map((j) => j.category_id));
      setAllCategories((catsResult.data ?? []) as Category[]);

      setLoading(false);
    };
    init();
  }, [locale, slug, router]);

  const addChapter = () =>
    setChapters((prev) => [...prev, { id: Date.now(), title: "", body: "", imageFile: null, imagePreview: "", existingImageUrl: "" }]);

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

  const handleLocationConfirm = ({
    lat,
    lng,
    precision,
    mapCategory: cat,
  }: {
    lat: number;
    lng: number;
    precision: LocationPrecision;
    mapCategory: SpotCategory;
  }) => {
    const rounded = roundLocation({ lat, lng, precision });
    setLocLat(rounded.lat);
    setLocLng(rounded.lng);
    setLocName(rounded.locationName);
    setLocPrecision(precision);
    setMapCategory(cat);
    setLocationDirty(true);
    setLocPickerOpen(false);
  };

  const clearLocation = () => {
    setLocLat(null);
    setLocLng(null);
    setLocName(null);
    setLocPrecision(null);
    setMapCategory(null);
    setLocationDirty(true);
  };

  const uploadImage = async (file: File, uid: string, suffix: string): Promise<string> => {
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("画像ファイル（JPEG / PNG / WebP / GIF）のみアップロード可能です");
    }
    if (file.size > MAX_SIZE) {
      throw new Error("ファイルサイズは5MB以内にしてください");
    }
    const isValidImage = await validateImageFile(file);
    if (!isValidImage) {
      throw new Error("ファイルの内容が画像形式と一致しません");
    }
    const compressed = await compressImage(file);
    const fileExt = compressed.name.split(".").pop() || "jpg";
    const fileName = `${uid}/${Date.now()}-${suffix}.${fileExt}`;
    const { error } = await supabase.storage
      .from("wiki-images")
      .upload(fileName, compressed, { cacheControl: "3600", upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("wiki-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleChapterImageChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChapters((prev) =>
      prev.map((c, idx) => idx === i ? { ...c, imageFile: file, imagePreview: URL.createObjectURL(file) } : c)
    );
  };

  const removeChapterImage = (i: number) => {
    setChapters((prev) =>
      prev.map((c, idx) => idx === i ? { ...c, imageFile: null, imagePreview: "", existingImageUrl: "" } : c)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert("タイトルを入力してください。"); return; }
    if (!summary.trim()) { alert("概要を入力してください。"); return; }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? "";

      // サムネイルのアップロード
      let imageUrl: string | null = existingThumbnailUrl || null;
      if (thumbnailFile) {
        try {
          imageUrl = await uploadImage(thumbnailFile, uid, "thumb");
        } catch (err) {
          alert(`サムネイルのアップロードに失敗しました: ${err instanceof Error ? err.message : ""}`);
          return;
        }
      }

      // 章ごとの本文＋画像を構築
      const chapterParts: string[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const title = ch.title.trim();
        let part = title ? `## ${title}\n\n${ch.body.trim()}` : ch.body.trim();
        if (ch.imageFile) {
          try {
            const imgUrl = await uploadImage(ch.imageFile, uid, `ch${i}`);
            part += `\n\n![章${i + 1}](${imgUrl})`;
          } catch (err) {
            alert(`章${i + 1}の画像アップロードに失敗しました: ${err instanceof Error ? err.message : ""}`);
            return;
          }
        } else if (ch.existingImageUrl) {
          part += `\n\n![章${i + 1}](${ch.existingImageUrl})`;
        }
        chapterParts.push(part);
      }
      const content = chapterParts.join("\n\n");

      const token = await getAccessToken();
      const res = await fetch(`/api/wiki/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          summary: summary.trim(),
          content,
          category_ids: selectedCategoryIds,
          image_url: imageUrl,
          ...(locationDirty ? {
            lat: locLat,
            lng: locLng,
            location_name: locName,
            // プライバシー保護：保存ラベルも town 以下に正規化（exact を許さない）
            location_precision: locPrecision ? normalizePrecision(locPrecision) : locPrecision,
            map_category: mapCategory,
          } : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(`更新失敗: ${json.error ?? res.statusText}`);
        return;
      }

      // JA編集の場合、バックグラウンドで英語版を再翻訳
      if (locale === "ja") {
        getAccessToken().then((tk) => {
          if (!tk) return;
          fetch("/api/translate/wiki-auto", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tk}`,
            },
            body: JSON.stringify({ slug, force: true }),
          }).catch(() => {});
        }); // fire-and-forget
      }

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
            <p style={breadcrumbStyle}>ARCHIVE / FILES / EDIT</p>
            <h1 style={titleStyle}>ファイルを編集</h1>
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
              <label style={labelStyle}>カテゴリー</label>
              {allCategories.length === 0 ? (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#a49080" }}>カテゴリーがまだありません。</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 6, marginBottom: 8 }}>
                  {allCategories.map((cat) => (
                    <label key={cat.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#e0d0c8", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={(e) => {
                          setSelectedCategoryIds((prev) =>
                            e.target.checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id)
                          );
                        }}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>概要</label>
              <textarea style={{ ...controlStyle, height: 80, resize: "vertical" }} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>サムネイル画像</label>
              {(thumbnailPreview || existingThumbnailUrl) && (
                <img
                  src={thumbnailPreview || existingThumbnailUrl}
                  alt="サムネイル"
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 4, marginBottom: 8, border: "1px solid rgba(180,100,110,0.2)" }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                style={{ fontSize: 12, color: "#a09080" }}
              />
              {existingThumbnailUrl && !thumbnailPreview && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#7a6a60" }}>現在の画像を使用中。新しい画像を選択すると上書きされます。</p>
              )}
            </div>

            {/* 位置情報 */}
            {canPickLocation && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#a09080", letterSpacing: "0.05em" }}>場所（任意）</label>
                {locLat !== null && locLng !== null ? (
                  <div style={wikiEditLocCardStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#e8d8d0" }}>
                        {locName ?? `${locLat.toFixed(4)}, ${locLng.toFixed(4)}`}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(200,150,140,0.5)", marginTop: 2 }}>
                        {locPrecision === "exact" ? "正確な位置" : locPrecision === "town" ? "町単位（±300mランダム）" : locPrecision === "prefecture" ? "都道府県のみ" : "精度未設定"}
                        {mapCategory && (
                          <>
                            {" ・ "}
                            {mapCategory === "haunted" && "心霊"}
                            {mapCategory === "horror" && "恐怖"}
                            {mapCategory === "sightseeing" && "観光"}
                            {mapCategory === "legend" && "伝承"}
                          </>
                        )}
                      </div>
                    </div>
                    <button type="button" style={wikiEditLocEditBtnStyle} onClick={() => setLocPickerOpen(true)}>変更</button>
                    <button type="button" style={wikiEditLocRemoveBtnStyle} onClick={clearLocation}>削除</button>
                  </div>
                ) : (
                  <button type="button" style={wikiEditLocAddBtnStyle} onClick={() => setLocPickerOpen(true)}>
                    ＋ 場所を追加
                  </button>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                <div style={groupStyle}>
                  <label style={labelStyle}>章の画像（任意）</label>
                  {(ch.imagePreview || ch.existingImageUrl) && (
                    <div style={{ position: "relative", marginBottom: 6 }}>
                      <img
                        src={ch.imagePreview || ch.existingImageUrl}
                        alt={`章${i + 1}の画像`}
                        style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 3, border: "1px solid rgba(180,100,110,0.2)" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeChapterImage(i)}
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", color: "#e08080", cursor: "pointer", borderRadius: 3, padding: "2px 6px", fontSize: 11 }}
                      >
                        削除
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleChapterImageChange(i, e)}
                    style={{ fontSize: 12, color: "#a09080" }}
                  />
                </div>
              </div>
            ))}

            <button type="button" style={{ ...secondaryBtn, marginTop: 12 }} onClick={addChapter}>章を追加</button>

            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button type="submit" style={primaryBtn} disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "変更を保存"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <LocationPickerModal
        isOpen={locPickerOpen}
        onConfirm={handleLocationConfirm}
        onCancel={() => setLocPickerOpen(false)}
        initialCenter={locLat !== null && locLng !== null ? [locLng, locLat] : undefined}
        initialZoom={locLat !== null && locLng !== null ? 12 : undefined}
      />
    </main>
  );
}

const wikiEditLocAddBtnStyle: React.CSSProperties = { padding: "10px 14px", background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", color: "#c0a090", borderRadius: 4, cursor: "pointer", fontSize: 13, textAlign: "left" };
const wikiEditLocCardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "rgba(30,10,15,0.8)", border: "1px solid rgba(180,100,110,0.3)", padding: "10px 14px", borderRadius: 4 };
const wikiEditLocEditBtnStyle: React.CSSProperties = { background: "none", border: "1px solid rgba(200,150,140,0.35)", color: "rgba(200,180,170,0.85)", fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer", flexShrink: 0 };
const wikiEditLocRemoveBtnStyle: React.CSSProperties = { background: "none", border: "1px solid rgba(200,60,60,0.35)", color: "rgba(200,100,100,0.75)", fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer", flexShrink: 0 };

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
