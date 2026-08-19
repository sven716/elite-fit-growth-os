create extension if not exists pgcrypto;

create table if not exists gainz_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid not null references clients(id) on delete cascade,
  week_label text not null,
  uitvoerbaarheid text,
  resultaat text,
  adherence text,
  tevredenheid text,
  een_op_een text,
  verlenging text,
  referral text,
  hoofdgewoonte text,
  bottleneck text,
  next_step text,
  intern_advies text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gainz_reviews_user_client_created_idx
  on gainz_reviews (user_id, client_id, created_at desc);

create or replace function set_gainz_reviews_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger gainz_reviews_set_updated_at
before update on gainz_reviews
for each row execute function set_gainz_reviews_updated_at();

alter table gainz_reviews enable row level security;

drop policy if exists "gainz_reviews_select_own" on gainz_reviews;
create policy "gainz_reviews_select_own"
  on gainz_reviews for select
  using (user_id = auth.uid());

drop policy if exists "gainz_reviews_insert_own" on gainz_reviews;
create policy "gainz_reviews_insert_own"
  on gainz_reviews for insert
  with check (user_id = auth.uid());

drop policy if exists "gainz_reviews_update_own" on gainz_reviews;
create policy "gainz_reviews_update_own"
  on gainz_reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "gainz_reviews_delete_own" on gainz_reviews;
create policy "gainz_reviews_delete_own"
  on gainz_reviews for delete
  using (user_id = auth.uid());
