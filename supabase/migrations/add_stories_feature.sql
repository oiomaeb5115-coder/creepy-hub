-- ============================================================
-- user_stories: Instagram風24時間ストーリー機能
-- ============================================================

create table if not exists user_stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  duration_ms integer,
  text_overlays jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  expires_at timestamptz not null
);

-- RLS
alter table user_stories enable row level security;

create policy "誰でも有効なストーリーを閲覧可"
  on user_stories for select
  using (expires_at > now());

create policy "自分のストーリーを作成可"
  on user_stories for insert
  with check (auth.uid() = user_id);

create policy "自分のストーリーを削除可"
  on user_stories for delete
  using (auth.uid() = user_id);

-- インデックス
create index idx_user_stories_expires_at
  on user_stories(expires_at, user_id, created_at desc);

create index idx_user_stories_user_id
  on user_stories(user_id);
