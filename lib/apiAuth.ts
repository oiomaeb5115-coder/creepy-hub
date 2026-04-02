import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";

/**
 * API Route でリクエストの Authorization ヘッダーを検証し、
 * admin ユーザーかどうかを確認する。
 * 認証失敗時は false を返す。
 */
export async function requireAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);

  // ユーザーの JWT を検証する（anon key で十分）
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) return false;

  // profiles テーブルは RLS があるため、service role key で読む
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return profile?.role === "admin";
}
