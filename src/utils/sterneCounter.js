// Sterne-Zaehler (Handicap-Wertung).
//
// Regel: wer mit einem SCHWAECHEREN Team antritt, bekommt mehr gutgeschrieben —
// Gutschrift = 6 − Sterne des Teams. Ein 5-Sterne-Team bringt also 1,0, ein
// 0,5-Sterne-Team 5,5.
//
// Diese Datei ist die einzige Quelle fuer die Formel. Vorher lag sie nur im
// Alkohol-Tab; mit dem Spielduell im Teams-Tab braeuchte es sie an zwei Stellen
// — und zwei Kopien derselben Regel laufen frueher oder spaeter auseinander.
//
// SPEICHER (seit db/09): der Stand wird aus dem Ereignis-Log in abende.js
// ABGELEITET, nicht daneben gefuehrt. Frueher lag er als eigenes Objekt im
// localStorage ('sterneData'); das war eine zweite Wahrheit, existierte nur auf
// dem jeweiligen Geraet und war nach einem geleerten Browser weg. Die nach
// aussen sichtbare Form ({ philip, alex, history }) bleibt gleich, damit die
// Oberflaechen unveraendert weiterlaufen.

import { ladeLokal, erfasse, entferne } from './abende';
import { nurOffene } from './abendAbschluss';

const ALT_KEY = 'sterneData'; // nur noch fuer die einmalige Uebernahme

export const STERNE_BASIS = 6;

/** Teams-Tab nutzt 'alexander', der Zaehler zeigt unter 'alex'. */
export const STERNE_PERSON_KEY = { alexander: 'alex', alex: 'alex', philip: 'philip' };

/** Ereignis-Person ('alexander') -> Anzeige-Schluessel ('alex'). */
const ZU_ANZEIGE = { alexander: 'alex', philip: 'philip' };

/** Gutschrift fuer eine Team-Staerke. */
export function gutschriftFuer(stars) {
  const s = Number(stars);
  if (!Number.isFinite(s)) return 0;
  return Math.max(0, STERNE_BASIS - s);
}

/** Text, den ein Spielduell in `info` hinterlaesst. */
export const DUELL_INFO_PREFIX = 'Spielduell: ';

/* --------------------------------------------------------------------------
   Lesen — alles abgeleitet
   -------------------------------------------------------------------------- */

/** Ein Sterne-Ereignis in die Form bringen, die die Oberflaechen erwarten. */
function zuVerlaufseintrag(e) {
  const i = e.info || {};
  return {
    person: ZU_ANZEIGE[e.person] || e.person,
    stars: i.stars ?? null,
    gained: Number(e.menge) || 0,
    timestamp: e.ts,
    ...(i.text ? { info: i.text } : {}),
    ...(i.duell ? { duell: i.duell } : {}),
    // Fuer removeSterneEintrag: welches Ereignis dahintersteckt.
    _ereignis: e,
  };
}

/**
 * Sterne laden.
 *
 * @param {object} [opt]
 * @param {boolean} [opt.ohneAbgeschlossene] Abende, die über „Abend beenden"
 *   abgeschlossen wurden, weglassen. Das ist die Form, die ein ZÄHLER
 *   braucht: er soll nach dem Abschluss bei Null anfangen.
 *
 * STANDARD IST DER VOLLE VERLAUF, UND ZWAR ABSICHTLICH.
 * Erst wollte ich hier einfach `nurOffene(...)` einsetzen. Das hätte die
 * Duell-Statistik zerstört: ZiehungsAuswertung baut ihre Auswertung über ALLE
 * Zeiten aus `loadSterne().history`, und die hätte dann jeden abgeschlossenen
 * Abend verloren. Deshalb ein Schalter statt einer stillen Änderung — wer den
 * Verlauf will, bekommt ihn weiterhin ganz.
 */
export function loadSterne({ ohneAbgeschlossene = false } = {}) {
  const quelle = ohneAbgeschlossene ? nurOffene(ladeLokal()) : ladeLokal();
  const verlauf = quelle
    .filter((e) => e.art === 'stern')
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .map(zuVerlaufseintrag);

  const summe = (p) => verlauf
    .filter((v) => v.person === p)
    .reduce((s, v) => s + v.gained, 0);

  return {
    philip: Math.round(summe('philip') * 10) / 10,
    alex: Math.round(summe('alex') * 10) / 10,
    history: verlauf,
  };
}

/* --------------------------------------------------------------------------
   Schreiben
   -------------------------------------------------------------------------- */

