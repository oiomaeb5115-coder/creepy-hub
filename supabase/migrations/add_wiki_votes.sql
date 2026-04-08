-- wiki_votes テーブル（post_votes と同じ構造）
CREATE TABLE IF NOT EXISTS wiki_votes (
  id          BIGSERIAL PRIMARY KEY,
  wiki_id     BIGINT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  user_id     UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type   SMALLINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wiki_id, user_id)
);

-- vote_score カラムを wiki_pages に追加
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS vote_score INT NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE wiki_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wiki votes"
  ON wiki_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own wiki vote"
  ON wiki_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wiki vote"
  ON wiki_votes FOR DELETE
  USING (auth.uid() = user_id);

-- vote_score を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_wiki_vote_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wiki_pages SET vote_score = vote_score + NEW.vote_type WHERE id = NEW.wiki_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wiki_pages SET vote_score = vote_score - OLD.vote_type WHERE id = OLD.wiki_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wiki_vote_score
AFTER INSERT OR DELETE ON wiki_votes
FOR EACH ROW EXECUTE FUNCTION update_wiki_vote_score();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_wiki_votes_wiki_id ON wiki_votes(wiki_id);
CREATE INDEX IF NOT EXISTS idx_wiki_votes_user_id ON wiki_votes(user_id);
