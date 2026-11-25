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

/** @returns {Object<string, {am: string, db?: boolean, alt?: boolean}>} je Datum */
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
  return (ereignisse || []).filter((e) => !zu[e.datum] || ms(e.ts) > ms(zu[e.datum].am));
}

async function schreibeInDB(datum, am) {
  try {
    const version = getCurrentFifaVersion();
    const { data, error } = await supabase.from('abende')
      .update({ abgeschlossen_am: am })
      .eq('datum', datum).eq('fifa_version', version)
      .select('id');
    if (error) return error;
    if (data.length || am === null) return null;
    const neu = await supabase.from('abende')
      .insert({ datum, fifa_version: version, abgeschlossen_am: am });
    return neu.error || null;
  } catch (fehler) {
    return fehler;
  }
}

async function reicheEin(datum, am) {
  // Offline nicht als "in der Datenbank" vermerken — der Abgleich reicht nach.
  if (usingFallback) return { ok: true };
  const fehler = await schreibeInDB(datum, am);
  if (fehler) return { ok: true, nurLokal: true, fehler };
  const jetzt = ladeAbschluesse();
  // Nur vermerken, wenn inzwischen nicht wieder geöffnet oder neu beendet wurde.
  if (jetzt[datum]?.am === am) speichere({ ...jetzt, [datum]: { am, db: true } });
  return { ok: true };
}

/**
 * Einen Abend abschließen. Lokal sofort, die Datenbank folgt.
 * @returns {Promise<{ok: boolean, nurLokal?: boolean, fehler?: unknown}>}
 */
export async function beende(datum) {
  if (!datum) return { ok: false, fehler: new Error('Kein Datum') };
  const am = new Date().toISOString();
  speichere({ ...ladeAbschluesse(), [datum]: { am } });
  return reicheEin(datum, am);
}

/** Abschluss zurücknehmen — der ganze Abend zählt wieder mit. */
export async function wiederOeffnen(datum) {
  const rest = { ...ladeAbschluesse() };
  delete rest[datum];
  speichere(rest);
  if (usingFallback) return { ok: true };
  const fehler = await schreibeInDB(datum, null);
  return fehler ? { ok: true, nurLokal: true, fehler } : { ok: true };
}

/**
 * Abschlüsse aus der Datenbank übernehmen und fehlende nachreichen.
 * @param {Array} abende Zeilen der laufenden Saison (datum, abgeschlossen_am)
 */
export async function uebernimmAbschluesse(abende) {
  const lokal = { ...ladeAbschluesse() };
  const vorher = JSON.stringify(lokal);
  for (const z of abende) {
    const l = lokal[z.datum];
    if (z.abgeschlossen_am) {
      const neuerHier = l && !l.db && !l.alt && ms(l.am) > ms(z.abgeschlossen_am);
      if (!neuerHier) lokal[z.datum] = { am: z.abgeschlossen_am, db: true };
    } else if (l?.db) {
      delete lokal[z.datum]; // woanders wieder geöffnet
    }
  }
  if (JSON.stringify(lokal) !== vorher) speichere(lokal);

  for (const [datum, a] of Object.entries(lokal)) {
    // Alte Einträge nicht hochladen: ihr Zeitpunkt ist geraten.
    if (!a.db && !a.alt) await reicheEin(datum, a.am);
  }
}
