// Erzeugt alle App-Icons und Startbilder aus EINER Quelldatei.
//
// Aufruf:  node scripts/logo-erzeugen.mjs <quelle.png>
// Ohne Argument wird design/logo-quelle.png genommen.
//
// Die Quelldatei liegt bewusst NICHT unter public/: alles dort landet im
// Vorab-Zwischenspeicher der PWA und wuerde bei jedem Update mit ausgeliefert.
//
// Die alten Dateien liegen unter public/assets/logo-alt/ — zum Zuruecksetzen
// siehe die README dort. Dieses Skript ueberschreibt nur die erzeugten
// Dateien, es loescht nichts.

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const quelle = process.argv[2] || 'design/logo-quelle.png';
const ziel = 'public/assets';
const splashOrdner = path.join(ziel, 'splash');

// Hintergrund der Startbilder = --bg-primary im Dunkelmodus.
const HINTERGRUND = { r: 10, g: 17, b: 25, alpha: 1 };

// Anteil der kurzen Seite, den das Logo im Startbild einnimmt. 0.38 entspricht
// der Groesse, die die bisherigen Startbilder hatten.
const LOGO_ANTEIL = 0.38;

async function iconsErzeugen() {
  const groessen = [
    ['icon-180.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['logo-fusta.png', 512], // In-App-Logo (Header, Anmeldung)
  ];
  for (const [name, px] of groessen) {
    await sharp(quelle)
      .resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, quality: 90, effort: 10 })
      .toFile(path.join(ziel, name));
    console.log('  ', name, px + 'x' + px);
  }
}

async function splashErzeugen() {
  await mkdir(splashOrdner, { recursive: true });
  const dateien = (await readdir(splashOrdner)).filter((f) => /^splash-\d+x\d+\.png$/.test(f));
  for (const datei of dateien) {
    const [b, h] = datei.replace('splash-', '').replace('.png', '').split('x').map(Number);
    const logoGroesse = Math.round(Math.min(b, h) * LOGO_ANTEIL);
    const logo = await sharp(quelle).resize(logoGroesse, logoGroesse, { fit: 'contain' }).png().toBuffer();
    await sharp({ create: { width: b, height: h, channels: 4, background: HINTERGRUND } })
      .composite([{ input: logo, gravity: 'centre' }])
      .png({ palette: true, quality: 80, effort: 10 })
      .toFile(path.join(splashOrdner, datei));
  }
  console.log('   Startbilder:', dateien.length);
}

console.log('Quelle:', quelle);
await iconsErzeugen();
await splashErzeugen();
console.log('Fertig.');
