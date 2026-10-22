-- ============================================================================
--  ABEND ABSCHLIESSEN — eine Spalte, kein Löschen
-- ============================================================================
--  NICHT-DESTRUKTIV: fügt eine Spalte hinzu. Kein DROP, kein DELETE, keine
--  bestehende Zeile wird verändert.
--
--  WOZU
--  Die Zähler im Alkohol-Bereich lasen das Ereignisprotokoll ohne
--  Datumsfilter und wuchsen damit über alle Abende hinweg endlos. Mit dem
--  Knopf „Abend beenden" wird ein Abend als abgeschlossen markiert, und die
--  Zähler lassen ihn dann weg.
--
--  WARUM EINE MARKIERUNG UND KEIN LÖSCHEN
--  Die Ereignisse bleiben vollständig stehen. Der Abendrückblick rechnet
--  seine Zahlen daraus, je Datum — er wäre sonst leer. „Zurücksetzen" heißt
--  hier ausschließlich: der Zähler zeigt diesen Abend nicht mehr an. Ein
--  Abschluss ist deshalb auch umkehrbar (`abgeschlossen_am = null`).
--
--  WOZU DIE SPALTE, WENN ES AUCH LOKAL GEHT
--  Der Abschluss steht zusätzlich im localStorage und wirkt dadurch sofort.
--  Allein lokal wüsste aber nur EIN Gerät davon: Philip beendet den Abend,
--  und auf Alexanders Telefon zählt er weiter. Solange diese Migration nicht
--  gelaufen ist, meldet die App genau das („nur auf diesem Gerät").
--
--  WARUM timestamptz UND NICHT boolean
--  „Wann" ist mehr als „ob", kostet nichts und beantwortet später die Frage,
--  ob jemand den Abend noch in derselben Nacht abgeschlossen hat oder erst
--  Tage danach. `null` heißt: läuft noch.
-- ============================================================================

alter table public.abende
  add column if not exists abgeschlossen_am timestamptz;

comment on column public.abende.abgeschlossen_am is
  'Wann der Abend abgeschlossen wurde. null = laeuft noch. Markierung, kein '
  'Loeschen: die Ereignisse in abend_ereignisse bleiben vollstaendig stehen, '
  'nur die laufenden Zaehler lassen abgeschlossene Abende weg.';

-- Index: gefragt wird „welche Abende sind noch offen?". Teilindex, weil nur
-- die offenen gesucht werden und die abgeschlossenen mit der Zeit die
-- Mehrheit sind.
create index if not exists abende_offen_idx
  on public.abende (fifa_version, datum)
  where abgeschlossen_am is null;

-- ============================================================================
--  PRÜFUNG — nach dem Ausführen laufen lassen
-- ============================================================================
--  select column_name, data_type, is_nullable
--    from information_schema.columns
--   where table_schema = 'public' and table_name = 'abende'
--     and column_name = 'abgeschlossen_am';
--
--  Erwartet: eine Zeile, abgeschlossen_am | timestamp with time zone | YES
--
--  Danach in der App: Schnellerfassung öffnen, „Abend beenden" tippen. Die
--  Meldung muss „Abend abgeschlossen" lauten. Steht dort „nur auf diesem
--  Gerät", ist die Spalte nicht angekommen — oder RLS lässt das Schreiben auf
--  `abende` nicht zu (siehe db/31, db/32).
-- ============================================================================
