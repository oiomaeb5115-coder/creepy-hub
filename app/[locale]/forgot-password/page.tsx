"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "../login/page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export default function ForgotPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      alert(locale === "en" ? "Please enter your email address." : "メールアドレスを入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? (locale === "en" ? "Failed to send email." : "メール送信に失敗しました。"));
        return;
      }

      setSent(true);
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
            <h1 className={styles.authTitle}>
              {locale === "en" ? "Forgot Password" : "パスワードリセット"}
            </h1>
          </div>
          <div className={styles.authActions}>
            <Link href={`/${locale}/login`} className={styles.topLink}>
              {dict.nav.login}
            </Link>
          </div>
        </header>

        <section className={styles.authCard}>
          {sent ? (
            <div className={styles.formHeader}>
              <h2>{locale === "en" ? "Email Sent" : "メールを送信しました"}</h2>
              <p>
                {locale === "en"
                  ? "A password reset link has been sent to your email address. Please check your inbox."
                  : "パスワードリセット用のリンクをお送りしました。メールをご確認ください。"}
              </p>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h2>{locale === "en" ? "Reset your password" : "パスワードをリセット"}</h2>
                <p>
                  {locale === "en"
                    ? "Enter your registered email address. We will send you a password reset link."
                    : "登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。"}
                </p>
              </div>

              <form className={styles.authForm} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">{dict.auth.emailLabel}</label>
                  <input
                    id="email"
                    type="email"
                    className={styles.formControl}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className={styles.submitRow}>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? (locale === "en" ? "Sending..." : "送信中...")
                      : (locale === "en" ? "Send Reset Link" : "リセットリンクを送る")}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
