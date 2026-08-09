/**
 * Die Geschichte über alle Saisons hinweg.
 *
 * Drei Fragen, eine Datenbasis:
 *   1. Wer liegt insgesamt vorn?           → ewigeTabelle()
 *   2. Wer kassiert die Sperren?           → disziplin()
 *   3. Was war in Saison X eigentlich los? → steckbrief()
 *
 * Der Kern ist bei allen dreien dasselbe Problem: die Saisons sind NICHT
 * gleich erfasst. FC26 hat einzelne Spiele, die Altsaisons meist nur eine
 * überlieferte Strichliste, und FC15 nicht einmal die. Wer das einebnet,
 * rechnet Äpfel mit Birnen — deshalb trägt jede Zeile ihre Herkunft mit sich
 * (`quelle`), und die Summen sagen dazu, worüber sie gebildet wurden.
 */
import { legacyInfo, siegeGesamt, LEGACY_SAISONS } from './legacySaison';

const nummer = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/**
 * Alle Saisonkennungen, die irgendwo vorkommen — älteste zuerst.
 *
 * Die bekannten Altsaisons sind IMMER dabei, auch wenn die aufrufende Ansicht
 * gerade keine Zeile daraus geladen hat: eine Saison, die es gab, soll nicht
 * durch die Ladereihenfolge verschwinden.
 */
export function alleSaisons({ matches, players, legacy = true }) {
  const set = new Set();
  for (const m of matches || []) if (m.fifa_version) set.add(m.fifa_version);
  for (const p of players || []) if (p.fifa_version) set.add(p.fifa_version);
  if (legacy) for (const v of Object.keys(LEGACY_SAISONS)) set.add(v);
  return [...set].sort((a, b) => nummer(a) - nummer(b));
}

/**
 * Eine Zeile je Saison: wer gewann wie oft, wie fielen die Tore.
 *
 * `quelle` sagt, worauf die Zeile beruht:
 *   'spiele'       aus einzelnen Spielen gerechnet (die laufende Saison)
 *   'ueberliefert' aus der Strichliste der Altsaison
 *   'ohne'         die Saison existiert, aber es gibt keine Ergebnisse (FC15)
 */
export function ewigeTabelle({ matches, saisons, nummern }) {
  const proVersion = new Map();
  for (const m of matches || []) {
    const v = m.fifa_version || 'FC25';
    if (!proVersion.has(v)) proVersion.set(v, []);
    proVersion.get(v).push(m);
  }

  return (saisons || []).map((version) => {
    const eigene = proVersion.get(version) || [];
    const basis = { version, nummer: nummern?.get(version) ?? null };

    if (eigene.length > 0) {
      let aekS = 0, realS = 0, remis = 0, aekT = 0, realT = 0;
      for (const m of eigene) {
        const a = m.goalsa || 0, b = m.goalsb || 0;
        aekT += a; realT += b;
        if (a > b) aekS += 1; else if (b > a) realS += 1; else remis += 1;
      }
      return { ...basis, quelle: 'spiele', spiele: eigene.length,
               aekSiege: aekS, realSiege: realS, remis, aekTore: aekT, realTore: realT };
    }

    const info = legacyInfo(version);
    if (info?.bilanz) {
      const b = info.bilanz;
      return { ...basis, quelle: 'ueberliefert',
               spiele: b.spiele ?? null,
               aekSiege: siegeGesamt(b.AEK), realSiege: siegeGesamt(b.Real),
               remis: b.unentschieden ?? 0,
               // Tore stehen in den Altsaisons an den Spielern, nicht an der
               // Bilanz — hier bewusst null statt einer 0, die wie "keine
               // Tore" aussähe.
               aekTore: null, realTore: null };
    }

    return { ...basis, quelle: 'ohne', spiele: null,
             aekSiege: null, realSiege: null, remis: null, aekTore: null, realTore: null };
  });
}

/**
 * Gesamtstand über die Zeilen der ewigen Tabelle.
 *
 * Gezählt wird zweierlei: die Summe aller Siege UND wie viele Saisons jeder
 * für sich entschieden hat. Das sind verschiedene Aussagen — wer eine Saison
 * hoch gewinnt und drei knapp verliert, führt bei den Siegen und liegt bei
 * den Saisons hinten.
 */
