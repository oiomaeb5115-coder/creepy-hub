"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

export default function RegisterPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        alert(`登録失敗: ${error.message}`);
        return;
      }

      alert("確認メールを送信しました。");
      window.location.href = `/${locale}/login`;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <div className={styles.authShell}>
        <BackButton />
        <header className={styles.authHeader}>
          <div>
            <p className={styles.authBreadcrumb}>ARCHIVE / ACCOUNT</p>
            <h1 className={styles.authTitle}>Register</h1>
            <p className={styles.authSubtitle}>
              Horror Archive のアカウントを作成します
            </p>
          </div>

          <div className={styles.authActions}>
            <Link href={`/${locale}`} className={styles.topLink}>
              ホーム
            </Link>
            <Link href={`/${locale}/login`} className={styles.topLink}>
              ログイン
            </Link>
          </div>
        </header>

        <section className={styles.authCard}>
          <div className={styles.formHeader}>
            <h2>登録</h2>
            <p>メールアドレスとパスワードを入力してアカウントを作成します。</p>
          </div>

          <form className={styles.authForm} onSubmit={handleRegister}>
            <div className={styles.formGroup}>
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                className={styles.formControl}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                className={styles.formControl}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? "登録中..." : "登録する"}
              </button>
            </div>
          </form>

          <div className={styles.authFooter}>
            <p>すでにアカウントを持っていますか？</p>
            <Link href={`/${locale}/login`} className={styles.inlineLink}>
              ログインページへ
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}