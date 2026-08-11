/**
 * Spielerwechsel: lesen, schreiben, auswerten.
 *
 * Spieler wechseln zwischen Alexander (AEK), Philip (Real) und "Ehemalige" —
 * auch mitten in einer Saison. Bisher stand in players.team nur EIN Wert; ein
 * Wechsel hat den alten überschrieben. Seit db/25_spieler_wechsel.sql steht
 * daneben der Verlauf, und daraus lassen sich zwei Dinge ableiten, die es
 * vorher nicht gab: wo jemand an einem bestimmten Tag war, und wie viele
 * Spiele er im Kader einer Seite verbracht hat.
 *
 * WAS HIER NICHT STEHT: Tore. Die kommen aus den Torschützenlisten der Spiele
 * (goalslista = Tore für AEK, goalslistb = für Real) und tragen ihre
 * Team-Zuordnung schon in sich — ein späterer Wechsel ändert daran nichts.
 *
 * WAS "SPIELE" HEISST: Spiele, in denen jemand zum Kader einer Seite gehörte.
 * Nicht: Spiele, in denen er auf dem Platz stand. Die App erfasst keine
 * Aufstellung, und eine Zahl, die etwas anderes behauptet als sie misst, ist
 * schlechter als keine. Jede Anzeige nennt es deshalb "im Kader".
 */

import { supabaseDb } from './supabase';
import { nameKey } from './playerIdentity';

const TABELLE = 'spieler_wechsel';

/** Die drei möglichen Seiten. "Ehemalige" ist keine Endstation. */
export const SEITEN = ['AEK', 'Real', 'Ehemalige'];

/** Heute als YYYY-MM-DD, ohne Zeitzonen-Verschiebung. */
export function heute() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* --------------------------------------------------------------------------
   Lesen
   -------------------------------------------------------------------------- */

/** Alle Wechsel, älteste zuerst. */
export async function ladeWechsel() {
  const { data, error } = await supabaseDb.select(TABELLE, '*', {
    order: { column: 'datum', ascending: true },
    skipFifaFilter: true,
  });
  if (error) return { wechsel: [], fehler: error };
  const liste = [...(data || [])].sort(
    (a, b) => String(a.datum).localeCompare(String(b.datum)) || (a.id - b.id));
  return { wechsel: liste, fehler: null };
}

/** Nur die Wechsel einer Person, älteste zuerst. */
export function wechselVon(alleWechsel, name) {
  const k = nameKey(name);
  return (alleWechsel || []).filter((w) => w.person_key === k);
}

/* --------------------------------------------------------------------------
   Ableiten
   -------------------------------------------------------------------------- */

/**
 * Bei wem war die Person an diesem Tag?
 *
 * @returns 'AEK' | 'Real' | 'Ehemalige' | null — null heisst "unbekannt",
 *          also vor der ersten erfassten Zeile. Bewusst nicht die heutige
 *          Seite: rückwirkend gibt es keine Wechseldaten, und stillschweigend
 *          die Gegenwart in die Vergangenheit zu verlängern wäre erfunden.
 */
export function seiteAmDatum(wechselDerPerson, datum) {
  if (!datum) return null;
  const tag = String(datum).slice(0, 10);
  let seite = null;
  for (const w of wechselDerPerson || []) {
    if (String(w.datum).slice(0, 10) > tag) break;
    seite = w.nach;
  }
  return seite;
}

/**
 * Die Zeitabschnitte einer Laufbahn: [{ seite, von, bis }], bis = null heisst
 * "bis heute". Das ist die Form, in der sich der Verlauf anzeigen lässt.
 */
export function abschnitte(wechselDerPerson) {
  const w = wechselDerPerson || [];
  return w.map((eintrag, i) => ({
    seite: eintrag.nach,
    von: String(eintrag.datum).slice(0, 10),
    bis: i + 1 < w.length ? String(w[i + 1].datum).slice(0, 10) : null,
    // Die erste Zeile ist der Stand bei Einführung, kein echter Wechsel.
    start: eintrag.von == null,
    grund: eintrag.notiz || null,
    id: eintrag.id,
  }));
}

/**
 * In wie vielen Spielen gehörte die Person zum Kader — je Seite.
 *
 * Ein Spiel zählt für die Seite, bei der die Person am Spieltag war. Spiele
 * vor der ersten erfassten Zeile zählen für niemanden und werden getrennt als
 * `ohneZuordnung` zurückgegeben, damit die Lücke sichtbar bleibt statt sich
 * still auf eine Seite zu schlagen.
 */
export function kaderSpiele(wechselDerPerson, matches) {
  const zaehler = { AEK: 0, Real: 0, Ehemalige: 0 };
  let ohneZuordnung = 0;
  for (const m of matches || []) {
    if (!m?.date) continue;
    const seite = seiteAmDatum(wechselDerPerson, m.date);
    if (seite && zaehler[seite] != null) zaehler[seite] += 1;
    else ohneZuordnung += 1;
  }
  return { ...zaehler, ohneZuordnung, gesamt: zaehler.AEK + zaehler.Real };
}

/**
 * Ab wann ist der Verlauf überhaupt belastbar? Vor diesem Datum wurde nichts
 * erfasst — jede Auswertung muss das sagen dürfen.
 */
export function erfasstSeit(alleWechsel) {
  const daten = (alleWechsel || []).map((w) => String(w.datum).slice(0, 10)).filter(Boolean);
  return daten.length ? daten.sort()[0] : null;
}

/* --------------------------------------------------------------------------
   Schreiben
   -------------------------------------------------------------------------- */

/**
 * Einen Wechsel festhalten.
 *
 * `von` wird aus dem Verlauf abgeleitet und nicht übergeben: die Herkunft ist
 * kein Eingabefeld, sondern eine Tatsache aus den bisherigen Zeilen. Ein
 * Wechsel auf die Seite, bei der jemand ohnehin schon ist, wird abgelehnt —
 * das wäre kein Wechsel, und die Datenbank würde ihn ebenfalls zurückweisen.
 */
export async function wechselEintragen({
  name, spielerId = null, nach, datum = heute(), fifaVersion,
  transaktionId = null, notiz = null, bisherigeWechsel = null,
}) {
  if (!name) return { fehler: new Error('Ohne Namen geht es nicht.') };
  if (!SEITEN.includes(nach)) return { fehler: new Error(`Unbekannte Seite: ${nach}`) };

  let verlauf = bisherigeWechsel;
  if (!verlauf) {
    const { wechsel, fehler } = await ladeWechsel();
    if (fehler) return { fehler };
    verlauf = wechsel;
  }
  const meine = wechselVon(verlauf, name);
  const von = seiteAmDatum(meine, datum);
  if (von === nach) {
    return { fehler: new Error(`${name} ist an diesem Tag bereits bei ${nach}.`) };
  }

  const { data, error } = await supabaseDb.insert(TABELLE, {
    person_key: nameKey(name),
    name,
    spieler_id: spielerId,
    von,
    nach,
    datum,
    fifa_version: fifaVersion,
    transaktion_id: transaktionId,
    notiz,
  });
  return { eintrag: data, fehler: error };
}

/** Einen falsch eingetragenen Wechsel wieder entfernen. */
export async function wechselLoeschen(id) {
  const { error } = await supabaseDb.delete(TABELLE, id);
  return { fehler: error };
}
