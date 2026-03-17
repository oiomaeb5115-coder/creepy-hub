import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://creepyhub.com";

export async function generateStaticParams() {
  return [{ locale: "ja" }, { locale: "en" }];
}

export default async function sitemap(
  props?: { params?: { locale: string } }
): Promise<MetadataRoute.Sitemap> {
  const locale = props?.params?.locale ?? "ja";

  const [storiesResult, wikiResult] = await Promise.all([
    // Stories are shared across locales (EN shows translated stories)
    supabase
      .from("post")
      .select("id, updated_at, created_at")
      .eq("is_published", true),
    supabase
      .from("wiki_pages")
      .select("slug, updated_at")
      .eq("locale", locale)
      .eq("is_published", true),
  ]);

  const stories = (storiesResult.data ?? []).map((post) => ({
    url: `${baseUrl}/${locale}/story/${post.id}`,
    lastModified: new Date(post.updated_at ?? post.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const wikiPages = (wikiResult.data ?? []).map((page) => ({
    url: `${baseUrl}/${locale}/wiki/${page.slug}`,
    lastModified: new Date(page.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/${locale}/story`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/${locale}/wiki`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...stories,
    ...wikiPages,
  ];
}
