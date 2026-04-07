import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;

  try {
    const { error: cleanupError } = await supabaseAdmin.rpc("delete_account_data", {
      p_user_id: userId,
    });

    if (cleanupError) {
      console.error("[delete-account] data cleanup error:", cleanupError.message);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[delete-account] auth delete error:", deleteError.message);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete-account] unexpected error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
