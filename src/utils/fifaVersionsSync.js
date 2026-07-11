/**
 * Cross-device sync for the FIFA-version registry.
 *
 * The version list, the active version and the per-version team config
 * (names/short/color/logo) historically lived only in localStorage — per
 * device, so two players on two phones could drift apart. This module mirrors
 * that registry into the shared `public.fifa_versions` table:
 *   - hydrate on app start (DB → localStorage, so the existing synchronous
 *     getters keep working unchanged), and
 *   - write through when a version is added / switched / its teams edited.
 *
 * Everything is best-effort and guarded by `usingFallback`: in demo mode or
 * before the table exists, the app simply keeps using localStorage.
 */
import { supabase, usingFallback } from './supabase';
import { BUILT_IN_FIFA_VERSIONS } from './fifaVersionManager';

const K_CUSTOM = 'fifa_custom_versions';
const K_CURRENT = 'fifa_current_version';
const K_TEAMS = 'fifa_version_teams';

const TABLE = 'fifa_versions';

/** DB → localStorage. Returns true when hydration actually ran. */
export async function hydrateFifaVersionsFromDB() {
  if (usingFallback) return false;
  try {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error || !Array.isArray(data) || data.length === 0) return false;

    const custom = {};
    const teams = {};
    let current = null;
    for (const row of data) {
      if (!BUILT_IN_FIFA_VERSIONS[row.id]) custom[row.id] = row.id;
      if (row.teams && Object.keys(row.teams).length) teams[row.id] = row.teams;
      if (row.is_active) current = row.id;
    }

    localStorage.setItem(K_CUSTOM, JSON.stringify(custom));
    localStorage.setItem(K_TEAMS, JSON.stringify(teams));
    if (current) localStorage.setItem(K_CURRENT, current);

    // Let mounted components refresh (mirrors events fired by the managers).
    window.dispatchEvent(new CustomEvent('fifaVersionsHydrated', { detail: { current } }));
    if (current) window.dispatchEvent(new CustomEvent('fifaVersionChanged', { detail: { version: current } }));
    window.dispatchEvent(new CustomEvent('versionTeamsChanged', { detail: {} }));
    return true;
  } catch {
    return false;
  }
}

/** Insert/patch a version row (id + optional name/teams). */
export async function pushVersionToDB(id, { name = null, teams = null } = {}) {
  if (usingFallback || !id) return;
  try {
    const row = { id };
    if (name != null) row.name = name;
    if (teams != null) row.teams = teams;
    await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
  } catch { /* best effort */ }
}

/** Make exactly one version active. */
export async function setActiveVersionInDB(id) {
  if (usingFallback || !id) return;
  try {
    await supabase.from(TABLE).update({ is_active: false }).neq('id', id);
    await supabase.from(TABLE).upsert({ id, is_active: true }, { onConflict: 'id' });
  } catch { /* best effort */ }
}

/** Persist the team config (names/short/color/base64 logos) for a version. */
export async function pushTeamsToDB(id, teams) {
  if (usingFallback || !id || !teams) return;
  try {
    await supabase.from(TABLE).upsert({ id, teams }, { onConflict: 'id' });
  } catch { /* best effort */ }
}

/** Remove a version from the shared registry. */
export async function deleteVersionFromDB(id) {
  if (usingFallback || !id) return;
  try {
    await supabase.from(TABLE).delete().eq('id', id);
  } catch { /* best effort */ }
}
