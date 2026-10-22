import { supabaseDb } from './supabase';
import { getCurrentFifaVersion } from './fifaVersionManager';

/**
 * Welche Abende sind abgeschlossen?
 *
 * WOZU
 * Die Zähler im Alkohol-Bereich lasen das Ereignisprotokoll OHNE Datumsfilter
 * und wuchsen damit über alle Abende hinweg endlos. Ein Abend endet aber
 * irgendwann, und danach soll bei Null angefangen werden.
 *
 * WARUM NICHTS GELÖSCHT WIRD
 * Ein Abschluss ist eine Markierung, kein Löschen. Die Ereignisse bleiben
 * vollständig stehen — der Abendrückblick rechnet seine Zahlen daraus, je
 * Datum. „Zurücksetzen" heißt deshalb: die Zähler lassen abgeschlossene
 * Abende weg. Es kann nichts verloren gehen, auch nicht durch einen
 * Fehlgriff: ein Abschluss ist umkehrbar (`wiederOeffnen`).
 *
 * WARUM EINE MENGE VON DATEN UND KEIN EINZELNER ZEITPUNKT
 * Erst stand hier die Idee „abgeschlossen bis <Datum>". Das geht schief, wenn
 * man einen Abend vergisst: schließt man heute ab, wäre der vergessene von
 * vorgestern mit abgeschlossen, ohne dass ihn jemand angesehen hat. Mit einer
 * Menge bleibt jeder Abend einzeln zu beantworten — und das Nachtragen Tage
 * später bleibt möglich.
 *
 * WARUM localStorage UND DATENBANK
 * Die Zähler arbeiten ohnehin auf dem lokalen Protokoll, der Abschluss wirkt
 * also sofort. In der Datenbank steht er zusätzlich, damit das andere Gerät
 * denselben Abend als beendet sieht. Das braucht die Spalte
 * `abende.abgeschlossen_am` aus db/33_abend_abschluss.sql — fehlt sie, sagt
 * `beende()` es über `nurLokal`, statt stillschweigend nur lokal zu wirken.
 */

const SPEICHER = 'fusta_abende_abgeschlossen_v1';

/** @returns {string[]} Abende als 'YYYY-MM-DD', ohne Reihenfolge-Garantie. */
export function ladeAbgeschlossene() {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
    return Array.isArray(roh) ? roh.filter((d) => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

function speichere(liste) {
  try { localStorage.setItem(SPEICHER, JSON.stringify([...new Set(liste)])); } catch { /* Quota */ }

  // ANDEREN BESCHEID SAGEN.
  // Ohne das hier wirkte der Abschluss erst nach einem Neuladen: gemessen
  // stand der Alkohol-Bereich nach „Abend beenden" weiter auf 3/18 und
  // Sterne 2, nach dem Neuladen dann auf 0/18. Der Abschluss kommt aus der
  // Schnellerfassung, also aus einer Ebene DARÜBER — die Zähler darunter
  // erfahren von sich aus nichts davon.
  //
  // Ein Fensterereignis und kein gemeinsamer Zustand: dasselbe Muster, mit
  // dem App.jsx schon die Saison-Hydrierung und die globale Suche meldet
  // ('fifaVersionsHydrated', 'global-search-toggle'). Wer zuhört, rechnet
  // neu; wer nicht, merkt nichts.
  try {
    window.dispatchEvent(new CustomEvent('abend-abschluss-geaendert'));
  } catch { /* kein window — etwa in einem Test ohne DOM */ }
}

export function istAbgeschlossen(datum) {
  return ladeAbgeschlossene().includes(datum);
}

/**
 * Ereignisse ohne die abgeschlossenen Abende — das ist die „Zurücksetzung".
 *
 * Als Funktion hier und nicht als Filter an der Aufrufstelle: sonst steht die
 * Regel, was ein Zähler zeigt, an jeder Stelle einzeln und läuft auseinander.
 */
export function nurOffene(ereignisse) {
  const zu = new Set(ladeAbgeschlossene());
  return (ereignisse || []).filter((e) => !zu.has(e.datum));
}

/**
 * Einen Abend abschließen.
 *
 * Lokal sofort, in der Datenbank danach. Das Ergebnis sagt, ob beides
 * geklappt hat — „abgeschlossen" zu melden, während nur der localStorage
 * beschrieben wurde, fällt erst auf dem anderen Gerät auf.
 *
 * @returns {Promise<{ok: boolean, nurLokal?: boolean, fehler?: unknown}>}
 */
export async function beende(datum) {
  if (!datum) return { ok: false, fehler: new Error('Kein Datum') };
  speichere([...ladeAbgeschlossene(), datum]);

  try {
    const version = getCurrentFifaVersion();
    const vorhanden = await supabaseDb.select('abende', '*', {
      eq: { datum, fifa_version: version }, limit: 1,
    });
    const zeile = (vorhanden?.data || [])[0];
    const jetzt = new Date().toISOString();

    const erg = zeile
      ? await supabaseDb.update('abende', { abgeschlossen_am: jetzt }, zeile.id)
      : await supabaseDb.insert('abende', { datum, abgeschlossen_am: jetzt });

    if (erg?.error) return { ok: true, nurLokal: true, fehler: erg.error };
    return { ok: true };
  } catch (fehler) {
    return { ok: true, nurLokal: true, fehler };
  }
}

/** Abschluss zurücknehmen — der Abend zählt wieder mit. */
export async function wiederOeffnen(datum) {
  speichere(ladeAbgeschlossene().filter((d) => d !== datum));
  try {
    const version = getCurrentFifaVersion();
    const vorhanden = await supabaseDb.select('abende', '*', {
      eq: { datum, fifa_version: version }, limit: 1,
    });
    const zeile = (vorhanden?.data || [])[0];
    if (zeile) {
      const erg = await supabaseDb.update('abende', { abgeschlossen_am: null }, zeile.id);
      if (erg?.error) return { ok: true, nurLokal: true, fehler: erg.error };
    }
    return { ok: true };
  } catch (fehler) {
    return { ok: true, nurLokal: true, fehler };
  }
}
