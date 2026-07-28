-- ============================================================================
--  RUECKWEG fuer Migration 06 (Team-Tracker / Saison-Bezug)
-- ============================================================================
--  Nur ausfuehren, wenn nach Migration 06 etwas nicht stimmt.
--
--  Nimmt Fremdschluessel, Indizes, Constraint und die Spalte fifa_version
--  zurueck und stellt die alten, saisonlosen Trigger aus
--  supabase_migrations/003_team_pull_triggers.sql wieder her.
--
--  ACHTUNG: Mit dem Entfernen der Spalte geht die Saison-Zuordnung verloren.
--  Das Ereignis-Log selbst (welche Ziehung wann) bleibt vollstaendig erhalten,
--  das Aggregat wird saisonlos neu aufgebaut. Supabase markiert dieses Skript
--  als "destruktiv" — das ist korrekt: es entfernt eine Spalte.
-- ============================================================================

begin;

-- --- Fremdschluessel + Indizes zurueck --------------------------------------
alter table public.team_pull_events drop constraint if exists team_pull_events_fifa_version_fkey;
alter table public.team_collection  drop constraint if exists team_collection_fifa_version_fkey;
drop index if exists public.idx_team_pull_events_version;
drop index if exists public.idx_team_collection_version;

-- --- Trigger wieder saisonlos (Stand 003) -----------------------------------
create or replace function public.tc_apply_pull_insert()
returns trigger language plpgsql as $$
begin
  insert into public.team_collection
    (person, team_name, rating, is_women, is_national, count, first_obtained_at, last_obtained_at)
  values
    (new.person, new.team_name, new.rating, new.is_women, new.is_national, 1,
     coalesce(new.created_at, now()), coalesce(new.created_at, now()))
  on conflict (person, team_name) do update
    set count            = public.team_collection.count + 1,
        last_obtained_at = greatest(public.team_collection.last_obtained_at, coalesce(new.created_at, now())),
        rating           = coalesce(new.rating, public.team_collection.rating);
  return new;
end $$;

create or replace function public.tc_apply_pull_delete()
returns trigger language plpgsql as $$
begin
  update public.team_collection
     set count = count - 1
   where person = old.person and team_name = old.team_name;

  delete from public.team_collection
   where person = old.person and team_name = old.team_name and count <= 0;
  return old;
end $$;

-- --- Eindeutigkeit zurueck auf (person, team_name) --------------------------
-- Zuerst das Aggregat saisonlos neu aufbauen, sonst kollidieren Zeilen, die
-- sich bisher nur durch die Saison unterschieden haben.
delete from public.team_collection;

alter table public.team_collection
  drop constraint if exists team_collection_person_team_version_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.team_collection'::regclass
      and contype  = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (person, team_name)'
  ) then
    alter table public.team_collection
      add constraint team_collection_person_team_key unique (person, team_name);
  end if;
end $$;

insert into public.team_collection
  (person, team_name, rating, is_women, is_national, count, first_obtained_at, last_obtained_at)
select person, team_name,
       max(rating), bool_or(is_women), bool_or(is_national),
       count(*), min(created_at), max(created_at)
from public.team_pull_events
group by person, team_name;

-- --- Spalte entfernen -------------------------------------------------------
alter table public.team_pull_events drop column if exists fifa_version;
alter table public.team_collection  drop column if exists fifa_version;

commit;
