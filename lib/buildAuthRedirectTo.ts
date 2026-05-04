import { isCreepyHubApp } from "@/lib/isCreepyHubApp";

/**
 * OAuth / auth フローの redirectTo URL を組み立てる。
 *
 * iOS / Android アプリ（WebView ラッパー）内では accounts.google.com /
 * discord.com への直接リダイレクトが許可ホスト外として外部ブラウザに飛ばされ、
 * ログインしてもセッションがアプリに戻らない問題がある。これを回避するため、
 * 公式アプリ内ではカスタムスキーム `creepyhub://auth/callback` を redirectTo
 * として返す。
 *
 * iOS:     WebView.swift の Coordinator が `*.supabase.co/auth/v1/authorize`
 *          への遷移を検知して ASWebAuthenticationSession を起動。
 * Android: MainWebViewClient が同遷移を検知して Chrome Custom Tabs を起動。
 *
 * 各ネイティブ側でコールバック URL を `https://creepyhub.com/<locale>/auth/callback?...`
 * に変換して WebView にロードし、既存の Next.js callback ページ
 * （PKCE/Implicit 両対応）が処理を引き継ぐ。
 *
 * Web ブラウザでは従来通り HTTPS の callback URL を返す。
 */
export function buildAuthRedirectTo(opts: {
  origin: string;
  locale: string;
  type: "register" | "oauth" | "recovery";
}): string {
  const { origin, locale, type } = opts;
  if (isCreepyHubApp()) {
    // ASWebSession / Custom Tabs のコールバック先。locale はネイティブ側で URL 復元時に使用。
    return `creepyhub://auth/callback?type=${type}&locale=${locale}`;
  }
  return `${origin}/${locale}/auth/callback?type=${type}`;
}
