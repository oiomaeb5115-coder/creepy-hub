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
 *
 * バリアント：
 *   A: Classic teardrop（デフォルト、現行）
 *   B: 朱印（和風の判子／二重円）
 *   C: 御札（縦長札＋紐）
 *   D: 血痕（不規則な血の雫）
 */

import { colorFor, type SpotCategory } from "@/lib/mapPalettes";

const STROKE = "#f5f5f5";

export type PinKind = "spot" | "post";
export type PinVariant = "A" | "B" | "C" | "D";

export const PIN_VARIANT_LABELS: Record<PinVariant, string> = {
  A: "Classic",
  B: "朱印",
  C: "御札",
  D: "血痕",
};

/** カテゴリ別グリフ（白で描画）。viewBox 基準は 26x26 にフィット */
function glyphFor(category: SpotCategory): string {
  switch (category) {
    case "haunted":
      return `
        <path d="M13 7c-1 2 -3 3 -3 6 a3 3 0 0 0 6 0 c0 -2 -1 -3 -3 -6z M13 16 a1.4 1.4 0 0 0 0 -3 a1.4 1.4 0 0 0 0 3z"
          fill="${STROKE}"/>`;
    case "horror":
      return `
        <rect x="7.5" y="8" width="11" height="9" rx="3.2" fill="${STROKE}"/>
        <circle cx="10.5" cy="12" r="1.3" fill="#000"/>
        <circle cx="15.5" cy="12" r="1.3" fill="#000"/>
        <rect x="10" y="16" width="6" height="2" fill="${STROKE}"/>`;
    case "sightseeing":
      return `
        <rect x="6" y="8" width="14" height="1.8" fill="${STROKE}"/>
        <rect x="7.5" y="10.6" width="11" height="1.2" fill="${STROKE}"/>
        <rect x="8.2" y="11.8" width="1.6" height="6.5" fill="${STROKE}"/>
        <rect x="16.2" y="11.8" width="1.6" height="6.5" fill="${STROKE}"/>`;
    case "legend":
      return `
        <path d="M13 7 L16 9 L16 18 L10 18 L10 9 Z" fill="${STROKE}"/>
        <rect x="11.2" y="11.2" width="3.6" height="0.8" fill="#000" opacity="0.6"/>
        <rect x="11.2" y="13" width="3.6" height="0.8" fill="#000" opacity="0.6"/>
        <rect x="11.2" y="14.8" width="3.6" height="0.8" fill="#000" opacity="0.6"/>`;
  }
}

/** A: 涙滴 */
function renderA(color: string, category: SpotCategory, size: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.44)}" viewBox="-3 -3 32 46">
  <path d="M13 0C5.82 0 0 5.74 0 12.83c0 9.6 13 25.17 13 25.17s13-15.57 13-25.17C26 5.74 20.18 0 13 0z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
  ${glyphFor(category)}
</svg>`.trim();
}

/** B: 朱印（二重円＋下にわずかな足） */
function renderB(color: string, category: SpotCategory, size: number): string {
  // アンカーを円下部に合わせる。viewBox 縦を少し拡げ、下に三角の留め具を追加
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.2)}" viewBox="-2 -2 30 34">
  <!-- 影 -->
  <ellipse cx="13" cy="31" rx="7" ry="1.3" fill="#000" opacity="0.35"/>
  <!-- 印影の外円（太めリング） -->
  <circle cx="13" cy="13" r="12.2" fill="${color}" stroke="${STROKE}" stroke-width="1.6"/>
  <!-- 内側リング -->
  <circle cx="13" cy="13" r="9.6" fill="none" stroke="${STROKE}" stroke-width="0.8" opacity="0.8"/>
  <!-- 固定ピン（下端の小突起） -->
  <path d="M11 24.5 L13 30 L15 24.5 Z" fill="${color}" stroke="${STROKE}" stroke-width="1.1" stroke-linejoin="round"/>
  ${glyphFor(category)}
</svg>`.trim();
}

/** C: 御札（縦長の札＋紐） */
function renderC(color: string, category: SpotCategory, size: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.55)}" viewBox="-2 -4 30 44">
  <!-- 紐 -->
  <path d="M13 -3 L13 3" stroke="${STROKE}" stroke-width="1" opacity="0.7"/>
  <circle cx="13" cy="-2.5" r="1.2" fill="none" stroke="${STROKE}" stroke-width="0.8" opacity="0.7"/>
  <!-- 札本体（五角形っぽい台形＋尖り） -->
  <path d="M13 2 L22 6 L22 32 L13 37 L4 32 L4 6 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
  <!-- 上下の線飾り -->
  <rect x="6" y="8.2" width="14" height="0.8" fill="${STROKE}" opacity="0.6"/>
  <rect x="6" y="30" width="14" height="0.8" fill="${STROKE}" opacity="0.6"/>
  <!-- グリフ（やや下方に配置） -->
  <g transform="translate(0, 4)">
    ${glyphFor(category)}
  </g>
