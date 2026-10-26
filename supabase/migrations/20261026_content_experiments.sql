create extension if not exists pgcrypto;

create table if not exists public.content_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id text not null,
  title text not null,
  topic text not null,
  format text not null default 'reel',
  objective text not null default 'hook'
    check (objective in ('hook', 'bereik', 'interactie', 'gesprekken')),
  status text not null default 'voorbereiding'
    check (status in ('voorbereiding', 'actief', 'meting_24h', 'meting_72h', 'afgerond', 'gestopt')),
  source_ref text,
  content_asset_id uuid references public.content_assets(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  winner_variant_code text,
  conclusion_observation text,
  interpretation text,
  next_rule text,
  next_hypothesis text,
  evidence_strength text not null default 'signaal'
    check (evidence_strength in ('signaal', 'patroon', 'sterk_patroon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, batch_id)
);

create table if not exists public.content_experiment_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.content_experiments(id) on delete cascade,
  code text not null,
  hook text not null,
  change_description text,
  status text not null default 'concept'
    check (status in ('concept', 'klaar', 'gepubliceerd', 'gemeten', 'winnaar', 'gestopt')),
  duration_seconds numeric,
  external_media_id text,
  output_path text,
  views_24h bigint,
  reach_24h bigint,
  skip_rate_24h numeric,
  avg_watch_time_ms_24h bigint,
  saved_24h bigint,
  shares_24h bigint,
  comments_24h bigint,
  score_24h numeric,
  views_72h bigint,
  reach_72h bigint,
  skip_rate_72h numeric,
  avg_watch_time_ms_72h bigint,
  saved_72h bigint,
  shares_72h bigint,
  comments_72h bigint,
  score_72h numeric,
  conversations integer,
  qualified_leads integer,
  score_note text,
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id, code),
  unique (experiment_id, external_media_id)
);

create table if not exists public.content_experiment_learnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null
    check (category in ('hook', 'opening', 'montage', 'format', 'onderwerp', 'cta', 'doelgroep')),
  rule text not null,
  status text not null default 'signaal'
    check (status in ('signaal', 'patroon', 'bevestigd', 'verworpen')),
  evidence_count integer not null default 1 check (evidence_count >= 1),
  supporting_batch_ids text[] not null default '{}'::text[],
  last_observed_at timestamptz not null default now(),
  next_hypothesis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, rule)
);

create index if not exists content_experiments_user_created_idx
  on public.content_experiments (user_id, created_at desc);
create index if not exists content_experiment_variants_experiment_idx
  on public.content_experiment_variants (experiment_id, code);
create index if not exists content_experiment_learnings_user_status_idx
  on public.content_experiment_learnings (user_id, status, last_observed_at desc);

create or replace function public.content_experiments_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_experiments_set_updated_at on public.content_experiments;
create trigger content_experiments_set_updated_at
before update on public.content_experiments
for each row execute function public.content_experiments_set_updated_at();

drop trigger if exists content_experiment_variants_set_updated_at on public.content_experiment_variants;
create trigger content_experiment_variants_set_updated_at
before update on public.content_experiment_variants
for each row execute function public.content_experiments_set_updated_at();

drop trigger if exists content_experiment_learnings_set_updated_at on public.content_experiment_learnings;
create trigger content_experiment_learnings_set_updated_at
before update on public.content_experiment_learnings
for each row execute function public.content_experiments_set_updated_at();

alter table public.content_experiments enable row level security;
alter table public.content_experiment_variants enable row level security;
alter table public.content_experiment_learnings enable row level security;

drop policy if exists "content_experiments_select_own" on public.content_experiments;
create policy "content_experiments_select_own"
  on public.content_experiments for select
  using (user_id = auth.uid());

drop policy if exists "content_experiment_variants_select_own" on public.content_experiment_variants;
create policy "content_experiment_variants_select_own"
  on public.content_experiment_variants for select
  using (
    exists (
      select 1
      from public.content_experiments experiment
      where experiment.id = experiment_id
        and experiment.user_id = auth.uid()
    )
  );

drop policy if exists "content_experiment_learnings_select_own" on public.content_experiment_learnings;
create policy "content_experiment_learnings_select_own"
  on public.content_experiment_learnings for select
  using (user_id = auth.uid());

with target_user as (
  select id from auth.users order by created_at asc limit 1
)
insert into public.content_experiments (
  user_id,
  batch_id,
  title,
  topic,
  format,
  objective,
  status,
  source_ref,
  next_hypothesis,
  evidence_strength
)
select
  id,
  'TR-2026-10-26-01',
  'Training inkorten bij weinig tijd',
  'Prioriteiten behouden wanneer een training korter moet',
  'b-roll reel',
  'hook',
  'voorbereiding',
  'Elite Fit Content OS/Experimenten/Trial Reels/TR-2026-10-26-01',
  'Welke opening verlaagt het skippercentage en verhoogt de gemiddelde kijktijd?',
  'signaal'
from target_user
on conflict (user_id, batch_id) do nothing;

insert into public.content_experiment_variants (
  experiment_id,
  code,
  hook,
  change_description,
  status,
  duration_seconds,
  output_path
)
select
  experiment.id,
  variant.code,
  variant.hook,
  variant.change_description,
  'klaar',
  10.966667,
  variant.output_path
from public.content_experiments experiment
cross join (
  values
    (
      'A',
      'Dit doe ik als ik weinig tijd heb.',
      'Neutrale persoonlijke opening; bestaande montagevolgorde.',
      'Elite Fit Content OS/Experimenten/Trial Reels/TR-2026-10-26-01/variant-A/output/FINAL-trial-A-weinig-tijd.mp4'
    ),
    (
      'B',
      'Weinig tijd? Dan schrap je waarschijnlijk de verkeerde oefeningen.',
      'Verlies- en fouthook; opent met curls en wisselt daarna naar raises.',
      'Elite Fit Content OS/Experimenten/Trial Reels/TR-2026-10-26-01/variant-B/output/FINAL-trial-reel-variant-B.mp4'
    ),
    (
      'C',
      'Zo kort je een training in zonder je prioriteit weg te gooien.',
      'Oplossingsgerichte how-to-hook; opent met raises en wisselt daarna naar curls.',
      'Elite Fit Content OS/Experimenten/Trial Reels/TR-2026-10-26-01/variant-C/output/FINAL-trial-reel-variant-C.mp4'
    )
) as variant(code, hook, change_description, output_path)
where experiment.batch_id = 'TR-2026-10-26-01'
on conflict (experiment_id, code) do nothing;
