import { supabase } from "@/lib/supabase";
import { makePostgrestIlikePattern } from "@/lib/postgrestFilter";

export async function searchAll(query: string, locale: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { stories: [], wiki: [], storyError: null, wikiError: null };
  }

  const keyword = makePostgrestIlikePattern(trimmed.slice(0, 200));

  const [storiesResult, wikiResult] = await Promise.all([
    supabase
      .from("post")
      .select("id, title, content, created_at, image_url, view_count, slug")
      .eq("is_published", true)
      .or(`title.ilike.${keyword},content.ilike.${keyword}`)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("wiki_pages")
      .select("id, slug, title, summary, updated_at, view_count")
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
