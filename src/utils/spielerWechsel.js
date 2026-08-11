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
 * Ab wann ist der Verlauf überhaupt belastbar? Vor diesem Datum wurde nichts
 * erfasst — jede Auswertung muss das sagen dürfen.
 */
export function erfasstSeit(alleWechsel) {
  const daten = (alleWechsel || []).map((w) => String(w.datum).slice(0, 10)).filter(Boolean);
  return daten.length ? daten.sort()[0] : null;
}

/**
 * In wie vielen Spielen gehörte die Person zum Kader — je Seite.
 *
 * Gezählt wird ERST AB der ersten erfassten Zeile. Alles davor liegt
 * ausserhalb dessen, worüber der Verlauf etwas sagt.
 *
 * Das war zuerst anders gelöst: Spiele davor wurden als `ohneZuordnung`
 * mitgezählt und angezeigt. Mit den echten Zahlen ist das unbrauchbar — bei
 * 903 erfassten Spielen und einer Startzeile von heute stünde bei JEDEM der
 * 41 Spieler "903 Spiele liegen vor dem Beginn der Erfassung" und sonst nur
 * Nullen. Eine Karte, die bei allen dasselbe sagt, sagt nichts.
 *
 * `ab` nennt stattdessen den Stichtag, damit die Zahl einordbar bleibt.
 * `ohneZuordnung` gibt es weiterhin, greift aber nur noch bei einer echten
 * Lücke INNERHALB des erfassten Zeitraums — etwa wenn ein Wechsel
 * nachträglich vor die eigene Startzeile datiert wird.
 */
export function kaderSpiele(wechselDerPerson, matches) {
  const zaehler = { AEK: 0, Real: 0, Ehemalige: 0 };
  const ab = erfasstSeit(wechselDerPerson);
  let ohneZuordnung = 0;
  if (!ab) return { ...zaehler, ohneZuordnung: 0, gesamt: 0, ab: null };

  for (const m of matches || []) {
    if (!m?.date) continue;
    const tag = String(m.date).slice(0, 10);
    if (tag < ab) continue;                 // vor dem Stichtag: kein Thema
    const seite = seiteAmDatum(wechselDerPerson, tag);
    if (seite && zaehler[seite] != null) zaehler[seite] += 1;
    else ohneZuordnung += 1;
  }
  return { ...zaehler, ohneZuordnung, gesamt: zaehler.AEK + zaehler.Real, ab };
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

  // Vor dem eigenen Stichtag geht nichts. Dort waere `von` unbekannt, die
  // neue Zeile wuerde sich vor die Startzeile sortieren und die Laufbahn
  // haette zwei Anfaenge. Der Verlauf beginnt bewusst am Stichtag.
  const ab = erfasstSeit(meine);
  if (ab && String(datum).slice(0, 10) < ab) {
    return { fehler: new Error(
      `Vor dem ${ab.split('-').reverse().join('.')} gibt es für ${name} keinen Verlauf — ` +
      'so weit zurück lässt sich kein Wechsel eintragen.') };
  }

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
  if (error) return { fehler: error };

  // Den Kader nachziehen.
  //
  // Ohne das widersprechen sich zwei Anzeigen derselben Sache: der Verlauf
  // sagt "seit heute bei Philip", die Kaderliste zeigt ihn weiter bei
  // Alexander, weil dort players.team steht. Wer den Wechsel eintraegt, hat
  // ihn gemeint — also wird er auch vollzogen.
  //
  // Nur wenn dieser Wechsel der juengste ist: eine nachtraegliche Korrektur
  // mitten im Verlauf darf den heutigen Stand nicht umwerfen.
  const juengster = meine.length === 0
    || String(datum).slice(0, 10) >= String(meine[meine.length - 1].datum).slice(0, 10);
  if (juengster) {
    const { fehler: kaderFehler } = await kaderNachziehen(name, nach, fifaVersion);
    if (kaderFehler) return { eintrag: data, fehler: null, kaderFehler };
  }

  return { eintrag: data, fehler: null };
}

/**
 * players.team der laufenden Saison auf die neue Seite setzen.
 *
 * Ueber den Namen, nicht ueber die id: der Wechsel kann aus dem
 * Transaktions-Formular kommen, wo es keine Spielerzeile gibt, sondern nur
 * einen eingetippten Namen.
 */
async function kaderNachziehen(name, nach, fifaVersion) {
  const { data, error } = await supabaseDb.select('players', 'id,name,team,fifa_version', {
    skipFifaFilter: true,
  });
  if (error) return { fehler: error };
  const k = nameKey(name);
  const treffer = (data || []).filter(
    (p) => nameKey(p.name) === k && (p.fifa_version || 'FC25') === fifaVersion);
  if (treffer.length === 0) return { fehler: null };   // nur im Verlauf, kein Kadereintrag
  for (const p of treffer) {
    if (p.team === nach) continue;
    const { error: e } = await supabaseDb.update('players', { team: nach }, p.id);
    if (e) return { fehler: e };
  }
  return { fehler: null };
}

/** Einen falsch eingetragenen Wechsel wieder entfernen. */
export async function wechselLoeschen(id) {
  const { error } = await supabaseDb.delete(TABELLE, id);
  return { fehler: error };
}
