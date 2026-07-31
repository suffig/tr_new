import { supabaseDb, usingFallback } from './supabase';

// Event-log model: every "team bekommen" is one pull event with a timestamp.
//
// Supabase `team_pull_events` ist die dauerhafte Quelle: beim Oeffnen des Tabs
// wird von dort geladen (fetchPullsFromDB), localStorage dient nur noch als
// Offline-Zwischenspeicher. Vorher war die Datenbank reines Schreibziel und
// wurde nie zurueckgelesen — geleerter localStorage sah deshalb wie
// Datenverlust aus, obwohl alles in der DB lag.
//
// Die Tabelle ist seit db/06_team_tracker_season.sql saison-gebunden; das
// Stempeln und Filtern uebernimmt die supabaseDb-Schicht (siehe
// getFifaVersionedTables), hier wird fifa_version deshalb nicht angefasst.
//
// Local shape: [{ id, dbId?, person, team, rating, women, national, ts }]
const PULLS_KEY = 'fc26TeamPulls_v1';
const LEGACY_KEY = 'fc26TeamCollection_v1'; // old aggregate { person: { team: count } }

export const COLLECTION_PEOPLE = ['alexander', 'philip'];
const PERSON_LABEL = { alexander: 'Alexander', philip: 'Philip' };
const PERSON_ID = { Alexander: 'alexander', Philip: 'philip' };

export const TIME_WINDOWS = [
  { id: '24h', label: '24 Std.', ms: 24 * 60 * 60 * 1000 },
  { id: 'week', label: 'Woche', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: 'month', label: 'Monat', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'Gesamt', ms: null },
];

export function windowStart(windowId) {
  const w = TIME_WINDOWS.find((x) => x.id === windowId);
  if (!w || w.ms == null) return 0;
  return Date.now() - w.ms;
}

function migrateLegacy() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (!legacy) return null;
    const events = [];
    const now = new Date().toISOString();
    for (const person of COLLECTION_PEOPLE) {
      const counts = legacy[person] || {};
      for (const [team, cnt] of Object.entries(counts)) {
        for (let i = 0; i < cnt; i++) {
          events.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, person, team, rating: null, women: false, national: false, ts: now });
        }
      }
    }
    localStorage.setItem(PULLS_KEY, JSON.stringify(events));
    localStorage.removeItem(LEGACY_KEY);
    return events;
  } catch {
    return null;
  }
}

