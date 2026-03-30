-- 投稿にSEO用slugカラムを追加
ALTER TABLE post ADD COLUMN slug text;

-- slugの検索パフォーマンス用インデックス
CREATE INDEX idx_post_slug ON post(slug);
