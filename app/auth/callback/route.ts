import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const locale = requestUrl.searchParams.get("locale") ?? "ja";
  const type = requestUrl.searchParams.get("type");

  // recovery の場合はクライアント側でセッションを確立するため、code をそのまま転送する
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL(`/${locale}/reset-password?code=${code ?? ""}`, request.url)
    );
  }

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  const destination = type === "register"
    ? `/${locale}?registered=true`
    : `/${locale}`;

  return NextResponse.redirect(new URL(destination, request.url));
}