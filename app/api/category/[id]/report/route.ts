import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getAuthorizedUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) return null;
  return { id: userData.user.id };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason ?? null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ユーザー作成カテゴリのみ報告可能
  const { data: category } = await supabase
    .from("story_categories")
    .select("id, is_user_created")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!category.is_user_created) {
    return NextResponse.json(
      { error: "システムカテゴリは報告できません" },
      { status: 400 }
    );
  }

  // 報告を挿入（UNIQUE 制約で重複防止）
  const { error: insertError } = await supabase.from("category_reports").insert({
    category_id: categoryId,
    user_id: user.id,
    reason,
  });

  if (insertError) {
    // 重複報告
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "すでに報告済みです" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // reported_count をインクリメント
  const { data: current } = await supabase
    .from("story_categories")
    .select("reported_count")
    .eq("id", categoryId)
    .single();
  await supabase
    .from("story_categories")
    .update({ reported_count: (current?.reported_count ?? 0) + 1 })
    .eq("id", categoryId);

  return NextResponse.json({ success: true }, { status: 201 });
}