/**
 * Eine Gutschrift eintragen.
 *
 * `duell` haelt das Ergebnis eines Spielduells fest:
 *   { sieger, verlierer, teams: { alex: {name, rating}, philip: {…} } }
 * Aus `stars` allein liesse sich nur die Staerke des Siegerteams ablesen — fuer
 * die Underdog-Quote braucht es beide Seiten.
 *
 * Gibt synchron zurueck: erfasse() schreibt den lokalen Zwischenspeicher noch
 * VOR dem ersten await, der Stand stimmt also sofort. Die Datenbank folgt.
 */
export function addSterneEintrag({ person, stars, info = null, duell = null }) {
  const gained = gutschriftFuer(stars);
  const app = person === 'alex' ? 'alexander' : (person === 'alexander' ? 'alexander' : 'philip');

  erfasse({
    person: app,
    art: 'stern',
    menge: gained,
    info: { stars, ...(info ? { text: info } : {}), ...(duell ? { duell } : {}) },
  });

  return { gained };
}

/**
 * Einen einzelnen Verlaufseintrag entfernen.
 *
 * Der Eintrag selbst und nicht seine Position: die Anzeige laesst
 * abgeschlossene Abende weg, der volle Verlauf nicht — mit einem Index wurde
 * dadurch ein fremder, alter Eintrag geloescht.
 */
export function removeSterneEintrag(eintrag) {
  if (eintrag?._ereignis) entferne(eintrag._ereignis);
}

/** Alle Sterne zuruecknehmen, die der Zaehler zeigt — Abgeschlossenes bleibt. */
export function alleSterneLoeschen() {
  for (const v of loadSterne({ ohneAbgeschlossene: true }).history) removeSterneEintrag(v);
}

/**
 * Einmalige Uebernahme des alten 'sterneData' aus dem localStorage.
 * Laeuft nur, solange der alte Schluessel existiert, und raeumt ihn danach weg.
 */
export function altenSterneStandUebernehmen() {
  let alt;
  try { alt = JSON.parse(localStorage.getItem(ALT_KEY) || 'null'); } catch { return 0; }
  if (!alt || !Array.isArray(alt.history) || alt.history.length === 0) {
    try { localStorage.removeItem(ALT_KEY); } catch { /* ignore */ }
    return 0;
  }
  for (const h of alt.history) {
    erfasse({
      person: h.person === 'alex' ? 'alexander' : 'philip',
      art: 'stern',
      menge: Number(h.gained) || 0,
      info: { stars: h.stars ?? null, ...(h.info ? { text: h.info } : {}), ...(h.duell ? { duell: h.duell } : {}) },
      datum: (h.timestamp || '').slice(0, 10) || undefined,
    });
  }
  try { localStorage.removeItem(ALT_KEY); } catch { /* ignore */ }
  return alt.history.length;
}

/* --------------------------------------------------------------------------
   Duelle aus dem Verlauf
   -------------------------------------------------------------------------- */

/**
 * Das Duell hinter einem Verlaufseintrag — oder null.
 *
 * Neue Eintraege bringen `duell` mit. Aeltere haben nur den Text
 * "Spielduell: <Team Alexander> vs. <Team Philip>"; daraus stehen beide
 * Teamnamen und ueber `person`/`stars` der Sieger samt Teamstaerke fest. Was
 * fehlt, ist das Rating des Verlierers — das holt `ratingFuerTeam` aus dem
 * Katalog. Findet es nichts, bleibt das Duell gueltig, nur ohne Vergleich.
 */
export function duellAusEintrag(eintrag, ratingFuerTeam) {
  if (!eintrag) return null;
  if (eintrag.duell?.teams) return eintrag.duell;

  const info = typeof eintrag.info === 'string' ? eintrag.info : '';
  if (!info.startsWith(DUELL_INFO_PREFIX)) return null;
  const teile = info.slice(DUELL_INFO_PREFIX.length).split(' vs. ');
  if (teile.length !== 2) return null;

  const sieger = STERNE_PERSON_KEY[eintrag.person] || eintrag.person;
  const verlierer = sieger === 'alex' ? 'philip' : 'alex';
  const namen = { alex: teile[0].trim(), philip: teile[1].trim() };
  const lookup = typeof ratingFuerTeam === 'function' ? ratingFuerTeam : () => null;
  const rating = (p) => {
    if (p === sieger) return Number(eintrag.stars);
    const r = lookup(namen[p]);
    return Number.isFinite(Number(r)) ? Number(r) : null;
  };

  return {
    sieger,
    verlierer,
    teams: {
      alex: { name: namen.alex, rating: rating('alex') },
      philip: { name: namen.philip, rating: rating('philip') },
    },
  };
}

/** Alle Duelle aus dem Verlauf, aelteste zuerst. */
export function duelleAusHistorie(history, ratingFuerTeam) {
  return (history || [])
    .map((e) => {
      const d = duellAusEintrag(e, ratingFuerTeam);
      return d ? { ...d, timestamp: e.timestamp, gained: e.gained } : null;
    })
    .filter(Boolean);
}
