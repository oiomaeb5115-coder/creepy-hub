"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import styles from "./page.module.css";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

type CategoryData = {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
  header_image_url: string | null;
  created_by: string | null;
};

export default function CategoryEditPage() {
  const params = useParams<{ locale: string; slug: string }>();
  const locale = params?.locale ?? "ja";
  const slug = params?.slug ?? "";
  const dict = locale === "en" ? en : ja;
  const router = useRouter();

  const [category, setCategory] = useState<CategoryData | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}/login`);
        return;
      }

      // カテゴリ取得
      const { data: catData, error: catError } = await supabase
        .from("story_categories")
        .select("id, name, slug, icon_url, header_image_url, created_by")
        .eq("slug", slug)
        .single();

      if (catError || !catData) {
        router.replace(`/${locale}/story`);
        return;
      }

      const cat = catData as CategoryData;

      // 権限チェック: 作成者 or admin
      const isCreator = cat.created_by === session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      const isAdmin = profile?.role === "admin";

      if (!isCreator && !isAdmin) {
        router.replace(`/${locale}/story/category/${slug}`);
        return;
      }

      setCategory(cat);
      setIconPreview(cat.icon_url);
      setHeaderPreview(cat.header_image_url);
      setLoading(false);
    };

    init();
  }, [locale, slug, router]);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setIconFile(file);
    if (file) {
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setHeaderFile(file);
    if (file) {
      setHeaderPreview(URL.createObjectURL(file));
    }
  };

  const uploadCategoryImage = async (
    file: File,
    userId: string,
    type: "icon" | "header"
  ): Promise<string | null> => {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${type}s/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("category-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from("category-images")
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!category) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace(`/${locale}/login`);
        return;
      }

      const updateBody: { icon_url?: string | null; header_image_url?: string | null } = {};

      if (iconFile) {
        try {
          updateBody.icon_url = await uploadCategoryImage(iconFile, session.user.id, "icon");
        } catch {
          setErrorMsg(dict.categoryEdit.errorIconUpload);
          return;
        }
      }

      if (headerFile) {
        try {
          updateBody.header_image_url = await uploadCategoryImage(headerFile, session.user.id, "header");
        } catch {
          setErrorMsg(dict.categoryEdit.errorHeaderUpload);
          return;
        }
      }

      if (Object.keys(updateBody).length === 0) {
        setErrorMsg(dict.categoryEdit.errorNoChange);
        return;
      }

      const res = await fetch(`/api/category/${category.id}/images`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateBody),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? dict.categoryEdit.errorGeneral);
        return;
      }

      setDone(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveIcon = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !category) return;

    const res = await fetch(`/api/category/${category.id}/images`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ icon_url: null }),
    });

    if (res.ok) {
      setIconPreview(null);
      setIconFile(null);
      setCategory({ ...category, icon_url: null });
    }
  };

  const handleRemoveHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !category) return;

    const res = await fetch(`/api/category/${category.id}/images`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ header_image_url: null }),
    });

    if (res.ok) {
      setHeaderPreview(null);
      setHeaderFile(null);
      setCategory({ ...category, header_image_url: null });
    }
  };

  if (loading) return null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <BackButton />
        <header className={styles.header}>
          <p className={styles.breadcrumb}>STORIES / CATEGORY / SETTINGS</p>
          <h1 className={styles.title}>{dict.categoryEdit.settingsTitle}</h1>
          <p className={styles.subtitle}>
            {dict.categoryEdit.settingsSubtitle.replace("{category}", category?.name ?? "")}
          </p>
        </header>

        {done ? (
          <div className={styles.successCard}>
            <p className={styles.successTitle}>{dict.categoryEdit.successTitle}</p>
            <button
              className={styles.backBtn}
              onClick={() => router.push(`/${locale}/story/category/${slug}`)}
            >
              {dict.categoryEdit.backToCategory}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && <p className={styles.error}>{errorMsg}</p>}

            {/* アイコン設定 */}
            <div className={styles.formGroup}>
              <label>{dict.categoryEdit.iconLabel}<span className={styles.hint}>{dict.categoryEdit.iconHint}</span></label>
              <div className={styles.imageRow}>
                {iconPreview ? (
                  <div className={styles.iconPreviewWrap}>
                    <img src={iconPreview} alt="icon" className={styles.iconPreview} />
                    {category?.icon_url && !iconFile && (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={handleRemoveIcon}
                      >
                        {dict.common.delete}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={styles.iconPlaceholder}>NO ICON</div>
                )}
                <div className={styles.fileInputWrap}>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handleIconChange}
                  />
                  <p className={styles.fileHint}>{dict.categoryEdit.fileHint}</p>
                </div>
              </div>
            </div>

            {/* ヘッダー画像設定 */}
            <div className={styles.formGroup}>
              <label>{dict.categoryEdit.headerLabel}<span className={styles.hint}>{dict.categoryEdit.headerHint}</span></label>
              {headerPreview ? (
                <div className={styles.headerPreviewWrap}>
                  <img src={headerPreview} alt="header" className={styles.headerPreview} />
                  {category?.header_image_url && !headerFile && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={handleRemoveHeader}
                    >
                      {dict.common.delete}
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.headerPlaceholder}>NO HEADER IMAGE</div>
              )}
              <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                style={{ marginTop: "8px" }}
                onChange={handleHeaderChange}
              />
              <p className={styles.fileHint}>{dict.categoryEdit.fileHint}</p>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? dict.categoryEdit.saving : dict.categoryEdit.saveBtn}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
