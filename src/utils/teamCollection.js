import { supabaseDb } from './supabase';

// Event-log model: every "team bekommen" is one pull event with a timestamp.
// This is the source of truth for the UI (works offline / in demo) and is
// best-effort mirrored to Supabase `team_pull_events`. A DB trigger keeps the
// `team_collection` aggregate consistent server-side (see migration 003).
//
// Local shape: [{ id, person, team, rating, women, national, ts }]
const PULLS_KEY = 'fc26TeamPulls_v1';
const LEGACY_KEY = 'fc26TeamCollection_v1'; // old aggregate { person: { team: count } }

export const COLLECTION_PEOPLE = ['alexander', 'philip'];
const PERSON_LABEL = { alexander: 'Alexander', philip: 'Philip' };

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
  const next = pulls.slice(0, idx).concat(pulls.slice(idx + 1));
  savePulls(next);
  dbDeleteLatest(personId, teamName);
  return next;
}

export function clearPerson(pulls, personId) {
  const next = pulls.filter((e) => e.person !== personId);
  savePulls(next);
  dbClearPerson(personId);
  return next;
}

// ── Best-effort Supabase sync (never throws) ─────────────────────────────────
async function dbInsert(ev) {
  try {
    await supabaseDb.insert('team_pull_events', {
      person: PERSON_LABEL[ev.person] || ev.person,
      team_name: ev.team,
      rating: ev.rating ?? null,
      is_women: !!ev.women,
      is_national: !!ev.national,
    });
  } catch { /* offline / demo */ }
}

async function dbDeleteLatest(personId, teamName) {
  try {
    const person = PERSON_LABEL[personId] || personId;
    const res = await supabaseDb.select('team_pull_events', '*', {
      eq: { person, team_name: teamName },
      order: { column: 'created_at', ascending: false },
      limit: 1,
      skipFifaFilter: true,
    });
    const row = (res?.data || [])[0];
    if (row) await supabaseDb.delete('team_pull_events', row.id);
  } catch { /* offline / demo */ }
}

async function dbClearPerson(personId) {
  try {
    const person = PERSON_LABEL[personId] || personId;
    const res = await supabaseDb.select('team_pull_events', '*', { eq: { person }, skipFifaFilter: true });
    for (const row of (res?.data || [])) {
      await supabaseDb.delete('team_pull_events', row.id);
    }
  } catch { /* offline / demo */ }
}
