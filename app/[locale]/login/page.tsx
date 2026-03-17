"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(`${dict.auth.loginFailed}${error.message}`);
        return;
      }

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

          <div className={styles.authFooter}>
            <p>{dict.auth.loginNoAccount}</p>
            <Link href={`/${locale}/register`} className={styles.inlineLink}>
              {dict.auth.loginToRegister}
            </Link>
          </div>

        </section>
      </div>
    </main>
  );
}