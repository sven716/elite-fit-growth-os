alter table public.tasks
  add column if not exists description text,
  add column if not exists action_url text,
  add column if not exists auto_managed boolean not null default false,
  add column if not exists detected_at timestamptz,
  add column if not exists last_seen_at timestamptz;

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks
  add constraint tasks_source_check
  check (source in ('handmatig', 'plaud', 'fathom', 'ghl', 'automation'));

create index if not exists tasks_open_auto_managed_idx
  on public.tasks (user_id, area, due_date)
  where status = 'open' and auto_managed = true;

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow text not null,
  status text not null check (status in ('gestart', 'geslaagd', 'fout')),
  detected_count integer not null default 0,
  created_count integer not null default 0,
  resolved_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists automation_runs_user_workflow_started_idx
  on public.automation_runs (user_id, workflow, started_at desc);

alter table public.automation_runs enable row level security;

drop policy if exists "automation_runs_select_own" on public.automation_runs;
create policy "automation_runs_select_own"
  on public.automation_runs for select
  using (user_id = auth.uid());
