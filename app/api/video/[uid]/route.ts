import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * DELETE /api/video/[uid]
 * Cloudflare Stream から動画を削除する。
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  // 認証
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  );

  if (!cfRes.ok && cfRes.status !== 404) {
    console.error("[DELETE /api/video] Cloudflare delete error:", cfRes.status);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
