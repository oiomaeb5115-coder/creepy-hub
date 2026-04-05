-- post_comments テーブルに画像カラムを追加（最大3枚、postと同じ構成）
ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS image_url   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_url_2 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT DEFAULT NULL;
