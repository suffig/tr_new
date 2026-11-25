import { supabase, usingFallback } from './supabase';
import { getCurrentFifaVersion } from './fifaVersionManager';

/**
 * Welche Abende sind abgeschlossen — und ab wann?
 *
 * EIN ABSCHLUSS IST EIN ZEITPUNKT, KEINE SPERRE.
 * Zuerst war er nur das Datum des Abends. Dann zählte an diesem Abend nichts
 * mehr: wer zu früh abschloss, konnte bis 6 Uhr weder Schnaps noch Sterne
 * sehen — sie wurden gespeichert, aber ausgeblendet, und das Plus war
 * gesperrt. Jetzt ist abgeschlossen, was BIS zum Abschluss eingetragen war;
 * alles danach zählt wieder von null.
 *
 * Gelöscht wird nichts. Der Abendrückblick rechnet aus dem vollen Protokoll.
 *
 * In der Datenbank steht der Zeitpunkt in abende.abgeschlossen_am (db/33). Er
 * wird beim Abgleich auch GELESEN (uebernimmAbschluesse) — vorher wurde er nur
 * geschrieben, das andere Gerät hat nie davon erfahren.
 */

const SPEICHER = 'fusta_abende_abgeschlossen_v1';

/** Ohne bekannten Zeitpunkt (alte Einträge): das Ende dieses Abends, 6 Uhr. */
function endeDesAbends(datum) {
  const d = new Date(`${datum}T06:00:00`);
  d.setDate(d.getDate() + 1);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/**
 * Je Datum entweder `am` (abgeschlossen) oder `offen` (von Hand wieder
 * geöffnet — zählt als Eingabe, sonst wäre er nach 24 Stunden sofort wieder zu).
 * @returns {Object<string, {am?: string, offen?: string, db?: boolean, alt?: boolean}>}
 */
export function ladeAbschluesse() {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
    // Bis zum 25.11.2026 stand hier eine Liste von Daten.
    if (Array.isArray(roh)) {
      // Ab jetzt zaehlt es wieder, auch wenn der Abend noch bis 6 Uhr liefe.
      const jetzt = new Date().toISOString();
      const neu = Object.fromEntries(roh
        .filter((d) => typeof d === 'string')
        .map((d) => [d, { am: [endeDesAbends(d), jetzt].sort()[0], alt: true }]));
      localStorage.setItem(SPEICHER, JSON.stringify(neu));
      return neu;
    }
    return roh && typeof roh === 'object' ? roh : {};
  } catch {
    return {};
  }
}

function speichere(abschluesse) {
  try { localStorage.setItem(SPEICHER, JSON.stringify(abschluesse)); } catch { /* Quota */ }
  // Der Abschluss kommt aus der Schnellerfassung, die Zähler liegen darunter —
  // ohne Meldung stehen sie bis zum Neuladen auf dem alten Stand.
  try { window.dispatchEvent(new CustomEvent('abend-abschluss-geaendert')); } catch { /* kein DOM */ }
}

const ms = (ts) => new Date(ts).getTime() || 0;

/** Ereignisse, die noch zählen: ohne Abschluss oder nach ihm eingetragen. */
export function nurOffene(ereignisse) {
  const zu = ladeAbschluesse();
  return (ereignisse || []).filter((e) => !zu[e.datum]?.am || ms(e.ts) > ms(zu[e.datum].am));
}

// Ein Wiederöffnen steht als Notiz am Abend, damit auch das andere Gerät die
// 24 Stunden neu zählt.
const NOTIZ = 'Wieder geöffnet ';
const ausNotiz = (notiz) => (notiz?.startsWith(NOTIZ) ? notiz.slice(NOTIZ.length) : null);

async function schreibeInDB(datum, { am, offen }) {
  try {
    const version = getCurrentFifaVersion();
    const werte = { abgeschlossen_am: am || null, notiz: offen ? NOTIZ + offen : null };
    const { data, error } = await supabase.from('abende')
      .update(werte)
      .eq('datum', datum).eq('fifa_version', version)
      .select('id');
    if (error) return error;
    if (data.length || !am) return null;
    const neu = await supabase.from('abende').insert({ datum, fifa_version: version, ...werte });
    return neu.error || null;
  } catch (fehler) {
    return fehler;
  }
}

