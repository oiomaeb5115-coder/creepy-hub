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

/**
 * マップ機能を Web 版にも一時的に公開するフラグ。
 *
 * true  — サイドバー地図アイコン、投稿作成/編集の位置UIを Web でも表示
 * false — iOS/Android アプリ内でのみ表示（本来の仕様）
 *
 * 戻す時はこの定数を false にするだけで元の挙動に復帰する。
 */
export const MAP_PUBLIC_TO_WEB = true;

/** マップ関連UIの表示判定（アプリ内 or 一時公開フラグON） */
export function canShowMapFeatures(): boolean {
  return isCreepyHubApp() || MAP_PUBLIC_TO_WEB;
}
