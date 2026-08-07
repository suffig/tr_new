import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abschnitt, zahlenListe, sperrListe, bilanzAusErgebnissen, alsBilanz } from './_hilfen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const roh = readFileSync(resolve(hier, 'rohdaten/fifa19.txt'), 'utf8');

// Ergebnisse stehen im Abschnitt "Karten": "18) A 4/0/1 || P 2/0/0 (1:3)",
// "206) (0:5)", teils mit Zusatz in der Klammer ("4:5 nE").
//
// Bewusst die ERSTE Ergebnisklammer: Zeile 190 lautet "(3:3) nE (9:10)" —
// die zweite Klammer ist das Elfmeterschiessen. Mit "letzte Klammer" waere
// daraus ein 9:10 geworden.
const karten = abschnitt(roh, 'Karten', null);
const b = bilanzAusErgebnissen(karten, /\((\d+)\s*:\s*(\d+)[^)]*\)/);

export default {
  version: 'FC19',
  name: 'FIFA 19 Ultimate Team',
  dateiNummer: 13,
  teams: { AEK: { label: 'Alexander', short: 'Alex' }, Real: { label: 'Philip', short: 'Philip' } },
  konten: { AEK: 0, Real: 68_010_000 },
  bilanz: alsBilanz(b),
  tore: zahlenListe(abschnitt(roh, 'Torschützen', 'SdS')),
  sds: zahlenListe(abschnitt(roh, 'SdS', 'Sperren')),
  sperren: sperrListe(abschnitt(roh, 'Sperren', 'Karten')),
  kader: {},
  varianten: {
    // Dieselbe Person, unterschiedlich getippt. Ziel ist jeweils die Form,
    // die in der Torschuetzenliste steht.
    aguierre: 'Aguierre', agguire: 'Aguierre',
    hallaran: 'Hallaran', hallowan: 'Hallaran', ohalloran: 'Hallaran',
    mbabu: 'Mbabu', mabau: 'Mbabu',
  },
  unklar: [],
};
