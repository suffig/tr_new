#!/usr/bin/env node
/**
 * Prüft, ob jede benutzte Farbstufe (`bg-system-blue/70` …) im gebauten CSS
 * wirklich existiert.
 *
 * WARUM ES DAS BRAUCHT
 * Die system-Farben sind CSS-Variablen. Für die baut Tailwind KEINE
 * Deckkraft-Stufen — `bg-system-blue/70` ist deshalb kein Fehler, sondern
 * einfach nichts: die Fläche bleibt durchsichtig. Der Build läuft grün, das
 * Lint schweigt, und auffallen kann es nur, wenn man genau diese Stelle
 * ansieht. Genau das ist mir in diesem Projekt fünfmal passiert.
 *
 * Die fehlenden Stufen stehen von Hand in src/styles/modern-design.css.
 * Dieses Skript sagt, welche noch fehlt — vor dem Ausliefern, nicht danach.
 *
 * Aufruf: node scripts/pruefe-farbstufen.mjs   (nach `npm run build`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const QUELLE = 'src';
const GEBAUT = 'dist/assets';
// bg-, text-, border-, ring- … mit Stufe. Ohne Stufe ist immer in Ordnung:
// die Grundfarbe selbst erzeugt Tailwind.
//
// Varianten gehören mit erfasst: `hover:bg-system-green/20` steht in der CSS
// als eigene Regel `.hover\:bg-system-green\/20:hover`. Wer nur den Teil ab
// `bg-` prüft, meldet vorhandene Klassen als fehlend — und wer die Variante
// ignoriert, übersieht umgekehrt eine fehlende Hover-Stufe, obwohl die
// Grundstufe da ist. Beide Fälle sind hier schon aufgetreten.
const VARIANTEN = '(?:(?:hover|focus|active|group-hover|dark|sm|md|lg):)*';
const MUSTER = new RegExp(`${VARIANTEN}(?:bg|text|border|ring|from|to|via)-system-[a-z]+\\/\\d+`, 'g');

// `.hover\:bg-…\/20:hover` — der Doppelpunkt der Variante ist escaped, der
// angehängte Pseudo-Selektor nicht.
const alsSelektor = (klasse) => `.${klasse.replace(/:/g, '\\:').replace('/', '\\/')}`;

const dateien = (verzeichnis, treffer = []) => {
  for (const name of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, name);
    if (statSync(pfad).isDirectory()) dateien(pfad, treffer);
    else if (['.js', '.jsx'].includes(extname(name))) treffer.push(pfad);
  }
  return treffer;
};

// Wo eine Klasse steht, damit die Meldung zur Datei führt statt nur zum Namen.
const herkunft = new Map();
for (const pfad of dateien(QUELLE)) {
  const zeilen = readFileSync(pfad, 'utf8').split('\n');
  zeilen.forEach((zeile, i) => {
    for (const klasse of zeile.match(MUSTER) || []) {
      if (!herkunft.has(klasse)) herkunft.set(klasse, `${pfad}:${i + 1}`);
    }
  });
}

let css = '';
try {
  for (const name of readdirSync(GEBAUT)) {
    if (extname(name) === '.css') css += readFileSync(join(GEBAUT, name), 'utf8');
  }
} catch {
  console.error(`Kein gebautes CSS in ${GEBAUT}. Erst "npm run build" laufen lassen.`);
  process.exit(2);
}
if (!css) {
  console.error(`Keine CSS-Datei in ${GEBAUT}. Erst "npm run build" laufen lassen.`);
  process.exit(2);
}

// Im CSS steht der Schrägstrich escaped: `.bg-system-blue\/70`.
//
// Die Stufe muss GENAU enden: sonst gilt `/8` als vorhanden, weil `/80`
// damit anfängt — und `/10` wegen `/100`. Deshalb darf hinter der Zahl
// keine weitere Ziffer stehen.
const vorhanden = (klasse) => {
  const gesucht = alsSelektor(klasse);
  let ab = 0;
  for (;;) {
    const i = css.indexOf(gesucht, ab);
    if (i === -1) return false;
    if (!/\d/.test(css[i + gesucht.length] || '')) return true;
    ab = i + 1;
  }
};

const fehlend = [...herkunft.keys()].filter((k) => !vorhanden(k)).sort();

if (fehlend.length === 0) {
  console.log(`Farbstufen in Ordnung — ${herkunft.size} geprüft.`);
  process.exit(0);
}

console.error(`${fehlend.length} Farbstufe(n) fehlen im gebauten CSS:\n`);
for (const k of fehlend) console.error(`  ${k}\n      benutzt in ${herkunft.get(k)}`);
console.error(`
Diese Flächen sind in der App durchsichtig. Ergänzen in
src/styles/modern-design.css, im Muster der dort vorhandenen Stufen:

  .bg-system-blue\\/70 { background-color: color-mix(in srgb, var(--system-blue) 70%, transparent); }
`);
process.exit(1);
