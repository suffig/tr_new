-- ============================================================================
--  BIERBÖRSE — Strichcode am Bier merken
-- ============================================================================
--  NICHT-DESTRUKTIV: fügt eine Spalte hinzu. Kein DROP, kein DELETE.
--
--  WOZU
--  Der erste Scan einer Flasche fragt Open Food Facts. Deren Angaben sind
--  brauchbar, aber nicht eure: die Sorte fehlt dort, und der Produktname ist
--  oft länger als der, unter dem ihr das Bier führt.
--
--  Mit dieser Spalte landet der zweite Scan derselben Flasche im EIGENEN
--  Katalog — mit euren Angaben, ohne Netz und ohne fremde Datenbank.
--
--  WARUM KEINE EINDEUTIGKEIT ERZWUNGEN WIRD
--  Ein eindeutiger Index wäre naheliegend, brächte aber ein Problem: eine
--  Brauerei kann denselben Code über Jahre für eine geänderte Rezeptur
--  weiterverwenden, und ihr könntet dasselbe Bier bewusst zweimal führen
--  (etwa Fass und Flasche). Ein Index würde das Eintragen dann mit einem
--  Datenbankfehler abbrechen, dessen Ursache man dem Text nicht ansieht.
--  Die Suche nimmt ohnehin den ersten Treffer.
-- ============================================================================

alter table public.bier_katalog
  add column if not exists ean text;

-- Nur zum schnellen Nachschlagen, nicht als Eindeutigkeitsregel.
create index if not exists bier_katalog_ean_idx
  on public.bier_katalog (ean)
  where ean is not null;

-- Kontrolle
select
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_katalog'
     and column_name = 'ean')                                as spalte_da,
  (select count(*) from public.bier_katalog where ean is not null) as mit_code;
