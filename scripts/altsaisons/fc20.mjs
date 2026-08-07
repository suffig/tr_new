import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abschnitt, zahlenListe, sperrListe, bilanzAusErgebnissen, alsBilanz } from './_hilfen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const roh = readFileSync(resolve(hier, 'rohdaten/fifa20.txt'), 'utf8');

// "Alexander 2:4 Philip (2 GK: //)" bzw. "A 2:5 P (//://)" — Alexander steht
// immer links. Zwei Zeilen bestehen nur aus "A" (abgebrochen notiert) und
// fallen dadurch von selbst raus.
const b = bilanzAusErgebnissen(
  abschnitt(roh, 'Ergebnisse', null),
  /^(?:A|Alexander)\s+(\d+)\s*:\s*(\d+)/
);

export default {
  version: 'FC20',
  name: 'FIFA 20 Ultimate Team',
  dateiNummer: 14,
  teams: { AEK: { label: 'Alexander', short: 'Alex' }, Real: { label: 'Philip', short: 'Philip' } },
  konten: { AEK: 0, Real: 25_620_000 },
  bilanz: alsBilanz(b),
  tore: zahlenListe(abschnitt(roh, 'Torschützen', 'SdS')),
  sds: zahlenListe(abschnitt(roh, 'SdS', 'Sperren')),
  sperren: sperrListe(abschnitt(roh, 'Sperren', 'Ergebnisse')),
  kader: {},
  varianten: {
    derrossi: 'De Rossi', derossi: 'De Rossi',
    promes: 'Promes', prommes: 'Promes',
    cuadrado: 'Cuadrado', curdrado: 'Cuadrado',
    heller: 'Heller',
    mathieu: 'Mathieu',
  },
  unklar: [],
};
