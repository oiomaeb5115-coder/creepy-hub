"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import styles from "./page.module.css";

export default function CategoryCreatePage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
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

  // name から slug を自動生成
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !slug.trim()) {
      setErrorMsg("カテゴリ名と slug は必須です。");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace(`/${locale}/login`);
        return;
      }

      const res = await fetch("/api/category/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "エラーが発生しました。");
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
          <p className={styles.breadcrumb}>STORIES / CATEGORY / NEW</p>
          <h1 className={styles.title}>カテゴリを作成</h1>
          <p className={styles.subtitle}>
            作成したカテゴリは管理者の審査後に公開されます。1アカウントにつき最大5個まで作成できます。
          </p>
        </header>

        {done ? (
          <div className={styles.successCard}>
            <p className={styles.successTitle}>申請を受け付けました</p>
            <p className={styles.successBody}>
              管理者が審査します。承認されるとカテゴリが公開されます。
            </p>
            <button
              className={styles.backBtn}
              onClick={() => router.push(`/${locale}/story`)}
            >
              ストーリー一覧へ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && <p className={styles.error}>{errorMsg}</p>}

            <div className={styles.formGroup}>
              <label htmlFor="catName">カテゴリ名 *</label>
              <input
                id="catName"
                type="text"
                className={styles.formControl}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="例: 心霊スポット"
                maxLength={40}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="catSlug">
                slug *{" "}
                <span className={styles.hint}>
                  （URLに使用。半角英小文字・数字・ハイフンのみ）
                </span>
              </label>
              <input
                id="catSlug"
                type="text"
                className={styles.formControl}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="例: shinrei-spot"
                maxLength={60}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="catDesc">説明（任意）</label>
              <textarea
                id="catDesc"
                className={styles.formControl}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="このカテゴリに投稿する内容の説明"
                rows={3}
                maxLength={200}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "送信中..." : "審査に申請する"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
