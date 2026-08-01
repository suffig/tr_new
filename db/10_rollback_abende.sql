-- ============================================================================
--  RUECKWEG fuer Migration 09 (Spieleabend)
-- ============================================================================
--  Nur ausfuehren, wenn nach 09 etwas nicht stimmt.
--
--  ACHTUNG: Loescht die beiden Tabellen samt Inhalt. Sobald die App Sterne,
--  Biere und Schnaps dorthin geschrieben hat, sind diese Daten weg — der
--  localStorage der Geraete ist dann die einzige Kopie, und auch nur auf den
--  Geraeten, die seither nicht geleert wurden.
--
--  Vorher also sichern:
--    select * from public.abende;
--    select * from public.abend_ereignisse;
--  (Ergebnis als CSV exportieren, Supabase kann das im SQL-Fenster.)
-- ============================================================================

begin;

-- Reihenfolge zaehlt: die Ereignisse haengen per Fremdschluessel am Abend.
drop table if exists public.abend_ereignisse;
drop table if exists public.abende;

commit;

-- Kontrolle: beide sollten weg sein.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('abende', 'abend_ereignisse');
