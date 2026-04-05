import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAuthorizedUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) return null;
  return { id: userData.user.id };
}

/** GET /api/story/[id]/comments — コメント一覧 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("story_comments")
    .select("id, content, is_deleted, created_at, user_id")
    .eq("story_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ユーザープロフィールを一括取得
  const userIds = [...new Set((data ?? []).map((c: Record<string, unknown>) => c.user_id as string))];
  const profileMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id as string, p);
    }
  }

  // is_deleted なコメントの content を隠す
  const comments = (data ?? []).map((c: Record<string, unknown>) => {
    const profile = profileMap.get(c.user_id as string);
    return {
      id: c.id,
      content: c.is_deleted ? "" : c.content,
      is_deleted: c.is_deleted,
      created_at: c.created_at,
      user_id: c.user_id,
      username: (profile?.username as string) ?? null,
      display_name: (profile?.display_name as string) ?? null,
      avatar_url: (profile?.avatar_url as string) ?? null,
    };
  });

  return NextResponse.json({ comments });
}

/** POST /api/story/[id]/comments — コメント投稿 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 1000) {
    return NextResponse.json({ error: "コメントは1〜1000文字にしてください" }, { status: 400 });
  }

  // ストーリーの存在確認
  const { data: story } = await supabaseAdmin
    .from("user_stories")
    .select("id")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: comment, error: insertError } = await supabaseAdmin
    .from("story_comments")
    .insert({
      story_id: id,
      user_id: user.id,
      content,
    })
    .select("id, content, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
