/**
 * Kontostand über die Zeit — rückwärts aus den Transaktionen rekonstruiert.
 *
 * WARUM RÜCKWÄRTS
 * Gespeichert ist nur der HEUTIGE Stand (finances.balance) und die Liste der
 * Bewegungen. Ein historischer Stand steht nirgends. Man kann ihn aber
 * ausrechnen: vom heutigen Stand die jüngste Bewegung abziehen, dann die
 * nächste, und so weiter — so entsteht der Stand vor jeder Bewegung.
 *
 * Vorwärts von null zu summieren wäre falsch: dann käme nicht der echte
 * Kontostand heraus, sondern nur die Summe der erfassten Bewegungen. Was vor
 * der ersten erfassten Transaktion auf dem Konto lag, weiß niemand.
 *
 * NACH DATUM, NICHT NACH id
 * Transaktionen werden nicht zwingend in der Reihenfolge eingetragen, in der
 * sie stattfanden. Bei gleichem Datum entscheidet die id — irgendeine
 * Reihenfolge braucht es, und die Eintragungsreihenfolge ist die einzige
 * zusätzliche Information, die vorliegt.
 */

const zahl = (x) => Number(x) || 0;

export function finanzVerlauf(transactions, finances, team, maxPunkte = 30) {
  const eigene = (transactions || [])
    .filter((t) => t.team === team && Number.isFinite(Number(t.amount)))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))
      || (a.id || 0) - (b.id || 0));

  if (eigene.length < 2) return [];

  const heute = zahl((finances || []).find((f) => f.team === team)?.balance);

  // Rückwärts: der Stand VOR der jüngsten Bewegung ist heute minus deren
  // Betrag. So weiter bis zum Anfang.
  const staende = new Array(eigene.length);
  let stand = heute;
  for (let i = eigene.length - 1; i >= 0; i--) {
    staende[i] = stand;            // Stand NACH dieser Bewegung
    stand -= zahl(eigene[i].amount);
  }

  const punkte = eigene.map((t, i) => ({
    datum: t.date || null,
    stand: staende[i],
    betrag: zahl(t.amount),
    info: t.info || t.type || null,
  }));

  // Bei vielen Bewegungen nur die jüngsten: eine Kurve über Jahre mit
  // Hunderten Punkten zeigt nichts, was man ablesen könnte.
  return punkte.slice(-maxPunkte);
}
