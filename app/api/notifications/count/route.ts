import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ unread: 0, pendingCategories: 0 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ unread: 0, pendingCategories: 0 });
  }

  // Fetch unread notifications and deduplicate by post_id + actor_id + type
  const { data: unreadData } = await supabase
    .from("notifications")
    .select("post_id, actor_id, type")
    .eq("user_id", user.id)
    .eq("is_read", false);

  const seen = new Set<string>();
  const unread = (unreadData ?? []).filter((n: { post_id: number | null; actor_id: string | null; type: string }) => {
    const key = `${n.post_id}_${n.actor_id}_${n.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).length;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  let pendingCategories = 0;

  if (isAdmin) {
    const { count } = await supabase
      .from("story_categories")
      .select("*", { count: "exact", head: true })
      .eq("is_user_created", true)
      .eq("approved", false);
    pendingCategories = count ?? 0;
  }

  return NextResponse.json({
    unread: unread ?? 0,
    pendingCategories,
  });
}
