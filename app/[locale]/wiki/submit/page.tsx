"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  // 日本語など非ASCII タイトルの場合はタイムスタンプで一意なスラッグを生成
  return ascii.length > 0 ? ascii : `wiki-${Date.now()}`;
}

export default function WikiSubmitPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [authChecked, setAuthChecked] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pageType, setPageType] = useState<PageType>("general");
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thumbnail
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Chapters
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 1, title: "", body: "", imageFile: null, imagePreview: "" },
  ]);
  const [uploadingChapter, setUploadingChapter] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        window.location.href = `/${locale}/login`;
        return;
      }
      setAuthChecked(true);
    });
  }, [locale]);

  const uploadImage = async (
    file: File,
    userId: string,
    suffix: string
  ): Promise<string> => {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}-${suffix}.${fileExt}`;
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

  const handleChapterImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChapters((prev) =>
      prev.map((ch, i) =>
        i === index
          ? { ...ch, imageFile: file, imagePreview: URL.createObjectURL(file) }
          : ch
      )
    );
  };

  const updateChapter = (
    index: number,
    key: "title" | "body",
    value: string
  ) => {
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
      alert("章は最低1つ必要です。");
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

    if (!title.trim()) {
      alert("タイトルを入力してください。");
      return;
    }
    if (!summary.trim()) {
      alert("概要を入力してください。");
      return;
    }
    const hasBody = chapters.some((ch) => ch.body.trim());
    if (!hasBody) {
      alert("本文を入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        alert("ログインが必要です。");
        window.location.href = `/${locale}/login`;
        return;
      }
      const userId = session.user.id;

      // Upload thumbnail
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        setUploadingThumb(true);
        try {
          thumbnailUrl = await uploadImage(thumbnailFile, userId, "thumb");
        } catch (err) {
          alert(`サムネイルのアップロードに失敗しました: ${err instanceof Error ? err.message : ""}`);
          return;
        } finally {
          setUploadingThumb(false);
        }
      }

      // Upload chapter images and build content
      const chapterParts: string[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const heading = ch.title.trim() || `章${i + 1}`;
        let part = `## ${heading}\n\n${ch.body.trim()}`;

        if (ch.imageFile) {
          setUploadingChapter(i);
          try {
            const imgUrl = await uploadImage(ch.imageFile, userId, `ch${i}`);
            part += `\n\n![章${i + 1}の画像](${imgUrl})`;
          } catch (err) {
            alert(`章${i + 1}の画像アップロードに失敗しました: ${err instanceof Error ? err.message : ""}`);
            return;
          } finally {
            setUploadingChapter(null);
          }
        }
        chapterParts.push(part);
      }

      const content = chapterParts.join("\n\n");
      const slug = slugify(title);

      if (!slug) {
        alert("有効な slug を生成できませんでした。タイトルを調整してください。");
        return;
      }

      const payload: Record<string, unknown> = {
        slug,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        summary: summary.trim(),
        content,
        page_type: pageType,
        locale,
        original_page_id: null,
        author_id: userId,
        status: isPublished ? "published" : "draft",
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        view_count: 0,
        image_url: thumbnailUrl,
      };

      const { data, error } = await supabase
        .from("wiki_pages")
        .insert([payload])
        .select("slug")
        .single();

      if (error) {
        alert(`wiki作成に失敗しました: ${error.message}`);
        return;
      }

      alert(isPublished ? "wiki記事を公開しました。" : "下書きを保存しました。");
      window.location.href = data?.slug
        ? (isPublished ? `/${locale}/wiki/${encodeURIComponent(data.slug)}` : `/${locale}/wiki`)
        : `/${locale}/wiki`;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <main className={styles.submitPage}>
        <div className={styles.submitShell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          認証確認中...
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
            <h1 className={styles.submitTitle}>Wiki Create</h1>
            <p className={styles.submitSubtitle}>
              用語、人物、都市伝説、作品などの wiki 記事を作成します
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>Wiki一覧</Link>
            <Link href={`/${locale}`} className={styles.topLink}>ホーム</Link>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>新規 wiki 作成</h2>
            <p className={styles.sectionDescription}>
              サムネイル・各章に画像を追加できます。
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>

            {/* Thumbnail */}
            <div className={styles.formGroup}>
              <label>サムネイル画像</label>
              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt="サムネイルプレビュー"
                  className={styles.imagePreview}
                />
              )}
              <input
                type="file"
                accept="image/*"
                className={`${styles.formControl} ${styles.fileInput}`}
                onChange={handleThumbnailChange}
              />
              {uploadingThumb && (
                <p className={styles.helpText}>アップロード中...</p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title">タイトル</label>
              <input
                id="title"
                type="text"
                className={styles.formControl}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: スレンダーマン"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="subtitle">サブタイトル</label>
              <input
                id="subtitle"
                type="text"
                className={styles.formControl}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="例: 海外都市伝説の代表格"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pageType">ページ種別</label>
              <select
                id="pageType"
                className={styles.formControl}
                value={pageType}
                onChange={(e) => setPageType(e.target.value as PageType)}
              >
                <option value="general">一般</option>
                <option value="urban_legend">都市伝説</option>
                <option value="incident">怪事件</option>
                <option value="work">作品</option>
                <option value="region">地域</option>
                <option value="term">用語</option>
                <option value="person">人物</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="summary">概要</label>
              <textarea
                id="summary"
                className={`${styles.formControl} ${styles.summaryArea}`}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="このページの短い概要を書いてください。"
              />
            </div>

            {/* Chapters */}
            <div className={styles.divider} />
            <div className={styles.sectionToolbar}>
              <h3>章構成</h3>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={addChapter}
              >
                章を追加
              </button>
            </div>

            <div className={styles.chapterList}>
              {chapters.map((chapter, index) => (
                <div className={styles.chapterCard} key={chapter.id}>
                  <div className={styles.chapterCardHead}>
                    <h4>章 {index + 1}</h4>
                    <div className={styles.chapterActions}>
                      <button
                        type="button"
                        className={styles.miniButton}
                        onClick={() => moveChapterUp(index)}
                      >上へ</button>
                      <button
                        type="button"
                        className={styles.miniButton}
                        onClick={() => moveChapterDown(index)}
                      >下へ</button>
                      <button
                        type="button"
                        className={`${styles.miniButton} ${styles.dangerButton}`}
                        onClick={() => removeChapter(chapter.id)}
                      >削除</button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>章タイトル</label>
                    <input
                      type="text"
                      className={styles.formControl}
                      value={chapter.title}
                      onChange={(e) => updateChapter(index, "title", e.target.value)}
                      placeholder={`章${index + 1}のタイトル`}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>本文</label>
                    <textarea
                      className={`${styles.formControl} ${styles.chapterTextarea}`}
                      value={chapter.body}
                      onChange={(e) => updateChapter(index, "body", e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>章の画像（任意）</label>
                    {chapter.imagePreview && (
                      <img
                        src={chapter.imagePreview}
                        alt={`章${index + 1}プレビュー`}
                        className={styles.imagePreview}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className={`${styles.formControl} ${styles.fileInput}`}
                      onChange={(e) => handleChapterImageChange(index, e)}
                    />
                    {uploadingChapter === index && (
                      <p className={styles.helpText}>アップロード中...</p>
                    )}
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
                すぐ公開する
              </label>
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting || uploadingThumb || uploadingChapter !== null}
              >
                {isSubmitting
                  ? "保存中..."
                  : isPublished
                  ? "公開する"
                  : "下書きを保存"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
