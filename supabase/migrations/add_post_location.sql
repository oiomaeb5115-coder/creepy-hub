-- 投稿に位置情報（緯度経度、地名、精度）を追加
-- スマホ版（iOS/Android）からの投稿時に地図タップで選んだ座標を保存する用途。
-- 正確な座標を守るため、精度は投稿時に「exact / town / prefecture」を選び、
-- town/prefecture 選択時はクライアント側で座標を丸めてから保存する想定。

ALTER TABLE post
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_precision text
    CHECK (location_precision IS NULL OR location_precision IN ('exact', 'town', 'prefecture'));

-- lat/lng を両方持つ行だけの部分インデックス（bbox クエリ用）
CREATE INDEX IF NOT EXISTS post_location_idx
  ON post (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 地図表示用ビュー。公開済み・未削除・位置あり のみ返す。
CREATE OR REPLACE VIEW posts_with_location AS
  SELECT
    id,
    title,
    slug,
    category_id,
    user_id,
    lat,
    lng,
    location_name,
    location_precision,
    created_at
  FROM post
  WHERE is_published = true
    AND deleted_at IS NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL;
