-- ============================================================================
--  STATUS-PRUEFUNG zu db/06_team_tracker_season.sql
-- ============================================================================
--  Rein lesend — aendert nichts, legt nichts an, loescht nichts.
--
--  BEWUSST EINE EINZIGE ABFRAGE: das SQL-Fenster von Supabase zeigt bei
--  mehreren Anweisungen nur das Ergebnis der LETZTEN an. Eine fruehere Fassung
--  hatte zwei Abfragen — die Statusliste war dadurch unsichtbar.
--
--  Erwartung: in jeder Status-Zeile steht "ja". Steht irgendwo "FEHLT", sagt
--  die Zeile, welches Skript fehlt.
-- ============================================================================

with status as (
  select 1 as sortierung, '1a) Spalte team_pull_events.fifa_version' as pruefung,
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'team_pull_events'
        and column_name = 'fifa_version'
    ) then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end as ergebnis

  union all select 2, '1b) Spalte team_collection.fifa_version',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'team_collection'
        and column_name = 'fifa_version'
    ) then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  union all select 3, '1c) fifa_version ist NOT NULL (beide Tabellen)',
    case when (
      select count(*) from information_schema.columns
      where table_schema = 'public'
        and table_name in ('team_pull_events', 'team_collection')
        and column_name = 'fifa_version' and is_nullable = 'NO'
    ) = 2 then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  union all select 4, '1d) Vorbelegung DEFAULT FC26 (beide Tabellen)',
    case when (
      select count(*) from information_schema.columns
      where table_schema = 'public'
        and table_name in ('team_pull_events', 'team_collection')
        and column_name = 'fifa_version' and column_default like '%FC26%'
    ) = 2 then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  union all select 5, '2a) alte Eindeutigkeit (person, team_name) entfernt',
    case when not exists (
      select 1 from pg_constraint
      where conrelid = 'public.team_collection'::regclass and contype = 'u'
        and pg_get_constraintdef(oid) = 'UNIQUE (person, team_name)'
    ) then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  union all select 6, '2b) neue Eindeutigkeit inkl. Saison',
    case when exists (
      select 1 from pg_constraint
      where conrelid = 'public.team_collection'::regclass
        and conname = 'team_collection_person_team_version_key'
    ) then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  union all select 7, '3a) Trigger-Funktion kennt die Saison',
    case when exists (
      select 1 from pg_proc
      where proname = 'tc_apply_pull_insert' and prosrc like '%fifa_version%'
    ) then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  -- Der haeufigste blinde Fleck: Migration 06 ersetzt nur die FUNKTIONEN
  -- (create or replace function) und setzt voraus, dass die Trigger schon an
  -- der Tabelle haengen. Die Bindungen selbst stehen ausschliesslich in
  -- supabase_migrations/003_team_pull_triggers.sql. Fehlen sie, laeuft alles
  -- fehlerfrei — nur das Aggregat wird nie fortgeschrieben.
  union all select 8, '3b) Trigger haengen an team_pull_events',
    case when (
      select count(*) from pg_trigger
      where tgrelid = 'public.team_pull_events'::regclass
        and tgname in ('trg_tc_pull_insert', 'trg_tc_pull_delete')
        and not tgisinternal
    ) = 2 then 'ja' else 'FEHLT -> db/08_team_aggregat_reparieren.sql' end

  union all select 9, '5a) Indizes auf fifa_version',
    case when (
      select count(*) from pg_indexes
      where schemaname = 'public'
        and indexname in ('idx_team_pull_events_version', 'idx_team_collection_version')
    ) = 2 then 'ja' else 'FEHLT -> db/06_team_tracker_season.sql' end

  union all select 10, '5b) Fremdschluessel auf fifa_versions',
    case when (
      select count(*) from pg_constraint
      where conname in ('team_pull_events_fifa_version_fkey',
                        'team_collection_fifa_version_fkey')
    ) = 2 then 'ja'
    else 'FEHLT (nur moeglich, wenn jede benutzte Saison in fifa_versions steht)' end
),

-- Ereignis-Log und Aggregat muessen je Saison und Person dieselbe Zahl zeigen.
-- Das Ereignis-Log ist die Quelle — die App liest ausschliesslich daraus.
abgleich as (
  select
    coalesce(e.fifa_version, a.fifa_version) as saison,
    coalesce(e.person, a.person)             as person,
    coalesce(e.n, 0)                         as ereignisse,
    coalesce(a.n, 0)                         as aggregat
  from (
    select fifa_version, person, count(*) as n
    from public.team_pull_events group by 1, 2
  ) e
  full outer join (
    select fifa_version, person, sum(count) as n
    from public.team_collection group by 1, 2
  ) a on a.fifa_version = e.fifa_version and a.person = e.person
)

-- Eigene Sortierspalte, damit die Datenzeilen unter den Statuszeilen bleiben.
-- Ein ORDER BY auf den Text wuerde "10)" vor "1a)" einsortieren und den
-- Abgleich zwischen die Pruefpunkte mischen.
select nr, pruefung, ergebnis from (
  select sortierung as nr, pruefung, ergebnis from status
  union all
  select 20, '— Datenabgleich (Log ist die Quelle) —', ''
  union all
  select 21,
    format('%s / %s', saison, person),
    case when ereignisse = aggregat
      then format('ja (%s Ziehungen)', ereignisse)
      else format('WEICHT AB: Log %s, Aggregat %s -> db/08_team_aggregat_reparieren.sql',
                  ereignisse, aggregat)
    end
  from abgleich
) alles
order by nr, pruefung;
