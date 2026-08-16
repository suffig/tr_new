/**
 * Serien und Läufe — was die Summen nicht zeigen.
 *
 * Die App rechnet überall Gesamtzahlen: 243 Siege, 187 Niederlagen. Was nach
 * einem Abend aber erzählt wird, ist „drei in Folge" oder „seit fünf Spielen
 * kein Gegentor". Das steht in denselben Daten und war bisher nirgends zu
 * sehen.
 *
 * ZEITLICHE ORDNUNG IST HIER DIE GANZE ARBEIT
 * Eine Serie ist nur so richtig wie die Reihenfolge. Die Spiele kommen aus
 * der Datenbank absteigend nach id; für Serien müssen sie aufsteigend nach
 * DATUM und innerhalb eines Tages nach id (= Eingabereihenfolge) sortiert
 * sein. Genau das ist die Ordnung, in der auch die Spielnummern eines Abends
 * vergeben werden.
 *
 * ALTSAISONS HABEN KEINE SERIEN
 * Aus FC15–FC24 sind nur Gesamtzahlen überliefert, keine Einzelspiele. Wo
 * keine Spiele stehen, gibt es hier nichts — leere Serien werden nicht
 * erfunden.
 */

/** Spiele in echter zeitlicher Reihenfolge, älteste zuerst. */
export function chronologisch(matches) {
  return [...(matches || [])].sort((a, b) => {
    const da = String(a.date || ''), db = String(b.date || '');
    if (da !== db) return da < db ? -1 : 1;
    return (a.id || 0) - (b.id || 0);
  });
}

/** 'AEK' | 'Real' | null (Unentschieden) */
function sieger(m) {
  const a = Number(m.goalsa) || 0, b = Number(m.goalsb) || 0;
  if (a === b) return null;
  return a > b ? 'AEK' : 'Real';
}

/**
 * Der aktuell laufende Lauf einer Seite: wie viele Spiele am Stück.
 *
 * Ein Unentschieden beendet sowohl eine Sieges- als auch eine
 * Niederlagenserie — es ist keins von beidem und darf keine der beiden
 * fortschreiben.
 */
export function aktuelleSerie(matches) {
  const spiele = chronologisch(matches);
  if (!spiele.length) return null;

  const letzte = spiele.at(-1);
  const gewinner = sieger(letzte);
  if (gewinner === null) return { art: 'unentschieden', seite: null, laenge: zaehleRueckwaerts(spiele, (m) => sieger(m) === null) };

  return { art: 'sieg', seite: gewinner, laenge: zaehleRueckwaerts(spiele, (m) => sieger(m) === gewinner) };
}

function zaehleRueckwaerts(spiele, passt) {
  let n = 0;
  for (let i = spiele.length - 1; i >= 0; i--) {
    if (!passt(spiele[i])) break;
    n++;
  }
  return n;
}

/**
 * Die längste Serie je Seite, mit dem Zeitraum.
 *
 * Der Zeitraum steht dabei, weil „5 Siege am Stück" ohne Datum nicht
 * einzuordnen ist — vor allem, wenn er lange her ist.
 */
export function laengsteSerien(matches) {
  const spiele = chronologisch(matches);
  const beste = { AEK: null, Real: null };
  const laufend = { AEK: 0, Real: 0 };
  const start = { AEK: null, Real: null };

  for (const m of spiele) {
    const gew = sieger(m);
    for (const seite of ['AEK', 'Real']) {
      if (gew === seite) {
        if (laufend[seite] === 0) start[seite] = m.date;
        laufend[seite]++;
        if (!beste[seite] || laufend[seite] > beste[seite].laenge) {
          beste[seite] = { laenge: laufend[seite], von: start[seite], bis: m.date };
        }
      } else {
        // Auch ein Unentschieden reisst die Serie ab.
        laufend[seite] = 0;
      }
    }
  }
  return beste;
}

/**
 * Die letzten N Ergebnisse als Form-Kette, jüngstes zuletzt.
 * Aus Sicht der angegebenen Seite: 'S' Sieg, 'U' unentschieden, 'N' Niederlage.
 */
export function formKette(matches, seite, anzahl = 5) {
  return chronologisch(matches).slice(-anzahl).map((m) => {
    const gew = sieger(m);
    if (gew === null) return 'U';
    return gew === seite ? 'S' : 'N';
  });
}

/**
 * Auffällige Läufe, die gerade laufen — nur solche, die etwas bedeuten.
 *
 * Ein Lauf von 1 ist kein Lauf. Erst ab 3 wird daraus etwas, das man erwähnt;
 * darunter entstünde nur Rauschen auf der Startseite.
 */
export function bemerkenswerteLaeufe(matches, mindest = 3) {
  const spiele = chronologisch(matches);
  if (spiele.length < mindest) return [];
  const raus = [];

  const serie = aktuelleSerie(spiele);
  if (serie && serie.laenge >= mindest) {
    raus.push(serie.art === 'sieg'
      ? { art: 'siegesserie', seite: serie.seite, wert: serie.laenge,
          text: `${serie.laenge} Siege am Stück` }
      : { art: 'remisserie', seite: null, wert: serie.laenge,
          text: `${serie.laenge} Unentschieden am Stück` });
  }

  // Zu Null: wie viele Spiele in Folge hat eine Seite kein Gegentor kassiert.
  for (const seite of ['AEK', 'Real']) {
    const gegentore = (m) => (seite === 'AEK' ? Number(m.goalsb) : Number(m.goalsa)) || 0;
    const n = zaehleRueckwaerts(spiele, (m) => gegentore(m) === 0);
    if (n >= mindest) {
      raus.push({ art: 'zuNull', seite, wert: n, text: `${n} Spiele ohne Gegentor` });
    }
  }

  // Torlaune: in Folge mindestens drei eigene Tore.
  for (const seite of ['AEK', 'Real']) {
    const eigene = (m) => (seite === 'AEK' ? Number(m.goalsa) : Number(m.goalsb)) || 0;
    const n = zaehleRueckwaerts(spiele, (m) => eigene(m) >= 3);
    if (n >= mindest) {
      raus.push({ art: 'torlaune', seite, wert: n, text: `${n}× drei Tore oder mehr` });
    }
  }

  return raus.sort((a, b) => b.wert - a.wert);
}
