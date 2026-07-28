-- ============================================================================
--  MIGRATION 06 — TEAM-TRACKER an die Saisons binden
-- ============================================================================
--  VORHER: Backup anlegen (Supabase Dashboard -> Database -> Backups).
--
--  Warum:
--  Die Team-Sammlung ("wer hat welches Team bekommen") lag bisher ohne
--  Saison-Bezug in der Datenbank. Alle bestehenden Eintraege stammen aus FC26
--  und werden entsprechend nachgetragen. Ab dann zaehlt jede Saison ihre eigene
--  Sammlung — genau wie Spiele, Spieler und Finanzen.
--
--  Wichtig zum Aggregat public.team_collection: dessen Eindeutigkeit lag auf
--  (person, team_name). Ohne Anpassung wuerde der Trigger aus
--  supabase_migrations/003_team_pull_triggers.sql die Ereignisse aus
--  VERSCHIEDENEN Saisons in EINE Aggregatzeile zusammenzaehlen. Deshalb werden
--  Constraint UND Trigger hier mitgezogen.
--
--  Das Skript ist idempotent (mehrfaches Ausfuehren ist gefahrlos), legt keine
--  Tabelle an und loescht keine Zeilen.
--
--  Rueckweg: db/07_rollback_team_season.sql
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Spalte fifa_version ergaenzen und mit FC26 vorbelegen
--    (alle bisherigen Eintraege stammen aus der laufenden FC26-Saison)
-- ---------------------------------------------------------------------------
alter table public.team_pull_events add column if not exists fifa_version text;
alter table public.team_collection  add column if not exists fifa_version text;

update public.team_pull_events set fifa_version = 'FC26' where fifa_version is null;
update public.team_collection  set fifa_version = 'FC26' where fifa_version is null;

alter table public.team_pull_events alter column fifa_version set default 'FC26';
alter table public.team_collection  alter column fifa_version set default 'FC26';

alter table public.team_pull_events alter column fifa_version set not null;
alter table public.team_collection  alter column fifa_version set not null;


-- ---------------------------------------------------------------------------
-- 2) Eindeutigkeit des Aggregats um die Saison erweitern
--    Ohne diesen Schritt landen FC26- und FC27-Ziehungen in derselben Zeile.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Alte Eindeutigkeit (person, team_name) entfernen, falls vorhanden.
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.team_collection'::regclass
      and contype  = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (person, team_name)'
  ) then
    execute (
      select format('alter table public.team_collection drop constraint %I', conname)
      from pg_constraint
      where conrelid = 'public.team_collection'::regclass
        and contype  = 'u'
        and pg_get_constraintdef(oid) = 'UNIQUE (person, team_name)'
      limit 1
    );
    raise notice 'Alte Eindeutigkeit (person, team_name) entfernt.';
  end if;

  -- Neue Eindeutigkeit inkl. Saison anlegen.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.team_collection'::regclass
      and conname  = 'team_collection_person_team_version_key'
  ) then
    alter table public.team_collection
      add constraint team_collection_person_team_version_key
      unique (person, team_name, fifa_version);
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 3) Trigger-Funktionen saison-aware machen
--    (ersetzt die Fassung aus 003_team_pull_triggers.sql)
-- ---------------------------------------------------------------------------
create or replace function public.tc_apply_pull_insert()
returns trigger language plpgsql as $$
begin
  insert into public.team_collection
    (person, team_name, rating, is_women, is_national, fifa_version,
     count, first_obtained_at, last_obtained_at)
  values
    (new.person, new.team_name, new.rating, new.is_women, new.is_national,
     coalesce(new.fifa_version, 'FC26'),
     1, coalesce(new.created_at, now()), coalesce(new.created_at, now()))
  on conflict (person, team_name, fifa_version) do update
    set count            = public.team_collection.count + 1,
        last_obtained_at = greatest(public.team_collection.last_obtained_at,
                                    coalesce(new.created_at, now())),
        rating           = coalesce(new.rating, public.team_collection.rating);
  return new;
end $$;

