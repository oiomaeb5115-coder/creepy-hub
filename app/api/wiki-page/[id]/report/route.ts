import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

const REPORT_RATE_LIMIT = {
  name: "wiki-report",
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
  const wikiId = parseInt(id, 10);
  if (isNaN(wikiId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason ?? null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Wiki ページの存在確認（公開済み・未削除）
  const { data: wikiPage } = await supabase
    .from("wiki_pages")
    .select("id")
    .eq("id", wikiId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (!wikiPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 報告を挿入（UNIQUE 制約で重複防止）
  const { error: insertError } = await supabase.from("wiki_reports").insert({
    wiki_page_id: wikiId,
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
  await supabase.rpc("increment_wiki_report_count", { p_wiki_id: wikiId });

  return NextResponse.json({ success: true }, { status: 201 });
}
