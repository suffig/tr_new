// Auswertungen zu den Team-Ziehungen und den Spielduellen.
//
// Bewusst reine Rechenfunktionen ohne React: so lassen sie sich einzeln lesen
// und pruefen, und die Ansicht bleibt reine Darstellung.
//
// Eine Ziehung hat die Form { person, team, rating, women, national, ts, saison? }.
// `rating` ist die Sternewertung des Teams (0,5 bis 5,0) und kann null sein,
// wenn ein Team ohne Wertung im Katalog steht.

/** Nur Ziehungen mit brauchbarer Wertung — alles andere verzerrt Mittelwerte. */
const mitRating = (pulls) => (pulls || []).filter((p) => Number.isFinite(Number(p.rating)));

const mittel = (zahlen) =>
  zahlen.length ? zahlen.reduce((s, z) => s + z, 0) / zahlen.length : null;

/**
 * Glücks-Index einer Person: Durchschnitt der gezogenen Sterne.
 *
 * Der Vergleichswert ist der Durchschnitt des KATALOGS, nicht 2,75 (die Mitte
 * der Skala) — im Katalog liegen sehr viel mehr Teams im Mittelfeld als an den
 * Raendern, ein reiner Skalen-Mittelwert wuerde beide Personen dauerhaft als
 * "unter Erwartung" ausweisen.
 *
 * @param {Array} pulls Ziehungen einer Person
 * @param {number|null} katalogSchnitt Durchschnittliche Sterne aller ziehbaren Teams
 */
export function gluecksIndex(pulls, katalogSchnitt) {
  const werte = mitRating(pulls).map((p) => Number(p.rating));
  const schnitt = mittel(werte);
  if (schnitt == null) return { schnitt: null, abweichung: null, anzahl: 0 };
  const basis = Number.isFinite(Number(katalogSchnitt)) ? Number(katalogSchnitt) : null;
  return {
    schnitt,
    abweichung: basis == null ? null : schnitt - basis,
    anzahl: werte.length,
    bestes: Math.max(...werte),
    schlechtestes: Math.min(...werte),
  };
}

/** Durchschnittliche Sterne aller Teams im Katalog. */
export function katalogSchnitt(catalog) {
  return mittel((catalog || []).map((t) => Number(t.rating)).filter(Number.isFinite));
}

/**
 * Verteilung der gezogenen Sterne, absteigend von 5,0 bis 0,5.
 * Feste Klassen statt "nur was vorkam", damit die Balken beider Personen
 * uebereinander liegen und man sie vergleichen kann.
 */
export const STERNE_KLASSEN = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

export function sterneVerteilung(pulls) {
  const zaehler = new Map(STERNE_KLASSEN.map((k) => [k, 0]));
  let ohneWertung = 0;
  for (const p of pulls || []) {
    const r = Number(p.rating);
    if (!Number.isFinite(r)) { ohneWertung++; continue; }
    // Auf die naechste halbe Stufe runden — Katalogwerte sind halbe Sterne,
    // ein per Hand gesetztes 3,7 soll trotzdem in einer Klasse landen.
    const klasse = Math.min(5, Math.max(0.5, Math.round(r * 2) / 2));
    zaehler.set(klasse, (zaehler.get(klasse) || 0) + 1);
  }
  return { klassen: STERNE_KLASSEN.map((k) => ({ sterne: k, anzahl: zaehler.get(k) || 0 })), ohneWertung };
}

/** Ziehungen je Saison (FIFA-Version), aelteste zuerst. */
export function proSaison(pulls, personen) {
  const map = new Map();
  for (const p of pulls || []) {
    const s = p.saison || 'unbekannt';
    if (!map.has(s)) map.set(s, { saison: s, gesamt: 0, ...Object.fromEntries(personen.map((x) => [x, 0])) });
    const eintrag = map.get(s);
    eintrag.gesamt++;
    if (eintrag[p.person] != null) eintrag[p.person]++;
  }
  const nummer = (v) => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
  return [...map.values()].sort((a, b) => nummer(a.saison) - nummer(b.saison));
}

/**
 * Ziehungen je Kalenderwoche, aelteste zuerst, ohne Luecken.
 * Leere Wochen werden aufgefuellt — sonst wirkt eine Pause von drei Wochen im
 * Diagramm wie ein normaler Abstand.
 */
