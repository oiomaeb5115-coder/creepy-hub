"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import styles from "./page.module.css";

type Dict = {
  breadcrumb: string;
  title: string;
  subtitle: string;
  successTitle: string;
  successBody: string;
  backToStories: string;
  nameLabel: string;
  namePlaceholder: string;
  slugLabel: string;
  slugHint: string;
  slugPlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  iconLabel: string;
  iconHint: string;
  headerLabel: string;
  headerHint: string;
  submitBtn: string;
  submitting: string;
  errorRequired: string;
  errorIconUpload: string;
  errorHeaderUpload: string;
};

type Props = { locale: string; dict: Dict };

export default function CategoryCreateClient({ locale, dict }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace(`/${locale}/login`);
        return;
      }
      setAuthChecked(true);
    });
  }, [locale, router]);

  const handleNameChange = (value: string) => {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setIconFile(file);
    setIconPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setHeaderFile(file);
    setHeaderPreview(file ? URL.createObjectURL(file) : null);
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

    if (!name.trim() || !slug.trim()) {
      setErrorMsg(dict.errorRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace(`/${locale}/login`);
        return;
      }

      let iconUrl: string | null = null;
      let headerUrl: string | null = null;

      if (iconFile) {
        try {
          iconUrl = await uploadCategoryImage(iconFile, session.user.id, "icon");
        } catch {
          setErrorMsg(dict.errorIconUpload);
          return;
        }
      }

      if (headerFile) {
        try {
          headerUrl = await uploadCategoryImage(headerFile, session.user.id, "header");
        } catch {
          setErrorMsg(dict.errorHeaderUpload);
          return;
        }
      }

      const res = await fetch("/api/category/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description,
          icon_url: iconUrl,
          header_image_url: headerUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Error");
        return;
      }

      setDone(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authChecked) return null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <BackButton />
        <header className={styles.header}>
          <p className={styles.breadcrumb}>{dict.breadcrumb}</p>
          <h1 className={styles.title}>{dict.title}</h1>
          <p className={styles.subtitle}>{dict.subtitle}</p>
        </header>

        {done ? (
          <div className={styles.successCard}>
            <p className={styles.successTitle}>{dict.successTitle}</p>
            <p className={styles.successBody}>{dict.successBody}</p>
            <button
              className={styles.backBtn}
              onClick={() => router.push(`/${locale}/story`)}
            >
              {dict.backToStories}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && <p className={styles.error}>{errorMsg}</p>}

            <div className={styles.formGroup}>
              <label htmlFor="catName">{dict.nameLabel}</label>
              <input
                id="catName"
                type="text"
                className={styles.formControl}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={dict.namePlaceholder}
                maxLength={40}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="catSlug">
                {dict.slugLabel}{" "}
                <span className={styles.hint}>{dict.slugHint}</span>
              </label>
              <input
                id="catSlug"
                type="text"
                className={styles.formControl}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={dict.slugPlaceholder}
                maxLength={60}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="catDesc">{dict.descLabel}</label>
              <textarea
                id="catDesc"
                className={styles.formControl}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={dict.descPlaceholder}
                rows={3}
                maxLength={200}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="catIcon">
                {dict.iconLabel}
                <span className={styles.hint}>{dict.iconHint}</span>
              </label>
              {iconPreview && (
                <div className={styles.iconPreviewWrap}>
                  <img src={iconPreview} alt="icon preview" className={styles.iconPreview} />
                </div>
              )}
              <input
                id="catIcon"
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleIconChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="catHeader">
                {dict.headerLabel}
                <span className={styles.hint}>{dict.headerHint}</span>
              </label>
              {headerPreview && (
                <div className={styles.headerPreviewWrap}>
                  <img src={headerPreview} alt="header preview" className={styles.headerPreview} />
                </div>
              )}
              <input
                id="catHeader"
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleHeaderChange}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? dict.submitting : dict.submitBtn}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
