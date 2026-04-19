/**
 * 地図ピンの SVG を生成する。
 * 形状: 和風プレミアムの「石灯籠（Stone Lantern）」一本化。
 *
 * - 心霊 (haunted)     → 炎
 * - 恐怖 (horror)      → 髑髏
 * - 観光 (sightseeing) → 鳥居
 * - 伝承 (legend)      → 御札
 *
 * パーツ構成:
 *   笠 (kasa)     — 上部の屋根（反りのある台形）
 *   火袋 (hibukuro) — 中央の灯りを入れる窓。色塗り＋カテゴリグリフ
 *   中台 (chūdai)  — 火袋の下の受け皿
 *   竿 (sao)      — 中央の柱
 *   基礎 (kiso)    — 末広がりの足。SVG 最下端が地理座標
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

/** 火袋の中に納めるためグリフを縮小（0.55 倍）してセンタリング */
function smallGlyph(category: SpotCategory, cx: number, cy: number): string {
  // glyphFor は (13,13) 中心の 26x26 設計。0.55 倍 + 任意位置に再配置。
  const scale = 0.55;
  // 元の中心(13,13)を新中心(cx,cy)にもっていく:
  // transform: translate(cx - 13*scale, cy - 13*scale) scale(scale)
  const tx = cx - 13 * scale;
  const ty = cy - 13 * scale;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})">${glyphFor(category)}</g>`;
}

/**
 * 灯籠ピン。アンカーは SVG 最下端（基礎の底）。
 * viewBox: -3 -3 32 46 → 縦長 1.44 比、幅26 / 高40 のレイアウト。
 *
 * 縦座標目安:
 *   y=0   : 笠 上端（宝珠想定なし）
 *   y=2-9 : 笠（屋根）
 *   y=10-22 : 火袋（カテゴリ色 + グリフ）
 *   y=23-25 : 中台（受け皿）
 *   y=26-32 : 竿（柱）
 *   y=33-38 : 基礎（末広がり）
 */
function renderLantern(color: string, category: SpotCategory, size: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.54)}" viewBox="-3 -3 32 46">
  <!-- 影（地面に薄く） -->
  <ellipse cx="13" cy="40" rx="9.5" ry="1.4" fill="#000" opacity="0.32"/>

  <!-- 宝珠（てっぺんの飾り玉） -->
  <circle cx="13" cy="2" r="1.7" fill="${color}" stroke="${STROKE}" stroke-width="1"/>

  <!-- 笠（屋根）反りのある六角台形 -->
  <path d="M2 9 L4 6 Q13 1 22 6 L24 9 L21 10 L5 10 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round"/>

  <!-- 火袋（中央の灯り箱） 角丸長方形 -->
  <rect x="5.5" y="10.5" width="15" height="12.5" rx="1.6"
    fill="${color}" stroke="${STROKE}" stroke-width="1.2"/>
  <!-- 火袋内のカテゴリグリフ（縮小） -->
  ${smallGlyph(category, 13, 16.5)}

  <!-- 中台（受け皿） -->
  <rect x="3.5" y="23.5" width="19" height="2.6" rx="0.6"
    fill="${color}" stroke="${STROKE}" stroke-width="1.1"/>

  <!-- 竿（柱）中央に細く -->
  <rect x="10.2" y="26.5" width="5.6" height="6.6"
    fill="${color}" stroke="${STROKE}" stroke-width="1.1"/>

  <!-- 基礎（末広がり） -->
  <path d="M7 33.2 L19 33.2 L22 38.6 L4 38.6 Z"
    fill="${color}" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`.trim();
}

/**
 * キュレーションスポット用のピン SVG。灯籠 + カテゴリグリフ。
 */
export function renderSpotPin(category: SpotCategory, size = 42): string {
  const color = colorFor(category);
  return renderLantern(color, category, size);
}

/**
 * 投稿ピン用の SVG。スポット同様の灯籠形状で、色は投稿のカテゴリに従う。
 * 旧: 巻物形 → 統一感のため灯籠＋グリフへ移行。
 *
 * 呼び出し側で `map_category` をカテゴリとして渡せば、4色4グリフが反映される。
 * カテゴリ未指定時は haunted（血赤＋炎）にフォールバック。
 */
export function renderPostPin(size = 38, category: SpotCategory = "haunted"): string {
  const color = colorFor(category);
  return renderLantern(color, category, size);
}
