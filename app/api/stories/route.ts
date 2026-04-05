import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/stories
 * アクティブな（期限内の）ストーリーをユーザーごとにグループ化して返す。
 * 認証不要（ストーリーは公開）。
 */
export async function GET() {
  const now = new Date().toISOString();

  const { data: stories, error } = await supabaseAdmin
    .from("user_stories")
    .select("id, user_id, media_url, media_type, duration_ms, text_overlays, created_at, expires_at")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) {
    // テーブル未作成時はエラーではなく空配列を返す
    if (error.message.includes("Could not find") || error.code === "42P01") {
      return NextResponse.json({ users: [] });
    }
    console.error("[GET /api/stories]", error.message);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }

  if (!stories || stories.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // ユーザープロフィールを一括取得
  const userIds = [...new Set(stories.map((s) => s.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
  }

  // ユーザーごとにグループ化
  const grouped: Record<string, typeof stories> = {};
  for (const story of stories) {
    if (!grouped[story.user_id]) grouped[story.user_id] = [];
    grouped[story.user_id].push(story);
  }

  // 最新ストーリー順にソート
  const users = Object.entries(grouped)
    .map(([userId, userStories]) => ({
      user_id: userId,
      username: profileMap[userId]?.username ?? null,
      display_name: profileMap[userId]?.display_name ?? null,
      avatar_url: profileMap[userId]?.avatar_url ?? null,
      stories: userStories.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }))
    .sort((a, b) => {
      const aLatest = a.stories[a.stories.length - 1].created_at;
      const bLatest = b.stories[b.stories.length - 1].created_at;
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

  return NextResponse.json({ users });
}
