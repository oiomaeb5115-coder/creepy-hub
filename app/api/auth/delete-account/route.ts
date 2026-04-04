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
    // Delete user's posts
    await supabaseAdmin.from("post").delete().eq("user_id", userId);

    // Detach categories from this user so they survive account deletion
    await supabaseAdmin.from("story_categories").update({ created_by: null }).eq("created_by", userId);
    await supabaseAdmin.from("categories").update({ created_by: null }).eq("created_by", userId);

    // Clear personal info from profile instead of deleting,
    // so any remaining foreign key references stay intact
    await supabaseAdmin.from("profiles").update({
      display_name: null,
      avatar_url: null,
      banner_url: null,
      bio: null,
      website_url: null,
      location: null,
      username: `deleted_${userId.slice(0, 8)}`,
      is_public: false,
    }).eq("id", userId);

    // Delete from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[delete-account] auth delete error:", deleteError.message);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-account] unexpected error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
