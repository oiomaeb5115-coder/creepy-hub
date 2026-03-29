"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validateImageFile } from "@/lib/validateImageFile";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

type PageType =
  | "general"
  | "urban_legend"
  | "incident"
  | "work"
  | "region"
  | "term"
  | "person";

type Category = { id: number; slug: string; name: string };

type Chapter = {
  id: number;
  title: string;
  body: string;
  imageFile: File | null;
  imagePreview: string;
};

function slugify(input: string): string {
  const ascii = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii.length > 0 ? ascii : `wiki-${Date.now()}`;
}

type WikiSubmitLabels = {
  title: string;
  subtitle: string;
  summary: string;
  pageType: string;
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
  pageTypes: {
    general: string;
    urban_legend: string;
    incident: string;
    work: string;
    region: string;
    term: string;
    person: string;
  };
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
  const [pageType, setPageType] = useState<PageType>("general");
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 1, title: "", body: "", imageFile: null, imagePreview: "" },
  ]);
  const [uploadingChapter, setUploadingChapter] = useState<number | null>(null);

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
      const validPageTypes: PageType[] = ["general", "urban_legend", "incident", "work", "region", "term", "person"];
      if (typeof draft.pageType === "string" && validPageTypes.includes(draft.pageType as PageType)) {
        setPageType(draft.pageType as PageType);
      }
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
      localStorage.setItem(`draft_wiki_${userId}`, JSON.stringify({ title, subtitle, summary, pageType, selectedCategoryIds, chapters: savableChapters }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [userId, title, subtitle, summary, pageType, selectedCategoryIds, chapters]);

  const deleteDraftFn = () => {
    if (!userId) return;
    localStorage.removeItem(`draft_wiki_${userId}`);
    setDraftRestored(false);
    setTitle(""); setSubtitle(""); setSummary(""); setPageType("general");
    setSelectedCategoryIds([]);
    setChapters([{ id: 1, title: "", body: "", imageFile: null, imagePreview: "" }]);
  };

  const uploadImage = async (file: File, uid: string, suffix: string): Promise<string> => {
    // ファイルの実際の内容（magic bytes）を検証
    const isValidImage = await validateImageFile(file);
    if (!isValidImage) {
      throw new Error("ファイルの内容が画像形式と一致しません");
    }
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${uid}/${Date.now()}-${suffix}.${fileExt}`;
    const { error } = await supabase.storage
      .from("wiki-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
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
        const heading = ch.title.trim() || `${labels.chapterSection} ${i + 1}`;
        let part = `## ${heading}\n\n${ch.body.trim()}`;

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
      const baseSlug = slugify(title);

      if (!baseSlug) {
        alert(labels.alertSlugFail);
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
        page_type: pageType,
        locale: resolvedLocale,
        original_page_id: null,
        author_id: uid,
        status: isPublished ? "published" : "draft",
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        view_count: 0,
        image_url: thumbnailUrl,
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
        <BackButton />
        <header className={styles.submitHeader}>
          <div>
            <p className={styles.submitBreadcrumb}>ARCHIVE / WIKI / SUBMIT</p>
            <h1 className={styles.submitTitle}>{labels.headerTitle}</h1>
            <p className={styles.submitSubtitle}>{labels.headerSubtitle}</p>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${resolvedLocale}/wiki`} className={styles.topLink}>{labels.wikiList}</Link>
            <Link href={`/${resolvedLocale}`} className={styles.topLink}>{labels.home}</Link>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{labels.sectionTitle}</h2>
            <p className={styles.sectionDescription}>{labels.sectionDesc}</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.draftNotice}>
              {labels.draftNotice}
            </div>

            {draftRestored && (
              <div className={styles.draftRestoredRow}>
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder={labels.title}
              />
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
              <label htmlFor="pageType">{labels.pageType}</label>
              <select
                id="pageType"
                className={styles.formControl}
                value={pageType}
                onChange={(e) => setPageType(e.target.value as PageType)}
              >
                <option value="general">{labels.pageTypes.general}</option>
                <option value="urban_legend">{labels.pageTypes.urban_legend}</option>
                <option value="incident">{labels.pageTypes.incident}</option>
                <option value="work">{labels.pageTypes.work}</option>
                <option value="region">{labels.pageTypes.region}</option>
                <option value="term">{labels.pageTypes.term}</option>
                <option value="person">{labels.pageTypes.person}</option>
              </select>
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
              <Link href={`/${resolvedLocale}/wiki/category/create`} className={styles.categoryCreateLink}>
                {labels.categoryCreate}
              </Link>
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

            <div className={styles.divider} />
            <div className={styles.sectionToolbar}>
              <h3>{labels.chapterSection}</h3>
              <button type="button" className={styles.secondaryButton} onClick={addChapter}>
                {labels.addChapter}
              </button>
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
    </main>
  );
}
