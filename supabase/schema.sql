-- おこづかいクエスト — Supabase スキーマ
-- 家族ごとに 1 行の JSON ブロブを保持する。
-- Supabase の SQL Editor でそのまま実行する。

create table if not exists public.family_states (
  family_id  uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.family_states enable row level security;

drop policy if exists "family can read own state" on public.family_states;
create policy "family can read own state"
  on public.family_states for select
  using (auth.uid() = family_id);

drop policy if exists "family can insert own state" on public.family_states;
create policy "family can insert own state"
  on public.family_states for insert
  with check (auth.uid() = family_id);

drop policy if exists "family can update own state" on public.family_states;
create policy "family can update own state"
  on public.family_states for update
  using (auth.uid() = family_id)
  with check (auth.uid() = family_id);

drop policy if exists "family can delete own state" on public.family_states;
create policy "family can delete own state"
  on public.family_states for delete
  using (auth.uid() = family_id);

-- updated_at を自動更新
create or replace function public.touch_family_states()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists family_states_touch on public.family_states;
create trigger family_states_touch
  before update on public.family_states
  for each row execute function public.touch_family_states();

-- Realtime に追加（既に追加済みなら DO 文でスキップ）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'family_states'
  ) then
    alter publication supabase_realtime add table public.family_states;
  end if;
end $$;
