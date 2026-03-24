import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import styles from "../wiki.module.css";
import BackButton from "@/components/BackButton";

type WikiCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export default async function WikiCategoriesPage({ params }: WikiCategoriesPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .eq("locale", locale)
    .eq("is_active", true)
    .eq("is_user_created", true)
    .order("created_at", { ascending: true })
    .limit(100);

  const userCategories = (categoriesData ?? []) as CategoryRow[];

  const builtinTypes = (
    Object.keys(dict.pageType) as Array<keyof typeof dict.pageType>
  ).filter((key) => key !== "general");

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

        {/* Built-in page types */}
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {locale === "ja" ? "組み込みカテゴリ" : "Built-in Types"}
            </h2>
          </div>
          <div className={styles.categoryGrid}>
            {builtinTypes.map((key) => (
              <Link
                key={key}
                href={`/${locale}/wiki/category/${key}`}
                className={styles.categoryLink}
              >
                <p className={styles.categoryName}>{dict.pageType[key]}</p>
                <p className={styles.categoryDesc}>{dict.wiki.categoryDefaultDesc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* User-created categories */}
        {userCategories.length > 0 && (
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{dict.wiki.categories}</h2>
              <span className={styles.sectionDescription}>{dict.wiki.browseByCategory}</span>
            </div>
            <div className={styles.categoryGrid}>
              {userCategories.map((category) => (
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
          </section>
        )}

        <div style={{ marginTop: "16px" }}>
          <Link href={`/${locale}/wiki/category/create`} className={styles.categoryChipNew}>
            {dict.wiki.createCategory}
          </Link>
        </div>
      </div>
    </main>
  );
}
