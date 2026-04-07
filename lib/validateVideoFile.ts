/**
 * ファイルの先頭バイト（magic bytes）を読み取り、
 * 許可された動画形式（MP4 / WebM / MOV）かどうかを検証する。
 * 拡張子の偽装を防ぐためにファイル内容を直接チェックする。
 */

export async function validateVideoFile(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const header = new Uint8Array(buffer);

  // MP4: オフセット4-7 が "ftyp" (0x66 0x74 0x79 0x70)
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return true;
  }

  // WebM: 先頭4バイトが 0x1A 0x45 0xDF 0xA3 (EBML header)
  if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return true;
  }

  return false;
}
