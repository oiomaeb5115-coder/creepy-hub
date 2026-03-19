import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import AutoLinkedWikiContent from "@/components/AutoLinkedwikiContent";
import { buildAutoLinkedHtml } from "@/lib/wiki-autolink";
import styles from "../wiki.module.css";
import BackButton from "@/components/BackButton";
import TranslateButton from "@/components/TranslateButton";
import WikiActionButtons from "@/components/WikiActionButtons";

const BASE_URL = "https://creepyhub.com";

type WikiDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: WikiDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("title, summary, image_url")
    .eq("locale", locale)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!page) return {};

  const title = page.title;
  const description = page.summary ?? undefined;
  const url = `${BASE_URL}/${locale}/wiki/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ja: `${BASE_URL}/ja/wiki/${slug}`,
        en: `${BASE_URL}/en/wiki/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: locale === "en" ? "en_US" : "ja_JP",
      ...(page.image_url ? { images: [{ url: page.image_url }] } : {}),
    },
  };
}

type WikiPageRow = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  content: string | null;
  page_type: string;
  locale: string;
  view_count: number | null;
  updated_at: string | null;
  is_published: boolean;
  image_url: string | null;
  author_id: string | null;
};

type RelatedRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  image_url: string | null;
};

type WikiLinkItem = {
  slug: string;
  title: string;
};

export default async function WikiDetailPage({
  params,
}: WikiDetailPageProps) {
  const { locale, slug } = await params;
  const dict = await getDictionary(locale);

  const { data: page, error } = await supabase
    .from("wiki_pages")
    .select(
      "id, slug, title, subtitle, summary, content, page_type, locale, view_count, updated_at, is_published, image_url, author_id"
    )
    .eq("locale", locale)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !page) {
    notFound();
  }

  const safePage = page as WikiPageRow;

  await supabase.rpc("increment_wiki_view", { p_wiki_id: safePage.id });

  const { data: related } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, summary, image_url")
    .eq("locale", locale)
    .eq("page_type", safePage.page_type)
    .eq("is_published", true)
    .neq("id", safePage.id)
    .limit(6);

  const { data: wikiItemsData } = await supabase
    .from("wiki_pages")
    .select("slug, title")
    .eq("locale", locale)
    .eq("is_published", true)
    .neq("id", safePage.id)
    .limit(200);

  // 英語版の存在チェック（ja ページの場合）
  let hasEnglishTranslation = false;
  if (locale === "ja") {
    const { data: enPage } = await supabase
      .from("wiki_pages")
      .select("id")
      .eq("slug", slug)
      .eq("locale", "en")
      .eq("is_published", true)
      .single();
    hasEnglishTranslation = !!enPage;
  }

  const relatedItems = (related ?? []) as RelatedRow[];
  const wikiItems = (wikiItemsData ?? []) as WikiLinkItem[];
  const displayedViewCount = (safePage.view_count ?? 0) + 1;

  const linkedHtml = buildAutoLinkedHtml(
    safePage.content ?? "",
    locale,
    wikiItems
  );

  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const pageTypeLabel =
    dict.pageType[safePage.page_type as keyof typeof dict.pageType] ??
    safePage.page_type;

  return (
    <main className={styles.wikiPage}>
      <div className={styles.wikiShell}>
        <BackButton />
        <header className={styles.wikiHeader}>
          <div className={styles.wikiHeaderTop}>
            <p className={styles.wikiBreadcrumb}>
              ARCHIVE / WIKI / {safePage.page_type.toUpperCase()}
            </p>
            <div className={styles.headerActions}>
            <Link href={`/${locale}/wiki`} className={styles.topLink}>
              {dict.wiki.listTitle}
            </Link>
            <Link href={`/${locale}`} className={styles.topLink}>
              {dict.nav.home}
            </Link>
            <Link
              href={`/${locale}/wiki/${safePage.slug}/revisions`}
              className={styles.topLink}
            >
              {dict.wiki.history}
            </Link>
            <TranslateButton
              type="wiki"
              slug={safePage.slug}
              locale={locale}
              hasTranslation={hasEnglishTranslation}
              labels={dict.wiki}
            />
            <WikiActionButtons
              slug={safePage.slug}
              authorId={safePage.author_id}
              locale={locale}
              labels={{
                edit: dict.common.edit,
                delete: dict.common.delete,
                deleting: dict.common.deleting,
                deleteConfirm: dict.common.deleteConfirmWiki,
                deleteFailed: dict.common.deleteFailed,
              }}
            />
            </div>
          </div>
          <div className={styles.wikiTitleRow}>
            <h1 className={styles.wikiTitle}>{safePage.title}</h1>
            <p className={styles.wikiSubtitle}>
              {safePage.subtitle ?? "Wiki"}
            </p>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.metaRow}>
            <span className={styles.badge}>{pageTypeLabel}</span>
            <span className={styles.badge}>{dict.post.views}: {displayedViewCount}</span>
            <span className={styles.badge}>
              {safePage.updated_at
                ? new Date(safePage.updated_at).toLocaleDateString(dateLocale)
                : "—"}
            </span>
          </div>

          {safePage.image_url && (
            <img
              src={safePage.image_url}
              alt={safePage.title}
              className={styles.wikiThumbnail}
            />
          )}

          {safePage.summary && (
            <p className={styles.summary}>{safePage.summary}</p>
          )}

          <div className={styles.content}>
            {!safePage.content ? (
              <p>{dict.wiki.noContent}</p>
            ) : (
              <AutoLinkedWikiContent html={linkedHtml} />
            )}
          </div>

          <div className={styles.inlineLinks}>
            <Link
              href={`/${locale}/wiki/category/${safePage.page_type}`}
              className={styles.inlineLink}
            >
              {dict.wiki.viewRelatedCategory}
            </Link>
            <Link href={`/${locale}/wiki/random`} className={styles.inlineLink}>
              {dict.wiki.randomArticle}
            </Link>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{dict.wiki.related}</h2>
            <p className={styles.sectionDescription}>{dict.wiki.relatedDesc}</p>
          </div>

          {relatedItems.length === 0 ? (
            <p className={styles.emptyText}>{dict.wiki.noRelated}</p>
          ) : (
            <div className={styles.relatedGrid}>
              {relatedItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/wiki/${item.slug}`}
                  className={styles.relatedCard}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className={styles.relatedCardImg} />
                  ) : (
                    <div className={styles.relatedCardImgPlaceholder} />
                  )}
                  <div className={styles.relatedCardBody}>
                    <h3 className={styles.relatedCardTitle}>{item.title}</h3>
                    <p className={styles.relatedCardText}>
                      {(item.summary ?? dict.wiki.noSummary).slice(0, 20)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
