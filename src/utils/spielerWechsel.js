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

/**
 * Den Wechsel als Geld buchen: der Aufnehmende zahlt, der Abgebende bekommt.
 *
 * Vorgeschlagen wird der gespeicherte Marktwert. ACHTUNG BEI DER EINHEIT:
 * players.value steht in Mio € (12.0 = zwölf Millionen), finances.balance und
 * transactions.amount in ganzen Euro. Der Aufrufer übergibt deshalb bereits
 * EURO — die Umrechnung passiert dort, wo der Vorschlag entsteht und sichtbar
 * ist, nicht versteckt hier drin.
 *
 * "Ehemalige" ist kein Konto: geht jemand dorthin, bekommt nur die abgebende
 * Seite Geld; kommt jemand von dort, zahlt nur die aufnehmende.
 *
 * Der Kontostand kann in dieser App nicht unter null fallen (dieselbe Regel
 * wie im Transaktions-Formular). Wird deshalb weniger abgezogen als gebucht,
 * steht das im Ergebnis als `gekappt` — sonst zeigte die Transaktion einen
 * Betrag, den das Konto nie gesehen hat, und niemand erführe davon.
 */
export async function wechselBuchen({ name, von, nach, betragEuro, datum, fifaVersion }) {
  const zeilen = buchungenFuer({ name, von, nach, betragEuro, datum, fifaVersion });
  const buchungen = [];
  const gekappt = [];
  for (const zeile of zeilen) {
    const { data, error } = await supabaseDb.insert('transactions', zeile);
    if (error) return { buchungen, gekappt, fehler: error };
    buchungen.push(data);

    const { gekappt: k, fehler } = await kontoAendern(zeile.team, zeile.amount);
    if (fehler) return { buchungen, gekappt, fehler };
    if (k > 0) gekappt.push({ team: zeile.team, betrag: k });
  }
  return { buchungen, gekappt, fehler: null };
}

/**
 * Welche Buchungen ein Wechsel ausloest — als reine Funktion.
 *
 * Bewusst getrennt vom Schreiben: die Entscheidung "wer zahlt, wer bekommt,
 * mit welchem Vorzeichen" ist der Teil, der falsch sein kann, und nur so
 * laesst er sich pruefen, ohne eine Datenbank zu brauchen. (Der Demo-Speicher
 * taugt dafuer nicht: er liefert bei select konstante Daten, waehrend update
 * nur simuliert wird — Schreiben und Lesen laufen dort auseinander.)
 *
 * `amount` ist vorzeichenbehaftet und wird auf den Kontostand ADDIERT, so wie
 * ueberall sonst in dieser App: Kauf negativ, Verkauf positiv.
 */
export function buchungenFuer({ name, von, nach, betragEuro, datum, fifaVersion }) {
  const betrag = Math.round(Number(betragEuro) || 0);
  if (!betrag) return [];
  const info = `${name} · ${von || 'Zugang'} → ${nach}`;
  const zeile = (team, type, amount) => ({
    date: datum, type, team, amount, info, match_id: null,
    ...(fifaVersion ? { fifa_version: fifaVersion } : {}),
  });
  const zeilen = [];
  // "Ehemalige" ist kein Konto — dorthin und von dort zahlt nur die Seite,
  // die es wirklich gibt.
  if (nach === 'AEK' || nach === 'Real') zeilen.push(zeile(nach, 'Spielerkauf', -betrag));
  if (von === 'AEK' || von === 'Real')  zeilen.push(zeile(von, 'Spielerverkauf', betrag));
  return zeilen;
}

/**
 * Kontostand um `delta` verschieben. Gibt zurück, wie viel davon an der
 * Nulllinie verloren ging.
 */
async function kontoAendern(team, delta) {
  const { data, error } = await supabaseDb.select('finances', '*', { eq: { team } });
  if (error) return { gekappt: 0, fehler: error };
  const konto = (data && data[0]) || null;
  const alt = Number(konto?.balance) || 0;
  const roh = alt + delta;
  const neu = Math.max(0, roh);
  const gekappt = neu - roh;          // > 0 heisst: es wurde abgefangen

  if (konto?.id != null) {
    const { error: e } = await supabaseDb.update('finances', { balance: neu }, konto.id);
    if (e) return { gekappt, fehler: e };
  } else {
    const { error: e } = await supabaseDb.insert('finances', { team, balance: neu, debt: 0 });
    if (e) return { gekappt, fehler: e };
  }
  return { gekappt, fehler: null };
}

/**
 * Die Zuordnungen eines abgeschlossenen Drafts als Wechsel mitschreiben.
 *
 * Ohne das reisst der Verlauf an jeder Saisongrenze ab: der Draft legt je
 * Saison NEUE Spielerzeilen an, und wer dabei die Seite wechselt, taucht in
 * spieler_wechsel nirgends auf. Die Laufbahn saehe dann so aus, als waere
 * niemand je gewechselt.
 *
 * Wer bleibt, wo er war, bekommt KEINE Zeile — das waere kein Wechsel. Wer
 * neu dazukommt und noch gar keinen Verlauf hat, bekommt eine Startzeile
 * (`von` bleibt null).
 *
 * KEIN GELD: der Draft verrechnet die Budgets bereits selbst (restBudget).
 * Hier noch einmal zu buchen hiesse, denselben Betrag zweimal zu bewegen.
 *
 * @returns {{ neu: number, uebersprungen: number, fehler: Error|null }}
 */
export async function wechselAusDraft({ zuordnungen, fifaVersion, datum = heute() }) {
  const { wechsel, fehler } = await ladeWechsel();
  if (fehler) return { neu: 0, uebersprungen: 0, fehler };

  let neu = 0, uebersprungen = 0;
  for (const z of zuordnungen || []) {
    if (!z?.name || !SEITEN.includes(z.team)) { uebersprungen += 1; continue; }
    const meine = wechselVon(wechsel, z.name);
    // Wer schon dort ist, wechselt nicht.
    if (seiteAmDatum(meine, datum) === z.team) { uebersprungen += 1; continue; }

    const { fehler: e } = await wechselEintragen({
      name: z.name,
      spielerId: z.spielerId ?? null,
      nach: z.team,
      datum,
      fifaVersion,
      notiz: `Draft ${fifaVersion}`,
      bisherigeWechsel: wechsel,
    });
    if (e) { uebersprungen += 1; continue; }   // z. B. Rueckdatierung
    // Den frisch geschriebenen Eintrag mitfuehren, damit der naechste Spieler
    // denselben Stand sieht — sonst wuerde ein Mensch, der zweimal in der
    // Liste steht, zweimal eingetragen.
    wechsel.push({ person_key: nameKey(z.name), datum, von: null, nach: z.team });
    wechsel.sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
    neu += 1;
  }
  return { neu, uebersprungen, fehler: null };
}

/** Einen falsch eingetragenen Wechsel wieder entfernen. */
export async function wechselLoeschen(id) {
  const { error } = await supabaseDb.delete(TABELLE, id);
  return { fehler: error };
}
