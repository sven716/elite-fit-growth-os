create extension if not exists pgcrypto;

create table if not exists public.integration_sync_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  status text not null check (status in ('ok','gedeeltelijk','fout')),
  last_started_at timestamptz,
  last_completed_at timestamptz,
  record_count integer,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source)
);

create table if not exists public.finance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  period_start date not null,
  period_end date not null,
  revenue_invoiced numeric not null default 0,
  revenue_paid numeric not null default 0,
  expenses numeric not null default 0,
  outstanding numeric not null default 0,
  overdue numeric not null default 0,
  margin numeric not null default 0,
  margin_percentage numeric,
  sales_invoice_count integer not null default 0,
  purchase_invoice_count integer not null default 0,
  overdue_count integer not null default 0,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date, period_start, period_end)
);

create table if not exists public.website_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  period_start date not null,
  period_end date not null,
  sessions integer not null default 0,
  active_users integer not null default 0,
  new_users integer not null default 0,
  engaged_sessions integer not null default 0,
  page_views integer not null default 0,
  event_count integer not null default 0,
  cta_clicks integer not null default 0,
  generate_leads integer not null default 0,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date, period_start, period_end)
);

create table if not exists public.website_breakdowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  period_start date not null,
  period_end date not null,
  dimension_type text not null check (dimension_type in ('kanaal','landingspagina','event')),
  dimension_value text not null,
  sessions integer,
  active_users integer,
  new_users integer,
  engaged_sessions integer,
  page_views integer,
  event_count integer,
  last_synced_at timestamptz not null default now(),
  unique (user_id, snapshot_date, period_start, period_end, dimension_type, dimension_value)
);

create table if not exists public.operations_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  period_start date not null,
  period_end date not null,
  calendar_events integer not null default 0,
  business_meetings integer not null default 0,
  strategy_calls integer not null default 0,
  coaching_calls integer not null default 0,
  group_calls integer not null default 0,
  focus_blocks integer not null default 0,
  meeting_minutes integer not null default 0,
  upcoming_7d_events integer not null default 0,
  upcoming_7d_meeting_minutes integer not null default 0,
  fathom_meetings integer not null default 0,
  fathom_crm_matches integer not null default 0,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date, period_start, period_end)
);

create or replace function public.platform_integrations_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists integration_sync_status_set_updated_at on public.integration_sync_status;
create trigger integration_sync_status_set_updated_at before update on public.integration_sync_status
for each row execute function public.platform_integrations_set_updated_at();

drop trigger if exists finance_snapshots_set_updated_at on public.finance_snapshots;
create trigger finance_snapshots_set_updated_at before update on public.finance_snapshots
for each row execute function public.platform_integrations_set_updated_at();

drop trigger if exists website_snapshots_set_updated_at on public.website_snapshots;
create trigger website_snapshots_set_updated_at before update on public.website_snapshots
for each row execute function public.platform_integrations_set_updated_at();

drop trigger if exists operations_snapshots_set_updated_at on public.operations_snapshots;
create trigger operations_snapshots_set_updated_at before update on public.operations_snapshots
for each row execute function public.platform_integrations_set_updated_at();

alter table public.integration_sync_status enable row level security;
alter table public.finance_snapshots enable row level security;
alter table public.website_snapshots enable row level security;
alter table public.website_breakdowns enable row level security;
alter table public.operations_snapshots enable row level security;

do $$
begin
  execute 'drop policy if exists "integration_sync_status_select_own" on public.integration_sync_status';
  execute 'create policy "integration_sync_status_select_own" on public.integration_sync_status for select using (user_id = auth.uid())';
  execute 'drop policy if exists "finance_snapshots_select_own" on public.finance_snapshots';
  execute 'create policy "finance_snapshots_select_own" on public.finance_snapshots for select using (user_id = auth.uid())';
  execute 'drop policy if exists "website_snapshots_select_own" on public.website_snapshots';
  execute 'create policy "website_snapshots_select_own" on public.website_snapshots for select using (user_id = auth.uid())';
  execute 'drop policy if exists "website_breakdowns_select_own" on public.website_breakdowns';
  execute 'create policy "website_breakdowns_select_own" on public.website_breakdowns for select using (user_id = auth.uid())';
  execute 'drop policy if exists "operations_snapshots_select_own" on public.operations_snapshots';
  execute 'create policy "operations_snapshots_select_own" on public.operations_snapshots for select using (user_id = auth.uid())';
end $$;
