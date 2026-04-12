import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  if (!UUID_RE.test(storyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

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

  const { data: story, error: fetchError } = await supabaseAdmin
    .from("user_stories")
    .select("id, user_id, media_url, stream_video_id")
    .eq("id", storyId)
    .single();

  if (fetchError || !story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  const { error: deleteError } = await supabaseAdmin
    .from("user_stories")
    .delete()
    .eq("id", storyId);

  if (deleteError) {
    console.error("[DELETE /api/story] db delete error:", deleteError.message);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }

  // Cloudflare Stream 動画のクリーンアップ
  if (story.stream_video_id) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
    if (accountId && apiToken) {
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${story.stream_video_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiToken}` },
      }).catch((err) => console.error("[DELETE /api/story] Stream cleanup error:", err));
    }
  }

  // Supabase Storage のクリーンアップ（レガシー）
  try {
    const url = new URL(story.media_url);
    const pathMatch = url.pathname.match(/\/story-media\/(.+)$/);

    if (pathMatch) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("story-media")
        .remove([pathMatch[1]]);

      if (storageError) {
        console.error("[DELETE /api/story] storage cleanup error:", storageError.message);
      }
    }
  } catch (error) {
    console.error("[DELETE /api/story] storage cleanup error:", error);
  }

  return NextResponse.json({ success: true });
}