</svg>`.trim();
}

/** D: 血痕（不規則な血の雫） */
function renderD(color: string, category: SpotCategory, size: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.5)}" viewBox="-4 -4 34 48">
  <!-- 不規則な血の雫シェイプ + 垂れ -->
  <path d="
    M13 0
    C 6 0 0 6 0 13
    C 0 18 3 22 6 25
    C 8 27 10 29 11 32
    L 11.5 36
    Q 12 39 12.7 40
    Q 13 41 13 40.5
    Q 13 39 13.3 36
    L 13.8 32
    C 15 29 18 27 20 25
    C 23 22 26 18 26 13
    C 26 6 20 0 13 0 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round"/>
  <!-- 小さな血飛沫 -->
  <circle cx="21.5" cy="21.5" r="1.3" fill="${color}" stroke="${STROKE}" stroke-width="0.6"/>
  <circle cx="3.5" cy="20" r="1.0" fill="${color}" stroke="${STROKE}" stroke-width="0.6"/>
  <circle cx="17.5" cy="33" r="0.9" fill="${color}"/>
  ${glyphFor(category)}
</svg>`.trim();
}

/**
 * キュレーションスポット用のピン SVG。涙滴シェイプ + カテゴリグリフ。
 * variant 未指定時は A（Classic）。
 */
export function renderSpotPin(
  category: SpotCategory,
  size = 42,
  variant: PinVariant = "A"
): string {
  const color = colorFor(category);
  switch (variant) {
    case "B": return renderB(color, category, size);
    case "C": return renderC(color, category, size);
    case "D": return renderD(color, category, size);
    case "A":
    default:  return renderA(color, category, size);
  }
}

/** 投稿用グリフ（巻物線） */
function postGlyph(): string {
  return `
    <rect x="9" y="10" width="8" height="1.2" fill="${STROKE}" opacity="0.9"/>
    <rect x="9" y="13" width="8" height="1.2" fill="${STROKE}" opacity="0.9"/>
    <rect x="9" y="16" width="8" height="1.2" fill="${STROKE}" opacity="0.9"/>`;
}

/**
 * 投稿ピン用の SVG。variant ごとに形状を変える。
 */
export function renderPostPin(size = 38, variant: PinVariant = "A"): string {
  const color = colorFor("haunted"); // 投稿は血赤ベース
  if (variant === "B") {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.2)}" viewBox="-2 -2 30 34">
  <ellipse cx="13" cy="31" rx="6" ry="1.2" fill="#000" opacity="0.35"/>
  <circle cx="13" cy="13" r="12.2" fill="${color}" stroke="${STROKE}" stroke-width="1.6"/>
  <circle cx="13" cy="13" r="9.6" fill="none" stroke="${STROKE}" stroke-width="0.8" opacity="0.8"/>
  <path d="M11 24.5 L13 30 L15 24.5 Z" fill="${color}" stroke="${STROKE}" stroke-width="1.1" stroke-linejoin="round"/>
  ${postGlyph()}
</svg>`.trim();
  }
  if (variant === "C") {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.55)}" viewBox="-2 -4 30 44">
  <path d="M13 -3 L13 3" stroke="${STROKE}" stroke-width="1" opacity="0.7"/>
  <circle cx="13" cy="-2.5" r="1.2" fill="none" stroke="${STROKE}" stroke-width="0.8" opacity="0.7"/>
  <path d="M13 2 L22 6 L22 32 L13 37 L4 32 L4 6 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
  <g transform="translate(0, 4)">${postGlyph()}</g>
</svg>`.trim();
  }
  if (variant === "D") {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.5)}" viewBox="-4 -4 34 48">
  <path d="M13 0 C 6 0 0 6 0 13 C 0 18 3 22 6 25 C 8 27 10 29 11 32 L 11.5 36 Q 12 39 12.7 40 Q 13 41 13 40.5 Q 13 39 13.3 36 L 13.8 32 C 15 29 18 27 20 25 C 23 22 26 18 26 13 C 26 6 20 0 13 0 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round"/>
  <circle cx="21.5" cy="21.5" r="1.3" fill="${color}" stroke="${STROKE}" stroke-width="0.6"/>
  <circle cx="3.5" cy="20" r="1.0" fill="${color}" stroke="${STROKE}" stroke-width="0.6"/>
  ${postGlyph()}
</svg>`.trim();
  }
  // A: 巻物形
  const w = 24, h = 34;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * (h / w))}" viewBox="-2 -2 ${w + 4} ${h + 4}">
  <path d="M0 3 Q${w / 2} -1 ${w} 3 L${w} ${h - 6} L${w / 2 + 1} ${h - 1} L${w / 2} ${h} L${w / 2 - 1} ${h - 1} L0 ${h - 6} Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.3" stroke-linejoin="round"/>
  <rect x="5" y="10" width="${w - 10}" height="1.3" fill="${STROKE}" opacity="0.9"/>
  <rect x="5" y="15" width="${w - 10}" height="1.3" fill="${STROKE}" opacity="0.9"/>
  <rect x="5" y="20" width="${w - 10}" height="1.3" fill="${STROKE}" opacity="0.9"/>
</svg>`.trim();
}
