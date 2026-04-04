import type { Metadata } from "next";
import { getDictionary } from "@/lib/getDictionary";
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
    title: dict.privacy.metaTitle,
    description: dict.privacy.metaDescription,
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const p = dict.privacy;

  return (
    <main className={styles.privacyPage}>
      <div className={styles.privacyShell}>
        <BackButton />
        <header className={styles.privacyHeader}>
          <p className={styles.privacyBreadcrumb}>ARCHIVE / PRIVACY POLICY</p>
          <h1 className={styles.privacyTitle}>{p.title}</h1>
          <p className={styles.privacyUpdated}>{p.lastUpdated}</p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.introTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.introBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.collectTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.collectBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.useTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.useBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.thirdPartyTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.thirdPartyBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.localStorageTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.localStorageBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.securityTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.securityBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.changesTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.changesBody }} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{p.contactTitle}</h2>
          <div className={styles.sectionBody} dangerouslySetInnerHTML={{ __html: p.contactBody }} />
        </section>
      </div>
    </main>
  );
}
