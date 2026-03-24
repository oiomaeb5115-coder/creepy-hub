import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const locale = searchParams.get("locale") ?? "ja";
  const excludeParam = searchParams.get("exclude") ?? "";

  const excludeSlugs = excludeParam
    ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const { data, error } = await supabase
    .from("wiki_pages")
    .select("slug")
    .eq("locale", locale)
    .eq("is_published", true)
    .limit(200);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ slug: null }, { status: 200 });
  }

  // Prefer unread articles; fall back to all if everything has been read
  const unread = excludeSlugs.length > 0
    ? data.filter((row) => !excludeSlugs.includes(row.slug))
    : data;

  const pool = unread.length > 0 ? unread : data;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json({ slug: picked?.slug ?? null });
}