export function loadPulls() {
  try {
    const raw = localStorage.getItem(PULLS_KEY);
    if (raw == null) {
      const migrated = migrateLegacy();
      return Array.isArray(migrated) ? migrated : [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePulls(arr) {
  try { localStorage.setItem(PULLS_KEY, JSON.stringify(arr)); } catch { /* ignore quota */ }
}

/** Offline-Zwischenspeicher durch den Stand aus der Datenbank ersetzen. */
export function replacePulls(arr) {
  savePulls(arr);
  return arr;
}

/** Count per team for a person within an optional time window (sinceTs = 0 → all). */
export function countsInWindow(pulls, personId, sinceTs = 0) {
  const out = {};
  for (const e of pulls) {
    if (e.person !== personId) continue;
    if (sinceTs && new Date(e.ts).getTime() < sinceTs) continue;
    out[e.team] = (out[e.team] || 0) + 1;
  }
  return out;
}

// ── Mutations (update local immediately, best-effort DB write-through) ────────
export function addPull(pulls, personId, team) {
  const ev = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    person: personId,
    team: team.name,
    rating: team.rating ?? null,
    women: !!team.women,
    national: !!team.national,
    ts: new Date().toISOString(),
  };
  const next = [...pulls, ev];
  savePulls(next);
  dbInsert(ev);
  return next;
}

/** Remove the most recent pull of a team for a person (optionally within window). */
export function removeLatestPull(pulls, personId, teamName, sinceTs = 0) {
  let idx = -1;
  let latest = -Infinity;
  for (let i = 0; i < pulls.length; i++) {
    const e = pulls[i];
    if (e.person !== personId || e.team !== teamName) continue;
    const t = new Date(e.ts).getTime();
    if (sinceTs && t < sinceTs) continue;
    if (t >= latest) { latest = t; idx = i; }
  }
  if (idx === -1) return pulls;
  const entfernt = pulls[idx];
  const next = pulls.slice(0, idx).concat(pulls.slice(idx + 1));
  savePulls(next);
  dbDeleteEvent(entfernt, personId, teamName);
  return next;
}

/**
 * Alle Ziehungen EINES Teams entfernen — wahlweise nur fuer eine Person
 * (personId gesetzt) oder fuer beide (personId = null).
 * Wird auch benutzt, wenn ein Team ganz aus dem Katalog verschwindet: sonst
 * blieben dessen Ziehungen als Karteileichen in der Sammlung stehen.
 */
export function removeTeamPulls(pulls, teamName, personId = null) {
  const betroffen = pulls.filter(
    (e) => e.team === teamName && (personId ? e.person === personId : true)
  );
  if (betroffen.length === 0) return pulls;
  const next = pulls.filter((e) => !betroffen.includes(e));
  savePulls(next);
  for (const ev of betroffen) dbDeleteEvent(ev, ev.person, teamName);
  return next;
}

export function clearPerson(pulls, personId) {
  const next = pulls.filter((e) => e.person !== personId);
  savePulls(next);
  dbClearPerson(personId);
  return next;
}

// ── Supabase sync ────────────────────────────────────────────────────────────
// Schreibfehler werden nicht mehr verschluckt: wer eine Ziehung eintraegt, soll
// erfahren, wenn sie nur lokal angekommen ist. Im Demo-/Offline-Modus gibt es
// keine Datenbank — das ist kein Fehler und bleibt still.

let syncErrorHandler = null;

/** Einmal registrieren (z. B. im Teams-Tab), um Sync-Fehler anzuzeigen. */
export function onSyncError(fn) {
  syncErrorHandler = typeof fn === 'function' ? fn : null;
}

function reportSyncError(action, error) {
  console.warn(`[Teams] ${action} konnte nicht in der Datenbank gespeichert werden:`, error?.message || error);
  if (syncErrorHandler) {
    try { syncErrorHandler(action, error); } catch { /* Anzeige darf nie stoeren */ }
  }
}

/** DB-Zeile -> lokale Form. Behaelt die echte Zeilen-ID fuer sicheres Loeschen. */
function rowToLocal(row) {
  return {
    id: `db_${row.id}`,
    dbId: row.id,
    person: PERSON_ID[row.person] || String(row.person || '').toLowerCase(),
    team: row.team_name,
    rating: row.rating ?? null,
    women: !!row.is_women,
    national: !!row.is_national,
    // Nur fuer die Saison-Auswertung interessant; im normalen Betrieb sind
    // ohnehin alle geladenen Ziehungen aus der aktuellen Saison.
    saison: row.fifa_version || null,
    ts: row.created_at || new Date().toISOString(),
  };
}

/**
 * Sammlung der AKTUELLEN Saison aus der Datenbank laden.
 * Die Saison-Filterung passiert in der supabaseDb-Schicht.
 * @returns {Promise<{ok: boolean, offline?: boolean, error?: unknown, pulls: Array}>}
 */
export async function fetchPullsFromDB() {
  if (usingFallback) return { ok: false, offline: true, pulls: [] };
  try {
    const res = await supabaseDb.select('team_pull_events', '*', {
      order: { column: 'created_at', ascending: true },
    });
    if (res?.error) return { ok: false, error: res.error, pulls: [] };
    return { ok: true, pulls: (res?.data || []).map(rowToLocal) };
  } catch (error) {
    return { ok: false, error, pulls: [] };
  }
}

/**
 * Ziehungen ALLER Saisons laden — bewusst ohne den Saison-Filter.
 * Der normale Betrieb sieht nur die laufende Saison; fuer "Sammlung je Saison"
 * braucht es den Blick darueber hinaus.
 * @returns {Promise<{ok: boolean, offline?: boolean, error?: unknown, pulls: Array}>}
 */
export async function fetchAlleSaisonZiehungen() {
  if (usingFallback) return { ok: false, offline: true, pulls: [] };
  try {
    const res = await supabaseDb.select('team_pull_events', '*', {
      order: { column: 'created_at', ascending: true },
      skipFifaFilter: true,
    });
    if (res?.error) return { ok: false, error: res.error, pulls: [] };
    return { ok: true, pulls: (res?.data || []).map(rowToLocal) };
  } catch (error) {
    return { ok: false, error, pulls: [] };
  }
}

/** Lokal vorhandene Ziehungen einmalig in die Datenbank uebertragen. */
export async function pushLocalPullsToDB(pulls) {
  if (usingFallback) return { ok: false, offline: true, uebertragen: 0 };
  let uebertragen = 0;
  for (const ev of pulls) {
    if (ev.dbId) continue; // stammt bereits aus der DB
    const res = await dbInsert(ev);
    if (!res.ok) return { ok: false, error: res.error, uebertragen };
    uebertragen++;
  }
  return { ok: true, uebertragen };
}

async function dbInsert(ev) {
  if (usingFallback) return { ok: true, offline: true };
  try {
    const res = await supabaseDb.insert('team_pull_events', {
      person: PERSON_LABEL[ev.person] || ev.person,
      team_name: ev.team,
      rating: ev.rating ?? null,
      is_women: !!ev.women,
      is_national: !!ev.national,
    });
    if (res?.error) { reportSyncError('Ziehung', res.error); return { ok: false, error: res.error }; }
    return { ok: true };
  } catch (error) {
    reportSyncError('Ziehung', error);
    return { ok: false, error };
  }
}

async function dbDeleteEvent(ev, personId, teamName) {
  if (usingFallback) return { ok: true, offline: true };
  try {
    // Bevorzugt ueber die echte Zeilen-ID loeschen; nur wenn die Ziehung offline
    // entstanden ist, muss die neueste passende Zeile gesucht werden.
    let id = ev?.dbId ?? null;
    if (id == null) {
      const person = PERSON_LABEL[personId] || personId;
      const res = await supabaseDb.select('team_pull_events', '*', {
        eq: { person, team_name: teamName },
        order: { column: 'created_at', ascending: false },
        limit: 1,
      });
      if (res?.error) { reportSyncError('Entfernen', res.error); return { ok: false, error: res.error }; }
      id = (res?.data || [])[0]?.id ?? null;
    }
    if (id == null) return { ok: true };
    const del = await supabaseDb.delete('team_pull_events', id);
    if (del?.error) { reportSyncError('Entfernen', del.error); return { ok: false, error: del.error }; }
    return { ok: true };
  } catch (error) {
    reportSyncError('Entfernen', error);
    return { ok: false, error };
  }
}

async function dbClearPerson(personId) {
  if (usingFallback) return { ok: true, offline: true };
  try {
    const person = PERSON_LABEL[personId] || personId;
    // Ohne skipFifaFilter: es wird nur die Sammlung der AKTUELLEN Saison
    // geleert. Frueheren Saisons soll ein Zuruecksetzen nichts anhaben.
    const res = await supabaseDb.select('team_pull_events', '*', { eq: { person } });
    if (res?.error) { reportSyncError('Zurücksetzen', res.error); return { ok: false, error: res.error }; }
    for (const row of (res?.data || [])) {
      const del = await supabaseDb.delete('team_pull_events', row.id);
      if (del?.error) { reportSyncError('Zurücksetzen', del.error); return { ok: false, error: del.error }; }
    }
    return { ok: true };
  } catch (error) {
    reportSyncError('Zurücksetzen', error);
    return { ok: false, error };
  }
}
