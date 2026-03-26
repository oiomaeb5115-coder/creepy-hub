import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/apiAuth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // RLS をバイパスするためサービスロールキーを使用
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ソフトデリート: deleted_at をセット
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", categoryId);

  if (error) {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
