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

/**
 * サーバーコンポーネントから User-Agent で creepy.hub 公式アプリか判定する。
 *
 * iOS アプリは UA 末尾に `CreepyHubApp` を付与する規約。
 * Android アプリも同様の文字列付与を想定（未実装時は UA に含まれない）。
 */
export async function isCreepyHubAppFromHeaders(): Promise<boolean> {
  // next/headers は動的 import（サーバー専用 API のため）
  const { headers } = await import("next/headers");
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  return ua.includes("CreepyHubApp");
}

/**
 * Android 公式アプリ shell 内かを判定する。
 *
 * iOS 側はまだ Native Drawer/Toolbar 未実装のため、Web UI（SidebarWrapper /
 * TopAppBarShortcuts）を非表示にしてしまうと操作不能になる。当面は Android
 * shell でのみ Web UI を抑止し、iOS では従来通り Web UI を出す。
 */
export async function isAndroidAppShellFromHeaders(): Promise<boolean> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  return ua.includes("CreepyHubApp") && ua.includes("Android");
}
