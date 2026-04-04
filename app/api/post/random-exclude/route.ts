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

  const { data, error } = await supabase
    .from("post")
    .select("id")
    .eq("is_published", true)
    .limit(200);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ id: null }, { status: 200 });
  }

  // Prefer unread posts; fall back to all if everything has been read
  const unread = validExcludeIds.length > 0
    ? data.filter((row) => !validExcludeIds.includes(String(row.id)))
    : data;

  const pool = unread.length > 0 ? unread : data;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json({ id: picked?.id ?? null });
}
