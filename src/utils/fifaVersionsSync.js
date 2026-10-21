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
const K_TEAMS = 'fifa_version_teams';
/**
 * Die Saison, in der GESPIELT wird — laut gemeinsamer Datenbank.
 * Getrennt von der Saison, die man sich gerade ANSIEHT (fifa_current_version):
 * Altsaisons durchblaettern darf nicht heissen, dass neue Spiele dort landen.
 */
export const K_AKTIV = 'fifa_active_version';

const TABLE = 'fifa_versions';

/** DB → localStorage. Returns true when hydration actually ran. */
export async function hydrateFifaVersionsFromDB() {
  if (usingFallback) return false;
  try {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error || !Array.isArray(data) || data.length === 0) return false;

    const custom = {};
    const teams = {};
    let aktiv = null;
    for (const row of data) {
      if (!BUILT_IN_FIFA_VERSIONS[row.id]) custom[row.id] = row.id;
      if (row.teams && Object.keys(row.teams).length) teams[row.id] = row.teams;
      if (row.is_active) aktiv = row.id;
    }

    // Sync only the shared registry: the version LIST + per-version team config.
    // The ACTIVE version stays a per-device choice on purpose — otherwise pulling
    // the DB's active version on every load would revert a local season switch.
    localStorage.setItem(K_CUSTOM, JSON.stringify(custom));
    localStorage.setItem(K_TEAMS, JSON.stringify(teams));
    // Merken, WELCHE Saison laut DB laeuft — nicht um sie zu erzwingen, sondern
    // damit die App sagen kann "du siehst gerade eine Archiv-Saison an".
    if (aktiv) localStorage.setItem(K_AKTIV, aktiv);

    // Let mounted components refresh team names/logos (does not change the season).
    window.dispatchEvent(new CustomEvent('fifaVersionsHydrated', { detail: {} }));
    window.dispatchEvent(new CustomEvent('versionTeamsChanged', { detail: {} }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Insert/patch a version row (id + optional name/teams).
 *
 * Gibt das Ergebnis zurueck, statt Fehler zu verschlucken: eine Saison, die
 * nur lokal existiert, ist fuer die andere Person unsichtbar — und sobald
 * fifa_version ein Fremdschluessel auf diese Tabelle ist, wuerde jeder
 * Spiel-/Spieler-/Transaktions-Insert dieser Saison abgewiesen.
 *
 * @returns {Promise<{ok: boolean, offline?: boolean, error?: unknown}>}
 */
export async function pushVersionToDB(id, { name = null, teams = null } = {}) {
  if (!id) return { ok: false, error: new Error('Keine Versions-ID') };
  // Demo-/Offline-Modus: es gibt keine DB, das ist kein Fehler.
  if (usingFallback) return { ok: true, offline: true };
  try {
    const row = { id };
    if (name != null) row.name = name;
    if (teams != null) row.teams = teams;
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/* -----------------------------------------------------------------------------
   WARUM DIESE DREI JETZT EIN ERGEBNIS ZURUECKGEBEN

   Sie waren mit einem leeren catch-Block ("best effort") geschrieben und gaben
   nichts zurueck. Zwei Fehler steckten darin:

   1. Der supabase-Aufruf WIRFT bei einem abgelehnten Schreibvorgang nicht. Er
      liefert `{ error }`. Das `try/catch` fing also gar nicht den Fall, um den
      es geht — der Fehler stand im Rueckgabewert und wurde nicht angesehen.

   2. Ohne Ergebnis kann der Aufrufer nicht unterscheiden, ob geschrieben wurde.
      VersionTeamSettingsTab meldete deshalb "Team-Einstellungen gespeichert",
      auch wenn nichts in der Datenbank ankam.

   Die Folge war nicht nur eine falsche Meldung, sondern Datenverlust mit
   Zeitverzoegerung: die Aenderung lag dann allein im localStorage, und
   hydrateFifaVersionsFromDB setzt K_TEAMS beim naechsten Start komplett aus
   der DB neu — die Aenderung war still wieder weg. Wer in der Verwaltung die
   Wappen fuer eine Saison setzt, saehe "gespeichert", danach die richtigen
   Wappen, und nach dem naechsten App-Start wieder die alten.

   Dieselbe Form wie pushVersionToDB: { ok, offline?, error? }. `offline: true`
   heisst Demo-Modus ohne Datenbank — das ist kein Fehler, aber der Aufrufer
   soll es sagen koennen.
   -------------------------------------------------------------------------- */

/** Make exactly one version active. */
export async function setActiveVersionInDB(id) {
  if (!id) return { ok: false, error: new Error('Keine Versions-ID') };
  if (usingFallback) return { ok: true, offline: true };
  try {
    // Erst alle anderen abwaehlen, dann diese setzen. Schlaegt der erste
    // Schritt fehl, waeren zwei Saisons aktiv — dann hier abbrechen.
    const ab = await supabase.from(TABLE).update({ is_active: false }).neq('id', id);
    if (ab.error) return { ok: false, error: ab.error };
    const an = await supabase.from(TABLE).upsert({ id, is_active: true }, { onConflict: 'id' });
    if (an.error) return { ok: false, error: an.error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Persist the team config (names/short/color/base64 logos) for a version. */
export async function pushTeamsToDB(id, teams) {
  if (!id || !teams) return { ok: false, error: new Error('Keine Versions-ID oder keine Teams') };
  if (usingFallback) return { ok: true, offline: true };
  try {
    const { error } = await supabase.from(TABLE).upsert({ id, teams }, { onConflict: 'id' });
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Remove a version from the shared registry. */
export async function deleteVersionFromDB(id) {
  if (!id) return { ok: false, error: new Error('Keine Versions-ID') };
  if (usingFallback) return { ok: true, offline: true };
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
