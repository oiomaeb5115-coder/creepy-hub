"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "../page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export default function EmailSentPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  return (
    <main className={styles.authPage}>
      <div className={styles.authShell}>
        <BackButton />
        <header className={styles.authHeader}>
          <div>
            <p className={styles.authBreadcrumb}>ARCHIVE / ACCOUNT</p>
            <h1 className={styles.authTitle}>{dict.auth.emailSentTitle}</h1>
          </div>
        </header>

        <section className={styles.authCard}>
          <div className={styles.formHeader}>
            <h2>{dict.auth.emailSentHeading}</h2>
            <p>{dict.auth.emailSentDescription}</p>
          </div>

          <div className={styles.authFooter}>
            <p>{dict.auth.emailSentNote}</p>
            <Link href={`/${locale}/login`} className={styles.inlineLink}>
              {dict.auth.emailSentToLogin}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
