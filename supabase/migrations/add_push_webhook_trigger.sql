-- =====================================================
-- コメント/返信時に Next.js の /api/push/send を呼んで
-- 実際にプッシュ通知（APNs/FCM）を送信するためのフック
-- =====================================================
--
-- 前提:
--   1. pg_net 拡張が有効
--   2. supabase_vault に以下2つのシークレットが登録済み:
--        push_webhook_url    : 例 'https://creepyhub.com/api/push/send'
--        push_webhook_secret : Next.js の PUSH_WEBHOOK_SECRET と同じ値
--      登録方法（Supabase の SQL Editor で1回実行）:
--        SELECT vault.create_secret('https://creepyhub.com/api/push/send',
--                                   'push_webhook_url', 'PUSH webhook URL');
--        SELECT vault.create_secret('<シークレット文字列>',
--                                   'push_webhook_secret', 'PUSH webhook auth secret');
--
-- 動作:
--   既存の create_comment_notification は notifications テーブルに INSERT するだけだった
--   これを CREATE OR REPLACE で拡張し、Vault からシークレットを読んで pg_net.http_post で
--   /api/push/send を非同期に叩く。失敗しても DB トランザクションには影響しない。

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.create_comment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  post_author_id uuid;
  parent_author_id uuid;
  target_user_id uuid;
  notif_type text;
  webhook_url text;
  webhook_secret text;
BEGIN
  IF NEW.parent_id IS NULL THEN
    SELECT user_id INTO post_author_id
    FROM post
    WHERE id = NEW.post_id;

    IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, post_id, actor_id, is_read)
      VALUES (post_author_id, 'comment', NEW.post_id, NEW.user_id, false);

      target_user_id := post_author_id;
      notif_type := 'comment';
    END IF;

  ELSE
    SELECT user_id INTO parent_author_id
    FROM post_comments
    WHERE id = NEW.parent_id;

    IF parent_author_id IS NOT NULL AND parent_author_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, post_id, actor_id, is_read)
      VALUES (parent_author_id, 'reply', NEW.post_id, NEW.user_id, false);

      target_user_id := parent_author_id;
      notif_type := 'reply';
    END IF;
  END IF;

  -- プッシュ通知（APNs/FCM）を非同期で送信
  IF target_user_id IS NOT NULL THEN
    SELECT decrypted_secret INTO webhook_url
    FROM vault.decrypted_secrets WHERE name = 'push_webhook_url' LIMIT 1;

    SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret' LIMIT 1;

    IF webhook_url IS NOT NULL AND webhook_secret IS NOT NULL THEN
      PERFORM net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || webhook_secret
        ),
        body := jsonb_build_object(
          'user_id', target_user_id,
          'actor_id', NEW.user_id,
          'post_id', NEW.post_id,
          'type', notif_type
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
