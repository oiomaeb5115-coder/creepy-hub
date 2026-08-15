"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateSlug, sanitizeSlug } from "@/lib/slug";
import { postUrl } from "@/lib/postUrl";
import { uploadImage } from "@/lib/uploadImage";
import { uploadVideoToStream } from "@/lib/uploadVideoToStream";
import BackButton from "@/components/BackButton";
import { getDictionary } from "@/lib/getDictionary";
import type { Dictionary } from "@/lib/getDictionary";
import { MAP_PUBLIC_TO_WEB } from "@/lib/isCreepyHubApp";
import { roundLocation, normalizePrecision, type LocationPrecision } from "@/lib/roundLocation";
import LocationPickerModal from "@/components/map/LocationPickerModal";
import type { SpotCategory } from "@/lib/mapPalettes";
import tabStyles from "./page.module.css";

type Chapter = { id: number; title: string; body: string };

const createEmptyChapter = (id = 1): Chapter => ({ id, title: "", body: "" });

function parseChapters(content: string): Chapter[] {
  if (!content.trim()) return [createEmptyChapter()];
  const parts = content.split(/\n\n(?=## )/);
  return parts.map((part, i) => {
    const lines = part.split("\n");
    const titleLine = lines[0] ?? "";
    const title = titleLine.startsWith("## ") ? titleLine.slice(3) : "";
    const bodyStartIndex = title ? (lines[1]?.trim() === "" ? 2 : 1) : 0;
    const body = lines.slice(bodyStartIndex).join("\n").trim();
    return { id: i + 1, title, body };
  });
}

function mergeChapters(chapters: Chapter[]) {
  return chapters
    .map((chapter) => {
      const title = chapter.title.trim();
      const heading = title ? `## ${title}\n\n` : "";
      return `${heading}${chapter.body.trim()}`;
    })
    .join("\n\n")
    .trim();
}

export default function PostNewPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const searchParams = useSearchParams();
  // 開発時に位置ピッカーUIを強制表示するためのフラグ（?forceAppUI=1）
  const forceAppUI = searchParams?.get("forceAppUI") === "1";

  // ── POST フォーム state ──
  const [labels, setLabels] = useState<Dictionary["postDrawer"] | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; name_en: string | null }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([createEmptyChapter()]);
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

  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isSensitive, setIsSensitive] = useState(false);

  // ── 位置情報（Web 地図ピッカー）──
  // 表示可否は state を介さず描画時に直接評価（SPA遷移/HMRの影響を回避）
  const canPickLocation = MAP_PUBLIC_TO_WEB || forceAppUI || (typeof window !== "undefined" && (
    (window as unknown as Record<string, unknown>).__CREEPYHUB_IOS__ === true ||
    (window as unknown as Record<string, unknown>).__CREEPYHUB_ANDROID__ === true
  ));
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [locName, setLocName] = useState<string | null>(null);
  const [locPrecision, setLocPrecision] = useState<LocationPrecision | null>(null);
  const [mapCategory, setMapCategory] = useState<SpotCategory | null>(null);
  const [locPickerOpen, setLocPickerOpen] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load dictionary
  useEffect(() => {
    getDictionary(locale).then((dict) => setLabels(dict.postDrawer));
  }, [locale]);

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
    setLocPickerOpen(false);
  };

  const clearLocation = () => {
    setLocLat(null);
    setLocLng(null);
    setLocName(null);
    setLocPrecision(null);
    setMapCategory(null);
  };

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
      if (Array.isArray(draft.chapters)) {
        const draftChapters = draft.chapters as unknown[];
        const validChapters = draftChapters.filter(
          (chapter: unknown): chapter is Chapter =>
            typeof chapter === "object" &&
            chapter !== null &&
            typeof (chapter as Chapter).title === "string" &&
            typeof (chapter as Chapter).body === "string"
        );
        if (validChapters.length > 0) {
          setChapters(validChapters.map((chapter, index) => ({
            id: typeof chapter.id === "number" ? chapter.id : index + 1,
            title: chapter.title,
            body: chapter.body,
          })));
        }
      } else if (typeof draft.body === "string") {
        setChapters(parseChapters(draft.body));
      }
      if (typeof draft.categoryId === "string" || typeof draft.categoryId === "number") {
        setCategoryId(String(draft.categoryId));
      }
      if (typeof draft.slugInput === "string") {
        setSlugInput(draft.slugInput);
        if (draft.slugInput) setSlugManuallyEdited(true);
      }
      if (typeof draft.isSensitive === "boolean") setIsSensitive(draft.isSensitive);
      const hasContent = draft.title || draft.body || draft.chapters || draft.categoryId || draft.slugInput;
      if (hasContent) setDraftRestored(true);
    } catch { /* ignore */ }
  }, [userId]);

  // Auto-save draft
  useEffect(() => {
    if (!userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(`draft_post_${userId}`, JSON.stringify({ categoryId, title, chapters, slugInput, isSensitive }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [userId, categoryId, title, chapters, slugInput, isSensitive]);

  const deleteDraft = () => {
    if (!userId) return;
    localStorage.removeItem(`draft_post_${userId}`);
    setDraftRestored(false);
    setCategoryId(""); setTitle(""); setChapters([createEmptyChapter()]); setSlugInput(""); setSlugManuallyEdited(false);
    setNewImage1(null); setNewImage2(null); setNewImage3(null);
    setImageUrl1(null); setImageUrl2(null); setImageUrl3(null);
    setNewVideo(null); setVideoPreviewUrl(null);
    setIsSensitive(false);
  };

  const saveDraftManually = () => {
    if (!userId) return;
    localStorage.setItem(`draft_post_${userId}`, JSON.stringify({ categoryId, title, chapters, slugInput, isSensitive }));
    setIsSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setIsSaved(false), 2000);
  };

  const addChapter = () =>
    setChapters((prev) => [...prev, createEmptyChapter(Date.now())]);

  const removeChapter = (id: number) => {
    if (chapters.length === 1) {
      alert(locale === "en" ? "At least one chapter is required." : "章は最低1つ必要です。");
      return;
    }
    setChapters((prev) => prev.filter((chapter) => chapter.id !== id));
  };

  const moveChapterUp = (index: number) => {
    if (index === 0) return;
    setChapters((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveChapterDown = (index: number) => {
    if (index === chapters.length - 1) return;
    setChapters((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const updateChapter = (index: number, key: "title" | "body", value: string) =>
    setChapters((prev) =>
      prev.map((chapter, chapterIndex) =>
        chapterIndex === index ? { ...chapter, [key]: value } : chapter
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labels) return;
    if (!title.trim()) { alert(labels.alertTitleRequired); return; }
    const mergedContent = mergeChapters(chapters);
    if (!chapters.some((chapter) => chapter.body.trim())) { alert(labels.alertBodyRequired); return; }

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

      let streamVideoId: string | null = null;
      if (newVideo) {
        try {
          setVideoUploading(true);
          setVideoUploadProgress(0);
          const { uid } = await uploadVideoToStream(newVideo, {
            type: "post",
            onProgress: (ratio) => setVideoUploadProgress(ratio),
          });
          setVideoUploading(false);
          streamVideoId = uid;
        } catch (err) {
          setVideoUploading(false);
          alert(`${labels.alertVideoFailed}${err instanceof Error ? err.message : String(err)}`);
          throw err;
        }
      }

      const rawSlug = sanitizeSlug(slugInput.trim());
      const slug = rawSlug || generateSlug(title.trim());

      // stream_video_id がある場合、HLS URL を video_url にも保存
      const videoUrl = streamVideoId && process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN
        ? `https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${streamVideoId}/manifest/video.m3u8`
        : null;

      const baseInsert: Record<string, unknown> = {
        title: title.trim(),
        content: mergedContent,
        user_id: user.id,
        category_id: categoryId ? Number(categoryId) : null,
        view_count: 0,
        is_published: true,
        image_url: imageUrlUp1,
        image_url_2: imageUrlUp2,
        image_url_3: imageUrlUp3,
        stream_video_id: streamVideoId,
        video_url: videoUrl,
        slug,
        lat: locLat,
        lng: locLng,
        location_name: locName,
        // プライバシー保護：保存ラベルも town 以下に正規化（exact を許さない）
        location_precision: locPrecision ? normalizePrecision(locPrecision) : locPrecision,
        map_category: mapCategory,
      };

      // is_sensitive カラムがあれば付与してINSERT。カラム不在エラーならフォールバックで再試行
      let { data, error } = await supabase
        .from("post")
        .insert([{ ...baseInsert, is_sensitive: isSensitive }])
        .select()
        .single();

      if (error && /is_sensitive/.test(error.message ?? "")) {
        const retry = await supabase.from("post").insert([baseInsert]).select().single();
        data = retry.data;
        error = retry.error;
      }

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
          content: mergedContent,
        }]);
      }

      if (userId) localStorage.removeItem(`draft_post_${userId}`);
      const redirectUrl = postUrl(locale, data.id, data.slug);
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("[PostNew] submit error:", err);
      // 未処理のエラーの場合はアラート表示
      if (err instanceof Error && !err.message.includes("already")) {
        alert(err.message);
      }
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
      <div className={tabStyles.postPanel}>
        <div style={{ padding: 40, textAlign: "center", color: "#8a7870" }}>
          {labels?.checkingAuth ?? "読み込み中..."}
        </div>
      </div>
    );
  }

  // ── 未ログイン ──
  if (!isLoggedIn) {
    return (
      <div className={tabStyles.postPanel}>
        <div style={{ maxWidth: 800, margin: "0 auto", paddingTop: 60, textAlign: "center" }}>
          <p style={{ color: "rgba(200,150,140,0.4)", fontFamily: '"装甲明朝","Soukou Mincho",serif' }}>
            {labels.loginRequired}
          </p>
          <Link
            href={`/${locale}?modal=login`}
            style={{ ...linkStyle, display: "inline-block", marginTop: 20 }}
            rel="nofollow"
          >
            {labels.loginLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
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

                {/* センシティブ設定 */}
                <div style={groupStyle}>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isSensitive}
                      onChange={(e) => setIsSensitive(e.target.checked)}
                    />
                    <span>{labels.sensitiveToggle}</span>
                  </label>
                  <small style={slugHintStyle}>{labels.sensitiveToggleHelp}</small>
                </div>

                {/* 動画 */}
                <div style={groupStyle}>
                  <label style={labelStyle}>{labels.videoLabel}</label>
                  <small style={slugHintStyle}>{labels.videoHint}</small>
                  {videoPreviewUrl ? (
                    <div style={{ position: "relative", width: 135, aspectRatio: "9/16", borderRadius: 6, overflow: "hidden", background: "#000" }}>
                      <video
                        src={`${videoPreviewUrl}#t=0.5`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        preload="metadata"
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
                        }}
                        title={locale === "en" ? "Remove video" : "動画を削除"}
                      >
                        &times;
                      </button>
                    </div>
                  ) : videoUploading ? (
                    <div style={{ width: 135, height: 240, aspectRatio: "9/16", borderRadius: 6, background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid rgba(161,102,108,0.18)" }}>
                      <span style={{ fontSize: 12, color: "#aaa" }}>
                        {locale === "en" ? "Uploading..." : "アップロード中..."}
                      </span>
                      <div style={{ width: 80, height: 4, background: "#333", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round(videoUploadProgress * 100)}%`, height: "100%", background: "#a1666c", transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#666" }}>{Math.round(videoUploadProgress * 100)}%</span>
                    </div>
                  ) : (
                    <label style={{ ...imageAddLabel, width: 135, height: 240, aspectRatio: "9/16" }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>▶</span>
                      <span style={{ fontSize: 11 }}>{labels.videoLabel}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (!f) return;
                          if (!["video/mp4", "video/webm", "video/quicktime"].includes(f.type)) {
                            alert(labels.alertVideoFormat); return;
                          }
                          if (f.size > 75 * 1024 * 1024) {
                            alert(labels.alertVideoSize); return;
                          }
                          setNewVideo(f);
                          setVideoPreviewUrl(URL.createObjectURL(f));
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 位置情報（iOS アプリ内のみ） */}
                {canPickLocation && (
                  <div style={groupStyle}>
                    <label style={labelStyle}>
                      {locale === "en" ? "Location (optional)" : "場所（任意）"}
                    </label>
                    {locLat !== null && locLng !== null ? (
                      <div style={locationCardStyle}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#e8d8d0" }}>
                            {locName ?? `${locLat.toFixed(4)}, ${locLng.toFixed(4)}`}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(200,150,140,0.5)", marginTop: 2 }}>
                            {locPrecision === "exact"
                              ? (locale === "en" ? "Exact" : "正確な位置")
                              : locPrecision === "town"
                              ? (locale === "en" ? "Town-level (randomised ±300m)" : "町単位（±300mランダム）")
                              : (locale === "en" ? "Prefecture only" : "都道府県のみ")}
                            {mapCategory && (
                              <>
                                {" ・ "}
                                {mapCategory === "haunted" && (locale === "en" ? "Haunted" : "心霊")}
                                {mapCategory === "horror" && (locale === "en" ? "Horror" : "恐怖")}
                                {mapCategory === "sightseeing" && (locale === "en" ? "Sightseeing" : "観光")}
                                {mapCategory === "legend" && (locale === "en" ? "Legend" : "伝承")}
                              </>
                            )}
                          </div>
                        </div>
                        <button type="button" style={locationRemoveBtn} onClick={clearLocation}>
                          {locale === "en" ? "Remove" : "削除"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        style={locationAddBtn}
                        onClick={() => setLocPickerOpen(true)}
                      >
                        {locale === "en" ? "＋ Add location" : "＋ 場所を追加"}
                      </button>
                    )}
                    <small style={slugHintStyle}>
                      {locale === "en"
                        ? "Pick on a map. Town/Prefecture options blur the exact coordinates before saving."
                        : "地図タップで位置を指定。町/県を選ぶと保存前に座標をぼかします。"}
                    </small>
                  </div>
                )}

                {/* 章構成 */}
                <div style={{ ...groupStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 14, color: "#c8b8b0" }}>
                    {locale === "en" ? "Chapters" : "章構成"}
                  </h3>
                </div>

                {chapters.map((chapter, index) => (
                  <div key={chapter.id} style={chapterCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "#a09080", flexShrink: 0 }}>
                        {locale === "en" ? `Chapter ${index + 1}` : `章 ${index + 1}`}
                      </span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button type="button" style={miniBtn} onClick={() => moveChapterUp(index)}>
                          {locale === "en" ? "Up" : "上へ"}
                        </button>
                        <button type="button" style={miniBtn} onClick={() => moveChapterDown(index)}>
                          {locale === "en" ? "Down" : "下へ"}
                        </button>
                        <button
                          type="button"
                          style={{ ...miniBtn, color: "#e08080", borderColor: "rgba(180,60,60,0.4)" }}
                          onClick={() => removeChapter(chapter.id)}
                        >
                          {locale === "en" ? "Delete" : "削除"}
                        </button>
                      </div>
                    </div>
                    <div style={groupStyle}>
                      <label style={labelStyle}>{locale === "en" ? "Chapter title" : "章タイトル"}</label>
                      <input
                        style={controlStyle}
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(index, "title", e.target.value)}
                        placeholder={locale === "en" ? `Chapter ${index + 1}` : `章${index + 1}`}
                      />
                    </div>
                    <div style={groupStyle}>
                      <label style={labelStyle}>{labels.bodyLabel}</label>
                      <textarea
                        style={{ ...controlStyle, height: 180, resize: "vertical" }}
                        value={chapter.body}
                        onChange={(e) => updateChapter(index, "body", e.target.value)}
                        placeholder="..."
                      />
                    </div>
                  </div>
                ))}

                <button type="button" style={{ ...secondaryBtn, alignSelf: "flex-start" }} onClick={addChapter}>
                  {locale === "en" ? "Add chapter" : "章を追加"}
                </button>

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

          {/* 位置ピッカーモーダル（MapLibre） */}
          <LocationPickerModal
            isOpen={locPickerOpen}
            onConfirm={handleLocationConfirm}
            onCancel={() => setLocPickerOpen(false)}
          />
    </div>
  );
}

// ── Styles (matching edit page) ──────────────────────────────
const shellStyle: React.CSSProperties = { maxWidth: 800, margin: "0 auto", paddingTop: 110 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(180,100,110,0.25)", paddingBottom: 20, marginBottom: 32 };
const breadcrumbStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "#7a6a60", marginBottom: 4 };
const titleFontStyle: React.CSSProperties = { fontSize: 22, fontWeight: 600, color: "#e8d8d0", margin: 0 };
const linkStyle: React.CSSProperties = { fontSize: 13, color: "#b08888", textDecoration: "none", border: "1px solid rgba(180,100,110,0.3)", padding: "6px 14px", borderRadius: 4 };
const cardStyle: React.CSSProperties = { background: "rgba(30, 10, 15, 0.6)", border: "1px solid rgba(180,100,110,0.2)", borderRadius: 6, padding: 24 };
const formStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const groupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#a09080", letterSpacing: "0.05em" };
const controlStyle: React.CSSProperties = { background: "rgba(20,8,10,0.8)", border: "1px solid rgba(180,100,110,0.3)", color: "#e0d0c8", borderRadius: 4, padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" };
const chapterCard: React.CSSProperties = { background: "rgba(20,5,10,0.5)", border: "1px solid rgba(180,100,110,0.15)", borderRadius: 4, padding: 16 };
const primaryBtn: React.CSSProperties = { padding: "10px 24px", background: "#6b1a22", border: "1px solid #8b3a42", color: "#f0e0e0", borderRadius: 4, cursor: "pointer", fontSize: 14 };
const secondaryBtn: React.CSSProperties = { padding: "8px 16px", background: "rgba(40,10,15,0.8)", border: "1px solid rgba(245,200,100,0.25)", color: "rgba(245,200,100,0.6)", borderRadius: 4, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em" };
const miniBtn: React.CSSProperties = { padding: "3px 8px", background: "rgba(40,10,15,0.6)", border: "1px solid rgba(180,100,110,0.25)", color: "#a09080", borderRadius: 3, cursor: "pointer", fontSize: 11 };
const slugHintStyle: React.CSSProperties = { fontSize: 10, color: "rgba(200,150,140,0.35)", lineHeight: 1.5, letterSpacing: "0.03em" };
const draftNoticeStyle: React.CSSProperties = { fontSize: 10, color: "rgba(245,200,100,0.5)", background: "rgba(245,200,100,0.04)", border: "1px solid rgba(245,200,100,0.12)", padding: "8px 12px", letterSpacing: "0.04em", lineHeight: 1.5 };
const draftRestoredRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "rgba(100,180,120,0.04)", border: "1px solid rgba(100,180,120,0.12)" };
const draftDeleteBtnStyle: React.CSSProperties = { background: "none", border: "1px solid rgba(200,60,60,0.25)", color: "rgba(200,60,60,0.45)", fontSize: 9, padding: "2px 8px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" };
const imageSlotStyle: React.CSSProperties = { width: 100, height: 100, borderRadius: 6, overflow: "hidden", flexShrink: 0 };
const imagePreviewStyle: React.CSSProperties = { width: 100, height: 100, objectFit: "cover", display: "block", borderRadius: 6 };
const imageRemoveBtn: React.CSSProperties = { position: "absolute", top: 2, right: 2, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, lineHeight: "20px", textAlign: "center", padding: 0 };
const imageAddLabel: React.CSSProperties = { width: 100, height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", borderRadius: 6, color: "#a09080", cursor: "pointer" };
const locationAddBtn: React.CSSProperties = { padding: "10px 14px", background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", color: "#c0a090", borderRadius: 4, cursor: "pointer", fontSize: 13, textAlign: "left" };
const locationCardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, background: "rgba(30,10,15,0.8)", border: "1px solid rgba(180,100,110,0.3)", padding: "10px 14px", borderRadius: 4 };
const locationRemoveBtn: React.CSSProperties = { background: "none", border: "1px solid rgba(200,60,60,0.35)", color: "rgba(200,100,100,0.75)", fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer", flexShrink: 0 };
