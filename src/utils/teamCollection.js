import { supabaseDb } from './supabase';

// Local mirror of the collection so the feature works offline / in demo mode.
// Shape: { alexander: { "Real Madrid": 3, ... }, philip: { ... } }
const STORAGE_KEY = 'fc26TeamCollection_v1';

export const COLLECTION_PEOPLE = ['alexander', 'philip'];
const PERSON_LABEL = { alexander: 'Alexander', philip: 'Philip' };

export function loadCollection() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      alexander: parsed?.alexander && typeof parsed.alexander === 'object' ? parsed.alexander : {},
      philip: parsed?.philip && typeof parsed.philip === 'object' ? parsed.philip : {},
    };
  } catch {
    return { alexander: {}, philip: {} };
  }
}

export function saveCollection(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore quota */ }
}

/**
 * Best-effort write-through to Supabase. Never throws — the local store is the
 * source of truth for the UI. When the DB is reachable it keeps
 * `team_collection` (aggregate) and `team_pull_events` (log) in sync.
 */
export async function syncPull(personId, team, delta) {
  const person = PERSON_LABEL[personId] || personId;
  try {
    const res = await supabaseDb.select('team_collection', '*', {
      eq: { person, team_name: team.name },
      skipFifaFilter: true,
    });
    const existing = (res?.data || [])[0];

    if (existing) {
      const newCount = Math.max(0, (existing.count || 0) + delta);
      await supabaseDb.update('team_collection', {
        count: newCount,
        last_obtained_at: new Date().toISOString(),
      }, existing.id);
    } else if (delta > 0) {
      await supabaseDb.insert('team_collection', {
        person,
        team_name: team.name,
        rating: team.rating ?? null,
        is_women: !!team.women,
        is_national: !!team.national,
        count: delta,
      });
    }

    if (delta > 0) {
      await supabaseDb.insert('team_pull_events', {
        person,
        team_name: team.name,
        rating: team.rating ?? null,
        is_women: !!team.women,
        is_national: !!team.national,
      });
    }
  } catch {
    // Offline / demo mode – local store already updated, nothing else to do.
  }
}
