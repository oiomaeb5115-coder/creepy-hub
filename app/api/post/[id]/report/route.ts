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
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason ?? null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 投稿の存在確認（公開済み・未削除）
  const { data: post } = await supabase
    .from("post")
    .select("id")
    .eq("id", postId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 報告を挿入（UNIQUE 制約で重複防止）
  const { error: insertError } = await supabase.from("post_reports").insert({
    post_id: postId,
    user_id: user.id,
    reason,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "すでに報告済みです" }, { status: 409 });
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  // reported_count をアトミックにインクリメント
  await supabase.rpc("increment_post_report_count", { p_post_id: postId });

  return NextResponse.json({ success: true }, { status: 201 });
}
