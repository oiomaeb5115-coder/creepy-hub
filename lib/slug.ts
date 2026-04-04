/**
 * タイトルからURL用slugを生成する。
 * 英字を含むタイトル → lowercase、ハイフン区切り、80文字以内
 * 日本語のみのタイトル → null（URLは /post/{id} にフォールバック）
 */
export function generateSlug(title: string): string | null {
  if (!title) return null;

  // 英字が含まれていない場合はnull
  if (!/[a-zA-Z]/.test(title)) return null;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // 英数字・スペース・ハイフン以外を除去
    .trim()
    .replace(/\s+/g, "-") // スペースをハイフンに
    .replace(/-+/g, "-") // 連続ハイフンを1つに
    .slice(0, 80);

  return slug || null;
}

/**
 * 手動入力されたスラッグをサニタイズする。
 * URL文字（/,:,?,#等）を除去し、安全な文字列に変換。
 * 空文字列の場合はnullを返す。
 */
export function sanitizeSlug(input: string): string | null {
  if (!input) return null;

  const sanitized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return sanitized || null;
}
