/**
 * ファイルの先頭バイト（magic bytes）を読み取り、
 * 許可された画像形式かどうかを検証する。
 * 拡張子の偽装を防ぐためにファイル内容を直接チェックする。
 */

const IMAGE_SIGNATURES: { mime: string; bytes: number[] }[] = [
  // JPEG: FF D8 FF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  // GIF87a / GIF89a: 47 49 46 38
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export async function validateImageFile(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const header = new Uint8Array(buffer);

  for (const sig of IMAGE_SIGNATURES) {
    if (sig.bytes.every((byte, i) => header[i] === byte)) {
      // WebP の追加チェック: オフセット8-11が "WEBP" であること
      if (sig.mime === "image/webp") {
        if (
          header[8] !== 0x57 ||
          header[9] !== 0x45 ||
          header[10] !== 0x42 ||
          header[11] !== 0x50
        ) {
          continue;
        }
      }
      return true;
    }
  }

  return false;
}
