alter table public.content_assets
  add column if not exists source_ref text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists channel text,
  add column if not exists decision_reason text,
  add column if not exists blockers text[] not null default '{}'::text[],
  add column if not exists decided_at timestamptz;

-- Vervang een eventuele oudere status-check zonder andere checks te raken.
do $$
declare
  status_attnum smallint;
  constraint_name text;
begin
  select attnum
    into status_attnum
    from pg_attribute
   where attrelid = 'public.content_assets'::regclass
     and attname = 'status'
     and not attisdropped;

  for constraint_name in
    select conname
      from pg_constraint
     where conrelid = 'public.content_assets'::regclass
       and contype = 'c'
       and status_attnum = any (conkey)
  loop
    execute format(
      'alter table public.content_assets drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

update public.content_assets
   set status = 'wacht_op_goedkeuring'
 where status is null
    or status not in (
      'wacht_op_goedkeuring',
      'goedgekeurd',
      'aanpassen',
      'gestopt',
      'geblokkeerd'
    );

alter table public.content_assets
  alter column status set default 'wacht_op_goedkeuring',
  alter column status set not null,
  add constraint content_assets_status_check
    check (
      status in (
        'wacht_op_goedkeuring',
        'goedgekeurd',
        'aanpassen',
        'gestopt',
        'geblokkeerd'
      )
    );

create unique index if not exists content_assets_user_source_ref_unique
  on public.content_assets (user_id, source_ref)
  where source_ref is not null;
