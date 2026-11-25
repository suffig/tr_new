// Der Spieleabend: Sterne, Biere, Shots, Schnaps und BJ-Buchungen.
//
// Bisher lag das alles im localStorage des jeweiligen Geraets — Alexander und
// Philip sahen dadurch verschiedene Zahlen, und ein geleerter Browser loeschte
// alles. Hier laeuft es ueber die Datenbank (db/09_abende.sql).
//
// Aufbau bewusst wie bei teamCollection.js, das sich bewaehrt hat:
//   * EIN Ereignis-Log, alle Zahlen werden daraus summiert. Kein Aggregat,
//     das auseinanderlaufen kann (siehe db/08 — genau das ist passiert).
//   * localStorage bleibt als Zwischenspeicher fuer den Offline-Fall.
//   * Schreibfehler werden gemeldet, nicht geschluckt.

import { supabase, usingFallback } from './supabase';
import { markSelfInsert } from './selfActivity';
import { getCurrentFifaVersion } from './fifaVersionManager';
import { fuehreZusammen } from './abendAbgleich';
import { beendeRuhende, nurOffene, uebernimmAbschluesse } from './abendAbschluss';
import { loadPulls } from './teamCollection';

const SPEICHER = 'fusta_abend_ereignisse_v1';

/** Die Arten, die db/09 per CHECK erlaubt. */
export const ARTEN = ['stern', 'bier', 'shot20', 'shot40', 'schnaps', 'bj'];

/** In der App heissen sie klein, in der Datenbank gross geschrieben. */
const PERSON_DB = { alexander: 'Alexander', alex: 'Alexander', philip: 'Philip' };
const PERSON_APP = { Alexander: 'alexander', Philip: 'philip' };

/**
 * Der Tag wechselt um 06:00, nicht um Mitternacht.
 *
 * Ein Spieleabend endet selten vor zwoelf. Ohne diese Regel waere der Schnaps
 * um 00:30 ein neuer Abend mit einem einzigen Eintrag, waehrend der eigentliche
 * Abend abgeschnitten daneben stuende.
 *
 * Bewusst KEIN Start/Ende-Knopf: um zwei Uhr nachts denkt niemand daran, den
 * Abend zu beenden — und ein vergessener offener Abend wuerde die naechste
 * Sitzung mitverschlucken. Sechs Uhr trifft die Wirklichkeit ohne Zutun.
 */
export const TAGESWECHSEL_STUNDE = 6;

export function logischesDatum(zeitpunkt = new Date()) {
  const d = new Date(zeitpunkt);
  if (d.getHours() < TAGESWECHSEL_STUNDE) d.setDate(d.getDate() - 1);
  // Lokale Zeit, nicht UTC: toISOString() wuerde je nach Zeitzone einen Tag
  // daneben liegen.
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let fehlerMelder = null;
/** Einmal registrieren, um Sync-Fehler anzuzeigen. */
export function onAbendFehler(fn) {
  fehlerMelder = typeof fn === 'function' ? fn : null;
}
function melde(aktion, fehler) {
  console.warn(`[Abend] ${aktion} nicht gespeichert:`, fehler?.message || fehler);
  if (fehlerMelder) {
    try { fehlerMelder(aktion, fehler); } catch { /* Anzeige darf nie stoeren */ }
  }
}

/* --------------------------------------------------------------------------
   Lokaler Zwischenspeicher
   -------------------------------------------------------------------------- */

// Nur gesetzt, wenn der Browser nichts mehr speichern will (voll, privat).
// Vorher verschwand der Eintrag dann wortlos und der Zaehler blieb stehen.
let notbehelf = null;

export function ladeLokal() {
  if (notbehelf) return notbehelf;
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
    return Array.isArray(roh) ? roh : [];
  } catch { return []; }
}

function speichereLokal(liste) {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(liste));
    notbehelf = null;
  } catch (fehler) {
    notbehelf = liste;
    melde('Geraetespeicher', fehler);
  }
  // Schnellerfassung, Alkohol-Bereich, Rueckblick und Start zeigen dasselbe
  // Protokoll — wer offen ist, rechnet neu.
  try { window.dispatchEvent(new CustomEvent('abend-log-geaendert')); } catch { /* kein DOM */ }
}

