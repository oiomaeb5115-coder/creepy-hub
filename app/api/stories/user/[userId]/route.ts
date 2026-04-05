import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/stories/user/[userId]
 * 指定ユーザーの全ストーリー（期限切れ含む）を取得。
 * プロフィールの「メディア」タブで使用。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_stories")
    .select("id, media_url, media_type, duration_ms, created_at, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (error.message.includes("Could not find") || error.code === "42P01") {
      return NextResponse.json({ stories: [] });
    }
    console.error("[GET /api/stories/user]", error.message);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }

  return NextResponse.json({ stories: data ?? [] });
}
