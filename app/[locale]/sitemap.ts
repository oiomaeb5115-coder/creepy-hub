import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://creepyhub.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [storiesResult, wikiResult] = await Promise.all([
    supabase
      .from("post")
      .select("id, updated_at, created_at")
      .eq("is_published", true),
    supabase
      .from("wiki_pages")
      .select("slug, updated_at")
      .eq("locale", "ja")
      .eq("is_published", true),
  ]);

  const stories = (storiesResult.data ?? []).map((post) => ({
    url: `${baseUrl}/ja/story/${post.id}`,
    lastModified: new Date(post.updated_at ?? post.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const wikiPages = (wikiResult.data ?? []).map((page) => ({
    url: `${baseUrl}/ja/wiki/${page.slug}`,
    lastModified: new Date(page.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${baseUrl}/ja`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/ja/story`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ja/wiki`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...stories,
    ...wikiPages,
  ];
}
