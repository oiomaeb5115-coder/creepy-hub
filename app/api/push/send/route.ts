import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as http2 from "http2";
import * as crypto from "crypto";
import { getFcmMessaging } from "@/lib/firebaseAdmin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * APNs JWT を生成する（ES256署名、最大60分有効）
 */
let cachedJwt: { token: string; expiresAt: number } | null = null;

function getApnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);

  if (cachedJwt && cachedJwt.expiresAt > now) {
    return cachedJwt.token;
  }

  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  const keyP8 = Buffer.from(process.env.APNS_KEY_P8!, "base64").toString("utf8");

  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString("base64url");
  const signingInput = `${header}.${payload}`;

  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  const derSig = sign.sign(keyP8);

  // DER → raw r||s (64 bytes) 変換
  const rawSig = derToRaw(derSig);
  const signature = Buffer.from(rawSig).toString("base64url");

  const jwt = `${signingInput}.${signature}`;
  cachedJwt = { token: jwt, expiresAt: now + 50 * 60 }; // 50分キャッシュ
  return jwt;
}

/** DER-encoded ECDSA signature を raw (r||s) 形式に変換 */
function derToRaw(der: Buffer): Buffer {
  const raw = Buffer.alloc(64);
  let offset = 2; // skip SEQUENCE tag + length

  // r
  const rLen = der[offset + 1];
  const rStart = offset + 2 + (rLen - 32 > 0 ? rLen - 32 : 0);
  const rDstStart = 32 - Math.min(rLen, 32);
  der.copy(raw, rDstStart, rStart, rStart + Math.min(rLen, 32));

  offset = offset + 2 + rLen;

  // s
  const sLen = der[offset + 1];
  const sStart = offset + 2 + (sLen - 32 > 0 ? sLen - 32 : 0);
  const sDstStart = 32 + 32 - Math.min(sLen, 32);
  der.copy(raw, sDstStart, sStart, sStart + Math.min(sLen, 32));

  return raw;
}

/**
 * APNs にプッシュ通知を送信する
 */
async function sendApnsPush(
  deviceToken: string,
  payload: object,
  bundleId: string,
  isProduction: boolean
): Promise<{ success: boolean; status: number; reason?: string }> {
  const host = isProduction
    ? "api.push.apple.com"
    : "api.sandbox.push.apple.com";

  const jwt = getApnsJwt();

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);

    client.on("error", (err) => {
      console.error("[APNs] Connection error:", err.message);
      resolve({ success: false, status: 0, reason: err.message });
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });

    let data = "";
    let statusCode = 0;

    req.on("response", (headers) => {
      statusCode = Number(headers[":status"]) || 0;
    });

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      client.close();
      if (statusCode === 200) {
        resolve({ success: true, status: 200 });
      } else {
        let reason = "";
        try {
          reason = JSON.parse(data)?.reason ?? data;
        } catch {
          reason = data;
        }
        resolve({ success: false, status: statusCode, reason });
      }
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * FCM (Android) にプッシュ通知を送信する
 */
async function sendFcmPush(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ success: boolean; reason?: string }> {
  try {
    await getFcmMessaging().send({
      token: deviceToken,
      notification: { title, body },
      data,
      android: {
        priority: "high",
        notification: { sound: "default" },
      },
    });
    return { success: true };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "unknown";
    return { success: false, reason: code };
  }
}

/**
 * POST /api/push/send
 * 通知作成時にDBトリガー/Webhookから呼ばれる。
 * 対象ユーザーの全デバイス（iOS/Android）にプッシュ通知を送信する。
 */
export async function POST(req: NextRequest) {
  // 共有シークレットで認証
  const auth = req.headers.get("authorization");
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.user_id || !body?.type) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { user_id, actor_id, post_id, type } = body as {
    user_id: string;
    actor_id: string | null;
    post_id: number | null;
    type: string;
  };

  // 対象ユーザーのプッシュトークンを取得（platform込み）
  const { data: tokens } = await supabaseAdmin
    .from("push_tokens")
    .select("id, token, platform")
    .eq("user_id", user_id);

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // 投稿スラッグを取得（通知タップ → 投稿遷移用）
  let postSlug: string | null = null;
  if (post_id !== null && post_id !== undefined) {
    const { data: post } = await supabaseAdmin
      .from("post")
      .select("slug")
      .eq("id", post_id)
      .single();
    postSlug = post?.slug ?? null;
  }

  // アクター名を取得
  let actorName = "someone";
  if (actor_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name")
      .eq("id", actor_id)
      .single();
    if (profile) {
      actorName = profile.display_name || profile.username || "someone";
    }
  }

  // 通知メッセージ生成
  let alertBody = "";
  switch (type) {
    case "comment":
      alertBody = `@${actorName} があなたの投稿にコメントしました`;
      break;
    case "reply":
      alertBody = `@${actorName} があなたのコメントに返信しました`;
      break;
    default:
      alertBody = `@${actorName} からの通知があります`;
  }

  const alertTitle = "creepy hub";

  const apnsPayload = {
    aps: {
      alert: { title: alertTitle, body: alertBody },
      sound: "default",
      badge: 1,
    },
    postId: post_id,
    postSlug,
    type,
  };

  const fcmData: Record<string, string> = { type };
  if (post_id !== null && post_id !== undefined) fcmData.postId = String(post_id);
  if (postSlug) fcmData.postSlug = postSlug;

  const bundleId = process.env.APNS_BUNDLE_ID ?? "com.inakuro.creepyhub";
  const isProduction = process.env.APNS_PRODUCTION === "true";

  let sentCount = 0;
  const staleTokenIds: number[] = [];

  for (const { id, token, platform } of tokens) {
    if (platform === "android") {
      const result = await sendFcmPush(token, alertTitle, alertBody, fcmData);
      if (result.success) {
        sentCount++;
      } else if (
        result.reason === "messaging/registration-token-not-registered" ||
        result.reason === "messaging/invalid-registration-token" ||
        result.reason === "messaging/invalid-argument"
      ) {
        staleTokenIds.push(id);
      }
      console.log(`[FCM] token=${token.slice(0, 8)}... reason=${result.reason ?? "ok"}`);
    } else {
      // 既定値 ios（platform カラム未設定の旧データを含む）
      const result = await sendApnsPush(token, apnsPayload, bundleId, isProduction);
      if (result.success) {
        sentCount++;
      } else if (
        result.status === 410 ||
        result.reason === "Unregistered" ||
        result.reason === "BadDeviceToken"
      ) {
        staleTokenIds.push(id);
      }
      console.log(`[APNs] token=${token.slice(0, 8)}... status=${result.status} reason=${result.reason ?? "ok"}`);
    }
  }

  // 失効トークンを削除
  if (staleTokenIds.length > 0) {
    await supabaseAdmin
      .from("push_tokens")
      .delete()
      .in("id", staleTokenIds);
    console.log(`[push] Cleaned up ${staleTokenIds.length} stale tokens`);
  }

  return NextResponse.json({ ok: true, sent: sentCount });
}
