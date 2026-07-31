-- ============================================================================
--  STATUS-PRUEFUNG zu db/06_team_tracker_season.sql
-- ============================================================================
--  Rein lesend — aendert nichts, legt nichts an, loescht nichts.
--  Beantwortet die Frage "ist Migration 06 schon gelaufen?" Punkt fuer Punkt.
--
--  Erwartung, wenn alles durchgelaufen ist: in jeder Zeile steht "ja".
--  Steht irgendwo "FEHLT", einfach db/06_team_tracker_season.sql (nochmal)
--  ausfuehren — das Skript ist idempotent.
-- ============================================================================

select
  '1a) Spalte team_pull_events.fifa_version' as pruefung,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_pull_events'
      and column_name = 'fifa_version'
  ) then 'ja' else 'FEHLT' end as status

union all select
  '1b) Spalte team_collection.fifa_version',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_collection'
      and column_name = 'fifa_version'
  ) then 'ja' else 'FEHLT' end

union all select
  '1c) fifa_version ist NOT NULL (beide Tabellen)',
  case when (
    select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name in ('team_pull_events', 'team_collection')
      and column_name = 'fifa_version'
      and is_nullable = 'NO'
  ) = 2 then 'ja' else 'FEHLT' end

union all select
  '1d) Vorbelegung DEFAULT FC26 (beide Tabellen)',
  case when (
    select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name in ('team_pull_events', 'team_collection')
      and column_name = 'fifa_version'
      and column_default like '%FC26%'
  ) = 2 then 'ja' else 'FEHLT' end

union all select
  '2a) alte Eindeutigkeit (person, team_name) entfernt',
  case when not exists (
    select 1 from pg_constraint
    where conrelid = 'public.team_collection'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (person, team_name)'
  ) then 'ja' else 'FEHLT' end

union all select
  '2b) neue Eindeutigkeit inkl. Saison',
  case when exists (
    select 1 from pg_constraint
    where conrelid = 'public.team_collection'::regclass
      and conname = 'team_collection_person_team_version_key'
  ) then 'ja' else 'FEHLT' end

union all select
  '3) Trigger-Funktion kennt die Saison',
  case when exists (
    select 1 from pg_proc
    where proname = 'tc_apply_pull_insert'
      and prosrc like '%fifa_version%'
  ) then 'ja' else 'FEHLT' end

union all select
  '5a) Indizes auf fifa_version',
  case when (
    select count(*) from pg_indexes
    where schemaname = 'public'
      and indexname in ('idx_team_pull_events_version', 'idx_team_collection_version')
  ) = 2 then 'ja' else 'FEHLT' end

union all select
  '5b) Fremdschluessel auf fifa_versions',
  case when (
    select count(*) from pg_constraint
    where conname in ('team_pull_events_fifa_version_fkey',
                      'team_collection_fifa_version_fkey')
  ) = 2 then 'ja'
  else 'FEHLT (nur relevant, wenn jede benutzte Saison in fifa_versions steht)' end

order by 1;


-- ---------------------------------------------------------------------------
-- Datenstand: muessen je Saison + Person uebereinstimmen.
-- Leere Ausgabe heisst schlicht: es sind noch keine Ziehungen erfasst.
-- ---------------------------------------------------------------------------
select 'Ereignisse' as quelle, fifa_version, person, count(*) as ziehungen
from public.team_pull_events
group by 1, 2, 3
union all
select 'Aggregat', fifa_version, person, sum(count)
from public.team_collection
group by 1, 2, 3
order by fifa_version, person, quelle;
