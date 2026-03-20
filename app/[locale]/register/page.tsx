"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export default function RegisterPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert(dict.auth.emptyFields);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(`${dict.auth.registerFailed}${json.error}`);
        return;
      }

      alert(dict.auth.registerEmailSent);
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
              {dict.auth.registerSubtitle}
            </p>
          </div>

          <div className={styles.authActions}>
            <Link href={`/${locale}`} className={styles.topLink}>
              {dict.nav.home}
            </Link>
            <Link href={`/${locale}/login`} className={styles.topLink}>
              {dict.nav.login}
            </Link>
          </div>
        </header>

        <section className={styles.authCard}>
          <div className={styles.formHeader}>
            <h2>{dict.auth.registerHeading}</h2>
            <p>{dict.auth.registerInstruction}</p>
          </div>

          <form className={styles.authForm} onSubmit={handleRegister}>
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
                autoComplete="new-password"
              />
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? dict.auth.registerSubmitting : dict.auth.registerSubmit}
              </button>
            </div>
          </form>

          <div className={styles.authFooter}>
            <p>{dict.auth.registerHasAccount}</p>
            <Link href={`/${locale}/login`} className={styles.inlineLink}>
              {dict.auth.registerToLogin}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}