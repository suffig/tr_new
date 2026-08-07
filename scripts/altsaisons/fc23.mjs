import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abschnitt, zahlenListe, sperrListe, bilanzAusErgebnissen, alsBilanz } from './_hilfen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const roh = readFileSync(resolve(hier, 'rohdaten/fifa23.txt'), 'utf8');

// "0:3 (2 GK: //)"; eine Zeile ist als "1 :10 (//: //)" getippt.
const b = bilanzAusErgebnissen(
  abschnitt(roh, 'Ergebnisse', null),
  /^(\d+)\s*:\s*(\d+)/
);

export default {
  version: 'FC23',
  name: 'FIFA 23 Ultimate Team',
  dateiNummer: 16,
  teams: { AEK: { label: 'Alexander', short: 'Alex' }, Real: { label: 'Philip', short: 'Philip' } },
  konten: { AEK: 0, Real: 58_680_000 },
  // Die Datei nennt 181 Spiele, gezaehlt sind 171 Ergebniszeilen — die Bilanz
  // gibt wieder, was tatsaechlich notiert ist.
  bilanz: alsBilanz(b),
  tore: zahlenListe(abschnitt(roh, 'Torschützen', 'SdS')),
  sds: zahlenListe(abschnitt(roh, 'SdS', 'Sperren')),
  sperren: sperrListe(abschnitt(roh, 'Sperren', 'Ergebnisse')),
  kader: {},
  varianten: {
    acheampong: 'Acheampong', acheapong: 'Acheampong',
    wakaso: 'Wakaso', wakazo: 'Wakaso',
    nouhou: 'Nouhou', noahou: 'Nouhou',
  },
  unklar: [],
};
