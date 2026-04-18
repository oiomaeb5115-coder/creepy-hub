/**
 * 地図ピンの SVG を生成する。
 * creepy-map/components/icons.ts の variant M (テーマ別) を参考に TypeScript で再実装。
 *
 * - 心霊 (haunted)     → 炎
 * - 恐怖 (horror)      → 髑髏
 * - 観光 (sightseeing) → 鳥居
 * - 伝承 (legend)      → 御札
 *
 * 投稿ピン（post）は涙滴シェイプ + 中央に「巻物」グリフで別形状に。
 */

import { colorFor, type SpotCategory } from "@/lib/mapPalettes";

const STROKE = "#f5f5f5";

export type PinKind = "spot" | "post";

/** カテゴリ別グリフ（白で描画） */
function glyphFor(category: SpotCategory): string {
  switch (category) {
    case "haunted":
      // 炎
      return `
        <path d="M13 7c-1 2 -3 3 -3 6 a3 3 0 0 0 6 0 c0 -2 -1 -3 -3 -6z M13 16 a1.4 1.4 0 0 0 0 -3 a1.4 1.4 0 0 0 0 3z"
          fill="${STROKE}"/>`;
    case "horror":
      // 髑髏
      return `
        <rect x="7.5" y="8" width="11" height="9" rx="3.2" fill="${STROKE}"/>
        <circle cx="10.5" cy="12" r="1.3" fill="#000"/>
        <circle cx="15.5" cy="12" r="1.3" fill="#000"/>
        <rect x="10" y="16" width="6" height="2" fill="${STROKE}"/>`;
    case "sightseeing":
      // 鳥居
      return `
        <rect x="6" y="8" width="14" height="1.8" fill="${STROKE}"/>
        <rect x="7.5" y="10.6" width="11" height="1.2" fill="${STROKE}"/>
        <rect x="8.2" y="11.8" width="1.6" height="6.5" fill="${STROKE}"/>
        <rect x="16.2" y="11.8" width="1.6" height="6.5" fill="${STROKE}"/>`;
    case "legend":
      // 御札（縦長札）
      return `
        <path d="M13 7 L16 9 L16 18 L10 18 L10 9 Z" fill="${STROKE}"/>
        <rect x="11.2" y="11.2" width="3.6" height="0.8" fill="#000" opacity="0.6"/>
        <rect x="11.2" y="13" width="3.6" height="0.8" fill="#000" opacity="0.6"/>
        <rect x="11.2" y="14.8" width="3.6" height="0.8" fill="#000" opacity="0.6"/>`;
  }
}

/**
 * キュレーションスポット用のピン SVG。涙滴シェイプ + カテゴリグリフ。
 */
export function renderSpotPin(category: SpotCategory, size = 42): string {
  const color = colorFor(category);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.44)}" viewBox="-3 -3 32 46">
  <path d="M13 0C5.82 0 0 5.74 0 12.83c0 9.6 13 25.17 13 25.17s13-15.57 13-25.17C26 5.74 20.18 0 13 0z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
  ${glyphFor(category)}
</svg>`.trim();
}

/**
 * 投稿ピン用の SVG。巻物＋筆線で視覚的にスポットとは別物だと分かるように。
 */
export function renderPostPin(size = 38): string {
  const color = colorFor("haunted"); // 投稿は血赤をベース
  const w = 24;
  const h = 34;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * (h / w))}" viewBox="-2 -2 ${w + 4} ${h + 4}">
  <path d="M0 3 Q${w / 2} -1 ${w} 3 L${w} ${h - 6} L${w / 2 + 1} ${h - 1} L${w / 2} ${h} L${w / 2 - 1} ${h - 1} L0 ${h - 6} Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.3" stroke-linejoin="round"/>
  <rect x="5" y="10" width="${w - 10}" height="1.3" fill="${STROKE}" opacity="0.9"/>
  <rect x="5" y="15" width="${w - 10}" height="1.3" fill="${STROKE}" opacity="0.9"/>
  <rect x="5" y="20" width="${w - 10}" height="1.3" fill="${STROKE}" opacity="0.9"/>
</svg>`.trim();
}
