import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REPORT_RATE_LIMIT = {
  name: "story-report",
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
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason ?? null;

  // ストーリーの存在確認（有効期限内）
  const { data: story } = await supabaseAdmin
    .from("user_stories")
    .select("id")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 報告を挿入（UNIQUE 制約で重複防止）
  const { error: insertError } = await supabaseAdmin.from("story_reports").insert({
    story_id: id,
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

/** DELETE /api/story/[id]/report — 管理者が報告をすべて却下 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 管理者チェック
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("story_reports")
    .delete()
    .eq("story_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
