import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);

  if (!postId || isNaN(postId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await supabaseAdmin.rpc("increment_post_view", { p_post_id: postId });

  return NextResponse.json({ ok: true });
}
