/**
 * Spieler über alle Saisons: Tore, Auszeichnungen und Sperren an einem Ort.
 *
 * Die drei Zahlen liegen in drei Tabellen und werden unterschiedlich
 * verknuepft — das ist der Grund fuer diese Datei:
 *
 *   players            der Spieler selbst, eine Zeile je Saison
 *   spieler_des_spiels ueber NAME + Saison (keine ID-Beziehung)
 *   bans               ueber player_id, also an genau einer Saisonzeile
 *
 * Wer das je Ansicht neu zusammensucht, macht es je Ansicht anders. Deshalb
 * hier einmal, mit derselben Namensnormalisierung wie aggregatePlayers.
 */
import { aggregatePlayers, nameKey } from './playerIdentity';

/** Alle Spieler mit Toren, Auszeichnungen und Sperren je Saison. */
export function spielerStatistik({ players, sds, bans }) {
  const basis = aggregatePlayers(players);

  // Auszeichnungen nach Name + Saison. Der Name wird genauso normalisiert wie
  // in aggregatePlayers, sonst faende "Al Shahrani" seine Auszeichnung nicht,
  // die unter "Al Sharanie" steht.
  const sdsIndex = new Map();
  for (const x of sds || []) {
    const k = `${nameKey(x.name)}|${x.fifa_version || 'FC25'}`;
    sdsIndex.set(k, (sdsIndex.get(k) || 0) + (Number(x.count) || 0));
  }

  // Sperren an der Saisonzeile.
  const sperrIndex = new Map();
  for (const b of bans || []) {
    if (b.player_id == null) continue;
    const e = sperrIndex.get(b.player_id) || { anzahl: 0, spiele: 0, arten: {} };
    e.anzahl += 1;
    e.spiele += Number(b.totalgames) || 0;
    e.arten[b.type || 'Unbekannt'] = (e.arten[b.type || 'Unbekannt'] || 0) + 1;
    sperrIndex.set(b.player_id, e);
  }

  return basis.map((p) => {
    const saisons = p.seasons.map((s) => {
      const sdsZahl = sdsIndex.get(`${nameKey(p.name)}|${s.version}`)
        // Auch die anderen Schreibweisen probieren — die Auszeichnung kann
        // unter einer davon stehen.
        ?? p.spellings.reduce(
          (treffer, n) => treffer ?? sdsIndex.get(`${nameKey(n)}|${s.version}`), undefined)
        ?? 0;
      const sperre = sperrIndex.get(s.id) || { anzahl: 0, spiele: 0, arten: {} };
      return { ...s, sds: sdsZahl, sperren: sperre.anzahl, sperrSpiele: sperre.spiele, sperrArten: sperre.arten };
    });

    const arten = {};
    for (const s of saisons) {
      for (const [art, n] of Object.entries(s.sperrArten)) arten[art] = (arten[art] || 0) + n;
    }

    return {
      ...p,
      seasons: saisons,
      sds: saisons.reduce((sum, s) => sum + s.sds, 0),
      sperren: saisons.reduce((sum, s) => sum + s.sperren, 0),
      sperrSpiele: saisons.reduce((sum, s) => sum + s.sperrSpiele, 0),
      sperrArten: arten,
    };
  });
}

/** Die drei Blickwinkel auf dieselbe Liste. */
// sortLabel getrennt vom label: "Nach Tore" waere falsch, "Nach Toren" richtig.
export const MASSE = [
  { id: 'tore', label: 'Tore', sortLabel: 'Toren', feld: 'goals', icon: 'football', farbe: 'text-system-orange', balken: 'bg-system-orange/70' },
  { id: 'sds', label: 'Auszeichnungen', sortLabel: 'Auszeichnungen', feld: 'sds', icon: 'star', farbe: 'text-system-blue', balken: 'bg-system-blue/70' },
  { id: 'sperren', label: 'Sperren', sortLabel: 'Sperren', feld: 'sperren', icon: 'ban', farbe: 'text-system-red', balken: 'bg-system-red/70' },
];

