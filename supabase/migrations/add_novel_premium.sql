-- ノベルエピソードに課金ロックの「箱」を追加する
--
-- 方針:
--   - free       : 誰でも視聴可（デフォルト／既存データもこれに該当）
--   - premium    : いずれかのメンバーシップ(YouTube/Apple IAP/Google Play)で解錠
--   - members_only : Phase1ではYouTubeメンバー限定、将来アプリIAPに拡張
--
--   required_membership は「どのプラットフォームで解錠できるか」を表す。
--   Phase1(Web先行)では 'youtube' 固定、iOS/Android公開タイミングで 'any' を採用する想定。
--
--   RLSは緩めに維持（is_published=true なら SELECT 可）し、
--   課金判定はアプリ層(サブスク状態 + is_premium) で実施する。
--   理由: subscriptions テーブル未実装のため。実装後に RLS 側にも制約を重ねる。

alter table novel_episodes
  add column if not exists access_tier text not null default 'free'
    check (access_tier in ('free', 'premium', 'members_only')),
  add column if not exists required_membership text
    check (required_membership in ('any', 'youtube', 'apple_iap', 'google_play', 'stripe')),
  add column if not exists premium_unlock_note_ja text,
  add column if not exists premium_unlock_note_en text;

-- 課金エピソードのうちプレビュー可能なシーン数（先頭からN個だけ非課金者にも見せる）
alter table novel_episodes
  add column if not exists preview_scene_count integer not null default 0
    check (preview_scene_count >= 0);

-- 既存データ互換: NULL 対策。既存エピソードはすべて free のまま。
update novel_episodes
  set access_tier = 'free'
  where access_tier is null;

-- 管理画面から premium フィルタで一覧する用のインデックス
create index if not exists idx_novel_episodes_access_tier
  on novel_episodes (access_tier, is_published);

comment on column novel_episodes.access_tier is
  'free: 誰でも可 / premium: 有料メンバー / members_only: YouTube等メンバー限定';
comment on column novel_episodes.required_membership is
  '解錠に必要なメンバーシップ種別。any は全プラットフォーム共通。null は access_tier=free の場合';
comment on column novel_episodes.preview_scene_count is
  '課金エピソードで非課金者にも見せる先頭シーン数（0なら完全ロック）';
