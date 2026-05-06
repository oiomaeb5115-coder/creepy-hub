-- センシティブフラグ追加（投稿 / ストーリー）
-- 投稿者がチェックを入れた画像はモザイク化し、閲覧者の意思で一時的に解除できる。

ALTER TABLE post
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_post_is_sensitive ON post(is_sensitive);

ALTER TABLE user_stories
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

-- post_with_counts ビュー再作成（is_sensitive を末尾に追加）
-- CREATE OR REPLACE は既存列の削除/順序変更ができないため、既存の列構成を保ったまま is_sensitive のみ末尾追加する
CREATE OR REPLACE VIEW post_with_counts AS
SELECT
  p.id,
  p.title,
  p.content,
  p.created_at,
  p.image_url,
  p.image_url_2,
  p.image_url_3,
  p.video_url,
  p.stream_video_id,
  p.view_count,
  p.user_id,
  p.slug,
  p.is_published,
  p.deleted_at,
  p.category_id,
  COALESCE((SELECT SUM(v.vote_type) FROM post_votes v WHERE v.post_id = p.id), 0)::int AS vote_score,
  COALESCE((SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id AND c.is_deleted IS NOT TRUE), 0)::int AS comment_count,
  p.is_sensitive
FROM post p;

-- posts_with_location ビュー再作成（is_sensitive を含める）
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
    video_url,
    stream_video_id,
    category_id,
    user_id,
    lat,
    lng,
    location_name,
    location_precision,
    map_category,
    is_sensitive,
    created_at
  FROM post
  WHERE is_published = true
    AND deleted_at IS NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL;
