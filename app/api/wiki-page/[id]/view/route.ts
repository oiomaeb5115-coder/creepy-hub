import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wikiId = Number(id);

  if (!wikiId || isNaN(wikiId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await supabaseAdmin.rpc("increment_wiki_view", { p_wiki_id: wikiId });

  return NextResponse.json({ ok: true });
}
