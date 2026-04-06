import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/story/[id]
 * 自分のストーリーを削除する（管理者は誰のでも削除可）。
 * DBレコード + Storage ファイルの両方を削除。
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  if (!UUID_RE.test(storyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 認証
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ストーリーを取得
  const { data: story, error: fetchError } = await supabaseAdmin
    .from("user_stories")
    .select("id, user_id, media_url")
    .eq("id", storyId)
    .single();

  if (fetchError || !story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 権限チェック: 本人 or admin
  if (story.user_id !== userData.user.id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Storage からファイル削除
  try {
    const url = new URL(story.media_url);
    // パス例: /storage/v1/object/public/story-media/userId/timestamp-random.ext
    const pathMatch = url.pathname.match(/\/story-media\/(.+)$/);
    if (pathMatch) {
      await supabaseAdmin.storage.from("story-media").remove([pathMatch[1]]);
    }
  } catch (e) {
    console.error("[DELETE /api/story] storage cleanup error:", e);
    // ストレージ削除失敗はDB削除をブロックしない
  }

  // DBレコード削除
  const { error: deleteError } = await supabaseAdmin
    .from("user_stories")
    .delete()
    .eq("id", storyId);

  if (deleteError) {
    console.error("[DELETE /api/story]", deleteError.message);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
