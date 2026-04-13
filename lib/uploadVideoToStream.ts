import { getAccessToken } from "@/lib/auth";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_POST_VIDEO_SIZE = 75 * 1024 * 1024;   // 75MB
const MAX_STORY_VIDEO_SIZE = 50 * 1024 * 1024;   // 50MB

/**
 * Cloudflare Stream Direct Creator Upload で動画をアップロードする。
 * サーバーサイドで一時アップロードURLを取得し、クライアントから直接アップロードする。
 */
export async function uploadVideoToStream(
  file: File,
  options: {
    type: "post" | "story";
    onProgress?: (ratio: number) => void;
  }
): Promise<{ uid: string }> {
  // クライアントサイドバリデーション
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error("動画ファイル（MP4 / WebM / MOV）のみアップロード可能です");
  }

  const maxSize = options.type === "post" ? MAX_POST_VIDEO_SIZE : MAX_STORY_VIDEO_SIZE;
  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    throw new Error(`動画ファイルは${limitMB}MB以内にしてください`);
  }

  const token = await getAccessToken();
  if (!token) throw new Error("ログインが必要です");

  // 1. サーバーからアップロードURL取得
  let urlRes: Response;
  try {
    urlRes = await fetch("/api/video/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: options.type }),
    });
  } catch (err) {
    throw new Error(`アップロードURL取得でネットワークエラー: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!urlRes.ok) {
    const data = await urlRes.json().catch(() => ({}));
    throw new Error(data.error || `アップロードURLの取得に失敗しました (${urlRes.status})`);
  }

  const { uploadURL, uid } = await urlRes.json();

  // 2. Cloudflare Stream にファイルを直接アップロード
  if (options.onProgress) {
    // XMLHttpRequest でプログレスを監視
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadURL);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && options.onProgress) {
          options.onProgress(e.loaded / e.total);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`アップロードに失敗しました (${xhr.status})`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error(`Cloudflare Streamへのアップロードに失敗しました (XHR error)`)));
      xhr.addEventListener("abort", () => reject(new Error("アップロードがキャンセルされました")));

      const formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
    });
  } else {
    // プログレス不要ならシンプルにfetch
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch(uploadURL, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Cloudflare Streamへのアップロードに失敗しました (${uploadRes.status})`);
    }
  }

  return { uid };
}
