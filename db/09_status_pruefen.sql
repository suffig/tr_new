-- ============================================================================
--  STATUS-PRUEFUNG zu db/09_abende.sql
-- ============================================================================
--  Rein lesend. EINE Abfrage — das SQL-Fenster von Supabase zeigt bei mehreren
--  Anweisungen nur das Ergebnis der letzten.
--
--  Erwartung: in jeder Zeile steht "ja".
-- ============================================================================

with status as (
  select 1 as nr, 'Tabelle abende' as pruefung,
    case when to_regclass('public.abende') is not null then 'ja' else 'FEHLT' end as ergebnis
  union all select 2, 'Tabelle abend_ereignisse',
    case when to_regclass('public.abend_ereignisse') is not null then 'ja' else 'FEHLT' end
  union all select 3, 'Ein Abend je Saison und Datum',
    case when exists (select 1 from pg_constraint where conname = 'abende_version_datum_key')
      then 'ja' else 'FEHLT' end
  union all select 4, 'Erlaubte Arten eingeschraenkt',
    case when exists (select 1 from pg_constraint where conname = 'abend_ereignisse_art_check')
      then 'ja' else 'FEHLT' end
  union all select 5, 'Nur Alexander und Philip',
    case when exists (select 1 from pg_constraint where conname = 'abend_ereignisse_person_check')
      then 'ja' else 'FEHLT' end
  union all select 6, 'Indizes',
    case when (select count(*) from pg_indexes where schemaname = 'public'
               and indexname in ('idx_abend_ereignisse_abend',
                                 'idx_abend_ereignisse_version',
                                 'idx_abende_version_datum')) = 3
      then 'ja' else 'FEHLT' end
  union all select 7, 'Fremdschluessel auf fifa_versions',
    case when (select count(*) from pg_constraint
               where conname in ('abende_fifa_version_fkey',
                                 'abend_ereignisse_fifa_version_fkey')) = 2
      then 'ja' else 'FEHLT (nur moeglich, wenn jede Saison in fifa_versions steht)' end
  union all select 8, 'Zugriffsschutz aktiv',
    case when (select count(*) from pg_policies
               where tablename in ('abende', 'abend_ereignisse')) >= 2
      then 'ja' else 'FEHLT' end
),

-- Ereignisse je Abend und Art — sagt, ob die App wirklich schreibt.
inhalt as (
  select a.datum, e.art, count(*) as anzahl
  from public.abende a
  join public.abend_ereignisse e on e.abend_id = a.id
  group by a.datum, e.art
)

select nr, pruefung, ergebnis from (
  select nr, pruefung, ergebnis from status
  union all
  select 20, '— Inhalt —', ''
  union all
  select 21, format('%s · %s', datum, art), format('%s Ereignisse', anzahl) from inhalt
) alles
order by nr, pruefung;
