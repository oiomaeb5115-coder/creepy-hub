import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/push/register
 * iOSデバイストークンを登録する。
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ユーザー認証
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // リクエストボディ
  const body = await req.json().catch(() => null);
  if (!body?.token || typeof body.token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const platform = body.platform;
  if (platform !== "ios" && platform !== "android") {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // upsert（同じユーザー+トークンの重複を防ぐ）
  const { error } = await supabaseAdmin
    .from("push_tokens")
    .upsert(
      { user_id: user.id, token: body.token, platform },
      { onConflict: "user_id,token" }
    );

  if (error) {
    console.error("[POST /api/push/register] Error:", error.message);
    return NextResponse.json({ error: "Failed to register token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
