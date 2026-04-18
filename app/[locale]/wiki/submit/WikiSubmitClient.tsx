"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";
import { validateImageFile } from "@/lib/validateImageFile";
import { compressImage } from "@/lib/compressImage";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import { roundLocation, type LocationPrecision } from "@/lib/roundLocation";
import LocationPickerModal from "@/components/map/LocationPickerModal";
import type { SpotCategory } from "@/lib/mapPalettes";
import { MAP_PUBLIC_TO_WEB } from "@/lib/isCreepyHubApp";

type Category = { id: number; slug: string; name: string };

type Chapter = {
  id: number;
  title: string;
  body: string;
  imageFile: File | null;
  imagePreview: string;
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type WikiSubmitLabels = {
  title: string;
  subtitle: string;
  summary: string;
  thumbnailLabel: string;
  chapterTitle: string;
  chapterBody: string;
  chapterImage: string;
  addChapter: string;
  moveUp: string;
  moveDown: string;
  deleteChapter: string;
  minChapterAlert: string;
  publishNow: string;
  submitPublish: string;
  submitDraft: string;
  submitting: string;
  alertTitle: string;
  alertSummary: string;
  alertBody: string;
  alertLogin: string;
  alertThumbFail: string;
  alertChapterImgFail: string;
  alertSlugFail: string;
  slugLabel: string;
  slugHint: string;
  alertSlugEmpty: string;
  alertWikiFail: string;
  successPublished: string;
  successDraft: string;
  draftNotice: string;
  draftRestored: string;
  deleteDraft: string;
  checkingAuth: string;
  uploading: string;
  breadcrumb: string;
  headerTitle: string;
  headerSubtitle: string;
  wikiList: string;
  home: string;
  sectionTitle: string;
  sectionDesc: string;
  chapterSection: string;
  categoryLabel: string;
  categoryNone: string;
  categoryCreate: string;
};

type Props = {
  locale: string;
  labels: WikiSubmitLabels;
};

export default function WikiSubmitClient({ locale, labels }: Props) {
  const params = useParams<{ locale: string }>();
  const resolvedLocale = params?.locale ?? locale;

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  const [slugInput, setSlugInput] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 1, title: "", body: "", imageFile: null, imagePreview: "" },
  ]);
  const [uploadingChapter, setUploadingChapter] = useState<number | null>(null);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        window.location.href = `/${resolvedLocale}/login`;
        return;
      }
      setUserId(session.user.id);
      setAuthChecked(true);
    });
  }, [resolvedLocale]);

  useEffect(() => {
    if (!authChecked) return;
    supabase
      .from("categories")
      .select("id, slug, name")
      .eq("locale", resolvedLocale)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, [authChecked, resolvedLocale]);

  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(`draft_wiki_${userId}`);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.subtitle === "string") setSubtitle(draft.subtitle);
      if (typeof draft.summary === "string") setSummary(draft.summary);
      if (Array.isArray(draft.selectedCategoryIds) && draft.selectedCategoryIds.every((v: unknown) => typeof v === "number")) {
        setSelectedCategoryIds(draft.selectedCategoryIds);
      }
      if (Array.isArray(draft.chapters)) {
        const validChapters = draft.chapters.filter(
          (ch: unknown): ch is { id: number; title: string; body: string } =>
            typeof ch === "object" && ch !== null &&
            typeof (ch as Record<string, unknown>).id === "number" &&
            typeof (ch as Record<string, unknown>).title === "string" &&
            typeof (ch as Record<string, unknown>).body === "string"
        );
        if (validChapters.length > 0) {
          setChapters(
            validChapters.map((ch: { id: number; title: string; body: string }) => ({
              id: ch.id,
              title: ch.title,
              body: ch.body,
              imageFile: null,
              imagePreview: "",
            }))
          );
        }
      }
      setDraftRestored(true);
    } catch { /* ignore invalid data */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const savableChapters = chapters.map(({ id, title, body }) => ({ id, title, body }));
      localStorage.setItem(`draft_wiki_${userId}`, JSON.stringify({ title, subtitle, summary, selectedCategoryIds, chapters: savableChapters }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [userId, title, subtitle, summary, selectedCategoryIds, chapters]);

  const deleteDraftFn = () => {
    if (!userId) return;
    localStorage.removeItem(`draft_wiki_${userId}`);
    setDraftRestored(false);
    setTitle(""); setSubtitle(""); setSummary("");
    setSelectedCategoryIds([]);
    setChapters([{ id: 1, title: "", body: "", imageFile: null, imagePreview: "" }]);
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
    // ファイルの実際の内容（magic bytes）を検証
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

  const handleChapterImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChapters((prev) =>
      prev.map((ch, i) =>
        i === index ? { ...ch, imageFile: file, imagePreview: URL.createObjectURL(file) } : ch
      )
    );
  };

  const updateChapter = (index: number, key: "title" | "body", value: string) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, [key]: value } : ch))
    );
  };

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      { id: Date.now(), title: "", body: "", imageFile: null, imagePreview: "" },
    ]);
  };

  const removeChapter = (id: number) => {
    if (chapters.length === 1) {
      alert(labels.minChapterAlert);
      return;
    }
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  };

  const moveChapterUp = (index: number) => {
    if (index === 0) return;
    setChapters((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  };

  const moveChapterDown = (index: number) => {
    if (index === chapters.length - 1) return;
    setChapters((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { alert(labels.alertTitle); return; }
    if (!summary.trim()) { alert(labels.alertSummary); return; }
    const hasBody = chapters.some((ch) => ch.body.trim());
    if (!hasBody) { alert(labels.alertBody); return; }

    setIsSubmitting(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        alert(labels.alertLogin);
        window.location.href = `/${resolvedLocale}/login`;
        return;
      }
      const uid = session.user.id;

      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        setUploadingThumb(true);
        try {
          thumbnailUrl = await uploadImage(thumbnailFile, uid, "thumb");
        } catch (err) {
          alert(`${labels.alertThumbFail}: ${err instanceof Error ? err.message : ""}`);
          return;
        } finally {
          setUploadingThumb(false);
        }
      }

      const chapterParts: string[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const title = ch.title.trim();
        let part = title ? `## ${title}\n\n${ch.body.trim()}` : ch.body.trim();

        if (ch.imageFile) {
          setUploadingChapter(i);
          try {
            const imgUrl = await uploadImage(ch.imageFile, uid, `ch${i}`);
            part += `\n\n![${labels.chapterSection} ${i + 1}](${imgUrl})`;
          } catch (err) {
            alert(`${labels.alertChapterImgFail} ${i + 1}: ${err instanceof Error ? err.message : ""}`);
            return;
          } finally {
            setUploadingChapter(null);
          }
        }
        chapterParts.push(part);
      }

      const content = chapterParts.join("\n\n");
      const baseSlug = slugInput.trim();

      if (!baseSlug) {
        alert(labels.alertSlugEmpty);
        return;
      }

      let slug = baseSlug;
      {
        const { data: existing } = await supabase
          .from("wiki_pages")
          .select("slug")
          .eq("locale", resolvedLocale)
          .like("slug", `${baseSlug}%`);
        if (existing && existing.length > 0) {
          const usedSlugs = new Set(existing.map((r: { slug: string }) => r.slug));
          if (usedSlugs.has(baseSlug)) {
            let counter = 2;
            while (usedSlugs.has(`${baseSlug}-${counter}`)) counter++;
            slug = `${baseSlug}-${counter}`;
          }
        }
      }

      const payload: Record<string, unknown> = {
        slug,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        summary: summary.trim(),
        content,
        page_type: "general",
        locale: resolvedLocale,
        original_page_id: null,
        author_id: uid,
        status: isPublished ? "published" : "draft",
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        view_count: 0,
        image_url: thumbnailUrl,
        lat: locLat,
        lng: locLng,
        location_name: locName,
        location_precision: locPrecision,
        map_category: mapCategory,
      };

      const { data, error } = await supabase
        .from("wiki_pages")
        .insert([payload])
        .select("slug, id")
        .single();

      if (error) {
        alert(`${labels.alertWikiFail}: ${error.message}`);
        return;
      }

      if (selectedCategoryIds.length > 0 && data?.id) {
        await supabase.from("wiki_page_categories").insert(
          selectedCategoryIds.map((cat_id) => ({
            wiki_page_id: data.id,
            category_id: cat_id,
          }))
        );
      }

      // JA公開の場合、バックグラウンドで自動英語翻訳
      if (isPublished && resolvedLocale === "ja" && data?.slug) {
        getAccessToken().then((tk) => {
          if (!tk) return;
          fetch("/api/translate/wiki-auto", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tk}`,
            },
            body: JSON.stringify({ slug: data.slug }),
          }).catch(() => {});
        }); // fire-and-forget
      }

      localStorage.removeItem(`draft_wiki_${uid}`);
      alert(isPublished ? labels.successPublished : labels.successDraft);
      window.location.href = data?.slug
        ? (isPublished ? `/${resolvedLocale}/wiki/${encodeURIComponent(data.slug)}` : `/${resolvedLocale}/wiki`)
        : `/${resolvedLocale}/wiki`;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <main className={styles.submitPage}>
        <div className={styles.submitShell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          {labels.checkingAuth}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.submitPage}>
      <div className={styles.submitShell}>
        <img src="/images/ui/auth-logo_2.webp" alt="" className={styles.pageTopLogo} />
        <h1 className={styles.pageLogoTitle}>{labels.headerTitle}</h1>
        <BackButton />
        <header className={styles.submitHeader}>
          <div>
            <p className={styles.submitBreadcrumb}>ARCHIVE / FILES / SUBMIT</p>
            <p className={styles.submitSubtitle}>{labels.headerSubtitle}</p>
          </div>
        </header>

        <section className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.draftNotice}>
              {labels.draftNotice}
            </div>

            {draftRestored && (
              <div className={styles.draftRestoredToast}>
                <span className={styles.draftRestoredMsg}>{labels.draftRestored}</span>
                <button type="button" className={styles.draftDeleteBtn} onClick={deleteDraftFn}>
                  {labels.deleteDraft}
                </button>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>{labels.thumbnailLabel}</label>
              {thumbnailPreview && (
                <img src={thumbnailPreview} alt="preview" className={styles.imagePreview} />
              )}
              <input
                type="file"
                accept="image/*"
                className={`${styles.formControl} ${styles.fileInput}`}
                onChange={handleThumbnailChange}
              />
              {uploadingThumb && <p className={styles.helpText}>{labels.uploading}</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title">{labels.title}</label>
              <input
                id="title"
                type="text"
                className={styles.formControl}
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  if (!slugManuallyEdited) {
                    setSlugInput(slugify(val));
                  }
                }}
                placeholder={labels.title}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="slugInput">{labels.slugLabel}</label>
              <input
                id="slugInput"
                type="text"
                className={styles.formControl}
                value={slugInput}
                onChange={(e) => {
                  setSlugInput(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="e.g. shisaki-eiko"
              />
              <small className={styles.slugHint}>{labels.slugHint}</small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="subtitle">{labels.subtitle}</label>
              <input
                id="subtitle"
                type="text"
                className={styles.formControl}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={labels.subtitle}
              />
            </div>

            <div className={styles.formGroup}>
              <label>{labels.categoryLabel}</label>
              {categories.length === 0 ? (
                <p className={styles.helpText}>{labels.categoryNone}</p>
              ) : (
                <div className={styles.categoryCheckList}>
                  {categories.map((cat) => (
                    <label key={cat.id} className={styles.categoryCheckItem}>
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={(e) => {
                          setSelectedCategoryIds((prev) =>
                            e.target.checked
                              ? [...prev, cat.id]
                              : prev.filter((id) => id !== cat.id)
                          );
                        }}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="summary">{labels.summary}</label>
              <textarea
                id="summary"
                className={`${styles.formControl} ${styles.summaryArea}`}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={labels.summary}
              />
            </div>

            {canPickLocation && (
              <>
                <div className={styles.divider} />
                <div className={styles.field}>
                  <label>場所（任意）</label>
                  {locLat !== null && locLng !== null ? (
                    <div style={wikiLocCardStyle}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#e8d8d0" }}>
                          {locName ?? `${locLat.toFixed(4)}, ${locLng.toFixed(4)}`}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(200,150,140,0.5)", marginTop: 2 }}>
                          {locPrecision === "exact" ? "正確な位置" : locPrecision === "town" ? "町単位（±300mランダム）" : "都道府県のみ"}
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
                      <button type="button" style={wikiLocEditBtnStyle} onClick={() => setLocPickerOpen(true)}>変更</button>
                      <button type="button" style={wikiLocRemoveBtnStyle} onClick={clearLocation}>削除</button>
                    </div>
                  ) : (
                    <button type="button" style={wikiLocAddBtnStyle} onClick={() => setLocPickerOpen(true)}>
                      ＋ 場所を追加
                    </button>
                  )}
                  <small style={{ fontSize: 10, color: "rgba(200,150,140,0.35)", lineHeight: 1.5 }}>
                    地図タップで位置を指定。町/県を選ぶと保存前に座標をぼかします。
                  </small>
                </div>
              </>
            )}

            <div className={styles.divider} />
            <div className={styles.sectionToolbar}>
              <h3>{labels.chapterSection}</h3>
            </div>

            <div className={styles.chapterList}>
              {chapters.map((chapter, index) => (
                <div className={styles.chapterCard} key={chapter.id}>
                  <div className={styles.chapterCardHead}>
                    <h4>{labels.chapterSection} {index + 1}</h4>
                    <div className={styles.chapterActions}>
                      <button type="button" className={styles.miniButton} onClick={() => moveChapterUp(index)}>
                        {labels.moveUp}
                      </button>
                      <button type="button" className={styles.miniButton} onClick={() => moveChapterDown(index)}>
                        {labels.moveDown}
                      </button>
                      <button
                        type="button"
                        className={`${styles.miniButton} ${styles.dangerButton}`}
                        onClick={() => removeChapter(chapter.id)}
                      >
                        {labels.deleteChapter}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>{labels.chapterTitle}</label>
                    <input
                      type="text"
                      className={styles.formControl}
                      value={chapter.title}
                      onChange={(e) => updateChapter(index, "title", e.target.value)}
                      placeholder={`${labels.chapterSection} ${index + 1}`}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>{labels.chapterBody}</label>
                    <textarea
                      className={`${styles.formControl} ${styles.chapterTextarea}`}
                      value={chapter.body}
                      onChange={(e) => updateChapter(index, "body", e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>{labels.chapterImage}</label>
                    {chapter.imagePreview && (
                      <img src={chapter.imagePreview} alt="preview" className={styles.imagePreview} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className={`${styles.formControl} ${styles.fileInput}`}
                      onChange={(e) => handleChapterImageChange(index, e)}
                    />
                    {uploadingChapter === index && <p className={styles.helpText}>{labels.uploading}</p>}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className={styles.secondaryButton} onClick={addChapter} style={{ marginTop: 12 }}>
              {labels.addChapter}
            </button>

            <div className={styles.publishRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                {labels.publishNow}
              </label>
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting || uploadingThumb || uploadingChapter !== null}
              >
                {isSubmitting
                  ? labels.submitting
                  : isPublished
                  ? labels.submitPublish
                  : labels.submitDraft}
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

const wikiLocAddBtnStyle: React.CSSProperties = { padding: "10px 14px", background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", color: "#c0a090", borderRadius: 4, cursor: "pointer", fontSize: 13, textAlign: "left" };
const wikiLocCardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "rgba(30,10,15,0.8)", border: "1px solid rgba(180,100,110,0.3)", padding: "10px 14px", borderRadius: 4 };
const wikiLocEditBtnStyle: React.CSSProperties = { background: "none", border: "1px solid rgba(200,150,140,0.35)", color: "rgba(200,180,170,0.85)", fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer", flexShrink: 0 };
const wikiLocRemoveBtnStyle: React.CSSProperties = { background: "none", border: "1px solid rgba(200,60,60,0.35)", color: "rgba(200,100,100,0.75)", fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer", flexShrink: 0 };
