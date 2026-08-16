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

/**
 * Wie viele der Tore eines Spielers gehören DIESER Seite?
 *
 * players.goals ist eine Laufsumme auf der Spielerzeile — und die Zeile
 * wechselt beim Transfer die Seite mit. Wer mitten in der Saison von
 * Alexander zu Philip geht, nimmt seine komplette bisherige Ausbeute mit:
 * Alexanders Summe verliert Tore, die für ihn gefallen sind, Philips gewinnt
 * welche, die er nie hatte.
 *
 * Deshalb wird hier nur abgezogen, was NACHWEISLICH woanders hingehört —
 * die Tore, die laut Torschützenliste für die andere Seite fielen. Alles
 * andere bleibt stehen:
 *
 *   - Für Spieler ohne Wechsel ändert sich damit gar nichts.
 *   - Die importierten Altsaisons haben nur Gesamtzahlen und keine
 *     Einzelspiele. Dort ist die Liste leer, es wird nichts abgezogen, und
 *     die überlieferte Zahl bleibt unangetastet.
 *   - Auch die 135 Spiele ohne Torschützenliste (siehe db/22) verlieren
 *     nichts: was nicht in einer Liste steht, kann nicht der anderen Seite
 *     zugeordnet werden.
 *
 * Nie kleiner als 0 — wenn die Listen mehr Tore für die andere Seite führen
 * als die Spalte insgesamt kennt, ist das ein Datenfehler und keine negative
 * Torzahl.
 */
export function toreFuerSeite(matches, player) {
  const gesamt = Number(player?.goals) || 0;
  const seite = player?.team;
  // "Ehemalige" haben keine Gegenseite, von der abzuziehen waere.
  if (seite !== 'AEK' && seite !== 'Real') {
    return { tore: gesamt, fuerAndere: 0, andere: null };
  }
  const andere = seite === 'AEK' ? 'Real' : 'AEK';
  const jeSeite = toreJeSeite(matches, player.name);
  return {
    tore: Math.max(0, gesamt - jeSeite[andere].tore),
    fuerAndere: jeSeite[andere].tore,
    andere,
  };
}

/**
 * Die letzten Spiele eines Spielers — die Formkurve.
 *
 * WELCHE SPIELE ZAEHLEN
 * Nur die, in denen der Spieler in einer der beiden Torschuetzenlisten
 * steht. Eine Aufstellung gibt es nicht, also ist ein Spiel ohne Tor von ihm
 * nicht von einem Spiel zu unterscheiden, an dem er gar nicht teilgenommen
 * hat. Eine Null zu zeichnen, wo vielleicht "nicht dabei" richtig waere,
 * waere eine erfundene Angabe — deshalb erscheinen nur Spiele MIT Toren.
 *
 * Das macht die Kurve zu einer Torkurve, nicht zu einer Einsatzkurve. Die
 * Beschriftung muss das sagen, sonst liest man sie falsch.
 *
 * Neueste zuerst im Rueckgabewert umgedreht: gezeichnet wird von links (alt)
 * nach rechts (neu), wie man eine Zeitachse liest.
 */
export function formkurve(matches, name, anzahl = 8) {
  if (!name) return [];
  const k = nameKey(name);
  const treffer = [];

  for (const m of matches || []) {
    // schuetzen() benutzen statt die Liste selbst zu lesen: sie faengt drei
    // Formen ab, die in den Daten wirklich vorkommen — Array von Objekten,
    // ein JSON-STRING statt eines Arrays, und blosse Namen ohne Anzahl.
    // Direkt auf g.player zuzugreifen haette die letzten beiden verschluckt.
    const zaehle = (roh) => schuetzen(roh)
      .filter((g) => nameKey(g.name) === k)
      .reduce((sum, g) => sum + g.anzahl, 0);
    const tore = zaehle(m.goalslista) + zaehle(m.goalslistb);
    if (tore > 0) treffer.push({ id: m.id, datum: m.date || m.datum || null, tore });
  }

  // Nach Datum, nicht nach id: Spiele werden nicht zwingend in der
  // Reihenfolge eingetragen, in der sie stattfanden.
  treffer.sort((a, b) => String(a.datum || '').localeCompare(String(b.datum || ''))
    || (a.id || 0) - (b.id || 0));

  return treffer.slice(-anzahl);
}
