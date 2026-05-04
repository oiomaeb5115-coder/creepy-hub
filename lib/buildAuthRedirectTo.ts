import { isIOSApp } from "@/lib/isIOSApp";

/**
 * OAuth / auth フローの redirectTo URL を組み立てる。
 *
 * iOS アプリ（WKWebView ラッパー）内では accounts.google.com / discord.com への
 * 直接リダイレクトが許可ホスト外として外部 Safari に飛ばされ、ログインしても
 * セッションがアプリに戻らない問題がある。これを回避するため、iOS アプリ内では
 * カスタムスキーム `creepyhub://auth/callback` を redirectTo として返す。
 *
 * iOS 側では WebView.swift の Coordinator が `*.supabase.co/auth/v1/authorize`
 * への遷移を検知して ASWebAuthenticationSession を起動し、コールバック URL を
 * `https://creepyhub.com/<locale>/auth/callback?...` に変換して WebView にロード。
 * 既存の Next.js callback ページ（PKCE/Implicit 両対応）が処理を引き継ぐ。
 *
 * Web ブラウザ／Android アプリでは従来通り HTTPS の callback URL を返す。
 * Android アプリ用の同等処理は別タスク（Chrome Custom Tabs）で対応予定。
 */
export function buildAuthRedirectTo(opts: {
  origin: string;
  locale: string;
  type: "register" | "oauth" | "recovery";
}): string {
  const { origin, locale, type } = opts;
  if (isIOSApp()) {
    // ASWebSession のコールバック先。locale は iOS 側で URL 復元時に使用。
    return `creepyhub://auth/callback?type=${type}&locale=${locale}`;
  }
  return `${origin}/${locale}/auth/callback?type=${type}`;
}
