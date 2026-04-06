import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/stream/posts
 * 動画付き投稿をストリームフィード用に返す。
 * ?cursor=<created_at> でカーソルページネーション。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 20;

  let query = supabaseAdmin
    .from("post")
    .select("id, title, video_url, created_at, user_id, slug, image_url")
    .not("video_url", "is", null)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ posts: [], nextCursor: null });
  }

  // ユーザープロフィールを取得
  const userIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const result = posts.map((p) => {
    const profile = profileMap.get(p.user_id);
    return {
      id: p.id,
      video_url: p.video_url,
      title: p.title,
      created_at: p.created_at,
      user_id: p.user_id,
      slug: p.slug,
      image_url: p.image_url,
      username: profile?.username ?? null,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });

  const nextCursor = posts.length === limit
    ? posts[posts.length - 1].created_at
    : null;

  return NextResponse.json(
    { posts: result, nextCursor },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
  );
}
