import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/video/[uid]/status
 * Cloudflare Stream 動画の処理状況を取得する。
 */
export async function GET(
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
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  );

  if (!cfRes.ok) {
    return NextResponse.json({ error: "Failed to fetch video status" }, { status: 502 });
  }

  const cfData = await cfRes.json();
  const result = cfData.result;

  return NextResponse.json({
    readyToStream: result?.readyToStream ?? false,
    status: result?.status?.state ?? "unknown",
    thumbnail: result?.thumbnail ?? null,
    duration: result?.duration ?? null,
  });
}
