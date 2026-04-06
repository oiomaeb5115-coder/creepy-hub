import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import ViewIcon from "@/components/icons/ViewIcon";

export const revalidate = 300;

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
  slug: string | null;
};

export default async function StoryTagPage({ params }: TagPageProps) {
  const { locale, slug } = await params;
  const dict = await getDictionary(locale);

  const { data: tagData } = await supabaseAdmin
    .from("story_tags")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  const tag = tagData as TagRow | null;

  if (!tag) notFound();

  const { data: joins } = await supabaseAdmin
    .from("post_story_tags")
    .select("post_id")
    .eq("tag_id", tag.id)
    .limit(100);

  const postIds = (joins ?? []).map((row: any) => row.post_id);

  let posts: PostRow[] = [];

  if (postIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("post")
      .select("id, title, content, image_url, view_count, created_at, slug")
      .eq("is_published", true)
      .in("id", postIds);

    let translationsMap: Record<number, { title: string; content: string }> = {};
    if (locale === "en" && (data ?? []).length > 0) {
      const ids = (data ?? []).map((p: any) => p.id);
      const { data: trData } = await supabaseAdmin
        .from("post_translations")
        .select("post_id, title, content")
        .eq("locale", "en")
        .in("post_id", ids);
      for (const tr of trData ?? []) {
        translationsMap[tr.post_id] = { title: tr.title, content: tr.content };
      }
    }

    posts = (data ?? []).map((p: any) => {
      const tr = translationsMap[p.id] ?? null;
      return {
        id: p.id,
        title: tr?.title ?? p.title,
        content: tr?.content ?? p.content,
        image_url: p.image_url,
        view_count: p.view_count,
        created_at: p.created_at,
        slug: p.slug,
      };
    });
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
                href={postUrl(locale, post.id, post.slug)}
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
                <h3 style={{ margin: "0 0 10px" }}>{post.title ?? dict.post.untitled}</h3>
                <p style={{ margin: "0 0 10px", color: "#c8d3e4" }}>
                  {(post.content ?? "").slice(0, 120)}
                </p>
                <span className="stat-icon" style={{ fontSize: 13 }}>
                  <ViewIcon /> {post.view_count ?? 0}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