/* --------------------------------------------------------------------------
   Umformung
   -------------------------------------------------------------------------- */

function zeileZuLokal(z) {
  return {
    id: `db_${z.id}`,
    dbId: z.id,
    abendId: z.abend_id,
    fifa_version: z.fifa_version,
    datum: z.datum || logischesDatum(z.created_at),
    person: PERSON_APP[z.person] || String(z.person || '').toLowerCase(),
    art: z.art,
    menge: Number(z.menge) || 0,
    info: z.info || null,
    ts: z.created_at || new Date().toISOString(),
  };
}

/* --------------------------------------------------------------------------
   Lesen
   -------------------------------------------------------------------------- */

// Direkt am Client und nicht ueber supabaseDb.select(): das faengt Fehler ab
// und liefert Demo-Daten. Beim Abgleich hiesse das, ein Funkloch fuer "in der
// Datenbank steht nichts" zu halten. Seitenweise, weil Supabase bei 1000
// Zeilen stillschweigend abschneidet.
async function alleZeilen(tabelle) {
  const SEITE = 1000;
  const raus = [];
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await supabase.from(tabelle).select('*')
      .order('id', { ascending: true }).range(von, von + SEITE - 1);
    if (error) throw error;
    raus.push(...data);
    if (data.length < SEITE) return raus;
  }
}

/* --------------------------------------------------------------------------
   Schreiben
   -------------------------------------------------------------------------- */

/** ids, deren Upload gerade laeuft, und dbIds, die hier geloescht wurden. */
const unterwegs = new Set();
const geloescht = new Set();

async function loescheZeile(dbId) {
  geloescht.add(dbId);
  const { error } = await supabase.from('abend_ereignisse').delete().eq('id', dbId);
  if (error) { geloescht.delete(dbId); throw error; }
}

/**
 * Den Abend zu einem Datum holen — oder anlegen.
 * Ein Abend je Saison und Datum; wer zweimal am selben Tag spielt, fuellt
 * denselben weiter.
 */
async function abendFuer(tag, version) {
  const suche = async () => {
    const { data, error } = await supabase.from('abende').select('id')
      .eq('datum', tag).eq('fifa_version', version).limit(1);
    if (error) throw error;
    return data[0]?.id;
  };
  const id = await suche();
  if (id != null) return id;

  const neu = await supabase.from('abende')
    .insert({ datum: tag, fifa_version: version }).select('id').single();
  if (!neu.error) return neu.data.id;
  // 23505: das andere Telefon hat denselben Abend gerade angelegt.
  if (neu.error.code !== '23505') throw neu.error;
  return suche();
}

/** Ein lokales Ereignis hochladen und seine dbId merken. Wirft bei Fehlern. */
async function ladeHoch(e) {
  if (unterwegs.has(e.id)) return;
  unterwegs.add(e.id);
  try {
    const version = e.fifa_version || getCurrentFifaVersion();
    const { data: zeile, error } = await supabase.from('abend_ereignisse').insert({
      abend_id: await abendFuer(e.datum, version),
      fifa_version: version,
      person: PERSON_DB[e.person] || e.person,
      art: e.art,
      menge: e.menge,
      info: e.info,
      // Die Zeit des Tippens, nicht die des Ankommens: daran haengt, ob der
      // Eintrag vor oder nach einem Abschluss liegt.
      created_at: e.ts,
    }).select('id').single();
    if (error) throw error;
    // Eigenes Insert vormerken, damit das Realtime-Echo keine Meldung an den
    // ausloest, der gerade selbst getippt hat.
    markSelfInsert('abend_ereignisse', zeile.id);

    const liste = ladeLokal();
    if (liste.some((x) => x.id === e.id)) {
      const fertig = { dbId: zeile.id, fifa_version: version, hoch: Date.now() };
      speichereLokal(liste.map((x) => (x.id === e.id ? { ...x, ...fertig } : x)));
    } else {
      // Waehrend des Hochladens zurueckgenommen — dann auch oben weg.
      await loescheZeile(zeile.id);
    }
  } finally {
    unterwegs.delete(e.id);
  }
}

