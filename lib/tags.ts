import { supabase } from "@/lib/supabase";

export async function getStoryTagBySlug(slug: string) {
  return supabase
    .from("story_tags")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
}