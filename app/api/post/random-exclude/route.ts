import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const excludeParam = searchParams.get("exclude") ?? "";

  const excludeIds = excludeParam
    ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200)
    : [];

  // IDが数値であることを検証
  const validExcludeIds = excludeIds.filter((id) => /^\d+$/.test(id));

  // DB側でexclude済みの投稿を除外し、1件だけ取得
  let query = supabase
    .from("post")
    .select("id")
    .eq("is_published", true);

  if (validExcludeIds.length > 0) {
    query = query.not("id", "in", `(${validExcludeIds.join(",")})`);
  }

  const { data, error } = await query.limit(50);

  if (error || !data || data.length === 0) {
    // fallback: excludeなしで再取得
    if (validExcludeIds.length > 0) {
      const { data: fallback } = await supabase
        .from("post")
        .select("id")
        .eq("is_published", true)
        .limit(50);
      const pool = fallback ?? [];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      return NextResponse.json({ id: picked?.id ?? null });
    }
    return NextResponse.json({ id: null }, { status: 200 });
  }

  const picked = data[Math.floor(Math.random() * data.length)];

  const res = NextResponse.json({ id: picked?.id ?? null });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
