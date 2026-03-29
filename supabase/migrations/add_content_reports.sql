-- post_reports テーブル
CREATE TABLE IF NOT EXISTS post_reports (
  post_id    INT         NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- wiki_reports テーブル（wiki_pages の id を FK として使用）
CREATE TABLE IF NOT EXISTS wiki_reports (
  wiki_page_id INT         NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wiki_page_id, user_id)
);
ALTER TABLE wiki_reports ENABLE ROW LEVEL SECURITY;

-- 既存テーブルに reported_count 列を追加
ALTER TABLE post       ADD COLUMN IF NOT EXISTS reported_count INT NOT NULL DEFAULT 0;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS reported_count INT NOT NULL DEFAULT 0;

-- アトミックなインクリメント RPC（category のパターンを踏襲）
CREATE OR REPLACE FUNCTION increment_post_report_count(p_post_id INT)
RETURNS void LANGUAGE sql AS $$
  UPDATE post SET reported_count = reported_count + 1 WHERE id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION increment_wiki_report_count(p_wiki_id INT)
RETURNS void LANGUAGE sql AS $$
  UPDATE wiki_pages SET reported_count = reported_count + 1 WHERE id = p_wiki_id;
$$;
