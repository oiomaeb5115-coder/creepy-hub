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
    title: dict.contact.metaTitle,
    description: dict.contact.metaDescription,
    robots: { index: false, follow: true },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const c = dict.contact;

  return (
    <main className={styles.privacyPage}>
      <div className={styles.privacyShell}>
        <BackButton />
        <header className={styles.privacyHeader}>
          <p className={styles.privacyBreadcrumb}>ARCHIVE / CONTACT</p>
          <h1 className={styles.privacyTitle}>{c.title}</h1>
        </header>

        <section className={styles.section}>
          <div
            className={styles.sectionBody}
            dangerouslySetInnerHTML={{ __html: c.body }}
          />
        </section>
      </div>
    </main>
  );
}
