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
    title: dict.rightsClaim.metaTitle,
    description: dict.rightsClaim.metaDescription,
    robots: { index: false, follow: true },
  };
}

export default async function RightsClaimPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const r = dict.rightsClaim;

  return (
    <main className={styles.privacyPage}>
      <div className={styles.privacyShell}>
        <BackButton />
        <header className={styles.privacyHeader}>
          <p className={styles.privacyBreadcrumb}>ARCHIVE / RIGHTS CLAIM</p>
          <h1 className={styles.privacyTitle}>{r.title}</h1>
        </header>

        <section className={styles.section}>
          <div
            className={styles.sectionBody}
            dangerouslySetInnerHTML={{ __html: r.body }}
          />
        </section>
      </div>
    </main>
  );
}
