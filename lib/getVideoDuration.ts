/**
 * 動画ファイルのメタデータを読み取り、再生時間（ミリ秒）を返す。
 * ブラウザの <video> 要素を使って非同期に取得する。
 */

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const durationMs = Math.round(video.duration * 1000);
      URL.revokeObjectURL(video.src);
      resolve(durationMs);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("動画のメタデータを読み取れませんでした"));
    };

    video.src = URL.createObjectURL(file);
  });
}