/** Summen je Person (AEK/Real) über alle Saisons — für die Übersicht. */
export function summenJePerson(spieler) {
  const leer = () => ({ tore: 0, sds: 0, sperren: 0, sperrSpiele: 0, spieler: 0, arten: {} });
  const raus = { AEK: leer(), Real: leer(), Ehemalige: leer() };
  for (const p of spieler) {
    for (const s of p.seasons) {
      const topf = raus[s.team];
      if (!topf) continue;
      topf.tore += s.goals;
      topf.sds += s.sds;
      topf.sperren += s.sperren;
      topf.sperrSpiele += s.sperrSpiele;
      topf.spieler += 1;
      for (const [art, n] of Object.entries(s.sperrArten)) {
        topf.arten[art] = (topf.arten[art] || 0) + n;
      }
    }
  }
  return raus;
}

/**
 * Kleine Fundstücke, die sonst niemand sieht.
 *
 * Bewusst nur Dinge, die aus den vorhandenen Zahlen folgen — keine
 * Hochrechnungen, keine „wahrscheinlich"-Aussagen.
 */
export function fundstuecke(spieler) {
  const mitToren = spieler.filter((p) => p.goals > 0);
  const raus = [];

  const dauerbrenner = [...spieler].sort((a, b) => b.seasons.length - a.seasons.length)[0];
  if (dauerbrenner && dauerbrenner.seasons.length > 1) {
    raus.push({
      id: 'dauerbrenner', icon: 'calendar', farbe: 'text-system-purple',
      titel: 'Dauerbrenner',
      text: `${dauerbrenner.name} war in ${dauerbrenner.seasons.length} Saisons dabei.`,
    });
  }

  // Wer trifft am zuverlaessigsten je Saison, in der er dabei war?
  const schnitt = mitToren
    .filter((p) => p.seasons.length >= 2)
    .map((p) => ({ p, wert: p.goals / p.seasons.length }))
    .sort((a, b) => b.wert - a.wert)[0];
  if (schnitt) {
    raus.push({
      id: 'schnitt', icon: 'trendingUp', farbe: 'text-system-green',
      titel: 'Bester Schnitt',
      text: `${schnitt.p.name}: ${schnitt.wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tore je Saison.`,
    });
  }

  const haerteste = [...spieler].sort((a, b) => b.sperrSpiele - a.sperrSpiele)[0];
  if (haerteste && haerteste.sperrSpiele > 0) {
    raus.push({
      id: 'sperren', icon: 'ban', farbe: 'text-system-red',
      titel: 'Meiste Sperrspiele',
      text: `${haerteste.name} fehlte ${haerteste.sperrSpiele} ${haerteste.sperrSpiele === 1 ? 'Spiel' : 'Spiele'}`
        + ` bei ${haerteste.sperren} ${haerteste.sperren === 1 ? 'Sperre' : 'Sperren'}.`,
    });
  }

  const ausgezeichnet = [...spieler].sort((a, b) => b.sds - a.sds)[0];
  if (ausgezeichnet && ausgezeichnet.sds > 0) {
    raus.push({
      id: 'sds', icon: 'star', farbe: 'text-system-blue',
      titel: 'Meiste Auszeichnungen',
      text: `${ausgezeichnet.name} wurde ${ausgezeichnet.sds}× Spieler des Spiels.`,
    });
  }

  // Ein Tor, eine Saison, nie wieder gesehen.
  const eintagsfliegen = mitToren.filter((p) => p.seasons.length === 1 && p.goals === 1).length;
  if (eintagsfliegen > 0) {
    raus.push({
      id: 'eintagsfliegen', icon: 'zap', farbe: 'text-system-yellow',
      titel: 'Ein Tor, dann weg',
      text: eintagsfliegen === 1
        ? 'Ein Spieler traf genau einmal und tauchte nie wieder auf.'
        : `${eintagsfliegen} Spieler trafen genau einmal und tauchten nie wieder auf.`,
    });
  }

  const teuerster = spieler
    .flatMap((p) => p.seasons.map((s) => ({ name: p.name, ...s })))
    .sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  if (teuerster && teuerster.value > 0) {
    raus.push({
      id: 'teuerster', icon: 'euro', farbe: 'text-system-teal',
      titel: 'Teuerster Spieler',
      text: `${teuerster.name} stand in ${teuerster.version} mit ${teuerster.value} Mio in den Büchern.`,
    });
  }

  return raus;
}
