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

/** 本番固定：血＋紫寄りピンクのパレット */
export const BLOOD_SCORCHED: Record<SpotCategory, string> = {
  haunted: "#C91F4A",      // クリムゾンピンク：炎
  horror: "#6B1E4F",       // 深いブラックベリー：髑髏
  sightseeing: "#E56BA1",  // ローズピンク：鳥居
  legend: "#9C3B74",       // ダスティマゼンタ：御札
};

export function colorFor(cat: SpotCategory): string {
  return BLOOD_SCORCHED[cat];
}
