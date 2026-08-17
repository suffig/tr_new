/**
 * Was an einem gerade eingetragenen Spiel bemerkenswert war.
 *
 * WARUM ES DAS BRAUCHT
 * Ein Rekord fällt still: man trägt ein Spiel ein, und dass es der höchste
 * Sieg aller Zeiten war, merkt man Wochen später zufällig in der Statistik —
 * oder nie. Der Moment, in dem es interessiert, ist direkt nach dem
 * Speichern.
 *
 * DIE ALTEN SPIELE SIND OHNE DAS NEUE ZU ÜBERGEBEN
 * Sonst vergleicht das neue Spiel gegen sich selbst und ist nie ein Rekord
 * (bei ">") oder immer einer (bei ">="). Deshalb nimmt jede Prüfung hier
 * `vorher` und `neu` getrennt entgegen.
 *
 * EIN ERSTES SPIEL IST KEIN REKORD
 * Ohne Vergleichswert ist jede Zahl gleichzeitig höchste und niedrigste.
 * Ist `vorher` leer, kommt nichts zurück — das erste Spiel als "Rekord!" zu
 * feiern wäre eine leere Geste.
 */

const zahl = (x) => Number(x) || 0;
const tore = (m) => zahl(m.goalsa) + zahl(m.goalsb);
const abstand = (m) => Math.abs(zahl(m.goalsa) - zahl(m.goalsb));

/** Torschützen eines Spiels als [{name, anzahl}] — beide Listen zusammen. */
function schuetzen(m) {
  const raus = [];
  for (const feld of ['goalslista', 'goalslistb']) {
    let liste = m?.[feld];
    if (typeof liste === 'string') { try { liste = JSON.parse(liste); } catch { liste = []; } }
    for (const g of Array.isArray(liste) ? liste : []) {
      const name = typeof g === 'object' && g !== null ? g.player : g;
      const anzahl = typeof g === 'object' && g !== null ? (Number(g.count) || 1) : 1;
      if (name) raus.push({ name: String(name), anzahl });
    }
  }
  return raus;
}

/**
 * Prüft ein frisch eingetragenes Spiel gegen alle vorherigen.
 *
 * Gibt eine Liste zurück — mehrere Rekorde in einem Spiel sind möglich und
 * sollen nicht gegeneinander ausgespielt werden.
 */
export function rekordeDesSpiels(neu, vorher) {
  if (!neu || !Array.isArray(vorher) || vorher.length === 0) return [];
  const raus = [];

  // 1. Höchster Sieg (Tordifferenz)
  const bisher = Math.max(...vorher.map(abstand));
  const jetzt = abstand(neu);
  if (jetzt > bisher && jetzt > 0) {
    const wer = zahl(neu.goalsa) > zahl(neu.goalsb) ? 'Alexander' : 'Philip';
    raus.push({
      id: 'abstand', icon: 'trophy',
      titel: 'Höchster Sieg aller Zeiten',
      text: `${wer} gewinnt mit ${jetzt} Toren Unterschied — der bisherige Höchstwert war ${bisher}.`,
    });
  }

  // 2. Meiste Tore in einem Spiel (beide zusammen)
  const bisherTore = Math.max(...vorher.map(tore));
  if (tore(neu) > bisherTore) {
    raus.push({
      id: 'tore', icon: 'football',
      titel: 'Torreichstes Spiel',
      text: `${tore(neu)} Tore in einem Spiel — bisher waren ${bisherTore} das Höchste.`,
    });
  }

  // 3. Bestes Einzelspiel eines Spielers
  const bisherEinzel = Math.max(0, ...vorher.flatMap((m) => schuetzen(m).map((g) => g.anzahl)));
  for (const g of schuetzen(neu)) {
    if (g.anzahl > bisherEinzel) {
      raus.push({
        id: `einzel-${g.name}`, icon: 'star',
        titel: 'Bestleistung eines Spielers',
        text: `${g.name} trifft ${g.anzahl}× in einem Spiel — bisher waren ${bisherEinzel} das Höchste.`,
      });
    }
  }

  // 4. Siegesserie. Nur die des Gewinners, und nur ab drei: zwei Siege
  //    hintereinander sind keine Serie, sondern zwei Siege.
  const sieger = zahl(neu.goalsa) > zahl(neu.goalsb) ? 'a'
    : zahl(neu.goalsb) > zahl(neu.goalsa) ? 'b' : null;
  if (sieger) {
    // Nach Datum, nicht nach id: Spiele werden nicht zwingend in der
    // Reihenfolge eingetragen, in der sie stattfanden.
    const sortiert = [...vorher].sort((x, y) =>
      String(y.date || '').localeCompare(String(x.date || '')) || (y.id || 0) - (x.id || 0));
    let serie = 1;
    for (const m of sortiert) {
      const s = zahl(m.goalsa) > zahl(m.goalsb) ? 'a'
        : zahl(m.goalsb) > zahl(m.goalsa) ? 'b' : null;
      if (s === sieger) serie++; else break;
    }
    if (serie >= 3) {
      raus.push({
        id: 'serie', icon: 'zap',
        titel: `${serie} Siege in Folge`,
        text: `${sieger === 'a' ? 'Alexander' : 'Philip'} gewinnt zum ${serie}. Mal hintereinander.`,
      });
    }
  }

  return raus;
}
