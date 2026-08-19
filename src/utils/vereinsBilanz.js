/**
 * Mit welchem Verein gewinnt wer wie oft?
 *
 * Die Vereine werden gezogen, nicht gewählt. Ohne diese Auswertung sieht man
 * nur, wer öfter gewonnen hat — nicht, ob ein Verein wirklich stärker ist
 * oder jemand ihn nur häufiger bekommen hat.
 *
 * JEDES SPIEL ZÄHLT FÜR ZWEI VEREINE
 * Einmal für den auf Alexanders Seite, einmal für den auf Philips. Ein 3:1
 * ist für den einen ein Sieg und für den anderen eine Niederlage — beides
 * gehört in die Tabelle, sonst fehlte die halbe Wahrheit.
 *
 * MINDESTZAHL STATT ZUFALLSSIEGER
 * Ein Verein mit einem einzigen Spiel hätte 100 % Siegquote und stünde ganz
 * oben. Das ist kein Ergebnis, sondern ein Zufall — deshalb wird nach
 * Spielen sortiert und die Quote nur ab einer Mindestzahl hervorgehoben.
 */

const zahl = (x) => Number(x) || 0;

/**
 * WOHER DER VEREINSNAME KOMMT — die eigentliche Schwierigkeit.
 *
 * `matches.teama` und `.teamb` enthalten NICHT den Verein, sondern die SEITE
 * ('AEK' / 'Real'). Der Verein haengt an der Saison: in FC25 hiessen die
 * Seiten AEK und Real, in FC26 Dynamo Dresden und Schalke 04. Wer einfach
 * `m.teama` als Verein nimmt, bekommt eine Tabelle mit genau zwei Zeilen,
 * die nichts weiter ist als die Gesamtbilanz in Tarnung — das war mein
 * erster Entwurf, und im Browser stand dann "AEK 5-1-2, Real 2-1-5".
 *
 * Deshalb wird der Name ueber `getTeamDisplay(seite, fifa_version)`
 * aufgeloest, dieselbe Quelle, aus der auch Kader und Spieleliste ihre
 * Vereinsnamen nehmen.
 */
export function vereinsBilanz(matches, nameVon, mindestens = 3) {
  const nach = new Map();

  const eintrag = (verein) => {
    if (!nach.has(verein)) {
      nach.set(verein, {
        verein, spiele: 0, siege: 0, remis: 0, niederlagen: 0,
        tore: 0, gegentore: 0,
        // Wer hatte diesen Verein wie oft?
        beiAek: 0, beiReal: 0,
      });
    }
    return nach.get(verein);
  };

  for (const m of matches || []) {
    const ta = zahl(m.goalsa), tr = zahl(m.goalsb);
    const seiten = [
      { verein: nameVon(m.teama || 'AEK', m.fifa_version), eigene: ta, fremde: tr, wer: 'aek' },
      { verein: nameVon(m.teamb || 'Real', m.fifa_version), eigene: tr, fremde: ta, wer: 'real' },
    ];
    for (const s of seiten) {
      if (!s.verein) continue;
      const e = eintrag(String(s.verein));
      e.spiele += 1;
      e.tore += s.eigene;
      e.gegentore += s.fremde;
      if (s.eigene > s.fremde) e.siege += 1;
      else if (s.eigene < s.fremde) e.niederlagen += 1;
      else e.remis += 1;
      if (s.wer === 'aek') e.beiAek += 1; else e.beiReal += 1;
    }
  }

  return [...nach.values()]
    .map((e) => ({
      ...e,
      quote: e.spiele ? e.siege / e.spiele : 0,
      differenz: e.tore - e.gegentore,
      // Erst ab der Mindestzahl ist die Quote eine Aussage.
      aussagekraeftig: e.spiele >= mindestens,
    }))
    // Nach Spielen, nicht nach Quote: sonst stünde ein Verein mit einem
    // einzigen Sieg ganz oben.
    .sort((a, b) => b.spiele - a.spiele
      || b.quote - a.quote
      || String(a.verein).localeCompare(String(b.verein), 'de'));
}
