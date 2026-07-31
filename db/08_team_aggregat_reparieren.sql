-- ============================================================================
--  MIGRATION 08 — Team-Aggregat wieder an das Ereignis-Log angleichen
-- ============================================================================
--  VORHER: Backup anlegen (Supabase Dashboard -> Database -> Backups).
--
--  Befund, der dazu gefuehrt hat:
--    Ereignisse FC26 / Alexander : 18      Aggregat FC26 / Alexander : 12
--    Ereignisse FC26 / Philip    : 18      Aggregat FC26 / Philip    : 12
--
--  Warum das passieren konnte:
--  db/06_team_tracker_season.sql ersetzt die Trigger-FUNKTIONEN
--  (create or replace function), setzt aber voraus, dass die Trigger bereits
--  an public.team_pull_events haengen. Die Bindungen selbst stehen
--  ausschliesslich in supabase_migrations/003_team_pull_triggers.sql. Wurde
--  003 nie ausgefuehrt (oder der Trigger spaeter entfernt), laeuft alles
--  fehlerfrei weiter — nur wird das Aggregat nie fortgeschrieben. Es steht dann
--  auf dem Stand, den Schritt 4 von 06 einmalig gebaut hat, waehrend das
--  Ereignis-Log weitergelaufen ist.
--
--  Wie kritisch: nicht dringend. Die App liest die Sammlung ausschliesslich aus
--  public.team_pull_events (siehe fetchPullsFromDB in src/utils/teamCollection.js);
--  public.team_collection wird von ihr weder gelesen noch geschrieben. In der
--  App standen die Zahlen also immer richtig. Falsch war nur die Nebenkopie in
--  der Datenbank — ein Stolperstein fuer jede spaetere Auswertung darauf.
--
--  Was dieses Skript tut:
--    1) Die Trigger sicher (neu) an die Tabelle binden — idempotent.
--    2) Das Aggregat einmalig aus dem Ereignis-Log neu aufbauen.
--  Das Ereignis-Log wird NICHT angefasst. Es ist die Quelle.
--
--  Voraussetzung: db/06_team_tracker_season.sql ist gelaufen (Spalte
--  fifa_version + Eindeutigkeit inkl. Saison). Pruefen mit
--  db/06_status_pruefen.sql.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Voraussetzungen pruefen — lieber sauber abbrechen als halb reparieren.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_pull_events'
      and column_name = 'fifa_version'
  ) then
    raise exception
      'Abbruch: Spalte fifa_version fehlt. Bitte zuerst db/06_team_tracker_season.sql ausfuehren.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.team_collection'::regclass
      and conname = 'team_collection_person_team_version_key'
  ) then
    raise exception
      'Abbruch: Eindeutigkeit (person, team_name, fifa_version) fehlt. '
      'Bitte zuerst db/06_team_tracker_season.sql ausfuehren — sonst schlaegt '
      'das ON CONFLICT im Insert-Trigger fehl und JEDE neue Ziehung wuerde abbrechen.';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 1) Trigger an die Tabelle binden.
--    Die Funktionen kommen aus 06 (saison-aware) und bleiben unveraendert;
--    hier geht es nur um die Bindung. drop + create ist idempotent.
-- ---------------------------------------------------------------------------
drop trigger if exists trg_tc_pull_insert on public.team_pull_events;
create trigger trg_tc_pull_insert
  after insert on public.team_pull_events
  for each row execute function public.tc_apply_pull_insert();

drop trigger if exists trg_tc_pull_delete on public.team_pull_events;
create trigger trg_tc_pull_delete
  after delete on public.team_pull_events
  for each row execute function public.tc_apply_pull_delete();


-- ---------------------------------------------------------------------------
-- 2) Aggregat aus dem Ereignis-Log neu aufbauen.
--
--    ABSICHERUNG wie in 06: nur neu bauen, wenn das Log mindestens so viele
--    Ziehungen enthaelt wie das Aggregat. Waere das Aggregat groesser, gaebe es
--    dort Zaehlungen ohne zugehoerige Ereignisse — ein Neuaufbau wuerde sie
--    loeschen. Dann passiert nichts und es kommt ein Hinweis.
-- ---------------------------------------------------------------------------
do $$
declare
  events_n bigint;
  agg_n    bigint;
begin
  select count(*)               into events_n from public.team_pull_events;
  select coalesce(sum(count), 0) into agg_n    from public.team_collection;

  if agg_n > events_n then
    raise notice
      'HINWEIS: Aggregat (% Ziehungen) ist groesser als das Ereignis-Log (% Ziehungen). '
      'team_collection wurde NICHT neu gebaut, um nichts zu verlieren. '
      'Die Trigger haengen jetzt aber — bitte melden, bevor es weitergeht.', agg_n, events_n;
  else
    delete from public.team_collection;

    insert into public.team_collection
      (person, team_name, rating, is_women, is_national, fifa_version,
       count, first_obtained_at, last_obtained_at)
    select
      person, team_name,
      max(rating), bool_or(is_women), bool_or(is_national), fifa_version,
      count(*), min(created_at), max(created_at)
    from public.team_pull_events
    group by person, team_name, fifa_version;

    raise notice 'Aggregat aus % Ereignissen neu aufgebaut.', events_n;
  end if;
end $$;

commit;


-- ---------------------------------------------------------------------------
-- Kontrolle: beide Spalten muessen je Saison und Person uebereinstimmen.
-- ---------------------------------------------------------------------------
select
  coalesce(e.fifa_version, a.fifa_version) as saison,
  coalesce(e.person, a.person)             as person,
  coalesce(e.n, 0)                         as ereignisse,
  coalesce(a.n, 0)                         as aggregat,
  case when coalesce(e.n, 0) = coalesce(a.n, 0) then 'ja' else 'WEICHT AB' end as stimmt
from (
  select fifa_version, person, count(*) as n
  from public.team_pull_events group by 1, 2
) e
full outer join (
  select fifa_version, person, sum(count) as n
  from public.team_collection group by 1, 2
) a on a.fifa_version = e.fifa_version and a.person = e.person
order by 1, 2;
