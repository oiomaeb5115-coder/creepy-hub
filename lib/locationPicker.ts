/**
 * iOS アプリ内で動作時だけ、ネイティブの位置ピッカーを呼び出すブリッジ。
 * Android 側も同じ name `locationPicker` で WebMessageListener を受ける想定なので、
 * 将来 Android 対応した際にこのファイルはそのまま使える。
 */

import { isIOSApp } from "@/lib/isIOSApp";
import type { LocationPrecision } from "@/lib/roundLocation";

export interface PickedLocation {
  lat: number;
  lng: number;
  precision: LocationPrecision;
  locationName?: string | null;
}

interface WebKitWindow {
  webkit?: {
    messageHandlers?: {
      locationPicker?: { postMessage: (msg: unknown) => void };
    };
  };
  __creepyhub_receiveLocation?: (payload: PickedLocation) => void;
  __creepyhub_cancelLocation?: () => void;
}

/**
 * iOS アプリで動作中なら true。
 * 内部で isIOSApp() を呼ぶが、さらに webkit ブリッジが実際に繋がっているかまで確認する。
 */
export function canUseNativeLocationPicker(): boolean {
  if (!isIOSApp()) return false;
  if (typeof window === "undefined") return false;
  const w = window as unknown as WebKitWindow;
  return typeof w.webkit?.messageHandlers?.locationPicker?.postMessage === "function";
}

/**
 * ネイティブの位置ピッカーを開き、ユーザーが確定するか キャンセルするまで待つ。
 * キャンセル時は null を返す。
 */
export function openNativeLocationPicker(): Promise<PickedLocation | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const w = window as unknown as WebKitWindow;
    const cleanup = () => {
      delete w.__creepyhub_receiveLocation;
      delete w.__creepyhub_cancelLocation;
    };
    w.__creepyhub_receiveLocation = (payload) => {
      cleanup();
      resolve(payload);
    };
    w.__creepyhub_cancelLocation = () => {
      cleanup();
      resolve(null);
    };
    try {
      w.webkit?.messageHandlers?.locationPicker?.postMessage({});
    } catch {
      cleanup();
      resolve(null);
    }
  });
}
