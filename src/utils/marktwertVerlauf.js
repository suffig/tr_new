/**
 * Marktwerte über die Saisons hinweg.
 *
 * `players` hält je Saison eine eigene Zeile pro Spieler — derselbe Mensch
 * taucht in FC24, FC25 und FC26 dreimal auf, mit unterschiedlichem Wert. Aus
 * diesen Zeilen lässt sich beantworten, wer teurer wurde, welcher Kader der
 * wertvollste war und wen man sich über Jahre geleistet hat. Bisher wurde
 * `value` nur als Momentaufnahme der laufenden Saison angezeigt.
 *
 * Alle Werte stehen in Millionen, so wie sie in der Datenbank liegen.
 */
// Die Saisonnummern kommen als Map von aussen (saisonNummern()) — hier keine
// zweite Zaehlweise aufmachen, das war schon einmal die Ursache dafuer, dass
// dieselbe Saison an zwei Stellen verschiedene Nummern hatte.

const nummer = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/** Saisonkennungen in Spielreihenfolge — FC15 vor FC26. */
export function saisonReihenfolge(spieler) {
  return [...new Set((spieler || []).map((p) => p.fifa_version).filter(Boolean))]
    .sort((a, b) => nummer(a) - nummer(b));
}

/**
 * Kaderwert je Saison und Team.
 *
 * Ehemalige zählen NICHT mit: sie stehen für abgegebene Spieler und wären in
 * einer Kadersumme ein Wert, den niemand besitzt.
 */
export function kaderWerte(spieler, nummern = null) {
  const saisons = saisonReihenfolge(spieler);
  return saisons.map((version) => {
    const zeilen = (spieler || []).filter((p) => p.fifa_version === version);
    const je = (team) => {
      const eigene = zeilen.filter((p) => p.team === team);
      return {
        wert: eigene.reduce((s, p) => s + (Number(p.value) || 0), 0),
        anzahl: eigene.length,
      };
    };
    const aek = je('AEK');
    const real = je('Real');
    return {
      version,
      nummer: nummern?.get(version) ?? null,
      aek,
      real,
      gesamt: aek.wert + real.wert,
      // Der teuerste Spieler der Saison, egal bei wem.
      teuerster: [...zeilen]
        .filter((p) => p.team !== 'Ehemalige' && Number(p.value) > 0)
        .sort((a, b) => Number(b.value) - Number(a.value))[0] || null,
    };
  });
}

/**
 * Ein Spieler über die Saisons.
 *
 * Zusammengeführt wird über den NAMEN, nicht über die id — die ist je Saison
 * eine andere. Gleiche Schreibweise vorausgesetzt; das ist dieselbe Annahme,
 * unter der die Spielerstatistik im Duell schon arbeitet.
 */
export function spielerVerlauf(spieler, nummern = null) {
  const proName = new Map();
  for (const p of spieler || []) {
    const name = String(p.name || '').trim();
    if (!name) continue;
    if (!proName.has(name)) proName.set(name, []);
    proName.get(name).push(p);
  }

  return [...proName.entries()].map(([name, zeilen]) => {
    const sortiert = [...zeilen].sort((a, b) => nummer(a.fifa_version) - nummer(b.fifa_version));
    const werte = sortiert.map((p) => Number(p.value) || 0);
    const erster = werte[0];
    const letzter = werte[werte.length - 1];
    return {
      name,
      saisons: sortiert.map((p) => ({
        version: p.fifa_version,
        nummer: nummern?.get(p.fifa_version) ?? null,
        wert: Number(p.value) || 0,
        team: p.team,
        position: p.position,
      })),
      anzahlSaisons: sortiert.length,
      erster,
      letzter,
      hoechster: Math.max(...werte),
      niedrigster: Math.min(...werte),
      // Differenz nur, wenn es überhaupt zwei Stände gibt.
      veraenderung: sortiert.length > 1 ? letzter - erster : null,
      teamZuletzt: sortiert[sortiert.length - 1]?.team,
    };
  }).sort((a, b) => b.hoechster - a.hoechster);
}

/**
 * Fundstücke aus den Werten — nur, was aus den Zahlen folgt.
 */
export function wertFundstuecke(verlauf, kader) {
  const raus = [];
  const mitVerlauf = verlauf.filter((v) => v.veraenderung != null);

  const gestiegen = [...mitVerlauf].sort((a, b) => b.veraenderung - a.veraenderung)[0];
  if (gestiegen && gestiegen.veraenderung > 0) {
    raus.push({
      id: 'gestiegen', icon: 'trendingUp', farbe: 'text-system-green',
      titel: 'Größter Wertzuwachs',
      text: `${gestiegen.name} — von ${mio(gestiegen.erster)} auf ${mio(gestiegen.letzter)} `
        + `über ${gestiegen.anzahlSaisons} Saisons.`,
    });
  }

  const gefallen = [...mitVerlauf].sort((a, b) => a.veraenderung - b.veraenderung)[0];
  if (gefallen && gefallen.veraenderung < 0) {
    raus.push({
      id: 'gefallen', icon: 'chart', farbe: 'text-system-red',
      titel: 'Größter Wertverlust',
      text: `${gefallen.name} — von ${mio(gefallen.erster)} auf ${mio(gefallen.letzter)}.`,
    });
  }

  const teuerster = verlauf[0];
  if (teuerster) {
    const wo = teuerster.saisons.find((s) => s.wert === teuerster.hoechster);
    raus.push({
      id: 'teuerster', icon: 'trophy', farbe: 'text-system-yellow',
      titel: 'Teuerster Spieler aller Zeiten',
      text: `${teuerster.name} — ${mio(teuerster.hoechster)}${wo ? ` in ${wo.version}` : ''}.`,
    });
  }

  const dauerbrenner = [...verlauf].sort((a, b) => b.anzahlSaisons - a.anzahlSaisons)[0];
  if (dauerbrenner && dauerbrenner.anzahlSaisons > 1) {
    raus.push({
      id: 'dauerbrenner', icon: 'clock', farbe: 'text-system-blue',
      titel: 'Längste Zugehörigkeit',
      text: `${dauerbrenner.name} — in ${dauerbrenner.anzahlSaisons} Saisons im Kader.`,
    });
  }

  const teuersterKader = [...(kader || [])].sort((a, b) => b.gesamt - a.gesamt)[0];
  if (teuersterKader && teuersterKader.gesamt > 0) {
    raus.push({
      id: 'kader', icon: 'users', farbe: 'text-system-purple',
      titel: 'Wertvollste Saison',
      text: `${teuersterKader.version} — beide Kader zusammen ${mio(teuersterKader.gesamt)}.`,
    });
  }

  return raus;
}

/** Millionen deutsch: "12,5 Mio €". */
export function mio(n) {
  return `${Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio €`;
}
