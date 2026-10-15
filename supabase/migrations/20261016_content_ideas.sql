create extension if not exists pgcrypto;

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  funnel_stage text not null check (funnel_stage in ('tof', 'mof', 'bof')),
  format text not null,
  status text not null default 'goedgekeurd'
    check (status in ('goedgekeurd', 'uitwerken', 'gepland', 'gepubliceerd', 'afgekeurd')),
  hook text,
  notes text,
  source_ref text,
  approved_at date not null default current_date,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_ref)
);

create index if not exists content_ideas_user_status_idx
  on public.content_ideas (user_id, status, approved_at desc);

create index if not exists content_ideas_user_filters_idx
  on public.content_ideas (user_id, funnel_stage, topic, format);

create or replace function public.content_ideas_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_ideas_set_updated_at on public.content_ideas;
create trigger content_ideas_set_updated_at
before update on public.content_ideas
for each row execute function public.content_ideas_set_updated_at();

alter table public.content_ideas enable row level security;

drop policy if exists "content_ideas_select_own" on public.content_ideas;
create policy "content_ideas_select_own"
  on public.content_ideas for select
  using (user_id = auth.uid());

drop policy if exists "content_ideas_insert_own" on public.content_ideas;
create policy "content_ideas_insert_own"
  on public.content_ideas for insert
  with check (user_id = auth.uid());

drop policy if exists "content_ideas_update_own" on public.content_ideas;
create policy "content_ideas_update_own"
  on public.content_ideas for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "content_ideas_delete_own" on public.content_ideas;
create policy "content_ideas_delete_own"
  on public.content_ideas for delete
  using (user_id = auth.uid());
