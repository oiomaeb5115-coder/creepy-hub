/**
 * 地図ピンの SVG を生成する。
 * 形状: 📍型ラウンドピン（円 + 下向き三角の尾）一本化。
 *
 * - 心霊 (haunted)     → 炎
 * - 恐怖 (horror)      → 髑髏
 * - 観光 (sightseeing) → 鳥居
 * - 伝承 (legend)      → 御札
 *
 * パーツ構成:
 *   円本体          — カテゴリ色塗り + 白ストローク。中央にカテゴリグリフを配置
 *   内側リング      — 高級感を演出する薄い二重輪郭
 *   尾（三角）      — 下向きに伸びる三角形。先端が地理座標のアンカー
 *   影              — 地面に薄く落ちる楕円
 */

import { colorFor, type SpotCategory } from "@/lib/mapPalettes";

const STROKE = "#f5f5f5";

export type PinKind = "spot" | "post";

/** カテゴリ別グリフ（白で描画）。viewBox 26x26 内、中心 (13,13) を想定。 */
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
      // 御札
      return `
        <path d="M13 7 L16 9 L16 18 L10 18 L10 9 Z" fill="${STROKE}"/>
        <rect x="11.2" y="11.2" width="3.6" height="0.8" fill="#000" opacity="0.6"/>
        <rect x="11.2" y="13" width="3.6" height="0.8" fill="#000" opacity="0.6"/>
        <rect x="11.2" y="14.8" width="3.6" height="0.8" fill="#000" opacity="0.6"/>`;
  }
}

/** ラウンドピンの円内に納めるためグリフを縮小（0.65 倍）してセンタリング */
function smallGlyph(category: SpotCategory, cx: number, cy: number): string {
  // glyphFor は (13,13) 中心の 26x26 設計。0.65 倍 + 任意位置に再配置。
  const scale = 0.65;
  const tx = cx - 13 * scale;
  const ty = cy - 13 * scale;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})">${glyphFor(category)}</g>`;
}

/**
 * 📍 ラウンドピン。アンカーは SVG 最下端（尾の先端）。
 * viewBox: -3 -3 32 46 → 縦長 1.44 比、幅26 / 高40 のレイアウト。
 *
 * 縦座標目安:
 *   y=0-24   : 円本体（中心 13,12 半径 12）
 *   y=23.91  : 針状の尾の付け根（円のほぼ底辺、幅3）
 *   y=38     : 尾の先端 = アンカー
 *   y=40     : 影
 *
 * 針幾何: 円底辺近く (12 ≦ y ≦ 24) に幅3の付け根 → 先端 (13,38) へ細く伸びる。
 *   付け根接点は円上の (11.5, 23.91) と (14.5, 23.91)。
 */
function renderRoundPin(color: string, category: SpotCategory, size: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.54)}" viewBox="-3 -3 32 46">
  <!-- 影（地面に薄く） -->
  <ellipse cx="13" cy="40" rx="6" ry="1" fill="#000" opacity="0.32"/>

  <!-- 📍 本体（円 + 円底から伸びる細い針状の尾） -->
  <path d="M 14.5 23.91 A 12 12 0 1 0 11.5 23.91 L 13 38 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>

  <!-- 内側リング（高級感の二重輪郭） -->
  <circle cx="13" cy="12" r="9.4" fill="none" stroke="${STROKE}" stroke-width="0.6" opacity="0.35"/>

  <!-- 中央のカテゴリグリフ -->
  ${smallGlyph(category, 13, 12)}
</svg>`.trim();
}

/**
 * キュレーションスポット用のピン SVG。📍ラウンドピン + カテゴリグリフ。
 */
export function renderSpotPin(category: SpotCategory, size = 42): string {
  const color = colorFor(category);
  return renderRoundPin(color, category, size);
}

/**
 * 投稿ピン用の SVG。スポット同様の📍ラウンドピン形状で、色は投稿のカテゴリに従う。
 *
 * 呼び出し側で `map_category` をカテゴリとして渡せば、4色4グリフが反映される。
 * カテゴリ未指定時は haunted（赤黒＋炎）にフォールバック。
 */
export function renderPostPin(size = 38, category: SpotCategory = "haunted"): string {
  const color = colorFor(category);
  return renderRoundPin(color, category, size);
}
