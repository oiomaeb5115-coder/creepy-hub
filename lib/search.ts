import { supabase } from "@/lib/supabase";

export async function searchAll(query: string, locale: string) {
  // LIKE ワイルドカード（% _）とPostgRESTフィルタ特殊文字をエスケープ
  const safeQuery = query
    .replace(/\\/g, "\\\\") // バックスラッシュを先にエスケープ
    .replace(/%/g, "\\%")   // LIKE ワイルドカード
    .replace(/_/g, "\\_")   // LIKE 単一文字ワイルドカード
    .replace(/[(),]/g, ""); // PostgREST フィルタ注入防止
  const keyword = `%${safeQuery}%`;

  const [storiesResult, wikiResult] = await Promise.all([
    supabase
      .from("post")
      .select("id, title, content, created_at, image_url, view_count")
      .eq("is_published", true)
      .or(`title.ilike.${keyword},content.ilike.${keyword}`)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, page_type, updated_at, view_count")
      .eq("locale", locale)
      .eq("is_published", true)
      .or(`title.ilike.${keyword},summary.ilike.${keyword},content.ilike.${keyword}`)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  return {
    stories: storiesResult.data ?? [],
    wiki: wikiResult.data ?? [],
    storyError: storiesResult.error,
    wikiError: wikiResult.error,
  };
}