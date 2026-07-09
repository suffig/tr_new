-- ============================================================================
-- FUSTA – Mannschafts-Sammlung ("welche Teams hat wer bekommen")
-- Ausführen im Supabase SQL-Editor. Danach 002_seed_fc26_team_catalog.sql laufen lassen.
-- ============================================================================

-- 1) Katalog aller FC26-Teams inkl. Star-Rating (halbe Sterne 0.5–5.0).
--    Nationalmannschaften: rating = NULL (kein offizielles Rating verfügbar).
create table if not exists public.fc26_team_catalog (
  id          bigint generated always as identity primary key,
  name        text        not null unique,
  rating      numeric(2,1),                       -- 0.5 .. 5.0 (halbe Schritte) oder NULL
  is_women    boolean     not null default false, -- Frauenteam (…(W) / …(Frauen))
  is_national boolean     not null default false, -- Nationalmannschaft
  sort_order  integer     not null default 0,     -- Reihenfolge wie in der offiziellen Liste
  created_at  timestamptz not null default now(),
  constraint fc26_rating_half_step check (
    rating is null or (rating >= 0.5 and rating <= 5.0 and (rating * 2) = floor(rating * 2))
  )
);

create index if not exists fc26_team_catalog_rating_idx on public.fc26_team_catalog (rating);

-- 2) Sammlung: pro Person + Team wie oft bekommen (Aggregat) + nützliche Statistik-Felder.
create table if not exists public.team_collection (
  id                bigint generated always as identity primary key,
  person            text        not null,          -- z. B. 'Alexander' | 'Philip'
  team_name         text        not null,          -- referenziert fc26_team_catalog.name (lose)
  rating            numeric(2,1),                   -- Snapshot des Ratings zum Zeitpunkt (für Stats)
  is_women          boolean     not null default false,
  is_national       boolean     not null default false,
  count             integer     not null default 1 check (count >= 0),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at  timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (person, team_name)
);

create index if not exists team_collection_person_idx on public.team_collection (person);
create index if not exists team_collection_team_idx   on public.team_collection (team_name);

-- 3) Optionales Ereignis-Log für spätere Zeitreihen-Statistiken (jede Ziehung = 1 Zeile).
--    Die App schreibt hier zusätzlich hinein; für die reine Zähl-Ansicht reicht team_collection.
create table if not exists public.team_pull_events (
  id          bigint generated always as identity primary key,
  person      text        not null,
  team_name   text        not null,
  rating      numeric(2,1),
  is_women    boolean     not null default false,
  is_national boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists team_pull_events_person_idx  on public.team_pull_events (person);
create index if not exists team_pull_events_created_idx  on public.team_pull_events (created_at);

-- ----------------------------------------------------------------------------
-- Row Level Security – wie bei den übrigen Tabellen: eingeloggte Nutzer dürfen alles.
-- (Bei Bedarf strenger fassen.)
-- ----------------------------------------------------------------------------
alter table public.fc26_team_catalog enable row level security;
alter table public.team_collection   enable row level security;
alter table public.team_pull_events  enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'fc26_team_catalog' and policyname = 'fc26_catalog_all') then
    create policy fc26_catalog_all on public.fc26_team_catalog for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'team_collection' and policyname = 'team_collection_all') then
    create policy team_collection_all on public.team_collection for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'team_pull_events' and policyname = 'team_pull_events_all') then
    create policy team_pull_events_all on public.team_pull_events for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Lesen des Katalogs auch für anon erlauben (reine Stammdaten):
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'fc26_team_catalog' and policyname = 'fc26_catalog_read_anon') then
    create policy fc26_catalog_read_anon on public.fc26_team_catalog for select to anon using (true);
  end if;
end $$;
