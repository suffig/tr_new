-- FUSTA · Feature #2 "Saisons" — in Supabase (SQL-Editor) ausführen.
-- Nicht-destruktiv: fügt eine Tabelle + eine nullable Spalte hinzu und ordnet
-- bestehende Matches einer ersten Saison zu. Bestehende Match-Daten bleiben.

-- 1) Saisons-Tabelle
create table if not exists public.seasons (
  id         bigint generated always as identity primary key,
  name       text not null,
  start_date date,
  end_date   date,                      -- NULL = laufende Saison
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.seasons enable row level security;

-- Policy analog zu euren bestehenden Tabellen (matches/players). Falls ihr dort
-- restriktivere Policies nutzt, hier bitte entsprechend anpassen.
drop policy if exists "seasons full access" on public.seasons;
create policy "seasons full access" on public.seasons for all using (true) with check (true);

-- 2) season_id an matches (nullable Fremdschlüssel)
alter table public.matches
  add column if not exists season_id bigint references public.seasons(id);

-- 3) Erste Saison anlegen + bestehende Matches zuordnen (in einem Rutsch)
with s as (
  insert into public.seasons (name, start_date, is_active)
  values ('Saison 1', (select min(date) from public.matches), true)
  returning id
)
update public.matches
   set season_id = (select id from s)
 where season_id is null;
