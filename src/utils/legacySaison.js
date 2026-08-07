/**
 * Legacy-Saisons — Saisons, aus denen nur Gesamtzahlen ueberliefert sind.
 *
 * Die Daten selbst stehen in legacySaisonDaten.js und werden von
 * scripts/altsaison-import.mjs erzeugt, damit Zahlen nicht zweimal gepflegt
 * (und beim Abtippen verdreht) werden. Neue Altsaison:
 *
 *     node scripts/altsaison-import.mjs --alle
 *
 * Warum es diese Kennzeichnung ueberhaupt gibt: in diesen Saisons wurde nur
 * mitgezaehlt, nicht Spiel fuer Spiel erfasst. Ohne Hinweis zeigt die App dort
 * ueberall "0 Spiele", "0:0" und eine leere Form — das sieht nach einem Fehler
 * aus, ist aber die Datenlage.
 *
 * Bewusst eine feste Liste und nicht "hat Spieler, aber keine Spiele": eine
 * frisch angelegte Saison sieht genauso aus, solange das erste Spiel fehlt,
 * und wuerde faelschlich als Legacy markiert.
 */
import { LEGACY_DATEN } from './legacySaisonDaten';

export const LEGACY_SAISONS = LEGACY_DATEN;

/** Ist diese Saison eine reine Zahlen-Saison? */
export function istLegacySaison(version) {
  return Boolean(version && LEGACY_SAISONS[version]);
}

/** Metadaten zur Legacy-Saison, sonst null. */
export function legacyInfo(version) {
  return LEGACY_SAISONS[version] || null;
}

/**
 * Siege eines Teams aus der ueberlieferten Bilanz.
 *
 * Zwei Schreibweisen kommen vor: gezaehlte Siege (`siege`) und die
 * Aufschluesselung aus FIFA 16 (regulaer / n.V. / n.E.). `siege` gewinnt,
 * weil es bei FC16 die bereits addierte Summe ist.
 */
export function siegeGesamt(eintrag) {
  if (!eintrag) return 0;
  if (typeof eintrag.siege === 'number') return eintrag.siege;
  return (eintrag.regulaer || 0) + (eintrag.nachVerlaengerung || 0) + (eintrag.nachElfmeter || 0);
}
