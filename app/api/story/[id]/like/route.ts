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

  // 既存のいいねを確認
  const { data: existing } = await supabaseAdmin
    .from("story_likes")
    .select("id")
    .eq("story_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  let liked: boolean;

  if (existing) {
    // いいね解除
    await supabaseAdmin
      .from("story_likes")
      .delete()
      .eq("story_id", id)
      .eq("user_id", user.id);
    liked = false;
  } else {
    // いいね追加
    await supabaseAdmin
      .from("story_likes")
      .insert({ story_id: id, user_id: user.id });
    liked = true;
  }

  // カウント取得
  const { count } = await supabaseAdmin
    .from("story_likes")
    .select("id", { count: "exact", head: true })
    .eq("story_id", id);

  return NextResponse.json({ liked, count: count ?? 0 });
}
