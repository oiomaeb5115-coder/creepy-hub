import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDictionary } from "@/lib/getDictionary";
import BottomNavProfileLink from "./BottomNavProfileLink";
import PageTransition from "./PageTransition";
import PostDrawer from "./PostDrawer";
import AuthDrawer from "./AuthDrawer";
import Link from "next/link";
import styles from "./layout.module.css";

const locales = ["ja", "en"] as const;
const BASE_URL = "https://creepyhub.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return {
    title: {
      default: dict.meta.title,
      template: `%s | creepy hub`,
    },
    description: dict.meta.description,
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "ja_JP",
      siteName: "creepy hub",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        ja: `${BASE_URL}/ja`,
        en: `${BASE_URL}/en`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const dict = await getDictionary(locale);

  return (
    <>
      {/* Set html lang attribute dynamically for the current locale */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${locale}";`,
        }}
      />
      <PageTransition locale={locale}>{children}</PageTransition>

      <nav className={styles.bottomNav}>
        <Link href={`/${locale}`} className={styles.bottomNavItem}>
          <span className={styles.bottomNavLabel}>
            <span className={styles.bottomNavLabelEn}>HOME</span>
            <span className={styles.bottomNavLabelJa}>{dict.nav.home}</span>
          </span>
        </Link>

        <Link href={`/${locale}/story`} className={styles.bottomNavItem}>
          <span className={styles.bottomNavLabel}>
            <span className={styles.bottomNavLabelEn}>CREEPY POSTS</span>
            <span className={styles.bottomNavLabelJa}>{dict.nav.stories}</span>
          </span>
        </Link>

        <Link href={`/${locale}/wiki`} className={styles.bottomNavItem}>
          <span className={styles.bottomNavLabel}>
            <span className={styles.bottomNavLabelEn}>WIKI</span>
            <span className={styles.bottomNavLabelJa}>{dict.nav.wiki}</span>
          </span>
        </Link>

        <BottomNavProfileLink locale={locale} />
      </nav>

      <PostDrawer locale={locale} labels={dict.postDrawer} />
      <AuthDrawer locale={locale} labels={dict.authDrawer} />
    </>
  );
}
