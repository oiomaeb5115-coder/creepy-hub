import { getAccessToken } from "@/lib/auth";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5分

/**
 * Cloudflare Stream の動画エンコード完了をポーリングで待機する。
 * readyToStream が true になるか、タイムアウトで reject する。
 */
export async function pollVideoReady(
  uid: string,
  onStatusChange?: (status: string) => void
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error("ログインが必要です");

  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
      throw new Error("動画の処理がタイムアウトしました。しばらく後に再度お試しください。");
    }

    const res = await fetch(`/api/video/${uid}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("動画の処理状況の取得に失敗しました");
    }

    const data = await res.json();

    if (onStatusChange) {
      onStatusChange(data.status);
    }

    if (data.readyToStream) {
      return;
    }

    if (data.status === "error") {
      throw new Error("動画の処理に失敗しました。別のファイルでお試しください。");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