create or replace function public.tc_apply_pull_delete()
returns trigger language plpgsql as $$
begin
  update public.team_collection
     set count = count - 1
   where person       = old.person
     and team_name    = old.team_name
     and fifa_version = coalesce(old.fifa_version, 'FC26');

  -- Aggregatzeile entfernen, sobald keine Events mehr uebrig sind.
  delete from public.team_collection
   where person       = old.person
     and team_name    = old.team_name
     and fifa_version = coalesce(old.fifa_version, 'FC26')
     and count       <= 0;
  return old;
end $$;


-- ---------------------------------------------------------------------------
-- 4) Aggregat einmalig aus dem Ereignis-Log neu aufbauen
--    Notwendig, weil die alten Aggregatzeilen saisonlos gezaehlt wurden.
--    Das Ereignis-Log bleibt dabei unangetastet — es ist die Quelle.
--
--    ABSICHERUNG: Das Aggregat wird nur dann neu gebaut, wenn das Ereignis-Log
--    mindestens so viele Ziehungen enthaelt wie das Aggregat. Waere das
--    Aggregat groesser, gaebe es dort Zaehlungen ohne zugehoerige Ereignisse —
--    ein Neuaufbau wuerde sie loeschen. In dem Fall bleibt alles unveraendert
--    und es kommt ein Hinweis; dann bitte melden, bevor es weitergeht.
-- ---------------------------------------------------------------------------
do $$
declare
  events_n bigint;
  agg_n    bigint;
begin
  select count(*)              into events_n from public.team_pull_events;
  select coalesce(sum(count),0) into agg_n    from public.team_collection;

  if agg_n > events_n then
    raise notice
      'HINWEIS: Aggregat (% Ziehungen) ist groesser als das Ereignis-Log (% Ziehungen). '
      'team_collection wurde NICHT neu gebaut, um nichts zu verlieren. '
      'Spalte, Constraint und Trigger sind aber migriert.', agg_n, events_n;
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


-- ---------------------------------------------------------------------------
-- 5) Index + Fremdschluessel auf die Saison
--    Der Fremdschluessel wird nur angelegt, wenn jede vorkommende Saison auch
--    in fifa_versions registriert ist — sonst wuerde er fehlschlagen.
-- ---------------------------------------------------------------------------
create index if not exists idx_team_pull_events_version on public.team_pull_events (fifa_version);
create index if not exists idx_team_collection_version  on public.team_collection  (fifa_version);

do $$
declare fehlend text;
begin
  select string_agg(distinct v.version, ', ') into fehlend
  from (
    select fifa_version as version from public.team_pull_events
    union select fifa_version from public.team_collection
  ) v
  left join public.fifa_versions fv on fv.id = v.version
  where fv.id is null;

  if fehlend is not null then
    raise notice
      'HINWEIS: Fremdschluessel NICHT angelegt — diese Saison(en) fehlen in '
      'fifa_versions: %. Alles andere ist migriert.', fehlend;
  else
    if not exists (
      select 1 from pg_constraint
      where conname = 'team_pull_events_fifa_version_fkey'
        and conrelid = 'public.team_pull_events'::regclass
    ) then
      alter table public.team_pull_events
        add constraint team_pull_events_fifa_version_fkey
        foreign key (fifa_version) references public.fifa_versions(id)
        on update cascade on delete restrict;
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'team_collection_fifa_version_fkey'
        and conrelid = 'public.team_collection'::regclass
    ) then
      alter table public.team_collection
        add constraint team_collection_fifa_version_fkey
        foreign key (fifa_version) references public.fifa_versions(id)
        on update cascade on delete restrict;
    end if;
  end if;
end $$;

commit;


-- ---------------------------------------------------------------------------
-- Kontrolle (reines SELECT) — sollte je Saison plausible Zahlen zeigen.
-- ---------------------------------------------------------------------------
select 'Ereignisse je Saison' as pruefung, fifa_version, person, count(*) as ziehungen
from public.team_pull_events
group by 1,2,3
order by fifa_version, person;

select 'Aggregat je Saison' as pruefung, fifa_version, person,
       count(*) as verschiedene_teams, sum(count) as ziehungen_gesamt
from public.team_collection
group by 1,2,3
order by fifa_version, person;

-- Beide "ziehungen"-Summen muessen je Saison+Person uebereinstimmen.
