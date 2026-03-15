import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/**
 * API Route でリクエストの Authorization ヘッダーを検証し、
 * admin ユーザーかどうかを確認する。
 * 認証失敗時は null を返す。
 */
export async function requireAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);

  // サービスロールキーを使わず、ユーザーの JWT を検証する
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return profile?.role === "admin";
}
