import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zahlenListe, sperrListe, bilanzAusErgebnissen, alsBilanz } from './_hilfen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const roh = readFileSync(resolve(hier, 'rohdaten/fifa24.txt'), 'utf8');
const zeilen = roh.split('\n').map((z) => z.trim());

// Diese Datei hat KEINE Ueberschriften. Aufbau: Kontostaende, dann die
// Torschuetzen, dann die Sperren (erkennbar an der Klammer mit Haken), dann
// ab dem ersten Trenner die Ergebnisse.
const iSperre = zeilen.findIndex((z) => /^.+\s+\d+\s*\(\s*[xX0oO]+\s*\)$/.test(z));
const iErgebnis = zeilen.findIndex((z) => /^[-—]{2,}/.test(z));
const kopf = zeilen.slice(0, iSperre);
const sperrBlock = zeilen.slice(iSperre, iErgebnis);
const ergebnisBlock = zeilen.slice(iErgebnis);

// Spieler des Spiels steht bei fast jeder Partie am Zeilenende in Klammern:
// "1:2 (//: 1 GK) (Mbappe)". Keine Vergabe ist als "no sds", "kein SdS!" oder
// "(//)" notiert. Daraus laesst sich die SdS-Liste selbst bauen — als einzige
// dieser Saisons hat FIFA 24 keine fertige.
const KEIN = /^(\/\/|no sds|kein sds!?|)$/i;
const sdsZaehler = new Map();
for (const z of ergebnisBlock) {
  const m = z.match(/\(([^()]*)\)\s*$/);
  if (!m) continue;
  const name = m[1].trim();
  if (KEIN.test(name) || /GK|RK/.test(name)) continue;
  sdsZaehler.set(name, (sdsZaehler.get(name) || 0) + 1);
}

const b = bilanzAusErgebnissen(ergebnisBlock, /^(\d+)\s*:\s*(\d+)/);

export default {
  version: 'FC24',
  name: 'FIFA 24 Ultimate Team',
  dateiNummer: 17,
  teams: { AEK: { label: 'Alexander', short: 'Alex' }, Real: { label: 'Philip', short: 'Philip' } },
  konten: { AEK: 0, Real: 41_170_000 },
  bilanz: alsBilanz(b),
  tore: zahlenListe(kopf),
  sds: [...sdsZaehler].map(([n, c]) => `${n} ${c}`).join('|'),
  sperren: sperrListe(sperrBlock),
  kader: {},
  varianten: {
    // Schreibweisen desselben Spielers ueber Torschuetzen, Sperren und die
    // SdS-Angaben in den Ergebniszeilen hinweg.
    adegberno: 'Adegbenro', adegbenro: 'Adegbenro',
    alharabi: 'Al Harbi', alharbi: 'Al Harbi',
    marquinios: 'Marquinhos', marquinhos: 'Marquinhos',
    szeczny: 'Szeczny', scezny: 'Szeczny',
    ndyia: 'Ndaye', ndaye: 'Ndaye', ndaiye: 'Ndaye', nidaye: 'Ndaye',
    lozaro: 'Lozaro',
  },
  unklar: [],
};
