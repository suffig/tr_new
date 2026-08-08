-- ============================================================================
--  BIERBÖRSE — wer die Runde bezahlt hat
-- ============================================================================
--  NICHT-DESTRUKTIV: fuegt nur eine Spalte hinzu. Kein DROP, kein DELETE,
--  bestehende Verkostungen bleiben unveraendert (bezahlt_von wird null).
--
--  Warum eine eigene Spalte und nicht "wer mehr getrunken hat":
--  Anzahl und Rechnung sind zwei verschiedene Dinge. Wer eine Runde
--  ausgibt, hat sie bezahlt, aber nicht unbedingt getrunken — und genau
--  diese Differenz ist am Ende des Abends die interessante.
--
--    'AEK'     Alexander hat bezahlt
--    'Real'    Philip hat bezahlt
--    'geteilt' jeder seinen Teil
--    null      nicht erfasst
-- ============================================================================

alter table public.bier_verkostungen
  add column if not exists bezahlt_von text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bier_verkostungen_bezahlt_check'
  ) then
    alter table public.bier_verkostungen
      add constraint bier_verkostungen_bezahlt_check
      check (bezahlt_von is null or bezahlt_von in ('AEK', 'Real', 'geteilt'));
  end if;
end $$;

-- Kontrolle
select
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name = 'bezahlt_von') as spalte_da,
  (select count(*) from pg_constraint
   where conname = 'bier_verkostungen_bezahlt_check') as regel_da,
  (select count(*) from public.bier_verkostungen) as verkostungen;
