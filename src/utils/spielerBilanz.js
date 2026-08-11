/**
 * Was ein Spieler bei welcher Seite gemacht hat.
 *
 * Drei Größen, drei sehr verschiedene Datenlagen — und das ist der Grund,
 * warum sie hier zusammen berechnet und getrennt beschriftet werden:
 *
 *   TORE — seit jeher richtig zugeordnet. Sie stehen je Spiel in zwei
 *   getrennten Listen: matches.goalslista sind die Tore für AEK, goalslistb
 *   die für Real. Wer 2024 für Alexander getroffen hat und heute bei Philip
 *   spielt, hat diese Tore weiterhin bei Alexander. Der Wechsel-Verlauf wird
 *   dafür gar nicht gebraucht.
 *
 *   SPERREN — ebenfalls richtig zugeordnet, seit es bans.team gibt: die Seite
 *   wird beim Eintragen der Sperre festgehalten und wandert später nicht mit.
 *
 *   SPIELE — erst ab dem Stichtag der Wechsel-Erfassung. Vorher wurde nicht
 *   festgehalten, wer wann bei wem war, und das lässt sich nicht nachholen.
 *
 * players.goals taucht hier bewusst nicht auf. Das ist eine Laufsumme auf der
 * Spielerzeile, die beim Wechsel mitwandert — nach einem Wechsel mitten in der
 * Saison stehen dort Tore, die für die andere Seite gefallen sind.
 */

import { nameKey } from './playerIdentity';

/** Eigentore stehen als "Eigentore_AEK"/"Eigentore_Real" in derselben Liste. */
const istEigentor = (name) => String(name || '').startsWith('Eigentore_');

/** Eine Torschützenliste in [{name, anzahl}] bringen — beide Altformate. */
function schuetzen(roh) {
  let liste = roh;
  if (typeof roh === 'string') {
    try { liste = JSON.parse(roh); } catch { return []; }
  }
  if (!Array.isArray(liste)) return [];
  return liste.map((g) => {
    const objekt = typeof g === 'object' && g !== null;
    return { name: objekt ? g.player : g, anzahl: objekt ? (Number(g.count) || 1) : 1 };
  }).filter((g) => g.name && !istEigentor(g.name));
}

/**
 * Tore je Seite für eine Person — über alle Spiele, die übergeben werden.
 *
 * Zusätzlich `spieleMitTor` je Seite: in wie vielen Spielen er für diese Seite
 * getroffen hat. Das ist die einzige "je Spiel"-Zahl, die ohne Aufstellung
 * ehrlich ist.
 */
export function toreJeSeite(matches, name) {
  const k = nameKey(name);
  const erg = {
    AEK: { tore: 0, spieleMitTor: 0 },
    Real: { tore: 0, spieleMitTor: 0 },
    bestesSpiel: null,     // { anzahl, seite, datum }
  };
  for (const m of matches || []) {
    for (const [seite, feld] of [['AEK', 'goalslista'], ['Real', 'goalslistb']]) {
      const treffer = schuetzen(m?.[feld]).filter((g) => nameKey(g.name) === k);
      if (treffer.length === 0) continue;
      const summe = treffer.reduce((s, g) => s + g.anzahl, 0);
      erg[seite].tore += summe;
      erg[seite].spieleMitTor += 1;
      if (!erg.bestesSpiel || summe > erg.bestesSpiel.anzahl) {
        erg.bestesSpiel = { anzahl: summe, seite, datum: m.date || null };
      }
    }
  }
  return erg;
}

/**
 * Sperren je Seite für eine Person.
 *
 * bans zeigt über player_id auf EINE Spielerzeile, und die gibt es je Saison
 * einmal — deshalb werden erst alle Zeilen dieser Person gesammelt und dann
 * deren Sperren. Die Seite kommt aus bans.team und nicht aus players.team:
 * sie wurde beim Eintragen festgehalten und ist damit die des Tattags.
 */
export function sperrenJeSeite(bans, players, name) {
  const k = nameKey(name);
  const meineIds = new Set(
    (players || []).filter((p) => nameKey(p.name) === k).map((p) => p.id));
  const erg = {
    AEK: { anzahl: 0, spiele: 0 },
    Real: { anzahl: 0, spiele: 0 },
    ohneSeite: 0,
  };
  for (const b of bans || []) {
    if (!meineIds.has(b.player_id)) continue;
    const seite = b.team;
    const spiele = Number(b.totalgames) || 0;
    if (erg[seite]) { erg[seite].anzahl += 1; erg[seite].spiele += spiele; }
    else erg.ohneSeite += 1;
  }
  return erg;
}
