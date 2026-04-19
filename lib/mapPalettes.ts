/**
 * 地図ピンのカテゴリ別カラーパレット。
 * creepy-map/lib/types.ts の `blood_scorched` を移植。
 */

export type SpotCategory = "haunted" | "horror" | "sightseeing" | "legend";

export const CATEGORY_LABEL: Record<SpotCategory, string> = {
  haunted: "心霊",
  horror: "恐怖",
  sightseeing: "観光",
  legend: "伝承",
};

/** 本番固定：黒・赤黒・金・焦茶の高級感4色パレット */
export const BLOOD_SCORCHED: Record<SpotCategory, string> = {
  haunted: "#5A0F0F",      // 赤黒い赤（凝固した血）：炎
  horror: "#1A1A1A",       // 黒（漆黒）：髑髏
  sightseeing: "#B89A2D",  // 高級感ある黄色（アンティークゴールド）：鳥居
  legend: "#3E2823",       // 高級感ある焦茶（エスプレッソブラウン）：御札
};

export function colorFor(cat: SpotCategory): string {
  return BLOOD_SCORCHED[cat];
}
