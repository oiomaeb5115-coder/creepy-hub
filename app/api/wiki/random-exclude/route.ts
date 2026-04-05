import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const locale = searchParams.get("locale") ?? "ja";
  const excludeParam = searchParams.get("exclude") ?? "";

  const excludeSlugs = excludeParam
    ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200)
    : [];

  // DB側でexclude済みの記事を除外
  let query = supabase
    .from("wiki_pages")
    .select("slug")
    .eq("locale", locale)
    .eq("is_published", true);

  if (excludeSlugs.length > 0) {
    query = query.not("slug", "in", `(${excludeSlugs.join(",")})`);
  }

  const { data, error } = await query.limit(50);

  if (error || !data || data.length === 0) {
    // fallback: excludeなしで再取得
    if (excludeSlugs.length > 0) {
      const { data: fallback } = await supabase
        .from("wiki_pages")
        .select("slug")
        .eq("locale", locale)
        .eq("is_published", true)
        .limit(50);
      const pool = fallback ?? [];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      return NextResponse.json({ slug: picked?.slug ?? null });
    }
    return NextResponse.json({ slug: null }, { status: 200 });
  }

  const picked = data[Math.floor(Math.random() * data.length)];

  const res = NextResponse.json({ slug: picked?.slug ?? null });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
