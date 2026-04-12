import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/video/upload-url
 * Cloudflare Stream Direct Creator Upload 用の一時アップロードURLを発行する。
 */
export async function POST(req: NextRequest) {
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

  // リクエストボディ
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type } = body as { type?: string };
  if (type !== "post" && type !== "story") {
    return NextResponse.json({ error: "type must be 'post' or 'story'" }, { status: 400 });
  }

  const maxDurationSeconds = type === "post" ? 180 : 120;

  // Cloudflare Stream Direct Creator Upload URL を作成
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error("[POST /api/video/upload-url] Missing Cloudflare credentials");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: false,
      }),
    }
  );

  if (!cfRes.ok) {
    const errBody = await cfRes.text();
    console.error("[POST /api/video/upload-url] Cloudflare API error:", cfRes.status, errBody);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 502 });
  }

  const cfData = await cfRes.json();
  const uploadURL = cfData.result?.uploadURL;
  const uid = cfData.result?.uid;

  if (!uploadURL || !uid) {
    console.error("[POST /api/video/upload-url] Unexpected Cloudflare response:", cfData);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 502 });
  }

  return NextResponse.json({ uploadURL, uid });
}
