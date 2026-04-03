import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../wiki.module.css";
import BackButton from "@/components/BackButton";

type WikiCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: WikiCategoriesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return { title: dict.meta.wikiCategoriesTitle };
}

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export default async function WikiCategoriesPage({ params }: WikiCategoriesPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const { data: categoriesData } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, description")
    .eq("locale", locale)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(100);

  const categories = (categoriesData ?? []) as CategoryRow[];

  return (
    <main className={styles.wikiPage}>
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div>
            <p className={styles.wikiBreadcrumb}>OCCULT WIKI / CATEGORIES</p>
            <h1 className={styles.wikiTitle}>{dict.wiki.categories}</h1>
            <p className={styles.wikiSubtitle}>{dict.wiki.browseByCategory}</p>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>{dict.nav.home}</Link>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{dict.wiki.categories}</h2>
            <span className={styles.sectionDescription}>{dict.wiki.browseByCategory}</span>
          </div>
          {categories.length === 0 ? (
            <p className={styles.emptyText}>{dict.wiki.noCategoryDesc}</p>
          ) : (
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${locale}/wiki/category/${category.slug}`}
                  className={styles.categoryLink}
                >
                  <p className={styles.categoryName}>{category.name}</p>
                  <p className={styles.categoryDesc}>
                    {category.description ?? dict.wiki.noCategoryDesc}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div style={{ marginTop: "16px" }}>
          <Link href={`/${locale}/wiki/category/create`} className={styles.categoryChipNew}>
            {dict.wiki.createCategory}
          </Link>
        </div>
      </div>
    </main>
  );
}
