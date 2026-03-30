/**
 * 投稿詳細ページのURLを生成する。
 * slugがある場合: /{locale}/post/{id}/{slug}
 * slugがない場合: /{locale}/post/{id}
 */
export function postUrl(
  locale: string,
  id: number | string,
  slug?: string | null
): string {
  return slug ? `/${locale}/post/${id}/${slug}` : `/${locale}/post/${id}`;
}