export function gesamtstand(zeilen) {
  const raus = {
    aekSiege: 0, realSiege: 0, remis: 0, spiele: 0,
    aekSaisons: 0, realSaisons: 0, unentschiedeneSaisons: 0,
    saisonsMitErgebnis: 0, saisonsOhne: 0,
  };
  for (const z of zeilen || []) {
    if (z.quelle === 'ohne') { raus.saisonsOhne += 1; continue; }
    raus.saisonsMitErgebnis += 1;
    raus.aekSiege += z.aekSiege || 0;
    raus.realSiege += z.realSiege || 0;
    raus.remis += z.remis || 0;
    raus.spiele += z.spiele || 0;
    if ((z.aekSiege || 0) > (z.realSiege || 0)) raus.aekSaisons += 1;
    else if ((z.realSiege || 0) > (z.aekSiege || 0)) raus.realSaisons += 1;
    else raus.unentschiedeneSaisons += 1;
  }
  return raus;
}

/**
 * Sperren je Team und je Spieler.
 *
 * `bans` trägt die Sperre, `players` den Namen und das Team — verbunden über
 * player_id. Verpasste Spiele sind `totalgames`, nicht `matchesserved`: die
 * Frage ist, was die Sperre gekostet hat, nicht wie viel davon schon
 * abgesessen ist.
 */
export function disziplin({ bans, players }) {
  const spielerNach = new Map((players || []).map((p) => [p.id, p]));
  const teams = { AEK: leerTeam(), Real: leerTeam(), Ehemalige: leerTeam() };
  const proSpieler = new Map();

  for (const b of bans || []) {
    const p = spielerNach.get(b.player_id);
    const team = b.team || p?.team || 'Ehemalige';
    const art = b.type || 'Unbekannt';
    const spiele = b.totalgames || 0;

    const topf = teams[team] || (teams[team] = leerTeam());
    topf.anzahl += 1;
    topf.spiele += spiele;
    topf.arten[art] = (topf.arten[art] || 0) + 1;

    const name = p?.name || b.player_name || 'Unbekannt';
    const schluessel = `${name}|${team}`;
    const e = proSpieler.get(schluessel) || { name, team, anzahl: 0, spiele: 0, arten: {}, saisons: new Set() };
    e.anzahl += 1;
    e.spiele += spiele;
    e.arten[art] = (e.arten[art] || 0) + 1;
    if (b.fifa_version) e.saisons.add(b.fifa_version);
    proSpieler.set(schluessel, e);
  }

  const liste = [...proSpieler.values()]
    .map((e) => ({ ...e, saisons: e.saisons.size }))
    .sort((a, b) => b.spiele - a.spiele || b.anzahl - a.anzahl);

  // Alle vorkommenden Sperrarten, häufigste zuerst — für die Aufschlüsselung.
  const artenGesamt = {};
  for (const t of Object.values(teams)) {
    for (const [art, n] of Object.entries(t.arten)) artenGesamt[art] = (artenGesamt[art] || 0) + n;
  }

  return {
    teams,
    spieler: liste,
    arten: Object.entries(artenGesamt).sort((a, b) => b[1] - a[1]),
    gesamt: {
      anzahl: Object.values(teams).reduce((s, t) => s + t.anzahl, 0),
      spiele: Object.values(teams).reduce((s, t) => s + t.spiele, 0),
    },
  };
}

function leerTeam() {
  return { anzahl: 0, spiele: 0, arten: {} };
}

/**
 * Steckbrief einer einzelnen Saison — das, was man beim Durchblättern wissen
 * will, ohne erst drei Filter umzustellen.
 */
export function steckbrief(version, { zeile, players, bans, sds }) {
  const kader = (players || []).filter((p) => p.fifa_version === version);
  const sperren = (bans || []).filter((b) => b.fifa_version === version);
  const auszeichnungen = (sds || []).filter((s) => s.fifa_version === version);

  const torschuetze = [...kader].sort((a, b) => (b.goals || 0) - (a.goals || 0))[0] || null;
  const teuerster = [...kader]
    .filter((p) => p.team !== 'Ehemalige')
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))[0] || null;
  const bester = [...auszeichnungen].sort((a, b) => (b.count || 0) - (a.count || 0))[0] || null;

  const nachId = new Map(kader.map((p) => [p.id, p]));
  const meisteSperren = [...sperren]
    .reduce((karte, b) => {
      const name = nachId.get(b.player_id)?.name || 'Unbekannt';
      karte.set(name, (karte.get(name) || 0) + 1);
      return karte;
    }, new Map());
  const sperrKoenig = [...meisteSperren.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  const kaderWert = (team) => kader
    .filter((p) => p.team === team)
    .reduce((s, p) => s + (Number(p.value) || 0), 0);

  return {
    version,
    zeile,
    spieler: kader.length,
    tore: kader.reduce((s, p) => s + (p.goals || 0), 0),
    sperren: sperren.length,
    auszeichnungen: auszeichnungen.reduce((s, a) => s + (a.count || 0), 0),
    torschuetze,
    teuerster,
    bester,
    sperrKoenig,
    kaderwert: { aek: kaderWert('AEK'), real: kaderWert('Real') },
  };
}
