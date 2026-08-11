#!/usr/bin/env node
/**
 * Vereinswappen von footylogos.com ins Repo holen.
 *
 * Warum ein Skript und kein Knopf in der App: assets.footylogos.com schickt
 * keinen Access-Control-Allow-Origin-Header. Ein `fetch()` aus dem Browser wird
 * damit von der Gleichen-Herkunft-Regel abgewiesen, und der Umweg über ein
 * <img> plus Canvas scheitert an der dadurch "getainteten" Canvas. Aus Node
 * heraus gibt es diese Beschränkung nicht — dort ist es ein simpler Download.
 *
 * Warum überhaupt herunterladen statt direkt zu verlinken: die App ist eine
 * PWA. Ihr Service Worker legt nur das eigene Bauergebnis in den Cache, extern
 * verlinkte Bilder wären offline weg — ausgerechnet in der Kneipe. Dazu
 * verspricht footylogos nirgends, dass Fremdeinbindung erlaubt bleibt; ein
 * eingeschalteter Hotlink-Schutz würde alle Wappen auf einmal leeren.
 *
 * Aufruf:
 *   node scripts/wappen-holen.mjs "Dynamo Dresden" "Schalke 04"
 *
 * Der Slug lässt sich nicht zuverlässig aus dem Namen ableiten — "schalke-04"
 * gibt es, "fc-schalke-04" nicht — und eine Suche-API bietet die Seite nicht.
 * Deshalb probiert das Skript mehrere Schreibweisen durch. Findet es nichts,
 * sagt es das und man gibt den Slug direkt vor:
 *   node scripts/wappen-holen.mjs "AEK Athen=aek-athens"
 *
 * Quellenangabe: footylogos.com bittet um "Credit FootyLogos.com as the
 * source". Die steht im Profil der App.
 */

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const ZIEL = join(WURZEL, 'public', 'logos');
const KATALOG = join(WURZEL, 'src', 'constants', 'wappenKatalog.js');

const url = (slug) => `https://assets.footylogos.com/logos/${slug}/${slug}-logo-footylogos.svg`;

/** Umlaute und Sonderzeichen auf das reduzieren, was in einer URL stehen kann. */
const grundform = (text) => text
  .toLowerCase()
  .replace(/&/g, ' and ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // é → e, ö → o
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

/** Vorsilben, die im Slug mal stehen und mal nicht. */
const VORSILBEN = /^(1-)?(fc|sv|sg|vfb|vfl|tsg|tsv|sc|as|ac|ss|ssc|rc|cf|cd|us|afc|bsc)-/;

/**
 * Mehrere Schreibweisen, von der wahrscheinlichsten zur unwahrscheinlichsten.
 * Umlaute werden zusätzlich in der deutschen Ersatzschreibung probiert
 * (Mönchengladbach → moenchengladbach), weil beide Varianten vorkommen.
 */
function kandidaten(name) {
  const deutsch = name
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/g, 'ss');
  const roh = [grundform(name), grundform(deutsch)];
  const liste = [];
  for (const g of roh) {
    liste.push(g);
    if (VORSILBEN.test(g)) liste.push(g.replace(VORSILBEN, ''));
    liste.push(`${g}-fc`);
  }
  return [...new Set(liste)].filter(Boolean);
}

/** Gibt es diesen Slug? Erst fragen, dann laden — spart fehlgeschlagene Downloads. */
async function existiert(slug) {
  try {
    const antwort = await fetch(url(slug), { method: 'HEAD' });
    return antwort.ok;
  } catch {
    return false;
  }
}

async function holen(name) {
  // "Name=slug" hebelt das Raten aus.
  const [klartext, vorgabe] = name.includes('=') ? name.split('=') : [name, null];
  const versuche = vorgabe ? [vorgabe] : kandidaten(klartext);

  for (const slug of versuche) {
    if (!(await existiert(slug))) continue;
    const antwort = await fetch(url(slug));
    if (!antwort.ok) continue;
    const svg = await antwort.text();
    // Ein 200 mit HTML-Fehlerseite statt SVG waere sonst still als Wappen
    // gelandet und haette in der App als kaputtes Bild geendet.
    if (!svg.trimStart().startsWith('<svg') && !svg.includes('<svg')) {
      console.log(`  ${klartext}: ${slug} liefert kein SVG — übersprungen`);
      continue;
    }
    await writeFile(join(ZIEL, `${slug}.svg`), svg, 'utf8');
    console.log(`  ${klartext} → ${slug}.svg (${svg.length} Bytes)`);
    return { slug, name: klartext };
  }

  console.log(`  ${klartext}: kein Wappen gefunden. Probiert: ${versuche.join(', ')}`);
  console.log(`     Slug auf footylogos.com nachsehen und "${klartext}=<slug>" übergeben.`);
  return null;
}

/**
 * Den Katalog aus dem Ordner ableiten statt mitzuführen: so kann die Auswahl
 * in der Verwaltung nichts anbieten, was nicht wirklich als Datei daliegt.
 */
async function katalogSchreiben(neue) {
  const dateien = (await readdir(ZIEL)).filter((f) => f.endsWith('.svg'));
  const namen = new Map(neue.filter(Boolean).map((e) => [e.slug, e.name]));

  const eintraege = dateien.map((f) => {
    const slug = f.replace(/\.svg$/, '');
    // Für schon vorhandene Dateien den Slug in einen lesbaren Namen zurück-
    // verwandeln: "borussia-dortmund" → "Borussia Dortmund".
    const name = namen.get(slug)
      || slug.split('-').map((w) => (/^\d+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
    return { slug, name };
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const inhalt = `/**
 * Welche Vereinswappen als Datei vorliegen.
 *
 * NICHT VON HAND PFLEGEN — diese Datei schreibt scripts/wappen-holen.mjs aus
 * dem Inhalt von public/logos/. Der Katalog wird aus dem Ordner abgeleitet und
 * nicht danebengeführt, damit die Auswahl in der Verwaltung nichts anbieten
 * kann, was nicht wirklich daliegt.
 *
 * Wappen von footylogos.com. Quellenangabe steht im Profil.
 */

export const WAPPEN = ${JSON.stringify(eintraege, null, 2).replace(/"([a-z]+)":/g, '$1:')};

/** Pfad zur Wappendatei, oder null wenn der Slug nichts Bekanntes meint. */
export function wappenPfad(slug) {
  if (!slug) return null;
  return WAPPEN.some((w) => w.slug === slug)
    ? \`\${import.meta.env.BASE_URL}logos/\${slug}.svg\`
    : null;
}
`;
  await writeFile(KATALOG, inhalt, 'utf8');
  console.log(`\nKatalog geschrieben: ${eintraege.length} Wappen in src/constants/wappenKatalog.js`);
}

const namen = process.argv.slice(2);
if (namen.length === 0) {
  console.log('Aufruf: node scripts/wappen-holen.mjs "Dynamo Dresden" "Schalke 04" ["AEK Athen=aek-athens"]');
  process.exit(1);
}

if (!existsSync(ZIEL)) await mkdir(ZIEL, { recursive: true });
console.log(`Hole ${namen.length} ${namen.length === 1 ? 'Wappen' : 'Wappen'} von footylogos.com:\n`);
const ergebnisse = [];
for (const n of namen) ergebnisse.push(await holen(n));
await katalogSchreiben(ergebnisse);
