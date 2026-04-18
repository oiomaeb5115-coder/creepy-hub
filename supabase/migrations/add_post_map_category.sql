-- 投稿ごとの地図ピン種別を追加。
-- キュレーションスポットと同じ 4 カテゴリ（心霊/恐怖/観光/伝承）を
-- ユーザー投稿でも選べるようにする。
--
-- 既存投稿（値なし）は地図上では "haunted"（クリムゾンピンク＋炎）にフォールバック。
-- UI 側は未選択でも投稿できるよう、NULL を許容する。

ALTER TABLE post
  ADD COLUMN IF NOT EXISTS map_category text
    CHECK (map_category IN ('haunted', 'horror', 'sightseeing', 'legend'));

-- posts_with_location ビューに map_category を含める
DROP VIEW IF EXISTS posts_with_location;

CREATE VIEW posts_with_location AS
  SELECT
    id,
    title,
    slug,
    content,
    image_url,
    image_url_2,
    image_url_3,
    category_id,
    user_id,
    lat,
    lng,
    location_name,
    location_precision,
    map_category,
    created_at
  FROM post
  WHERE is_published = true
    AND deleted_at IS NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL;
