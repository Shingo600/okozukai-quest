-- おこづかいクエスト — スナップショット型バックアップ用テーブル
-- Supabase SQL Editor で実行する（family_states を作った後に）。

create table if not exists public.family_state_snapshots (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references auth.users(id) on delete cascade,
  state       jsonb not null,
  label       text,
  created_at  timestamptz not null default now()
);

create index if not exists family_state_snapshots_family_idx
  on public.family_state_snapshots (family_id, created_at desc);

alter table public.family_state_snapshots enable row level security;

drop policy if exists "snapshots: select own" on public.family_state_snapshots;
create policy "snapshots: select own"
  on public.family_state_snapshots for select
  using (auth.uid() = family_id);

drop policy if exists "snapshots: insert own" on public.family_state_snapshots;
create policy "snapshots: insert own"
  on public.family_state_snapshots for insert
  with check (auth.uid() = family_id);

drop policy if exists "snapshots: delete own" on public.family_state_snapshots;
create policy "snapshots: delete own"
  on public.family_state_snapshots for delete
  using (auth.uid() = family_id);

-- 更新は禁止（snapshot は immutable）。policy 未定義のまま RLS が deny する。
