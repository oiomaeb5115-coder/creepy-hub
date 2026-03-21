-- ログイン失敗カウントとロックアウトを管理するテーブル
-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS login_attempts (
  email          TEXT        PRIMARY KEY,
  failed_count   INT         NOT NULL DEFAULT 0,
  locked_at      TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security: サービスロールキーからのみアクセス可
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
-- ポリシーなし = anon/authenticated キーからは全拒否
