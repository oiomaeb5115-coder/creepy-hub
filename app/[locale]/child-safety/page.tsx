import type { Metadata } from "next";
import { getDictionary } from "@/lib/getDictionary";
import { sanitizeDictHtml } from "@/lib/sanitizeDictHtml";
import BackButton from "@/components/BackButton";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.childSafety.metaTitle,
    description: dict.childSafety.metaDescription,
    robots: { index: true, follow: true },
  };
}

export default async function ChildSafetyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const c = dict.childSafety;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <BackButton />
        <header className={styles.header}>
          <p className={styles.breadcrumb}>ARCHIVE / CHILD SAFETY</p>
          <h1 className={styles.title}>{c.title}</h1>
          <p className={styles.updated}>{c.lastUpdated}</p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.introTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.introBody) }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.prohibitedTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.prohibitedBody) }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.reportingTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.reportingBody) }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.responseTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.responseBody) }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.lawEnforcementTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.lawEnforcementBody) }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.complianceTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.complianceBody) }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.contactTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: sanitizeDictHtml(c.contactBody) }} />
        </section>
      </div>
    </main>
  );
}