/**
 * Ein Ereignis erfassen. Schreibt sofort lokal (damit die Oberflaeche
 * reagiert) und danach in die Datenbank. Schlaegt das fehl, bleibt es lokal
 * stehen und synchronisiere() reicht es nach.
 *
 * @param {object} e
 * @param {string} e.person 'alexander' | 'philip'
 * @param {string} e.art    siehe ARTEN
 * @param {number} e.menge  Stueckzahl bzw. Gutschrift
 * @param {object} [e.info] Zusatzangaben (z. B. Duell-Details)
 * @param {string} [e.datum] Abend-Datum, Standard heute
 */
export async function erfasse({ person, art, menge = 1, info = null, datum = null }) {
  if (!ARTEN.includes(art)) throw new Error(`Unbekannte Art: ${art}`);

  const lokal = {
    id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    person, art, menge: Number(menge) || 0, info,
    datum: datum || logischesDatum(),
    ts: new Date().toISOString(),
    fifa_version: getCurrentFifaVersion(),
  };
  speichereLokal([...ladeLokal(), lokal]);

  if (usingFallback) return { ok: true, offline: true };
  try {
    await ladeHoch(lokal);
    return { ok: true };
  } catch (error) {
    melde('Eintrag', error);
    return { ok: false, error };
  }
}

/** Ein Ereignis zuruecknehmen (Rueckgaengig-Knopf). */
export async function entferne(ereignis) {
  // Frisch nachsehen: die Oberflaeche kann es aus der Zeit vor dem Hochladen
  // kennen, dann fehlt ihr die dbId und die Zeile bliebe oben stehen.
  const liste = ladeLokal();
  const aktuell = liste.find((e) => e.id === ereignis.id) || ereignis;
  speichereLokal(liste.filter((e) => e.id !== ereignis.id));

  if (usingFallback || !aktuell.dbId) return { ok: true };
  try {
    await loescheZeile(aktuell.dbId);
    return { ok: true };
  } catch (error) {
    melde('Rueckgaengig', error);
    return { ok: false, error };
  }
}

let laeuft = null;

/**
 * Geraet und Datenbank auf denselben Stand bringen: fehlende Ereignisse
 * holen, nie hochgeladene nachreichen, Abschluesse uebernehmen. Laeuft beim
 * Start, beim Zurueckkehren in die App und wenn das Netz wiederkommt.
 */
export function synchronisiere() {
  if (!laeuft) laeuft = abgleich().finally(() => { laeuft = null; });
  return laeuft;
}

/** Wann zuletzt etwas in die App eingetragen wurde (Spiel, Sperre, Bier …). */
function letzteSonstigeEingabe() {
  try { return localStorage.getItem('fusta_letzte_eingabe'); } catch { return null; }
}

/** Abende beenden, an denen seit 24 Stunden nichts mehr passiert ist. */
async function beendeFaellige() {
  const letzte = new Map();
  const merke = (datum, ts) => letzte.set(datum, Math.max(letzte.get(datum) || 0, new Date(ts).getTime() || 0));
  for (const e of nurOffene(ladeLokal())) if (e.datum) merke(e.datum, e.ts);
  // Ein gezogenes Team oder ein Spiel haelt den Abend offen, eroeffnet aber
  // keinen: zu beenden gibt es nur, was der Zaehler zeigt.
  for (const ts of [...loadPulls().map((p) => p.ts), letzteSonstigeEingabe()]) {
    if (ts && letzte.has(logischesDatum(ts))) merke(logischesDatum(ts), ts);
  }
  const beendet = await beendeRuhende(letzte);
  if (!beendet.length) return;
  try { window.dispatchEvent(new CustomEvent('abend-automatisch-beendet', { detail: beendet })); } catch { /* kein DOM */ }
}

