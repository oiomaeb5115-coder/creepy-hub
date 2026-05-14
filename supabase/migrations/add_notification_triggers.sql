-- =====================================================
-- コメント/返信時に通知を自動生成するトリガー
-- =====================================================

-- コメント挿入時に通知を生成する関数
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- トップレベルコメント → 投稿者に通知
    SELECT user_id INTO target_user_id FROM post WHERE id = NEW.post_id;
    IF target_user_id IS NOT NULL AND target_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, post_id, actor_id, type)
      VALUES (target_user_id, NEW.post_id, NEW.user_id, 'comment');
    END IF;
  ELSE
    -- 返信 → 親コメント作者に通知
    SELECT user_id INTO target_user_id FROM post_comments WHERE id = NEW.parent_id;
    IF target_user_id IS NOT NULL AND target_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, post_id, actor_id, type)
      VALUES (target_user_id, NEW.post_id, NEW.user_id, 'reply');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- post_comments テーブルにトリガーを設定
DROP TRIGGER IF EXISTS trg_notify_on_comment ON post_comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();
