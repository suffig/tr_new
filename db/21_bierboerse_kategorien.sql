-- ============================================================================
--  BIERBÖRSE — Bewertung in Kategorien
-- ============================================================================
--  NICHT-DESTRUKTIV: fuegt sechs Spalten hinzu und verbreitert zwei. Kein
--  DROP, kein DELETE. Bestehende Verkostungen behalten ihre Gesamtnote.
--
--  Bisher gab es je Person eine Note von 0 bis 10. Jetzt drei:
--
--    geschmack_*   wie es schmeckt
--    aussehen_*    Farbe, Schaum, Glas
--    pl_*          Preis-Leistung
--
--  Die Gesamtnote note_aek / note_real BLEIBT und ist weiterhin die Zahl, mit
--  der alle Auswertungen rechnen (Bestenliste, Sortenschnitt, Fundstuecke,
--  Bier-Verlauf). Sie wird beim Speichern aus den ausgefuellten Kategorien
--  gemittelt. Damit gilt:
--
--    * alte Eintraege mit nur einer Gesamtnote bleiben gueltig und vergleichbar
--    * neue Eintraege sind zusaetzlich aufgeschluesselt
--    * keine einzige bestehende Auswertung muss angefasst werden
--
--  Deshalb wird note_* von int auf numeric(3,1) verbreitert: der Mittelwert
--  aus 8, 7 und 6 ist 7,0 — aber aus 8, 8 und 7 eben 7,7. Als int waere das
--  auf 8 gerundet, und drei Biere mit 7,3 / 7,7 / 8,0 stuenden alle gleichauf
--  in der Bestenliste. int -> numeric ist eine erweiternde Umwandlung, die
--  vorhandenen Werte bleiben unveraendert (7 wird zu 7.0).
-- ============================================================================

-- 1. Gesamtnoten verbreitern -------------------------------------------------
--    Die vorhandenen Pruefregeln (0..10) gelten unveraendert weiter.
alter table public.bier_verkostungen
  alter column note_aek  type numeric(3,1),
  alter column note_real type numeric(3,1);

-- 2. Kategorien --------------------------------------------------------------
--    Bewusst int: hier wird direkt getippt, halbe Punkte braucht niemand.
--    Nullable, weil man auch nur eine Kategorie vergeben darf.
alter table public.bier_verkostungen
  add column if not exists geschmack_aek  int,
  add column if not exists geschmack_real int,
  add column if not exists aussehen_aek   int,
  add column if not exists aussehen_real  int,
  add column if not exists pl_aek         int,
  add column if not exists pl_real        int;

do $$
declare
  spalte text;
begin
  foreach spalte in array array[
    'geschmack_aek', 'geschmack_real', 'aussehen_aek', 'aussehen_real', 'pl_aek', 'pl_real'
  ] loop
    if not exists (
      select 1 from pg_constraint
      where conname = 'bier_verkostungen_' || spalte || '_check'
    ) then
      execute format(
        'alter table public.bier_verkostungen add constraint %I check (%I is null or (%I >= 0 and %I <= 10))',
        'bier_verkostungen_' || spalte || '_check', spalte, spalte, spalte
      );
    end if;
  end loop;
end $$;

-- Kontrolle
select
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name in ('geschmack_aek','geschmack_real','aussehen_aek','aussehen_real','pl_aek','pl_real')) as neue_spalten,
  (select count(*) from pg_constraint
   where conrelid = 'public.bier_verkostungen'::regclass and conname like '%_check') as pruefregeln,
  (select data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name = 'note_aek') as note_typ,
  (select count(*) from public.bier_verkostungen) as verkostungen;
