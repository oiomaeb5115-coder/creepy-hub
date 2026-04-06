import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

const STORY_CREATE_RATE_LIMIT = {
  name: "story-create",
  windowMs: 60 * 60 * 1000, // 1時間
  maxRequests: 10,           // 1時間あたり10件
};

/**
 * POST /api/story
 * 新しいストーリーを作成する。認証必須。
 */

type TextOverlay = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string | null;
  rotation: number;
};

function validateTextOverlays(overlays: unknown): overlays is TextOverlay[] {
  if (!Array.isArray(overlays)) return false;
  if (overlays.length > 10) return false; // 最大10個
  return overlays.every(
    (o) =>
      typeof o === "object" &&
      o !== null &&
      typeof o.text === "string" &&
      o.text.length <= 200 &&
      typeof o.x === "number" &&
      o.x >= 0 && o.x <= 100 &&
      typeof o.y === "number" &&
      o.y >= 0 && o.y <= 100 &&
      typeof o.fontSize === "number" &&
      o.fontSize >= 12 && o.fontSize <= 72 &&
      typeof o.fontFamily === "string" &&
      typeof o.color === "string" &&
      (o.backgroundColor === null || typeof o.backgroundColor === "string") &&
      typeof o.rotation === "number" &&
      o.rotation >= -180 && o.rotation <= 180
  );
}

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

  // レート制限（認証済みユーザーIDベース）
  const ip = getClientIp(req);
  const rl = checkRateLimit(STORY_CREATE_RATE_LIMIT, `${userData.user.id}:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "投稿が多すぎます。しばらくしてからお試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  // リクエストボディ解析
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { media_url, media_type, duration_ms, text_overlays } = body as {
    media_url?: string;
    media_type?: string;
    duration_ms?: number;
    text_overlays?: unknown;
  };

  // バリデーション
  if (!media_url || typeof media_url !== "string" || !media_url.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid media_url" }, { status: 400 });
  }
  if (media_type !== "image" && media_type !== "video") {
    return NextResponse.json({ error: "media_type must be 'image' or 'video'" }, { status: 400 });
  }
  if (media_type === "video") {
    if (typeof duration_ms !== "number" || duration_ms <= 0 || duration_ms > 120000) {
      return NextResponse.json({ error: "動画は2分以内にしてください" }, { status: 400 });
    }
  }

  const overlays = text_overlays ?? [];
  if (!validateTextOverlays(overlays)) {
    return NextResponse.json({ error: "Invalid text_overlays" }, { status: 400 });
  }

  // expires_at = 24時間後
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // サービスロールで挿入（認証は上記getUserで検証済み）
  const { data: story, error: insertError } = await supabaseAdmin
    .from("user_stories")
    .insert({
      user_id: userData.user.id,
      media_url,
      media_type,
      duration_ms: media_type === "video" ? duration_ms : null,
      text_overlays: overlays,
      expires_at: expiresAt,
    })
    .select("id, created_at, expires_at")
    .single();

  if (insertError) {
    console.error("[POST /api/story]", insertError.message);
    return NextResponse.json({ error: "ストーリーの作成に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true, story }, { status: 201 });
}
