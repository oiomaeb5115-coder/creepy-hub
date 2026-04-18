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

/** 本番固定：血＋焦土パレット */
export const BLOOD_SCORCHED: Record<SpotCategory, string> = {
  haunted: "#8B1A14",      // 血赤：炎
  horror: "#5A1A14",       // 血×焦土：髑髏
  sightseeing: "#A65A1F",  // 朱色寄り焦土：鳥居
  legend: "#6A3A22",       // バーントシエナ：御札
};

export function colorFor(cat: SpotCategory): string {
  return BLOOD_SCORCHED[cat];
}
