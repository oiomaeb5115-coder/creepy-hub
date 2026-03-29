import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { translateStoryToEnglish } from "@/lib/googleTranslate";

/**
 * 投稿公開時に自動で英語翻訳を生成するエンドポイント。
 * 認証不要（投稿直後にクライアントから fire-and-forget で呼ばれる）。
 * 既に翻訳済みの場合はスキップ。
 */
export async function POST(req: NextRequest) {
  const { postId, force } = (await req.json()) as { postId: number; force?: boolean };

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  // 原文取得
  const { data: post, error } = await supabaseAdmin
    .from("post")
    .select("id, title, content")
    .eq("id", postId)
    .eq("is_published", true)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // 翻訳済みかチェック
  const { data: existing } = await supabaseAdmin
    .from("post_translations")
    .select("id")
    .eq("post_id", postId)
    .eq("locale", "en")
    .maybeSingle();

  if (existing && !force) {
    return NextResponse.json({ alreadyTranslated: true });
  }

  // Google Translate API で翻訳
  try {
    const translated = await translateStoryToEnglish(
      post.title ?? "",
      post.content ?? ""
    );

    if (existing) {
      // 既存翻訳を更新
      const { error: updateError } = await supabaseAdmin
        .from("post_translations")
        .update({
          title: translated.title,
          content: translated.content,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Auto-translate update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update translation" },
          { status: 500 }
        );
      }
    } else {
      // 新規翻訳を作成
      const { error: insertError } = await supabaseAdmin
        .from("post_translations")
        .insert({
          post_id: postId,
          locale: "en",
          title: translated.title,
          content: translated.content,
        });

      if (insertError) {
        console.error("Auto-translate insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to save translation" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, title: translated.title });
  } catch (e) {
    console.error("Auto-translate error:", e);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
