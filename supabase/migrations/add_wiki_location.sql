-- wiki_pages に位置情報カラムを追加。
-- post と同じ仕様（lat/lng + 精度 + 地図カテゴリ）で、地図ページに wiki ピンも描画できるようにする。

ALTER TABLE wiki_pages
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_precision text
    CHECK (location_precision IN ('exact', 'town', 'prefecture')),
  ADD COLUMN IF NOT EXISTS map_category text
    CHECK (map_category IN ('haunted', 'horror', 'sightseeing', 'legend'));

-- bbox 検索を効率化するため lat/lng に index
CREATE INDEX IF NOT EXISTS idx_wiki_pages_lat_lng
  ON wiki_pages (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 公開済み・位置情報ありの wiki ページを bbox で取得するためのビュー
DROP VIEW IF EXISTS wiki_pages_with_location;

CREATE VIEW wiki_pages_with_location AS
  SELECT
    id,
    slug,
    title,
    subtitle,
    summary,
    image_url,
    author_id,
    locale,
    lat,
    lng,
    location_name,
    location_precision,
    map_category,
    created_at,
    published_at
  FROM wiki_pages
  WHERE is_published = true
    AND deleted_at IS NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL;
