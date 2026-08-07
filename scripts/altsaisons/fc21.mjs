import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abschnitt, zahlenListe, sperrListe, bilanzAusErgebnissen, alsBilanz } from './_hilfen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const roh = readFileSync(resolve(hier, 'rohdaten/fifa21.txt'), 'utf8');
const rohTeam = readFileSync(resolve(hier, 'rohdaten/fifa21_team.txt'), 'utf8');

// "2:3 (3 GK: //)", einmal "4-6 (1 GRK: 1 GRK)". Zeilen wie "-:-" oder "--:--"
// sind nicht gespielte Partien und fallen raus.
const b = bilanzAusErgebnissen(
  abschnitt(roh, 'Ergebnisse', null),
  /^(\d+)\s*[:\-]\s*(\d+)/
);

export default {
  version: 'FC21',
  name: 'FIFA 21 Ultimate Team',
  dateiNummer: 15,
  teams: { AEK: { label: 'Alexander', short: 'Alex' }, Real: { label: 'Philip', short: 'Philip' } },
  konten: { AEK: 150_000, Real: 11_310_000 },
  bilanz: alsBilanz(b),
  // "Keine Vergabe 1" ist kein Spieler, sondern eine Notiz.
  tore: zahlenListe(abschnitt(roh, 'Torschützen', 'SdS'), ['Keine Vergabe']),
  sds: zahlenListe(abschnitt(roh, 'SdS', 'Sperren')),
  sperren: sperrListe(abschnitt(roh, 'Sperren', 'Ergebnisse')),
  // Als einzige dieser Saisons ist der Kader erhalten (fifa21_team.txt).
  kader: {
    AEK: zahlenListe(abschnitt(rohTeam, 'Alexander', 'Philip')),
    Real: zahlenListe(abschnitt(rohTeam, 'Philip', null)),
  },
  varianten: {
    gervinio: 'Gervinio',
    pauliniho: 'Pauliniho',
    matheus: 'Matheus',
  },
  unklar: [],
};
