-- posts_with_location ビューに本文（content）と画像URLを追加。
-- 地図のピンをタップした時、モーダルで本文と画像を軽く見せるために必要。
--
-- CREATE OR REPLACE VIEW は既存ビューのカラム順を変えられない（位置4 の category_id を
-- content に改名しようとしたと解釈されて "42P16: cannot change name of view column"
-- エラーで失敗する）ため、一旦 DROP してから CREATE する。
-- このビューには依存オブジェクトが無い前提（現状は API から直接 SELECT のみ）。
--
-- 本文は長文になり得るため、将来 payload が重くなったら LEFT(content, 1000) のような
-- 切り詰めを検討する。MVP 段階では全文返す。

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
    created_at
  FROM post
  WHERE is_published = true
    AND deleted_at IS NULL
    AND lat IS NOT NULL
    AND lng IS NOT NULL;
