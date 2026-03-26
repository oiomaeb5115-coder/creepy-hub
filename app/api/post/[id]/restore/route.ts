import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/apiAuth";
import { revalidatePath } from "next/cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("post")
    .update({ is_published: true, deleted_at: null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });

  revalidatePath("/ja");
  revalidatePath("/en");
  revalidatePath("/ja/story");

  return NextResponse.json({ success: true });
}
