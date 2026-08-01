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

import { supabaseDb, usingFallback } from './supabase';

const SPEICHER = 'fusta_abend_ereignisse_v1';

/** Die Arten, die db/09 per CHECK erlaubt. */
export const ARTEN = ['stern', 'bier', 'shot20', 'shot40', 'schnaps', 'bj'];

/** In der App heissen sie klein, in der Datenbank gross geschrieben. */
const PERSON_DB = { alexander: 'Alexander', alex: 'Alexander', philip: 'Philip' };
const PERSON_APP = { Alexander: 'alexander', Philip: 'philip' };

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

export function ladeLokal() {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
    return Array.isArray(roh) ? roh : [];
  } catch { return []; }
}

function speichereLokal(liste) {
  try { localStorage.setItem(SPEICHER, JSON.stringify(liste)); } catch { /* Quota */ }
  return liste;
}

/** Den Stand aus der Datenbank uebernehmen. */
export function ersetzeLokal(liste) {
  return speichereLokal(liste);
}

/* --------------------------------------------------------------------------
   Umformung
   -------------------------------------------------------------------------- */

function zeileZuLokal(z) {
  return {
    id: `db_${z.id}`,
    dbId: z.id,
    abendId: z.abend_id,
    datum: z.datum || null,
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

/**
 * Alle Ereignisse der laufenden Saison, aeltestes zuerst.
 * Die Saison-Filterung uebernimmt die supabaseDb-Schicht.
 */
export async function ladeAusDB() {
  if (usingFallback) return { ok: false, offline: true, ereignisse: [] };
  try {
    const res = await supabaseDb.select('abend_ereignisse', '*', {
      order: { column: 'created_at', ascending: true },
    });
    if (res?.error) return { ok: false, error: res.error, ereignisse: [] };

    // Die Datumsangabe haengt am Abend, nicht am Ereignis — einmal nachladen
    // und zuordnen, statt je Ereignis einzeln zu fragen.
    const abende = await supabaseDb.select('abende', '*', {});
    const datumVon = new Map((abende?.data || []).map((a) => [a.id, a.datum]));

    const ereignisse = (res?.data || []).map((z) =>
      zeileZuLokal({ ...z, datum: datumVon.get(z.abend_id) })
    );
    return { ok: true, ereignisse };
  } catch (error) {
    return { ok: false, error, ereignisse: [] };
  }
}

/* --------------------------------------------------------------------------
   Schreiben
   -------------------------------------------------------------------------- */

/**
 * Den Abend zu einem Datum holen — oder anlegen.
 * Ein Abend je Saison und Datum; wer zweimal am selben Tag spielt, fuellt
 * denselben weiter.
 */
async function abendFuer(datum) {
  const tag = datum || new Date().toISOString().slice(0, 10);
  const vorhanden = await supabaseDb.select('abende', '*', { eq: { datum: tag } });
  const treffer = (vorhanden?.data || [])[0];
  if (treffer) return treffer.id;

  const neu = await supabaseDb.insert('abende', { datum: tag });
  if (neu?.error) throw neu.error;
  // insert liefert je nach Client ein Objekt oder eine Liste zurueck.
  const zeile = Array.isArray(neu?.data) ? neu.data[0] : neu?.data;
  return zeile?.id;
}

/**
 * Ein Ereignis erfassen. Schreibt sofort lokal (damit die Oberflaeche
 * reagiert) und danach in die Datenbank.
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
    datum: datum || new Date().toISOString().slice(0, 10),
    ts: new Date().toISOString(),
  };
  const liste = [...ladeLokal(), lokal];
  speichereLokal(liste);

  if (usingFallback) return { ok: true, offline: true, ereignisse: liste };

  try {
    const abendId = await abendFuer(lokal.datum);
    const res = await supabaseDb.insert('abend_ereignisse', {
      abend_id: abendId,
      person: PERSON_DB[person] || person,
      art,
      menge: lokal.menge,
      info,
    });
    if (res?.error) { melde('Eintrag', res.error); return { ok: false, error: res.error, ereignisse: liste }; }
    return { ok: true, ereignisse: liste };
  } catch (error) {
    melde('Eintrag', error);
    return { ok: false, error, ereignisse: liste };
  }
}

/** Ein Ereignis zuruecknehmen (Rueckgaengig-Knopf). */
export async function entferne(ereignis) {
  const liste = ladeLokal().filter((e) => e.id !== ereignis.id);
  speichereLokal(liste);

  if (usingFallback || !ereignis.dbId) return { ok: true, ereignisse: liste };
  try {
    const res = await supabaseDb.delete('abend_ereignisse', ereignis.dbId);
    if (res?.error) { melde('Rueckgaengig', res.error); return { ok: false, error: res.error, ereignisse: liste }; }
    return { ok: true, ereignisse: liste };
  } catch (error) {
    melde('Rueckgaengig', error);
    return { ok: false, error, ereignisse: liste };
  }
}

/** Lokal vorhandene Ereignisse einmalig uebertragen (Altbestand). */
export async function uebertrageLokale() {
  if (usingFallback) return { ok: false, offline: true, uebertragen: 0 };
  let n = 0;
  for (const e of ladeLokal()) {
    if (e.dbId) continue; // stammt schon aus der Datenbank
    try {
      const abendId = await abendFuer(e.datum);
      const res = await supabaseDb.insert('abend_ereignisse', {
        abend_id: abendId,
        person: PERSON_DB[e.person] || e.person,
        art: e.art,
        menge: e.menge,
        info: e.info,
      });
      if (res?.error) return { ok: false, error: res.error, uebertragen: n };
      n++;
    } catch (error) {
      return { ok: false, error, uebertragen: n };
    }
  }
  return { ok: true, uebertragen: n };
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

/** Alle Abende, neuester zuerst, mit ihrem jeweiligen Stand. */
export function abendListe(ereignisse) {
  const tage = [...new Set(ereignisse.map((e) => e.datum).filter(Boolean))];
  return tage
    .sort((a, b) => (a < b ? 1 : -1))
    .map((datum) => ({ datum, ...standFuer(ereignisse, datum) }));
}
