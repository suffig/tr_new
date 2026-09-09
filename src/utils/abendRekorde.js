import { boersenStatistik, schnittNote, rechnung } from './bierboerse';

/**
 * Bestmarken der Abende.
 *
 * Für die Spiele gibt es Rekorde, für die Abende bisher nicht — dabei ist
 * das die andere Hälfte der App und die Hälfte, die dem Namen 90Proof
 * überhaupt seinen Sinn gibt.
 *
 * JEDER REKORD NENNT SEINEN ABEND
 * „Meiste Biere: 9" allein ist eine Zahl. Mit dem Abend dahinter wird es
 * eine Erinnerung — und man kann nachsehen.
 *
 * KEIN REKORD OHNE GRUNDLAGE
 * Bestmarken, für die es keinen Wert gibt, erscheinen gar nicht. Eine
 * Bestmarke mit „—" ist keine.
 */

const zahl = (x) => Number(x) || 0;

export function abendRekorde(boersen, verkostungen, katalog) {
  const abende = (boersen || []).map((b) => {
    const eigene = (verkostungen || []).filter((v) => v.boerse_id === b.id);
    const s = boersenStatistik(eigene, katalog);
    const noten = eigene.map(schnittNote).filter((n) => n != null);
    const kasse = rechnung(eigene);
    return {
      boerse: b,
      biere: s.biere,
      glaeser: s.glaeser,
      liter: s.liter,
      ausgaben: s.ausgaben,
      standardglaeser: zahl(s.standardglaeser),
      schnitt: noten.length ? noten.reduce((x, y) => x + y, 0) / noten.length : null,
      bewertet: noten.length,
      // Ein offener Ausgleich heißt: an dem Abend wurde nicht abgerechnet.
      ausgleich: Math.abs(zahl(kasse.ausgleich)),
    };
  }).filter((a) => a.glaeser > 0);

  if (abende.length === 0) return [];

  // Ein Rekord entsteht nur, wenn `wert` eine Zahl liefert. Sonst gibt es
  // ihn nicht — statt einer Zeile mit Strich.
  const marken = [
    { id: 'biere', icon: 'beer', titel: 'Meiste Biere',
      wert: (a) => a.biere, zeige: (n) => `${n} ${n === 1 ? 'Bier' : 'Biere'}` },
    { id: 'glaeser', icon: 'glass', titel: 'Meiste Gläser',
      wert: (a) => a.glaeser, zeige: (n) => `${n} ${n === 1 ? 'Glas' : 'Gläser'}` },
    { id: 'liter', icon: 'chart', titel: 'Meiste Liter',
      wert: (a) => a.liter,
      zeige: (n) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} l` },
    { id: 'ausgaben', icon: 'euro', titel: 'Teuerster Abend',
      wert: (a) => a.ausgaben,
      zeige: (n) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` },
    { id: 'stark', icon: 'zap', titel: 'Stärkster Abend',
      wert: (a) => a.standardglaeser,
      zeige: (n) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.-Gläser` },
    // Nur Abende mit mindestens zwei Bewertungen: bei einem einzigen Bier
    // ist der „Schnitt" dessen Note, und der beste Abend wäre der, an dem
    // zufällig ein gutes Bier allein dastand.
    { id: 'schnitt', icon: 'star', titel: 'Bester Schnitt',
      wert: (a) => (a.bewertet >= 2 ? a.schnitt : null),
      zeige: (n) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} von 10`,
      zusatz: (a) => `aus ${a.bewertet} Bewertungen` },
    { id: 'schuld', icon: 'wallet', titel: 'Größte offene Schuld',
      wert: (a) => (a.ausgleich > 0.01 ? a.ausgleich : null),
      zeige: (n) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` },
  ];

  return marken.map((m) => {
    let bester = null;
    let gleichauf = 0;
    for (const a of abende) {
      const w = m.wert(a);
      if (w == null || !Number.isFinite(w)) continue;
      if (!bester || w > bester.wert) { bester = { abend: a, wert: w }; gleichauf = 1; }
      else if (w === bester.wert) gleichauf += 1;
    }
    if (!bester) return null;
    return {
      id: m.id, icon: m.icon, titel: m.titel,
      wert: m.zeige(bester.wert),
      abend: bester.abend.boerse,
      zusatz: m.zusatz ? m.zusatz(bester.abend) : null,
      gleichauf,
    };
  }).filter(Boolean);
}
