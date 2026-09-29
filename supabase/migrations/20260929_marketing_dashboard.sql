create extension if not exists pgcrypto;

create table if not exists public.instagram_media_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_media_id text not null,
  caption text,
  media_type text,
  media_product_type text,
  permalink text,
  thumbnail_url text,
  published_at timestamptz not null,
  views bigint,
  reach bigint,
  likes bigint,
  comments bigint,
  saved bigint,
  shares bigint,
  total_interactions bigint,
  total_watch_time_ms bigint,
  avg_watch_time_ms bigint,
  replies bigint,
  follows bigint,
  profile_visits bigint,
  navigation jsonb,
  trigger_key text,
  leads integer,
  email_leads integer,
  booked_calls integer,
  held_calls integer,
  won_customers integer,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_media_id)
);

create index if not exists instagram_media_performance_user_published_idx
  on public.instagram_media_performance (user_id, published_at desc);

create table if not exists public.marketing_funnel_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  period_start date not null,
  period_end date not null,
  contacts_total integer not null default 0,
  contacts_with_email integer not null default 0,
  contacts_with_source integer not null default 0,
  instagram_sourced_contacts integer not null default 0,
  opportunities_total integer not null default 0,
  open_opportunities integer not null default 0,
  won_opportunities integer not null default 0,
  booked_calls integer not null default 0,
  held_calls integer not null default 0,
  confirmed_customer_starts integer not null default 0,
  attributed_opportunities integer not null default 0,
  unattributed_opportunities integer not null default 0,
  unread_conversations integer,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date, period_start, period_end)
);

create index if not exists marketing_funnel_snapshots_user_date_idx
  on public.marketing_funnel_snapshots (user_id, snapshot_date desc);

create or replace function public.marketing_dashboard_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists instagram_media_performance_set_updated_at on public.instagram_media_performance;
create trigger instagram_media_performance_set_updated_at
before update on public.instagram_media_performance
for each row execute function public.marketing_dashboard_set_updated_at();

drop trigger if exists marketing_funnel_snapshots_set_updated_at on public.marketing_funnel_snapshots;
create trigger marketing_funnel_snapshots_set_updated_at
before update on public.marketing_funnel_snapshots
for each row execute function public.marketing_dashboard_set_updated_at();

alter table public.instagram_media_performance enable row level security;
alter table public.marketing_funnel_snapshots enable row level security;

drop policy if exists "instagram_media_performance_select_own" on public.instagram_media_performance;
create policy "instagram_media_performance_select_own"
  on public.instagram_media_performance for select
  using (user_id = auth.uid());

drop policy if exists "marketing_funnel_snapshots_select_own" on public.marketing_funnel_snapshots;
create policy "marketing_funnel_snapshots_select_own"
  on public.marketing_funnel_snapshots for select
  using (user_id = auth.uid());
