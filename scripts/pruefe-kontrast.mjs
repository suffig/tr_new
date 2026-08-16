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

const holeFarbe = (block, name) => {
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) return null;
  const wert = m[1].trim();
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

let fehler = 0;
for (const [thema, block] of Object.entries(bloecke)) {
  const bg = holeFarbe(block, 'bg-primary');
  if (!bg) { console.error(`--bg-primary fehlt im Block "${thema}".`); process.exit(2); }
  console.log(`\n${thema.toUpperCase()} — Hintergrund rgb(${bg.rgb.join(', ')})`);
  for (const name of GEPRUEFT) {
    const fg = holeFarbe(block, name);
    if (!fg) { console.log(`  --${name}: nicht in diesem Block (erbt)`); continue; }
    const v = kontrast(fg, bg);
    const ok = v >= SCHWELLE;
    if (!ok) fehler++;
    console.log(`  --${name}: ${v.toFixed(2)}:1 ${ok ? '✓' : `✗ unter ${SCHWELLE}`}`);
  }
}

if (fehler > 0) {
  console.error(`\n${fehler} Token unter ${SCHWELLE}:1. Deckkraft in src/styles/globals.css erhöhen.`);
  process.exit(1);
}
console.log(`\nAlle geprüften Token erreichen ${SCHWELLE}:1.`);
