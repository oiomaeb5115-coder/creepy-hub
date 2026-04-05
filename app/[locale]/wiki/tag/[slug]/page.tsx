import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import styles from "../../wiki.module.css";
import BackButton from "@/components/BackButton";

export const revalidate = 300;

type WikiTagPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: WikiTagPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data: tag } = await supabaseAdmin
    .from("wiki_tags")
    .select("name")
    .eq("locale", locale)
    .eq("slug", slug)
    .single();
  if (!tag) return {};
  return { title: tag.name };
}

type TagRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
};

type JoinRow = {
  wiki_page_id: number;
};

type WikiRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
};

export default async function WikiTagPage({ params }: WikiTagPageProps) {
  const { locale, slug } = await params;

  const { data: tag, error: tagError } = await supabaseAdmin
    .from("tags")
    .select("id, slug, name, description, locale")
    .eq("locale", locale)
    .eq("slug", slug)
    .single();

  if (tagError || !tag) {
    notFound();
  }

  const safeTag = tag as TagRow;

  const { data: joins, error: joinError } = await supabaseAdmin
    .from("wiki_page_tags")
    .select("wiki_page_id")
    .eq("tag_id", safeTag.id);

  const wikiIds = ((joins ?? []) as JoinRow[]).map((item) => item.wiki_page_id);

  let items: WikiRow[] = [];
  let wikiErrorMessage = "";

  if (joinError) {
    wikiErrorMessage = joinError.message;
  } else if (wikiIds.length > 0) {
    const { data: wikiItems, error: wikiError } = await supabaseAdmin
      .from("wiki_pages")
      .select("id, slug, title, summary")
      .eq("locale", locale)
      .eq("is_published", true)
      .in("id", wikiIds);

    if (wikiError) {
      wikiErrorMessage = wikiError.message;
    } else {
      items = (wikiItems ?? []) as WikiRow[];
    }
  }

  return (
    <main className={styles.wikiPage}>
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div>
            <p className={styles.wikiBreadcrumb}>ARCHIVE / WIKI / TAG</p>
            <h1 className={styles.wikiTitle}>#{safeTag.name}</h1>
            <p className={styles.wikiSubtitle}>
              {safeTag.description ?? "タグ別の wiki 一覧です。"}
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>
              Wiki 一覧
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>タグ付きページ</h2>
            <p className={styles.sectionDescription}>
              このタグに紐づいた wiki 記事を表示しています。
            </p>
          </div>

          {wikiErrorMessage ? (
            <div className={styles.errorBox}>{wikiErrorMessage}</div>
          ) : items.length === 0 ? (
            <p className={styles.emptyText}>まだ記事がありません。</p>
          ) : (
            <div className={styles.list}>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/wiki/${item.slug}`}
                  className={styles.listLink}
                >
                  <article className={styles.listItem}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <p className={styles.itemText}>
                      {item.summary ?? "概要はまだ設定されていません。"}
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}