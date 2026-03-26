import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id, created_by")
    .eq("id", id)
    .single();

  if (catError || !category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isCreator = category.created_by === userId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const isAdmin = profile?.role === "admin";

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { icon_url, header_image_url } = body as {
    icon_url?: string | null;
    header_image_url?: string | null;
  };

  // URL スキーム検証: https: のみ許可（null は削除を意味するので許可）
  const isValidUrl = (url: unknown): boolean => {
    if (url === null || url === undefined) return true;
    if (typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (!isValidUrl(icon_url) || !isValidUrl(header_image_url)) {
    return NextResponse.json({ error: "URLはhttpsで始まる必要があります" }, { status: 400 });
  }

  const updateData: Record<string, string | null> = {};
  if (icon_url !== undefined) updateData.icon_url = icon_url;
  if (header_image_url !== undefined) updateData.header_image_url = header_image_url;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
