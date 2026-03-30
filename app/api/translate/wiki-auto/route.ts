import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { translateWikiToEnglish } from "@/lib/cfTranslate";

/**
 * Wiki公開時に自動で英語翻訳を生成するエンドポイント。
 * ログインユーザーのみ実行可能。
 * 既に英語版が存在する場合はスキップ。
 */
export async function POST(req: NextRequest) {
  // 認証チェック
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

  const { slug, force } = (await req.json()) as { slug: string; force?: boolean };

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  // 原文取得（ja）
  const { data: page, error } = await supabaseAdmin
    .from("wiki_pages")
    .select(
      "id, slug, title, subtitle, summary, content, page_type, image_url"
    )
    .eq("slug", slug)
    .eq("locale", "ja")
    .eq("is_published", true)
    .single();

  if (error || !page) {
    return NextResponse.json(
      { error: "Wiki page not found" },
      { status: 404 }
    );
  }

  // 英語版がすでにあるかチェック
  const { data: existing } = await supabaseAdmin
    .from("wiki_pages")
    .select("id")
    .eq("slug", slug)
    .eq("locale", "en")
    .maybeSingle();

  if (existing && !force) {
    return NextResponse.json({ alreadyTranslated: true });
  }

  // Google Translate API で翻訳
  try {
    const translated = await translateWikiToEnglish({
      title: page.title,
      subtitle: page.subtitle,
      summary: page.summary,
      content: page.content,
    });

    if (existing) {
      // 既存の英語版を更新
      const { error: updateError } = await supabaseAdmin
        .from("wiki_pages")
        .update({
          title: translated.title,
          subtitle: translated.subtitle || null,
          summary: translated.summary || null,
          content: translated.content || null,
          page_type: page.page_type,
          image_url: page.image_url,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Auto-translate wiki update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update translation" },
          { status: 500 }
        );
      }
    } else {
      // 新規英語版を作成
      const { error: insertError } = await supabaseAdmin.from("wiki_pages").insert({
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
        console.error("Auto-translate wiki insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to save translation" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, title: translated.title });
  } catch (e) {
    console.error("Auto-translate wiki error:", e);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
