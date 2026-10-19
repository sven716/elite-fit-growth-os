alter table public.tasks
  add column if not exists priority text not null default 'normaal';

alter table public.tasks
  drop constraint if exists tasks_priority_check;

alter table public.tasks
  add constraint tasks_priority_check
  check (priority in ('normaal', 'hoog'));

create index if not exists tasks_open_priority_due_date_idx
  on public.tasks (user_id, priority, due_date)
  where status = 'open';