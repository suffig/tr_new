#!/usr/bin/env node
/**
 * Rechnet den Kontrast der Text-Token gegen den Seitenhintergrund aus —
 * für beide Themen, aus den Werten in globals.css.
 *
 * WARUM NICHT IM BROWSER MESSEN
 * `html, body` haben eine transition auf `color`. Im Test-Browser läuft keine
 * Animations-Zeitachse, die Farbe bleibt dort auf dem Ausgangswert stehen —
 * gemessene Farben sind deshalb unbrauchbar, solange man die Übergänge nicht
 * vorher abschaltet. Die Token stehen als Zahlen in der CSS; daraus lässt es
 * sich ohne Browser exakt ausrechnen.
 *
 * WAS DIE SCHWELLEN BEDEUTEN
 * 4,5:1 ist die Grenze für normalen Text (WCAG AA), 3:1 gilt nur für große
 * oder fette Schrift. Die Token stecken fast überall in kleinen
 * Beschriftungen — für die zählt 4,5:1.
 *
 * Aufruf: node scripts/pruefe-kontrast.mjs
 */
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/globals.css', 'utf8');

// :root { … }  und  :root.dark, [data-theme="dark"] { … }
const bloecke = {
  hell: css.slice(css.indexOf(':root {'), css.indexOf(':root.dark')),
  dunkel: css.slice(css.indexOf(':root.dark')),
};

const holeFarbe = (block, name, tiefe = 0) => {
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) return null;
  const wert = m[1].trim();

  // VERWEISE AUFLOESEN.
  // --system-yellow-schrift zeigt auf var(--brand-text). Ohne diesen Zweig
  // gab holeFarbe dafuer null zurueck, die Schleife uebersprang den Token
  // still — und die Pruefung meldete "alles in Ordnung", ohne ihn je
  // gemessen zu haben. Ein stiller Durchlaeufer ist schlimmer als ein
  // Fehler, weil er wie ein Ergebnis aussieht.
  //
  // Die Tiefenbegrenzung faengt einen Verweiszirkel ab; ohne sie liefe die
  // Funktion endlos.
  const verweis = wert.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i);
  if (verweis) {
    if (tiefe > 5) {
      console.error(`  --${name}: Verweiskette zu tief (Zirkel?)`);
      return null;
    }
    return holeFarbe(block, verweis[1], tiefe + 1);
  }
  const rgba = wert.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*([\d.]+))?\s*\)/);
  if (rgba) return { rgb: [+rgba[1], +rgba[2], +rgba[3]], a: rgba[4] ? +rgba[4] : 1 };
  const hex = wert.match(/^#([0-9a-f]{6})$/i);
  if (hex) return {
    rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)), a: 1,
  };
  return null;
};

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const leuchtdichte = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ueber = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg.rgb[i] * (1 - fg.a));
const kontrast = (fg, bg) => {
  const [hoch, tief] = [leuchtdichte(ueber(fg, bg)), leuchtdichte(bg.rgb)].sort((a, b) => b - a);
  return (hoch + 0.05) / (tief + 0.05);
};

// --text-quaternary ist bewusst sehr blass (Trennlinien, Platzhalter) und
// trägt keine Information; er wird deshalb nicht gegen 4,5:1 gemessen.
const GEPRUEFT = ['text-primary', 'text-secondary', 'text-tertiary', 'text-muted'];
const SCHWELLE = 4.5;

/**
 * Die Systemfarben werden AUCH als Schrift benutzt — `text-system-yellow`
 * allein 90 Mal, `text-system-green` 140 Mal. Sie standen bisher nicht in
 * der Pruefung, obwohl sie Text tragen.
 *
 * Sie werden getrennt gemeldet und brechen den Build NICHT ab. Grund: eine
 * Systemfarbe hat zwei Rollen. Als kleiner Text muss sie lesbar sein, als
 * Balken, Punkt oder Symbolflaeche gilt das Textmass gar nicht. Ein harter
 * Abbruch wuerde also Faelle erschlagen, die in Ordnung sind — die Liste
 * dagegen zeigt, wo man hinsehen sollte.
 */
const SYSTEMFARBEN = ['system-blue', 'system-green', 'system-red', 'system-purple',
  'system-indigo',
  // Diese drei haben einen eigenen SCHRIFTTON — der Flaechenton ist bewusst
  // hell und wird hier nicht gemessen, weil er nie Text traegt.
  'system-orange-schrift', 'system-yellow-schrift', 'system-teal-schrift'];

let fehler = 0;
for (const [thema, block] of Object.entries(bloecke)) {
  // NICHT NUR GEGEN DEN SEITENGRUND.
  // Beschriftungen stehen selten auf bg-primary — sie sitzen auf Karten und
  // grauen Kacheln, und die sind heller oder dunkler. Nur gegen bg-primary
  // zu messen bestand die Pruefung, waehrend derselbe Text auf einer Kachel
  // darunter liegen konnte. Gemessen wird deshalb gegen JEDEN Flaechenton,
  // und es zaehlt der schlechteste Wert.
  const gruende = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-elevated']
    .map((n) => [n, holeFarbe(block, n)])
    .filter(([, f]) => f);
  if (!gruende.length) { console.error(`Kein Flaechenton im Block "${thema}".`); process.exit(2); }
  console.log(`\n${thema.toUpperCase()} — ${gruende.length} Flächentöne`);
  for (const name of GEPRUEFT) {
    const fg = holeFarbe(block, name);
    if (!fg) { console.log(`  --${name}: nicht in diesem Block (erbt)`); continue; }
    let schlecht = null;
    for (const [gname, bg] of gruende) {
      const v = kontrast(fg, bg);
      if (!schlecht || v < schlecht.v) schlecht = { v, gname };
    }
    const ok = schlecht.v >= SCHWELLE;
    if (!ok) fehler++;
    console.log(`  --${name}: ${schlecht.v.toFixed(2)}:1 auf --${schlecht.gname}`
      + ` ${ok ? '✓' : `✗ unter ${SCHWELLE}`}`);
  }

  // Systemfarben als SCHRIFT — nur Bericht, kein Abbruch (siehe oben).
  const schwach = [];
  const unbekannt = [];
  for (const name of SYSTEMFARBEN) {
    const fg = holeFarbe(block, name);
    // Ein Token, das die Pruefung nicht lesen kann, wird GENANNT. Sonst
    // sieht ein Tippfehler im Namen wie ein bestandener Test aus.
    if (!fg) { unbekannt.push(name); continue; }
    let schlecht = null;
    for (const [gname, bg] of gruende) {
      const v = kontrast(fg, bg);
      if (!schlecht || v < schlecht.v) schlecht = { v, gname };
    }
    if (schlecht.v < SCHWELLE) schwach.push(`${name} ${schlecht.v.toFixed(2)}:1 auf --${schlecht.gname}`);
  }
  if (schwach.length) {
    console.log(`  als Schrift zu blass (Hinweis, kein Fehler): ${schwach.join(', ')}`);
  }
  if (unbekannt.length) {
    console.log(`  nicht lesbar und deshalb UNGEPRUEFT: ${unbekannt.join(', ')}`);
  }
}

if (fehler > 0) {
  console.error(`\n${fehler} Token unter ${SCHWELLE}:1. Deckkraft in src/styles/globals.css erhöhen.`);
  process.exit(1);
}
console.log(`\nAlle geprüften Token erreichen ${SCHWELLE}:1.`);
