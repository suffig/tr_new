-- ============================================================================
--  STATUS-PRUEFUNG zu db/04_spieler_identitaet.sql
-- ============================================================================
--  Rein lesend. EINE Abfrage — das SQL-Fenster von Supabase zeigt bei mehreren
--  Anweisungen nur das Ergebnis der letzten.
--
--  Beantwortet ZWEI Fragen:
--    A) Ist die Migration gelaufen?
--    B) Wird sie ueberhaupt gebraucht?
--
--  Zu B: Die App fasst Spieler schon heute ueber einen normalisierten Namen
--  zusammen (src/utils/playerIdentity.js) — ohne diese Migration. Sie lohnt
--  sich nur, wenn der Name als Schluessel NICHT reicht, also wenn zwei
--  verschiedene Menschen gleich heissen. Genau das prueft der zweite Teil.
--  Kommt dort nichts zurueck, ist die Migration reine Vorsorge und kann
--  liegenbleiben.
-- ============================================================================

with status as (
  select 1 as nr, 'Funktion fusta_name_key' as pruefung,
    case when exists (select 1 from pg_proc where proname = 'fusta_name_key')
      then 'ja' else 'FEHLT' end as ergebnis
  union all select 2, 'Tabelle people',
    case when to_regclass('public.people') is not null then 'ja' else 'FEHLT' end
  union all select 3, 'Spalte players.person_id',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'players' and column_name = 'person_id'
    ) then 'ja' else 'FEHLT' end
  union all select 4, 'Fremdschluessel players -> people',
    case when exists (select 1 from pg_constraint where conname = 'players_person_id_fkey')
      then 'ja' else 'FEHLT' end
  union all select 5, 'Index auf person_id',
    case when exists (select 1 from pg_indexes
                      where schemaname = 'public' and indexname = 'idx_players_person')
      then 'ja' else 'FEHLT' end
),

-- Wie viele Spielerzeilen sind schon einer Person zugeordnet?
zuordnung as (
  select
    case when to_regclass('public.people') is null then 'Migration nicht gelaufen'
    else (
      select format('%s von %s Zeilen zugeordnet',
        count(*) filter (where person_id is not null), count(*))
      from public.players
    ) end as text
),

-- Der eigentliche Bedarfstest: gleicher normalisierter Name, aber Zeilen, die
-- sich NICHT nur durch die Saison unterscheiden — also ein Verdacht auf zwei
-- verschiedene Menschen mit demselben Namen. Ohne die Funktion aus 04 wird
-- hier ein einfacher Vergleich benutzt, damit die Abfrage immer laeuft.
namenskonflikte as (
  select lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) as schluessel,
         count(distinct fifa_version) as saisons,
         count(*) as zeilen,
         string_agg(distinct name, ' / ') as schreibweisen,
         string_agg(distinct team, ' / ') as teams
  from public.players
  group by 1
  having count(*) > count(distinct fifa_version)   -- mehr Zeilen als Saisons
)

select nr, pruefung, ergebnis from (
  select nr, pruefung, ergebnis from status
  union all
  select 10, '— Zuordnung —', (select text from zuordnung)
  union all
  select 20, '— Brauchen wir 04? —',
    case when exists (select 1 from namenskonflikte)
      then 'MOEGLICHER BEDARF — siehe Zeilen unten'
      else 'nein: jeder Name kommt je Saison hoechstens einmal vor' end
  union all
  select 21, format('%s (%s)', schreibweisen, teams),
         format('%s Zeilen in %s Saisons', zeilen, saisons)
  from namenskonflikte
) alles
order by nr, pruefung;
