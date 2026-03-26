-- ログイン失敗カウントをアトミックにインクリメントする RPC 関数
-- 競合状態（Race Condition）を防ぐため、JS ではなく DB レベルで処理する
-- Supabase SQL Editor で実行してください

CREATE OR REPLACE FUNCTION record_login_failure(p_email TEXT, p_max_attempts INT)
RETURNS TABLE(new_count INT, just_locked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INT;
  v_rows_updated INT;
BEGIN
  -- アトミックにインクリメント（INSERT または UPDATE を1回のクエリで実行）
  INSERT INTO login_attempts (email, failed_count, locked_at, last_failed_at)
  VALUES (p_email, 1, NULL, NOW())
  ON CONFLICT (email) DO UPDATE
    SET failed_count = login_attempts.failed_count + 1,
        last_failed_at = NOW()
  RETURNING login_attempts.failed_count INTO v_new_count;

  -- 閾値に達した場合のみ locked_at をセット（未ロックのときだけ更新）
  IF v_new_count >= p_max_attempts THEN
    UPDATE login_attempts
    SET locked_at = NOW()
    WHERE email = p_email AND locked_at IS NULL;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN QUERY SELECT v_new_count, (v_rows_updated > 0);
  ELSE
    RETURN QUERY SELECT v_new_count, FALSE;
  END IF;
END;
$$;
