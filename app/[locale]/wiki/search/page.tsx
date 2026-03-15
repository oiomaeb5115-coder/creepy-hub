import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function StorySearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = await searchParams;

  const keyword = `%${q}%`;

  const { data: posts } = q
    ? await supabase
        .from("post")
        .select("id,title,content,view_count")
        .eq("is_published", true)
        .or(`title.ilike.${keyword},content.ilike.${keyword}`)
        .order("view_count", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <main style={{ padding: "40px" }}>
      <BackButton />
      <h1>怪談検索</h1>

      <form action={`/${locale}/story/search`} method="get">
        <input name="q" placeholder="怪談を検索" />
      </form>

      <div style={{ marginTop: "30px" }}>
        {(posts ?? []).map((post: any) => (
          <Link
            key={post.id}
            href={`/${locale}/story/${post.id}`}
            style={{ display: "block", marginBottom: "15px" }}
          >
            <h3>{post.title ?? "無題"}</h3>
            <p>{(post.content ?? "").slice(0, 100)}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}