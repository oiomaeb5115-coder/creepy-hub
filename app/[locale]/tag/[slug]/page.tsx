import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import { getStoryTagBySlug } from "@/lib/tags";
import BackButton from "@/components/BackButton";

type TagPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type TagRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  view_count: number | null;
  created_at: string | null;
};

export default async function StoryTagPage({ params }: TagPageProps) {
  const { locale, slug } = await params;
  const dict = await getDictionary(locale);

  const { data: tagData } = await getStoryTagBySlug(slug);
  const tag = tagData as TagRow | null;

  if (!tag) notFound();

  const { data: joins } = await supabase
    .from("post_story_tags")
    .select("post_id")
    .eq("tag_id", tag.id);

  const postIds = (joins ?? []).map((row: any) => row.post_id);

  let posts: PostRow[] = [];

  if (postIds.length > 0) {
    if (locale === "en") {
      const { data } = await supabase
        .from("post")
        .select("id, title, content, image_url, view_count, created_at, post_translations!inner(title, content)")
        .eq("is_published", true)
        .eq("post_translations.locale", "en")
        .in("id", postIds);

      posts = (data ?? []).map((p: any) => ({
        id: p.id,
        title: p.post_translations?.[0]?.title ?? p.title,
        content: p.post_translations?.[0]?.content ?? p.content,
        image_url: p.image_url,
        view_count: p.view_count,
        created_at: p.created_at,
      }));
    } else {
      const { data } = await supabase
        .from("post")
        .select("id, title, content, image_url, view_count, created_at")
        .eq("is_published", true)
        .in("id", postIds);
      posts = (data ?? []) as PostRow[];
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #07111f 0%, #020812 100%)",
        color: "#e8edf7",
        padding: "32px 20px 72px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <BackButton />
        <h1>#{tag.name}</h1>
        <p>{tag.description ?? dict.tag.stories}</p>

        <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
          {posts.length === 0 ? (
            <p>{dict.tag.noStories}</p>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/${locale}/story/${post.id}`}
                style={{
                  display: "block",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(104, 128, 165, 0.24)",
                  background: "rgba(7, 14, 25, 0.94)",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <h3 style={{ margin: "0 0 10px" }}>{post.title ?? dict.story.untitled}</h3>
                <p style={{ margin: "0 0 10px", color: "#c8d3e4" }}>
                  {(post.content ?? "").slice(0, 120)}
                </p>
                <span style={{ color: "#8ea4c2", fontSize: 13 }}>
                  👁 {post.view_count ?? 0}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