async function abgleich() {
  if (usingFallback) {
    await beendeFaellige();
    return { ok: false, offline: true };
  }
  try {
    // Ohne Anmeldung liefert RLS eine leere Liste OHNE Fehler — das saehe aus
    // wie eine geleerte Datenbank.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, offline: true };

    const start = Date.now();
    const saison = getCurrentFifaVersion();
    const [abende, zeilen] = await Promise.all([alleZeilen('abende'), alleZeilen('abend_ereignisse')]);
    await uebernimmAbschluesse(abende.filter((a) => a.fifa_version === saison));

    const datumVon = new Map(abende.map((a) => [a.id, a.datum]));
    const db = zeilen
      .filter((z) => !geloescht.has(z.id))
      .map((z) => zeileZuLokal({ ...z, datum: datumVon.get(z.abend_id) }));
    const { liste, hochladen } = fuehreZusammen({ lokal: ladeLokal(), db, saison, unterwegs, start });
    speichereLokal(liste);

    for (const e of hochladen) {
      // Aeltere Eintraege kennen ihre Saison nicht: die ihres Abends nehmen,
      // wenn sie eindeutig ist.
      const saisons = [...new Set(abende.filter((a) => a.datum === e.datum).map((a) => a.fifa_version))];
      const version = e.fifa_version || (saisons.length === 1 ? saisons[0] : saison);
      await ladeHoch({ ...e, fifa_version: version });
    }
    // Erst jetzt: vorher koennte das andere Geraet noch Spaeteres eingetragen haben.
    await beendeFaellige();
    return { ok: true, nachgereicht: hochladen.length };
  } catch (error) {
    console.warn('[Abend] Abgleich fehlgeschlagen:', error?.message || error);
    return { ok: false, error };
  }
}

/* --------------------------------------------------------------------------
   Auswertung — alle Zahlen leiten sich aus dem Log ab
   -------------------------------------------------------------------------- */

const summe = (liste, art, person) => liste
  .filter((e) => e.art === art && (!person || e.person === person))
  .reduce((s, e) => s + (Number(e.menge) || 0), 0);

/** Stand eines Abends (oder aller Ereignisse, wenn datum fehlt). */
export function standFuer(ereignisse, datum = null) {
  const l = datum ? ereignisse.filter((e) => e.datum === datum) : ereignisse;
  const je = (art) => ({
    alexander: summe(l, art, 'alexander'),
    philip: summe(l, art, 'philip'),
    gesamt: summe(l, art),
  });
  return {
    anzahl: l.length,
    sterne: je('stern'),
    bier: je('bier'),
    shot20: je('shot20'),
    shot40: je('shot40'),
    schnaps: je('schnaps'),
    bj: je('bj'),
  };
}

/* --------------------------------------------------------------------------
   Formen, wie der Alkohol-Tab sie erwartet
   --------------------------------------------------------------------------
   Bewusst hier und nicht im Tab: so gibt es EINE Stelle, an der aus Ereignissen
   Zahlen werden. Vorher fuehrte der Tab die Summen selbst fort — bei den
   Sternen lag dieselbe Rechnung dadurch doppelt vor.
   -------------------------------------------------------------------------- */

const zaehle = (l, art, person) => l.filter((e) => e.art === art && e.person === person).length;

export function bierStand(ereignisse) {
  return {
    alexander: zaehle(ereignisse, 'bier', 'alexander'),
    philip: zaehle(ereignisse, 'bier', 'philip'),
  };
}

export function shotStand(ereignisse) {
  return {
    alexander: {
      shots20: zaehle(ereignisse, 'shot20', 'alexander'),
      shots40: zaehle(ereignisse, 'shot40', 'alexander'),
    },
    philip: {
      shots20: zaehle(ereignisse, 'shot20', 'philip'),
      shots40: zaehle(ereignisse, 'shot40', 'philip'),
    },
  };
}

/**
 * Schnaps-Zaehler. `target` ist eine Einstellung und kein Ereignis — sie bleibt
 * vorerst geraetelokal. Wer trinkt, steht dagegen in der Datenbank.
 */
export function schnapsStand(ereignisse) {
  const verlauf = ereignisse
    .filter((e) => e.art === 'schnaps')
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .map((e) => ({
      person: e.person === 'alexander' ? 'alex' : 'philip',
      timestamp: e.ts,
      _ereignis: e,
    }));
  return {
    alex: verlauf.filter((v) => v.person === 'alex').length,
    philip: verlauf.filter((v) => v.person === 'philip').length,
    history: verlauf,
  };
}

/** Alle Abende, neuester zuerst, mit ihrem jeweiligen Stand. */
export function abendListe(ereignisse) {
  const tage = [...new Set(ereignisse.map((e) => e.datum).filter(Boolean))];
  return tage
    .sort((a, b) => (a < b ? 1 : -1))
    .map((datum) => ({ datum, ...standFuer(ereignisse, datum) }));
}
