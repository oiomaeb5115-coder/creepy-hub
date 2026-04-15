/**
 * iOS アプリ（WKWebView）内で実行されているかを判定する。
 * Swift 側で `window.__CREEPYHUB_IOS__ = true` を atDocumentStart で注入している。
 */
export function isIOSApp(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__CREEPYHUB_IOS__ === true
  );
}
