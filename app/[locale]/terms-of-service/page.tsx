import type { Metadata } from "next";
import { getDictionary } from "@/lib/getDictionary";
import BackButton from "@/components/BackButton";
import styles from "../privacy-policy/page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.terms.metaTitle,
    description: dict.terms.metaDescription,
  };
}

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.terms;

  return (
    <main className={styles.privacyPage}>
      <div className={styles.privacyShell}>
        <BackButton />
        <header className={styles.privacyHeader}>
          <p className={styles.privacyBreadcrumb}>ARCHIVE / TERMS OF SERVICE</p>
          <h1 className={styles.privacyTitle}>{t.title}</h1>
          <p className={styles.privacyUpdated}>{t.lastUpdated}</p>
        </header>

        <div
          className={styles.sectionBody}
          dangerouslySetInnerHTML={{ __html: t.body }}
        />
      </div>
    </main>
  );
}
