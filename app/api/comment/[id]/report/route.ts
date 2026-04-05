import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

const REPORT_RATE_LIMIT = {
  name: "comment-report",
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
};

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

  const rl = checkRateLimit(REPORT_RATE_LIMIT, user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "報告の送信が多すぎます。しばらくしてからお試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const { id } = await params;
  const commentId = parseInt(id, 10);
  if (isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason ?? null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // コメントの存在確認（未削除）
  const { data: comment } = await supabase
    .from("post_comments")
    .select("id")
    .eq("id", commentId)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 報告を挿入（UNIQUE 制約で重複防止）
  const { error: insertError } = await supabase.from("comment_reports").insert({
    comment_id: commentId,
    user_id: user.id,
    reason,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "すでに報告済みです" }, { status: 409 });
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