const stempel = (a) => ms(a?.am || a?.offen);

async function reicheEin(datum, eintrag) {
  // Offline nicht als "in der Datenbank" vermerken — der Abgleich reicht nach.
  if (usingFallback) return { ok: true };
  const fehler = await schreibeInDB(datum, eintrag);
  if (fehler) return { ok: true, nurLokal: true, fehler };
  const jetzt = ladeAbschluesse();
  // Nur vermerken, wenn inzwischen nichts Neues entschieden wurde.
  if (stempel(jetzt[datum]) === stempel(eintrag)) {
    speichere({ ...jetzt, [datum]: { am: eintrag.am, offen: eintrag.offen, db: true } });
  }
  return { ok: true };
}

function setze(datum, eintrag) {
  speichere({ ...ladeAbschluesse(), [datum]: eintrag });
  return reicheEin(datum, eintrag);
}

/**
 * Einen Abend abschließen. Lokal sofort, die Datenbank folgt.
 * @param {string} datum
 * @param {string} [am] bis wann — Standard jetzt
 * @returns {Promise<{ok: boolean, nurLokal?: boolean, fehler?: unknown}>}
 */
export async function beende(datum, am = new Date().toISOString()) {
  if (!datum) return { ok: false, fehler: new Error('Kein Datum') };
  return setze(datum, { am });
}

/** Abschluss zurücknehmen — der ganze Abend zählt wieder mit. */
export async function wiederOeffnen(datum) {
  return setze(datum, { offen: new Date().toISOString() });
}

/**
 * Abschlüsse aus der Datenbank übernehmen und fehlende nachreichen.
 * @param {Array} abende Zeilen der laufenden Saison (datum, abgeschlossen_am, notiz)
 */
export async function uebernimmAbschluesse(abende) {
  const lokal = { ...ladeAbschluesse() };
  const vorher = JSON.stringify(lokal);
  for (const z of abende) {
    const l = lokal[z.datum];
    const offen = ausNotiz(z.notiz);
    const oben = z.abgeschlossen_am ? { am: z.abgeschlossen_am } : offen ? { offen } : null;
    const neuerHier = l && !l.db && !l.alt && stempel(l) > stempel(oben);
    if (neuerHier) continue;
    if (oben) lokal[z.datum] = { ...oben, db: true };
    else if (l?.db) delete lokal[z.datum]; // woanders wieder geöffnet
  }
  if (JSON.stringify(lokal) !== vorher) speichere(lokal);

  for (const [datum, a] of Object.entries(lokal)) {
    // Alte Einträge nicht hochladen: ihr Zeitpunkt ist geraten.
    if (!a.db && !a.alt) await reicheEin(datum, a);
  }
}

/* --------------------------------------------------------------------------
   Von selbst beenden
   -------------------------------------------------------------------------- */

export const RUHE_MS = 24 * 3600 * 1000;

/**
 * Abende beenden, an denen seit 24 Stunden nichts mehr eingetragen wurde.
 *
 * Der Abschluss liegt genau 24 Stunden nach der letzten Eingabe und nicht auf
 * „jetzt": so kommen beide Geräte auf denselben Zeitpunkt, egal wann sie das
 * nächste Mal geöffnet werden, und ein später Nachtrag zählt wieder.
 *
 * @param {Map<string, number>} letzteEingabe je offenem Abend, in ms
 * @returns {Promise<string[]>} die beendeten Abende
 */
export async function beendeRuhende(letzteEingabe, jetzt = Date.now()) {
  const zu = ladeAbschluesse();
  const beendet = [];
  for (const [datum, ts] of letzteEingabe) {
    const bis = Math.max(ts, ms(zu[datum]?.offen)) + RUHE_MS;
    if (bis > jetzt) continue;
    beendet.push(datum);
    await beende(datum, new Date(bis).toISOString());
  }
  return beendet;
}
