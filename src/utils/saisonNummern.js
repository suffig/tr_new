/**
 * Saison-Nummerierung an einer Stelle.
 *
 * Eine "Saison" ist eine FIFA-Version. Die Nummer (Saison 1, 2, 3 …) ergibt
 * sich aus der Reihenfolge der Versionen — und die muss ueberall dieselbe sein.
 *
 * Der Anlass: FC15 hat 72 Spieler, aber kein einziges erfasstes Spiel. Wer nur
 * `matches` betrachtet, faengt bei FC25 mit "Saison 1" an; wer auch `players`
 * betrachtet, bei FC15. Dann steht in der Saisonansicht "Saison 2 · FC25" und
 * im Duell "Saison 1 · FC25" — dieselbe Saison, zwei Nummern.
 */

import { LEGACY_SAISONS } from './legacySaison';

const versionNum = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/**
 * Alle bekannten Saisons, aelteste zuerst.
 * @param {Array} matches  Spiele (koennen aus allen Saisons stammen)
 * @param {Array} players  Spielerzeilen (tragen die Saison auch ohne Spiele)
 * @param {string} current laufende Version — immer dabei, auch wenn noch leer
 * @returns {Array<{version: string, number: number, label: string}>}
 */
export function saisonListe(matches, players, current) {
  const set = new Set();
  for (const m of matches || []) set.add(m.fifa_version || 'FC25');
  for (const p of players || []) set.add(p.fifa_version || 'FC25');
  if (current) set.add(current);
  // Bekannte Altsaisons immer mitzaehlen, auch wenn die aufrufende Ansicht
  // gerade keine Zeile daraus geladen hat (das Duell laedt z. B. nur Spiele
  // und Spieler — eine Saison mit reiner Strichlisten-Bilanz faellt sonst
  // durch und bekommt "Saison ?").
  for (const v of Object.keys(LEGACY_SAISONS)) set.add(v);
  return [...set]
    .sort((a, b) => versionNum(a) - versionNum(b))
    .map((v, i) => ({ version: v, number: i + 1, label: `Saison ${i + 1} · ${v}` }));
}

/** Nachschlagetabelle Version → Saisonnummer. */
export function saisonNummern(matches, players, current) {
  const map = new Map();
  for (const s of saisonListe(matches, players, current)) map.set(s.version, s.number);
  return map;
}
