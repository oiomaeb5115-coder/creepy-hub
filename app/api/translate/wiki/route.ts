import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { translateWikiToEnglish } from "@/lib/claude";
import { requireAdmin } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await req.json() as { slug: string };

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  // 原文取得（ja）
  const { data: page, error } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, subtitle, summary, content, page_type, image_url")
    .eq("slug", slug)
    .eq("locale", "ja")
    .eq("is_published", true)
    .single();

  if (error || !page) {
    return NextResponse.json({ error: "Wiki page not found" }, { status: 404 });
  }

  // 英語版がすでに存在するかチェック
  const { data: existing } = await supabase
    .from("wiki_pages")
    .select("id")
    .eq("slug", slug)
    .eq("locale", "en")
    .single();

  if (existing) {
    return NextResponse.json({ alreadyTranslated: true });
  }

  // Claude APIで翻訳
  let translated;
  try {
    translated = await translateWikiToEnglish({
      title: page.title,
      subtitle: page.subtitle,
      summary: page.summary,
      content: page.content,
    });
  } catch (e) {
    console.error("Translation error:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }

  // 英語版レコードを作成
  const { error: insertError } = await supabase.from("wiki_pages").insert({
    slug: page.slug,
    locale: "en",
    title: translated.title,
    subtitle: translated.subtitle || null,
    summary: translated.summary || null,
    content: translated.content || null,
    page_type: page.page_type,
    image_url: page.image_url,
    is_published: true,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: "Failed to save translation" }, { status: 500 });
  }

  return NextResponse.json({ success: true, title: translated.title });
}
