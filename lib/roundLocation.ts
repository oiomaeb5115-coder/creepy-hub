/**
 * 投稿に付ける位置情報の精度処理。
 *
 * プライバシー配慮のため、投稿時点で正確な座標を落とす。
 * DB には丸めた後の値だけを保存する（復元不可能）。
 */

export type LocationPrecision = "exact" | "town" | "prefecture";

export interface LocationInput {
  lat: number;
  lng: number;
  precision: LocationPrecision;
  locationName?: string;
}

export interface LocationRounded {
  lat: number;
  lng: number;
  locationName: string | null;
}

/**
 * 指定の精度に応じて座標を丸める。
 * - exact: そのまま
 * - town: 小数 3 桁（約 110m 単位）に丸め + ±300m のランダムオフセット
 * - prefecture: 入力座標に最も近い都道府県の重心へ置換
 */
export function roundLocation(input: LocationInput): LocationRounded {
  const { lat, lng, precision, locationName } = input;

  if (precision === "exact") {
    return { lat, lng, locationName: locationName ?? null };
  }

  if (precision === "town") {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    // ±300m 相当の乱数オフセット。1 度 ≈ 111km なので 0.003 ≈ 333m
    const jitter = () => (Math.random() - 0.5) * 0.003;
    return {
      lat: +(roundedLat + jitter()).toFixed(4),
      lng: +(roundedLng + jitter()).toFixed(4),
      locationName: locationName ?? null,
    };
  }

  // prefecture: 重心テーブルから最寄りを選ぶ
  const nearest = findNearestPrefecture(lat, lng);
  return {
    lat: nearest.lat,
    lng: nearest.lng,
    locationName: nearest.name,
  };
}

/** 47 都道府県のおおよその重心（県庁所在地を代表点として採用）。 */
const PREFECTURE_CENTROIDS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "北海道", lat: 43.0642, lng: 141.3469 },
  { name: "青森県", lat: 40.8244, lng: 140.7400 },
  { name: "岩手県", lat: 39.7036, lng: 141.1527 },
  { name: "宮城県", lat: 38.2688, lng: 140.8722 },
  { name: "秋田県", lat: 39.7186, lng: 140.1024 },
  { name: "山形県", lat: 38.2404, lng: 140.3634 },
  { name: "福島県", lat: 37.7500, lng: 140.4678 },
  { name: "茨城県", lat: 36.3418, lng: 140.4468 },
  { name: "栃木県", lat: 36.5658, lng: 139.8836 },
  { name: "群馬県", lat: 36.3912, lng: 139.0604 },
  { name: "埼玉県", lat: 35.8570, lng: 139.6489 },
  { name: "千葉県", lat: 35.6046, lng: 140.1233 },
  { name: "東京都", lat: 35.6895, lng: 139.6917 },
  { name: "神奈川県", lat: 35.4478, lng: 139.6425 },
  { name: "新潟県", lat: 37.9022, lng: 139.0236 },
  { name: "富山県", lat: 36.6953, lng: 137.2113 },
  { name: "石川県", lat: 36.5946, lng: 136.6256 },
  { name: "福井県", lat: 36.0652, lng: 136.2216 },
  { name: "山梨県", lat: 35.6642, lng: 138.5685 },
  { name: "長野県", lat: 36.6513, lng: 138.1810 },
  { name: "岐阜県", lat: 35.3912, lng: 136.7223 },
  { name: "静岡県", lat: 34.9769, lng: 138.3831 },
  { name: "愛知県", lat: 35.1802, lng: 136.9067 },
  { name: "三重県", lat: 34.7303, lng: 136.5085 },
  { name: "滋賀県", lat: 35.0045, lng: 135.8686 },
  { name: "京都府", lat: 35.0214, lng: 135.7556 },
  { name: "大阪府", lat: 34.6863, lng: 135.5200 },
  { name: "兵庫県", lat: 34.6913, lng: 135.1830 },
  { name: "奈良県", lat: 34.6853, lng: 135.8328 },
  { name: "和歌山県", lat: 34.2261, lng: 135.1675 },
  { name: "鳥取県", lat: 35.5039, lng: 134.2381 },
  { name: "島根県", lat: 35.4723, lng: 133.0505 },
  { name: "岡山県", lat: 34.6618, lng: 133.9344 },
  { name: "広島県", lat: 34.3965, lng: 132.4596 },
  { name: "山口県", lat: 34.1859, lng: 131.4714 },
  { name: "徳島県", lat: 34.0658, lng: 134.5593 },
  { name: "香川県", lat: 34.3401, lng: 134.0434 },
  { name: "愛媛県", lat: 33.8416, lng: 132.7657 },
  { name: "高知県", lat: 33.5597, lng: 133.5311 },
  { name: "福岡県", lat: 33.6064, lng: 130.4181 },
  { name: "佐賀県", lat: 33.2494, lng: 130.2989 },
  { name: "長崎県", lat: 32.7448, lng: 129.8737 },
  { name: "熊本県", lat: 32.7898, lng: 130.7417 },
  { name: "大分県", lat: 33.2382, lng: 131.6126 },
  { name: "宮崎県", lat: 31.9111, lng: 131.4239 },
  { name: "鹿児島県", lat: 31.5602, lng: 130.5581 },
  { name: "沖縄県", lat: 26.2124, lng: 127.6809 },
];

function findNearestPrefecture(lat: number, lng: number) {
  let best = PREFECTURE_CENTROIDS[0];
  let bestDist = squareDistance(lat, lng, best.lat, best.lng);
  for (let i = 1; i < PREFECTURE_CENTROIDS.length; i++) {
    const p = PREFECTURE_CENTROIDS[i];
    const d = squareDistance(lat, lng, p.lat, p.lng);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

/** 平方距離（緯度経度を平面近似した簡易値、比較のみ用途） */
function squareDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}
