import { FC26_TEAMS } from '../constants/fc26Teams';
import { supabaseDb } from './supabase';

// Editable FC26 team catalog: the static list is the seed; user edits (rating
// changes, added / removed teams) live in localStorage as overrides and are
// best-effort mirrored to the `fc26_team_catalog` table so everything stays
// consistent in the DB when it is reachable.
const OVERRIDES_KEY = 'fc26CatalogOverrides_v1';

function loadOverrides() {
  try {
    const p = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || 'null');
    return {
      edits: p?.edits && typeof p.edits === 'object' ? p.edits : {},   // { name: rating|null }
      added: Array.isArray(p?.added) ? p.added : [],                    // [{name, rating, women, national}]
      removed: Array.isArray(p?.removed) ? p.removed : [],              // [name]
    };
  } catch {
    return { edits: {}, added: [], removed: [] };
  }
}

function saveOverrides(o) {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); } catch { /* ignore */ }
}

/** Merged catalog: static seed + local overrides. Sorted rating desc, then name. */
export function getCatalog() {
  const o = loadOverrides();
  const removed = new Set(o.removed.map((n) => n.toLowerCase()));
  const map = new Map();
  FC26_TEAMS.forEach((t) => {
    if (removed.has(t.name.toLowerCase())) return;
    map.set(t.name, { ...t });
  });
  o.added.forEach((t) => {
    if (removed.has(t.name.toLowerCase())) return;
    map.set(t.name, { name: t.name, rating: t.rating ?? null, women: !!t.women, national: !!t.national });
  });
  // apply rating edits
  Object.entries(o.edits).forEach(([name, rating]) => {
    if (map.has(name)) map.get(name).rating = rating;
  });
  const list = [...map.values()];
  list.sort((a, b) => {
    const ra = a.rating == null ? -1 : a.rating;
    const rb = b.rating == null ? -1 : b.rating;
    if (rb !== ra) return rb - ra;
    return a.name.localeCompare(b.name, 'de');
  });
  return list;
}

// Best-effort DB upsert for a single catalog team (by unique name)
async function dbUpsertTeam(team) {
  try {
    const res = await supabaseDb.select('fc26_team_catalog', '*', { eq: { name: team.name }, skipFifaFilter: true });
    const existing = (res?.data || [])[0];
    const payload = {
      name: team.name,
      rating: team.rating ?? null,
      is_women: !!team.women,
      is_national: !!team.national,
    };
    if (existing) await supabaseDb.update('fc26_team_catalog', payload, existing.id);
    else await supabaseDb.insert('fc26_team_catalog', payload);
  } catch { /* offline / demo */ }
}

export function setRating(name, rating) {
  const o = loadOverrides();
  o.edits[name] = rating;
  saveOverrides(o);
  const t = getCatalog().find((x) => x.name === name);
  if (t) dbUpsertTeam(t);
}

export function addTeam({ name, rating = null, women = false, national = false }) {
  const clean = name.trim();
  if (!clean) return false;
  const o = loadOverrides();
  o.removed = o.removed.filter((n) => n.toLowerCase() !== clean.toLowerCase());
  const exists = getCatalog().some((t) => t.name.toLowerCase() === clean.toLowerCase());
  if (exists) { o.edits[clean] = rating; saveOverrides(o); }
  else { o.added.push({ name: clean, rating, women, national }); saveOverrides(o); }
  dbUpsertTeam({ name: clean, rating, women, national });
  return true;
}

export function removeTeam(name) {
  const o = loadOverrides();
  o.added = o.added.filter((t) => t.name.toLowerCase() !== name.toLowerCase());
  if (!o.removed.some((n) => n.toLowerCase() === name.toLowerCase())) o.removed.push(name);
  delete o.edits[name];
  saveOverrides(o);
  (async () => {
    try {
      const res = await supabaseDb.select('fc26_team_catalog', '*', { eq: { name }, skipFifaFilter: true });
      const existing = (res?.data || [])[0];
      if (existing) await supabaseDb.delete('fc26_team_catalog', existing.id);
    } catch { /* offline / demo */ }
  })();
}
