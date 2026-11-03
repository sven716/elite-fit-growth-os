create extension if not exists pgcrypto;

create table if not exists public.project_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  topic_type text not null default 'algemeen'
    check (topic_type in ('algemeen', 'content_idee', 'onderzoek', 'besluit', 'uitvoering')),
  bot_profile text not null default 'default'
    check (bot_profile in ('default', 'marketing', 'sales', 'coaching', 'operations')),
  linked_content_idea_id uuid references public.content_ideas(id) on delete set null,
  hermes_session_name text not null,
  source_ref text,
  status text not null default 'actief'
    check (status in ('actief', 'afgerond', 'gearchiveerd')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  thread_id uuid not null references public.project_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  source_ref text,
  error text,
  claimed_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  thread_id uuid references public.project_threads(id) on delete set null,
  linked_content_idea_id uuid references public.content_ideas(id) on delete set null,
  item_type text not null default 'voortgang'
    check (item_type in ('idee', 'besluit', 'vraag', 'voortgang', 'bron')),
  title text not null,
  content text,
  status text not null default 'actief'
    check (status in ('actief', 'afgerond', 'gearchiveerd')),
  source text not null default 'handmatig',
  source_ref text,
  created_by_profile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.project_threads
    add constraint project_threads_user_source_ref_key unique (user_id, source_ref);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.project_messages
    add constraint project_messages_user_source_ref_key unique (user_id, source_ref);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.project_items
    add constraint project_items_user_source_ref_key unique (user_id, source_ref);
exception when duplicate_object then null;
end $$;

create index if not exists project_threads_project_updated_idx
  on public.project_threads (project_id, updated_at desc);

create index if not exists project_messages_pending_idx
  on public.project_messages (status, created_at)
  where role = 'user' and status in ('pending', 'processing');

create index if not exists project_messages_thread_created_idx
  on public.project_messages (thread_id, created_at);

create index if not exists project_items_project_created_idx
  on public.project_items (project_id, created_at desc);

create or replace function public.project_memory_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists project_threads_set_updated_at on public.project_threads;
create trigger project_threads_set_updated_at
before update on public.project_threads
for each row execute function public.project_memory_set_updated_at();

drop trigger if exists project_items_set_updated_at on public.project_items;
create trigger project_items_set_updated_at
before update on public.project_items
for each row execute function public.project_memory_set_updated_at();

alter table public.project_threads enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_items enable row level security;

drop policy if exists "project_threads_own_all" on public.project_threads;
create policy "project_threads_own_all"
  on public.project_threads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "project_messages_own_all" on public.project_messages;
create policy "project_messages_own_all"
  on public.project_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "project_items_own_all" on public.project_items;
create policy "project_items_own_all"
  on public.project_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.claim_project_chat_messages(p_limit integer default 5)
returns table (message_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_messages
  set status = 'pending', claimed_at = null
  where role = 'user'
    and status = 'processing'
    and claimed_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select id
    from public.project_messages
    where role = 'user' and status = 'pending'
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 10))
  )
  update public.project_messages message
  set status = 'processing', claimed_at = now(), error = null
  from candidates
  where message.id = candidates.id
  returning message.id;
end;
$$;

create or replace function public.complete_project_chat_message(
  p_message_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_message public.project_messages%rowtype;
  response_id uuid;
begin
  select * into source_message
  from public.project_messages
  where id = p_message_id and role = 'user'
  for update;

  if source_message.id is null then
    raise exception 'Projectbericht niet gevonden';
  end if;

  update public.project_messages
  set status = 'completed', processed_at = now(), error = null
  where id = source_message.id;

  insert into public.project_messages (
    user_id, project_id, thread_id, role, content, status,
    source_ref, processed_at
  ) values (
    source_message.user_id,
    source_message.project_id,
    source_message.thread_id,
    'assistant',
    p_response,
    'completed',
    'project-chat:assistant:' || source_message.id::text,
    now()
  )
  on conflict (user_id, source_ref)
  do update set content = excluded.content, processed_at = excluded.processed_at
  returning id into response_id;

  update public.project_threads
  set updated_at = now()
  where id = source_message.thread_id;

  return response_id;
end;
$$;

create or replace function public.fail_project_chat_message(
  p_message_id uuid,
  p_error text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.project_messages
  set status = 'failed', error = left(p_error, 1000), processed_at = now()
  where id = p_message_id and role = 'user';
$$;

revoke all on function public.claim_project_chat_messages(integer) from public;
revoke all on function public.complete_project_chat_message(uuid, text) from public;
revoke all on function public.fail_project_chat_message(uuid, text) from public;
grant execute on function public.claim_project_chat_messages(integer) to service_role;
grant execute on function public.complete_project_chat_message(uuid, text) to service_role;
grant execute on function public.fail_project_chat_message(uuid, text) to service_role;
