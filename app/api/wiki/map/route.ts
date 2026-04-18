import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/wiki/map?north=&south=&east=&west=&limit=300&since=
 *
 * 公開済み・位置情報ありの wiki ページを bounding box で返す。
 * /api/posts/map と同様の仕様。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const north = parseFloat(searchParams.get("north") ?? "");
  const south = parseFloat(searchParams.get("south") ?? "");
  const east = parseFloat(searchParams.get("east") ?? "");
  const west = parseFloat(searchParams.get("west") ?? "");
  const limitRaw = parseInt(searchParams.get("limit") ?? "300", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 300;

  // since: 期間フィルタ
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

  let query = supabase
    .from("wiki_pages_with_location")
    .select("id, slug, title, subtitle, summary, image_url, author_id, locale, lat, lng, location_name, location_precision, map_category, created_at, published_at")
    .gte("lat", south)
    .lte("lat", north)
    .gte("lng", west)
    .lte("lng", east)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (sinceISO) {
    query = query.gte("published_at", sinceISO);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { wikis: data ?? [] },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    }
  );
}
