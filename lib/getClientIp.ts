import type { NextRequest } from "next/server";

/**
 * リクエストからクライアントIPを安全に取得する。
 *
 * Vercel 環境では x-real-ip が信頼できるプロキシによって設定されるため優先。
 * x-forwarded-for はクライアントが偽装可能なので最後のフォールバックとして使用。
 */
export function getClientIp(req: NextRequest): string {
  // Vercel が設定する信頼できるヘッダー
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // フォールバック: x-forwarded-for の最初のIP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
