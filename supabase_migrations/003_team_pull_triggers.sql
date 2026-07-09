-- ============================================================================
-- Hält das Aggregat public.team_collection automatisch konsistent mit dem
-- Ereignis-Log public.team_pull_events. Die App schreibt nur noch Events
-- (Insert beim "bekommen", Delete beim Verringern) – der Zähler wird hier
-- serverseitig gepflegt. Ausführen NACH 001_team_collection.sql.
-- ============================================================================

create or replace function public.tc_apply_pull_insert()
returns trigger language plpgsql as $$
begin
  insert into public.team_collection
    (person, team_name, rating, is_women, is_national, count, first_obtained_at, last_obtained_at)
  values
    (new.person, new.team_name, new.rating, new.is_women, new.is_national, 1, coalesce(new.created_at, now()), coalesce(new.created_at, now()))
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

  -- Aggregatzeile entfernen, sobald keine Events mehr übrig sind.
  delete from public.team_collection
   where person = old.person and team_name = old.team_name and count <= 0;
  return old;
end $$;

drop trigger if exists trg_tc_pull_insert on public.team_pull_events;
create trigger trg_tc_pull_insert
  after insert on public.team_pull_events
  for each row execute function public.tc_apply_pull_insert();

drop trigger if exists trg_tc_pull_delete on public.team_pull_events;
create trigger trg_tc_pull_delete
  after delete on public.team_pull_events
  for each row execute function public.tc_apply_pull_delete();

-- Optional: bestehende Events einmalig ins Aggregat spiegeln (idempotent genug für Erstlauf)
-- insert into public.team_collection (person, team_name, rating, is_women, is_national, count, first_obtained_at, last_obtained_at)
-- select person, team_name, max(rating), bool_or(is_women), bool_or(is_national), count(*), min(created_at), max(created_at)
-- from public.team_pull_events group by person, team_name
-- on conflict (person, team_name) do update set count = excluded.count;
