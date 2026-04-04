-- View: post_with_counts
-- 投稿ごとの vote_score と comment_count を集計済みで返す View。
-- post_votes / post_comments の全行フェッチを避け、Disk IO を大幅に削減する。

CREATE OR REPLACE VIEW post_with_counts AS
SELECT
  p.id,
  p.title,
  p.content,
  p.created_at,
  p.updated_at,
  p.image_url,
  p.image_url_2,
  p.image_url_3,
  p.view_count,
  p.user_id,
  p.slug,
  p.is_published,
  p.deleted_at,
  p.category_id,
  COALESCE((SELECT SUM(v.vote_type) FROM post_votes v WHERE v.post_id = p.id), 0)::int AS vote_score,
  COALESCE((SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id AND c.is_deleted IS NOT TRUE), 0)::int AS comment_count
FROM post p;
