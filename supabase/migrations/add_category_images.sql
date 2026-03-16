-- カテゴリにアイコン・ヘッダー画像を追加するマイグレーション
-- Supabase SQL Editorで実行してください

ALTER TABLE story_categories
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS header_image_url TEXT;

-- ストレージバケット: category-images
-- Supabase ダッシュボード > Storage > New bucket にて
-- バケット名: category-images
-- Public bucket: ON（公開）
-- として作成してください。
