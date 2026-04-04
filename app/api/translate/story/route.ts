import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { translateStoryToEnglish } from "@/lib/cfTranslate";
import { requireAdmin } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";

const TRANSLATE_RATE_LIMIT = {
  name: "translate-story-admin",
  windowMs: 60 * 60 * 1000,
  maxRequests: 50,
};

export async function POST(req: NextRequest) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(TRANSLATE_RATE_LIMIT, "admin");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "翻訳リクエストが多すぎます。しばらくしてからお試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const { postId } = await req.json() as { postId: number };

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
    .single();

  if (existing) {
    return NextResponse.json({ alreadyTranslated: true });
  }

  // Google Translate API で翻訳
  let translated;
  try {
    translated = await translateStoryToEnglish(
      post.title ?? "",
      post.content ?? ""
    );
  } catch (e) {
    console.error("Translation error:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }

  // DB に保存
  const { error: insertError } = await supabaseAdmin.from("post_translations").insert({
    post_id: postId,
    locale: "en",
    title: translated.title,
    content: translated.content,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: "Failed to save translation" }, { status: 500 });
  }

  return NextResponse.json({ success: true, title: translated.title });
}
