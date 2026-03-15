import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const { name, slug, description } = body as {
    name?: string;
    slug?: string;
    description?: string;
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

  const { error: insertError } = await supabase.from("story_categories").insert({
    name: name.trim(),
    slug: slug.trim(),
    description: description?.trim() ?? null,
    created_by: userId,
    is_user_created: true,
    approved: false,
    is_active: false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
