-- ブロック機能用テーブル
create table if not exists blocks (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(blocker_id, blocked_id)
);

-- RLS
alter table blocks enable row level security;

-- 自分のブロック一覧を読める
create policy "Users can view own blocks"
  on blocks for select
  using (auth.uid() = blocker_id);

-- 自分がブロックを作成できる
create policy "Users can block others"
  on blocks for insert
  with check (auth.uid() = blocker_id and blocker_id != blocked_id);

-- 自分のブロックを解除できる
create policy "Users can unblock"
  on blocks for delete
  using (auth.uid() = blocker_id);

-- インデックス
create index if not exists idx_blocks_blocker on blocks(blocker_id);
create index if not exists idx_blocks_blocked on blocks(blocked_id);
