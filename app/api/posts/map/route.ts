import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/posts/map?north=&south=&east=&west=&limit=300
 *
 * 公開済み・位置情報ありの投稿を bounding box で返す。
 * iOS / Android の地図画面からネイティブで叩く想定。認証不要。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const north = parseFloat(searchParams.get("north") ?? "");
  const south = parseFloat(searchParams.get("south") ?? "");
  const east = parseFloat(searchParams.get("east") ?? "");
  const west = parseFloat(searchParams.get("west") ?? "");
  const limitRaw = parseInt(searchParams.get("limit") ?? "300", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 300;

  // since: 期間フィルタ。数値なら "過去N日"、ISO文字列ならその時点以降。
  const sinceRaw = searchParams.get("since");
  let sinceISO: string | null = null;
  if (sinceRaw) {
    const asDays = parseInt(sinceRaw, 10);
    if (Number.isFinite(asDays) && String(asDays) === sinceRaw && asDays > 0) {
      sinceISO = new Date(Date.now() - asDays * 24 * 60 * 60 * 1000).toISOString();
    } else if (!Number.isNaN(Date.parse(sinceRaw))) {
      sinceISO = new Date(sinceRaw).toISOString();
    }
  }

  if (
    !Number.isFinite(north) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(west)
  ) {
    return NextResponse.json(
      { error: "north/south/east/west are required numeric query params" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // posts_with_location ビューを叩く（is_published + 未削除 + 位置あり）
  let query = supabase
    .from("posts_with_location")
    .select("id, title, slug, content, image_url, image_url_2, image_url_3, category_id, user_id, lat, lng, location_name, location_precision, map_category, created_at")
    .gte("lat", south)
    .lte("lat", north)
    .order("created_at", { ascending: false })
    .limit(limit);

  // 日付変更線をまたがない想定（日本のみ対象）なので east > west 前提
  query = query.gte("lng", west).lte("lng", east);

  if (sinceISO) {
    query = query.gte("created_at", sinceISO);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { posts: data ?? [] },
    {
      headers: {
        // bbox が変わる度に fetch するため短めキャッシュ
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    }
  );
}
