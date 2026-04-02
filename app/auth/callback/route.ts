import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function generateRandomUsername(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `user_${n}`;
}

async function ensureSafeUsername(userId: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  const current: string | null = profile?.username ?? null;
  if (current && !current.includes("@")) return; // 既に安全なユーザー名

  // ユニークなユーザー名を生成（最大5回リトライ）
  for (let i = 0; i < 5; i++) {
    const candidate = generateRandomUsername();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!existing) {
      await admin
        .from("profiles")
        .upsert({ id: userId, username: candidate });
      return;
    }
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawLocale = requestUrl.searchParams.get("locale") ?? "ja";
  const locale = ["ja", "en"].includes(rawLocale) ? rawLocale : "ja";
  const type = requestUrl.searchParams.get("type");

  // recovery の場合はクライアント側でセッションを確立するため、code をそのまま転送する
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL(`/${locale}/reset-password?code=${code ?? ""}`, request.url)
    );
  }

  let isNewUser = type === "register";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.session?.user?.id) {
      await ensureSafeUsername(data.session.user.id);

      // OAuth 新規登録判定: アカウント作成が2分以内なら新規とみなす
      if (!isNewUser && data.session.user.created_at) {
        const createdAt = new Date(data.session.user.created_at).getTime();
        const now = Date.now();
        if (now - createdAt < 2 * 60 * 1000) {
          isNewUser = true;
        }
      }
    }
  }

  const destination = isNewUser
    ? `/${locale}?registered=true`
    : `/${locale}`;

  return NextResponse.redirect(new URL(destination, request.url));
}