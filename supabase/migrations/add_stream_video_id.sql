-- post テーブルに Cloudflare Stream 動画ID列を追加
ALTER TABLE post ADD COLUMN IF NOT EXISTS stream_video_id text;

-- user_stories テーブルに Cloudflare Stream 動画ID列を追加
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS stream_video_id text;

-- post_with_counts ビューを再作成（stream_video_id を含める）
DROP VIEW IF EXISTS post_with_counts;

CREATE VIEW post_with_counts AS
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
  COALESCE((SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id AND c.is_deleted IS NOT TRUE), 0)::int AS comment_count
FROM post p;
