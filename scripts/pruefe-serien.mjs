#!/usr/bin/env node
/**
 * Prueft die Serien-Rechnung an von Hand nachvollziehbaren Spielfolgen.
 *
 * Serien haengen ganz an der zeitlichen Reihenfolge, und die ist die
 * fehleranfaellige Stelle: die Spiele kommen absteigend nach id aus der
 * Datenbank, zwei Spiele koennen am selben Tag stattfinden, und ein
 * Unentschieden muss BEIDE Serien abreissen. Genau diese drei Faelle stehen
 * hier drin.
 *
 * Aufruf: node scripts/pruefe-serien.mjs
 */
import { aktuelleSerie, laengsteSerien, formKette, bemerkenswerteLaeufe, chronologisch }
  from '../src/utils/serien.js';

const spiel = (id, date, a, b) => ({ id, date, goalsa: a, goalsb: b });
let fehler = 0;
const pruefe = (was, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) fehler++;
  console.log(`${ok ? '  ok  ' : 'FALSCH'} ${was}\n         ist:  ${JSON.stringify(ist)}${ok ? '' : `\n         soll: ${JSON.stringify(soll)}`}`);
};

// AEK gewinnt 3x, dann Real, dann AEK 2x — absichtlich UNSORTIERT übergeben,
// und am selben Datum zwei Spiele, damit die id die Reihenfolge entscheidet.
const reihe = [
  spiel(5, '2026-08-03', 2, 0),   // AEK
  spiel(1, '2026-08-01', 3, 1),   // AEK
  spiel(3, '2026-08-02', 1, 0),   // AEK
  spiel(2, '2026-08-01', 2, 1),   // AEK  (gleicher Tag wie id 1, danach)
  spiel(4, '2026-08-02', 0, 2),   // Real (gleicher Tag wie id 3, danach)
];
pruefe('chronologisch sortiert nach Datum, dann id',
  chronologisch(reihe).map(m => m.id), [1, 2, 3, 4, 5]);

pruefe('aktuelle Serie: nach Reals Sieg gewinnt AEK 1x',
  aktuelleSerie(reihe), { art: 'sieg', seite: 'AEK', laenge: 1 });

pruefe('längste Serie AEK = 3 (Spiele 1,2,3)',
  laengsteSerien(reihe).AEK, { laenge: 3, von: '2026-08-01', bis: '2026-08-02' });
pruefe('längste Serie Real = 1', laengsteSerien(reihe).Real, { laenge: 1, von: '2026-08-02', bis: '2026-08-02' });

pruefe('Form aus AEK-Sicht', formKette(reihe, 'AEK', 5), ['S', 'S', 'S', 'N', 'S']);
pruefe('Form aus Real-Sicht', formKette(reihe, 'Real', 5), ['N', 'N', 'N', 'S', 'N']);

// Unentschieden muss BEIDE Serien abreissen
const mitRemis = [
  spiel(1, '2026-08-01', 2, 0),  // AEK
  spiel(2, '2026-08-02', 1, 0),  // AEK
  spiel(3, '2026-08-03', 1, 1),  // Remis
  spiel(4, '2026-08-04', 3, 0),  // AEK
];
pruefe('Remis reisst die Siegesserie ab: aktuell nur 1',
  aktuelleSerie(mitRemis), { art: 'sieg', seite: 'AEK', laenge: 1 });
pruefe('längste AEK-Serie trotz Remis = 2', laengsteSerien(mitRemis).AEK.laenge, 2);

// Zu Null und Torlaune
const zuNull = [
  spiel(1, '2026-08-01', 3, 0),
  spiel(2, '2026-08-02', 4, 0),
  spiel(3, '2026-08-03', 5, 0),
];
const laeufe = bemerkenswerteLaeufe(zuNull);
pruefe('AEK: 3 Siege, 3x ohne Gegentor, 3x drei Tore',
  laeufe.map(l => `${l.art}:${l.seite}:${l.wert}`),
  ['siegesserie:AEK:3', 'zuNull:AEK:3', 'torlaune:AEK:3']);

pruefe('unter der Mindestlänge kommt nichts', bemerkenswerteLaeufe(zuNull.slice(0, 2)), []);
pruefe('keine Spiele → keine Serie', aktuelleSerie([]), null);

console.log(fehler === 0 ? '\nAlle Fälle richtig.' : `\n${fehler} Fälle falsch.`);
process.exit(fehler ? 1 : 0);
