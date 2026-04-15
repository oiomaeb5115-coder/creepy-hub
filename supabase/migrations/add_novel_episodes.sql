-- ビジュアルノベル怪談リーダー用テーブル

-- novel_episodes: エピソード（ノベル1話分）
create table if not exists novel_episodes (
  id uuid default gen_random_uuid() primary key,
  title_ja text not null,
  title_en text,
  description_ja text,
  description_en text,
  cover_image_url text,
  is_published boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- novel_scenes: 各シーン（レイヤー・台詞・音声）
-- layers は JSONB 配列。配列順 = 重ね順（先頭が最背面）。
-- 各要素: { "type": "bg"|"char", "image_url": "...", "position"?: "left"|"center"|"right" }
-- type=char の場合のみ position を使用。
create table if not exists novel_scenes (
  id uuid default gen_random_uuid() primary key,
  episode_id uuid not null references novel_episodes(id) on delete cascade,
  scene_order integer not null,
  layers jsonb default '[]'::jsonb,
  text_ja text not null,
  text_en text,
  speaker_name_ja text,
  speaker_name_en text,
  audio_url text,
  audio_duration_ms integer,
  transition_effect text default 'fade'
    check (transition_effect in ('fade', 'cut', 'slide')),
  created_at timestamptz default now() not null
);

-- インデックス
create index idx_novel_scenes_episode_order on novel_scenes(episode_id, scene_order);
create index idx_novel_episodes_published on novel_episodes(is_published, sort_order);

-- RLS
alter table novel_episodes enable row level security;
alter table novel_scenes enable row level security;

-- 公開エピソードは誰でも閲覧可
create policy "公開エピソードの閲覧"
  on novel_episodes for select
  using (is_published = true);

-- 管理者は全操作可
create policy "管理者のエピソード管理"
  on novel_episodes for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 公開エピソードのシーンは誰でも閲覧可
create policy "公開シーンの閲覧"
  on novel_scenes for select
  using (
    exists (select 1 from novel_episodes where id = episode_id and is_published = true)
  );

-- 管理者はシーンの全操作可
create policy "管理者のシーン管理"
  on novel_scenes for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
