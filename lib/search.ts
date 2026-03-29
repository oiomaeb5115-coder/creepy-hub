import { supabase } from "@/lib/supabase";

/**
 * PostgREST フィルタ文字列内で安全に使えるよう、
 * LIKE ワイルドカードおよび PostgREST 構文上の特殊文字をすべてエスケープ/除去する。
 */
function sanitizeForPostgrest(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\") // バックスラッシュを先にエスケープ
    .replace(/%/g, "\\%")   // LIKE ワイルドカード
    .replace(/_/g, "\\_")   // LIKE 単一文字ワイルドカード
    .replace(/[(),.:"]/g, ""); // PostgREST 演算子・区切り文字の注入防止
}

export async function searchAll(query: string, locale: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { stories: [], wiki: [], storyError: null, wikiError: null };
  }

  const safeQuery = sanitizeForPostgrest(trimmed);
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