export function proWoche(pulls, personen, maxWochen = 12) {
  const wochenStart = (d) => {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    // Montag als Wochenanfang (getDay: So = 0)
    const versatz = (t.getDay() + 6) % 7;
    t.setDate(t.getDate() - versatz);
    return t;
  };
  const gueltig = (pulls || []).filter((p) => !Number.isNaN(new Date(p.ts).getTime()));
  if (!gueltig.length) return [];

  const map = new Map();
  for (const p of gueltig) {
    const key = wochenStart(p.ts).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, Object.fromEntries(personen.map((x) => [x, 0])));
    const e = map.get(key);
    if (e[p.person] != null) e[p.person]++;
  }

  const letzte = wochenStart(gueltig[gueltig.length - 1].ts);
  const erste = wochenStart(gueltig[0].ts);
  const reihe = [];
  for (let d = new Date(letzte); d >= erste && reihe.length < maxWochen; d.setDate(d.getDate() - 7)) {
    const key = d.toISOString().slice(0, 10);
    const e = map.get(key) || Object.fromEntries(personen.map((x) => [x, 0]));
    reihe.unshift({
      woche: key,
      label: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
      ...e,
      gesamt: personen.reduce((s, x) => s + (e[x] || 0), 0),
    });
  }
  return reihe;
}

/** Meistgezogene Teams einer Person. */
export function topTeams(pulls, limit = 5) {
  const map = new Map();
  for (const p of pulls || []) {
    const e = map.get(p.team) || { team: p.team, anzahl: 0, rating: p.rating };
    e.anzahl++;
    map.set(p.team, e);
  }
  return [...map.values()]
    .sort((a, b) => b.anzahl - a.anzahl || a.team.localeCompare(b.team, 'de'))
    .slice(0, limit);
}

/** Anteil Frauen- und Nationalteams. */
export function typVerteilung(pulls) {
  const gesamt = (pulls || []).length;
  const frauen = (pulls || []).filter((p) => p.women).length;
  const national = (pulls || []).filter((p) => p.national).length;
  return { gesamt, frauen, national, vereine: gesamt - frauen - national };
}

/* ---------------------------------------------------------------------------
   Spielduelle
   -------------------------------------------------------------------------- */

/**
 * Bilanz der Spielduelle.
 *
 * Underdog-Quote = Anteil der Duelle, die das SCHWAECHERE Team gewonnen hat.
 * Duelle ohne beide Ratings und Duelle mit gleicher Staerke zaehlen dafuer
 * nicht mit (bei Gleichstand gibt es keinen Underdog), stehen aber weiter in
 * der Gesamtbilanz — sonst waere die Zahl der Siege je nach Karte verschieden.
 *
 * @param {Array} duelle aus duelleAusHistorie()
 * @param {string[]} personen Schluessel wie in den Duell-Daten ('alex', 'philip')
 */
export function duellBilanz(duelle, personen) {
  const siege = Object.fromEntries(personen.map((p) => [p, 0]));
  let underdogSiege = 0;
  let vergleichbar = 0;
  const differenzen = [];

  for (const d of duelle || []) {
    if (siege[d.sieger] != null) siege[d.sieger]++;

    const rS = Number(d.teams?.[d.sieger]?.rating);
    const rV = Number(d.teams?.[d.verlierer]?.rating);
    if (!Number.isFinite(rS) || !Number.isFinite(rV) || rS === rV) continue;
    vergleichbar++;
    differenzen.push(rS - rV);
    if (rS < rV) underdogSiege++;
  }

  const gesamt = (duelle || []).length;
  return {
    gesamt,
    siege,
    fuehrend: personen.reduce((a, b) => (siege[b] > siege[a] ? b : a), personen[0]),
    unentschiedenInBilanz: personen.length === 2 && siege[personen[0]] === siege[personen[1]],
    underdogSiege,
    vergleichbar,
    underdogQuote: vergleichbar ? underdogSiege / vergleichbar : null,
    // Positiv = der Sieger war im Schnitt das staerkere Team.
    schnittDifferenz: mittel(differenzen),
    serie: aktuelleSerie(duelle),
  };
}

/** Laufende Siegesserie am Ende der Liste. */
function aktuelleSerie(duelle) {
  const liste = duelle || [];
  if (!liste.length) return { person: null, laenge: 0 };
  const person = liste[liste.length - 1].sieger;
  let laenge = 0;
  for (let i = liste.length - 1; i >= 0 && liste[i].sieger === person; i--) laenge++;
  return { person, laenge };
}

/**
 * Verlauf der Sterne-Zaehler als kumulative Reihe.
 * @param {Array} history Verlauf aus loadSterne()
 */
export function sterneVerlauf(history) {
  const reihe = [];
  const stand = { alex: 0, philip: 0 };
  for (const e of history || []) {
    const key = e.person === 'alex' || e.person === 'alexander' ? 'alex' : 'philip';
    stand[key] += Number(e.gained) || 0;
    reihe.push({
      timestamp: e.timestamp,
      alex: Math.round(stand.alex * 10) / 10,
      philip: Math.round(stand.philip * 10) / 10,
      person: key,
      gained: Number(e.gained) || 0,
      ausDuell: !!(e.duell || (typeof e.info === 'string' && e.info.startsWith('Spielduell'))),
    });
  }
  return reihe;
}
