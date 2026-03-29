import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { translateCategoryName } from "@/lib/googleTranslate";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // ユーザーの JWT をクライアントに渡すことで RLS が auth.uid() を認識できる
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await req.json();
  const { name, slug, description, icon_url, header_image_url } = body as {
    name?: string;
    slug?: string;
    description?: string;
    icon_url?: string;
    header_image_url?: string;
  };

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "name と slug は必須です" }, { status: 400 });
  }

  // slug バリデーション（英数字・ハイフンのみ）
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "slug は半角英小文字・数字・ハイフンのみ使用できます" },
      { status: 400 }
    );
  }

  // 5個上限チェック
  const { count } = await supabase
    .from("story_categories")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("is_user_created", true);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "カテゴリの作成上限（5個）に達しています" },
      { status: 403 }
    );
  }

  // slug 重複チェック
  const { data: existing } = await supabase
    .from("story_categories")
    .select("id")
    .eq("slug", slug.trim())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "この slug はすでに使用されています" },
      { status: 409 }
    );
  }

  // URL バリデーション（https スキームのみ許可）
  for (const urlValue of [icon_url, header_image_url]) {
    if (urlValue) {
      try {
        const u = new URL(urlValue);
        if (u.protocol !== "https:") throw new Error();
      } catch {
        return NextResponse.json(
          { error: "画像URLはhttps://で始まる有効なURLを指定してください" },
          { status: 400 }
        );
      }
    }
  }

  // Google Translate で英語名を自動生成
  let nameEn: string | null = null;
  try {
    nameEn = await translateCategoryName(name.trim());
  } catch {
    // 翻訳失敗時は null のまま（日本語名がフォールバック）
  }

  const { error: insertError } = await supabase.from("story_categories").insert({
    name: name.trim(),
    name_en: nameEn,
    slug: slug.trim(),
    description: description?.trim() ?? null,
    icon_url: icon_url ?? null,
    header_image_url: header_image_url ?? null,
    created_by: userId,
    is_user_created: true,
    approved: false,
    is_active: false,
  });

  if (insertError) {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
