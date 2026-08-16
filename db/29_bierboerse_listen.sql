-- ============================================================================
--  BIERBÖRSE — eigene Listeneinträge auf Vorrat
-- ============================================================================
--  NICHT-DESTRUKTIV: fügt eine Spalte zur vorhandenen Einstellungszeile hinzu.
--  Kein DROP, kein DELETE, bestehende Einstellungen bleiben unverändert.
--
--  DAS PROBLEM
--  Brauereien, Sorten und Länder sind keine eigenen Dinge — sie stehen als
--  Text in jeder Bierzeile. Ein Wert existiert also nur, solange ein Bier ihn
--  trägt. Wer in der Verwaltung „Weihenstephan" anlegen will, bevor er ein
--  Bier davon eingetragen hat, hat nichts, woran der Name hängen könnte: beim
--  nächsten Laden wäre er wieder weg.
--
--  DIE LÖSUNG OHNE DREI NEUE TABELLEN
--  Eine jsonb-Spalte auf der Einstellungszeile (id = 1), die je Feld eine
--  Liste zusätzlicher Werte hält:
--
--    { "brauerei": ["Weihenstephan"], "art": ["Gose"], "land": ["Belgien"] }
--
--  Die App legt diese Liste über die Werte, die ohnehin aus dem Katalog
--  kommen. Ein Wert, der später an einem Bier hängt, steht dann doppelt in
--  der Quelle, aber nur einmal in der Auswahl — das Zusammenführen passiert
--  beim Anzeigen.
--
--  WARUM NICHT DREI TABELLEN
--  Es sind Namenslisten ohne eigene Eigenschaften, ohne Beziehungen und mit
--  einer Handvoll Einträgen. Drei Tabellen samt Zugriffsregeln zu pflegen,
--  um Zeichenketten zu speichern, wäre mehr Apparat als Nutzen — und die
--  Werte in den Bierzeilen müssten zusätzlich synchron gehalten werden.
-- ============================================================================

alter table public.bierboerse_einstellungen
  add column if not exists eigene_listen jsonb not null default '{}'::jsonb;

-- Kontrolle
select
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'bierboerse_einstellungen'
     and column_name = 'eigene_listen')            as spalte_da,
  (select eigene_listen from public.bierboerse_einstellungen where id = 1) as inhalt;
