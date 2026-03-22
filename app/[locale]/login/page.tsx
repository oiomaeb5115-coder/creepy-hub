"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearAuthCache } from "@/lib/auth";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export default function LoginPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert(dict.auth.emptyFields);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, locale }),
      });
      const json = await res.json();

      if (res.status === 423) {
        if (json.justLocked) {
          alert(dict.auth.lockoutJustLocked);
        } else {
          alert(dict.auth.lockoutStillLocked.replace("{mins}", String(json.remainingMinutes ?? 30)));
        }
        return;
      }

      if (!res.ok) {
        if (json.attemptsLeft != null) {
          alert(dict.auth.attemptsLeftWarning.replace("{count}", String(json.attemptsLeft)));
        } else {
          alert(`${dict.auth.loginFailed}${json.error}`);
        }
        return;
      }

      await supabase.auth.setSession(json.session);
      clearAuthCache();
      window.location.href = `/${locale}`;
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
            <h1 className={styles.authTitle}>Login</h1>
            <p className={styles.authSubtitle}>
              {dict.auth.loginSubtitle}
            </p>
          </div>

          <div className={styles.authActions}>
            <Link href={`/${locale}`} className={styles.topLink}>
              {dict.nav.home}
            </Link>
            <Link href={`/${locale}/register`} className={styles.topLink}>
              {dict.nav.register}
            </Link>
          </div>
        </header>

        <section className={styles.authCard}>
          <div className={styles.formHeader}>
            <h2>{dict.auth.loginHeading}</h2>
            <p>{dict.auth.loginInstruction}</p>
          </div>

          <form className={styles.authForm} onSubmit={handleLogin}>
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

            <div className={styles.formGroup}>
              <label htmlFor="password">{dict.auth.passwordLabel}</label>
              <input
                id="password"
                type="password"
                className={styles.formControl}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? dict.auth.loginSubmitting : dict.auth.loginSubmit}
              </button>
            </div>
          </form>

          <div className={styles.divider}>{dict.auth.orDivider}</div>
          <button
            type="button"
            className={styles.googleButton}
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&type=oauth`,
                },
              });
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            {dict.auth.googleLogin}
          </button>

          <div className={styles.authFooter}>
            <p>{dict.auth.loginNoAccount}</p>
            <Link href={`/${locale}/register`} className={styles.inlineLink}>
              {dict.auth.loginToRegister}
            </Link>
            <p style={{ marginTop: "14px" }}>
              <Link href={`/${locale}/forgot-password`} className={styles.inlineLink}>
                {dict.auth.forgotPassword}
              </Link>
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}