"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "../login/page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export default function ResetPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;
  const searchParams = useSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // リセットリンクのcodeからセッションを確立する
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setIsReady(true);
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(() => {
      setIsReady(true);
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert(dict.auth.resetPasswordMismatch);
      return;
    }

    if (newPassword.length < 6) {
      alert("パスワードは6文字以上で入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        alert(`${dict.auth.resetPasswordFailed}${error.message}`);
        return;
      }

      // パスワード変更成功 → ロックを解除
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/auth/unlock", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }

      alert(dict.auth.resetPasswordSuccess);
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
            <h1 className={styles.authTitle}>Reset Password</h1>
            <p className={styles.authSubtitle}>
              {dict.auth.resetPasswordInstruction}
            </p>
          </div>
        </header>

        <section className={styles.authCard}>
          <div className={styles.formHeader}>
            <h2>{dict.auth.resetPasswordHeading}</h2>
          </div>

          {!isReady ? (
            <p style={{ color: "#a49080" }}>準備中...</p>
          ) : (
            <form className={styles.authForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">{dict.auth.newPasswordLabel}</label>
                <input
                  id="newPassword"
                  type="password"
                  className={styles.formControl}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">
                  {dict.auth.confirmPasswordLabel}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={styles.formControl}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.submitRow}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "変更中..."
                    : dict.auth.resetPasswordSubmit}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
