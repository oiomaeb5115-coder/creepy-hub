"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

export default function PostPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [mainImage1, setMainImage1] = useState<File | null>(null);
  const [mainImage2, setMainImage2] = useState<File | null>(null);
  const [mainImage3, setMainImage3] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        window.location.href = `/${locale}/login`;
        return;
      }
      setAuthChecked(true);
    });

    supabase
      .from("story_categories")
      .select("id, name")
      .eq("is_active", true)
      .or("is_user_created.eq.false,approved.eq.true")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data as { id: number; name: string }[]);
      });
  }, [locale]);

  const uploadImage = async (
    file: File | null,
    userId: string,
    suffix: string
  ): Promise<string | null> => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}-${suffix}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("記事タイトルを入力してください。");
      return;
    }

    if (!body.trim()) {
      alert("本文を入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        alert(`セッション確認に失敗しました: ${sessionError.message}`);
        return;
      }

      const user = sessionData.session?.user;

      if (!user) {
        alert("ログイン状態が切れています。もう一度ログインしてください。");
        window.location.href = `/${locale}/login`;
        return;
      }

      let imageUrl1: string | null = null;
      let imageUrl2: string | null = null;
      let imageUrl3: string | null = null;

      try {
        imageUrl1 = await uploadImage(mainImage1, user.id, "1");
        imageUrl2 = await uploadImage(mainImage2, user.id, "2");
        imageUrl3 = await uploadImage(mainImage3, user.id, "3");
      } catch (uploadErr) {
        const message =
          uploadErr instanceof Error
            ? uploadErr.message
            : "画像アップロードに失敗しました。";
        alert(`画像アップロードに失敗しました: ${message}`);
        return;
      }

      const insertPayload = {
        title: title.trim(),
        content: body.trim(),
        user_id: user.id,
        category_id: categoryId ? Number(categoryId) : null,
        view_count: 0,
        is_published: true,
        image_url: imageUrl1,
        image_url_2: imageUrl2,
        image_url_3: imageUrl3,
      };

      const { data, error } = await supabase
        .from("post")
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        alert(`投稿に失敗しました: ${error.message}`);
        return;
      }

      window.location.href = `/${locale}/story/${data.id}`;
    } catch (err) {
      console.error(err);
      alert("予期しないエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <main className={styles.postEntryPage}>
        <div className={styles.postEntryShell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          認証確認中...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.postEntryPage}>
      <div className={styles.postEntryShell}>
        <BackButton />
        <header className={styles.postEntryHeader}>
          <div>
            <p className={styles.postEntryBreadcrumb}>ARCHIVE / NEW ENTRY</p>
            <h1 className={styles.postEntryTitle}>Post Entry</h1>
            <p className={styles.postEntrySubtitle}>
              新しいアーカイブ記事を投稿します
            </p>
          </div>

          <div className={styles.postEntryActionsTop}>
            <Link href={`/${locale}`} className={styles.ghostButton}>
              ホーム
            </Link>
            <Link href={`/${locale}/login`} className={styles.ghostButton}>
              アカウント
            </Link>
          </div>
        </header>

        <div className={styles.postEntryLayout}>
          <section className={styles.postMainCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>記事投稿</h2>
                <p>画像は3枚まで投稿できます。</p>
              </div>
            </div>

            <div className={styles.loginStatus}>
              ログイン中のユーザーとして投稿されます
            </div>

            <form className={styles.postForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="category">ジャンル</label>
                <select
                  id="category"
                  className={styles.formControl}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="title">記事タイトル</label>
                <input
                  id="title"
                  type="text"
                  className={styles.formControl}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tags">タグ</label>
                <input
                  id="tags"
                  type="text"
                  className={styles.formControl}
                  placeholder="例: Backrooms, ARG, Liminal Space"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="mainImage1">画像1</label>
                <input
                  id="mainImage1"
                  type="file"
                  className={`${styles.formControl} ${styles.fileInput}`}
                  accept="image/*"
                  onChange={(e) => setMainImage1(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="mainImage2">画像2</label>
                <input
                  id="mainImage2"
                  type="file"
                  className={`${styles.formControl} ${styles.fileInput}`}
                  accept="image/*"
                  onChange={(e) => setMainImage2(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="mainImage3">画像3</label>
                <input
                  id="mainImage3"
                  type="file"
                  className={`${styles.formControl} ${styles.fileInput}`}
                  accept="image/*"
                  onChange={(e) => setMainImage3(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.formGroup}>
                <label htmlFor="body">本文</label>
                <textarea
                  id="body"
                  className={`${styles.formControl} ${styles.bodyTextarea}`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="ここに本文を入力してください..."
                />
              </div>

              <div className={styles.submitRow}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "投稿中..." : "公開する"}
                </button>
              </div>
            </form>
          </section>

          <aside className={styles.postSideCard}>
            <h3>案内</h3>
            <ul className={styles.guideList}>
              <li>画像は3枚まで投稿できます。</li>
              <li>ジャンルは後から増やせます。</li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
