alter table public.tasks
  add column if not exists area text not null default 'centraal';

alter table public.tasks
  drop constraint if exists tasks_area_check;

alter table public.tasks
  add constraint tasks_area_check
  check (area in ('centraal', 'content', 'sales', 'coaching', 'operations', 'administratie'));

-- Bestaande taken krijgen één duidelijke afdeling. Eerst de expliciete
-- titel/bron, daarna het gekoppelde project. Onbekend blijft centraal.
update public.tasks
set area = case
  when (
    lower(title) ~ '^\[(marketing|content|community|stories|content ritual)'
    or source_ref like 'content-ritual:%'
    or source_ref like 'communitybericht:%'
    or source_ref like 'story-ideeen:%'
    or source_ref like 'dagritueel:%'
  ) then 'content'
  when lower(title) ~ '^\[sales' or source_ref like 'sales:%' then 'sales'
  when lower(title) ~ '^\[coaching' then 'coaching'
  when lower(title) ~ '^\[(operations|marketing/operations)' then 'operations'
  when lower(title) ~ '^\[(administratie|financien|financiën)' then 'administratie'
  else area
end;

update public.tasks t
set area = case
  when lower(p.name) = 'content' then 'content'
  when lower(p.name) like '%lead%' or lower(p.name) like '%groeisprint%' then
    case
      when t.area <> 'centraal' then t.area
      else 'sales'
    end
  when lower(p.name) like '%ai graphics%' then 'operations'
  else t.area
end
from public.projects p
where p.id = t.project_id;

-- Oude dagelijks gegenereerde contentrituelen horen niet als achterstallige
-- bedrijfsschuld te blijven staan. De actuele dag blijft open; historie wordt
-- bewaard als archief en niet verwijderd.
update public.tasks
set status = 'gearchiveerd'
where status = 'open'
  and due_date < current_date
  and (
    source_ref like 'content-ritual:%'
    or source_ref like 'communitybericht:%'
    or source_ref like 'story-ideeen:%'
    or source_ref like 'dagritueel:%'
  );

create index if not exists tasks_open_area_due_date_idx
  on public.tasks (user_id, area, due_date, priority)
  where status = 'open';
