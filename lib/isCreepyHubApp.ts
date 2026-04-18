/**
 * creepy.hub の iOS / Android 公式アプリ内で動作しているかを判定する。
 *
 * 各アプリは WKWebView / WebView で creepyhub.com を読み込む際、
 *   - iOS:     window.__CREEPYHUB_IOS__ = true
 *   - Android: window.__CREEPYHUB_ANDROID__ = true
 * を document-start 相当のタイミングで注入する規約。
 *
 * Web（デスクトップ・モバイルブラウザ）ではどちらも undefined。
 */

import { isIOSApp } from "@/lib/isIOSApp";

export function isAndroidApp(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__CREEPYHUB_ANDROID__ === true
  );
}

export function isCreepyHubApp(): boolean {
  return isIOSApp() || isAndroidApp();
}
