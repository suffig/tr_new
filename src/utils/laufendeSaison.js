/**
 * Welche Saison laeuft gerade — im Unterschied zu der, die man ansieht.
 *
 * Zwei verschiedene Dinge, die leicht durcheinandergehen:
 *   fifa_current_version  die Saison, die man sich gerade ANSIEHT
 *   fifa_active_version   die Saison, in der laut Datenbank GESPIELT wird
 *
 * Alles andere ist Archiv — auch FC25, obwohl es echte Einzelspiele hat. Das
 * ist unabhaengig davon, ob die Zahlen aus Spielen stammen oder aus einer
 * Strichliste gezaehlt sind; beides wird getrennt gekennzeichnet.
 */
import { getCurrentFifaVersion } from './fifaVersionManager';

const K_AKTIV = 'fifa_active_version';

/** Die laufende Saison laut DB, sonst die angesehene als Notnagel. */
export function laufendeSaison() {
  try {
    return localStorage.getItem(K_AKTIV) || getCurrentFifaVersion();
  } catch {
    return getCurrentFifaVersion();
  }
}

/** Ist diese Saison abgeschlossen? */
export function istArchiv(version) {
  if (!version) return false;
  return version !== laufendeSaison();
}
