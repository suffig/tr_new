/**
 * Ein Kräfteverhältnis: eine Zeile, zwei Seiten, eine Trennlinie.
 *
 * Die Kennzahlen dieser App sind fast alle paarweise — 243 gegen 622 Siege,
 * 2078 gegen 3321 Tore, 12 gegen 9 Gläser, Note 7,5 gegen 7,0. Als zwei Zahlen
 * in einer Kachel muss man sie im Kopf ins Verhältnis setzen. Als geteilte
 * Fläche steht das Verhältnis selbst da: wo die Trennlinie sitzt, ist die
 * Aussage.
 *
 * Die Zahlen bleiben trotzdem lesbar an den Enden — ein Balken allein sagt
 * "ungefähr zwei Drittel", nicht "622".
 *
 * Steht seit dem dritten Nachbau an einer gemeinsamen Stelle: Duell, Statistik
 * (Monat für Monat) und Bierbörse (Verbrauch, Geschmacks-Duell) zeigen damit
 * dasselbe Muster, und wer eins verstanden hat, versteht alle.
 *
 * @param label     Worum es geht ("Siege", "Gläser", "Januar 2024").
 * @param zusatz    Kleingedrucktes darunter, optional.
 * @param aek/real  Die beiden Werte. Negative werden auf 0 gezogen — ein
 *                  Balken kann nicht weniger als nichts füllen.
 * @param anzeige   Formatierung der Zahlen, z. B. Euro oder Noten.
 * @param aekName/realName  Für Vorleseprogramme, die den Balken nicht sehen.
 * @param klein     Schmalere Bauform für lange Listen.
 */
export default function Kraefteverhaeltnis({
  label, zusatz, aek, real, anzeige, aekName, realName, klein = false,
}) {
  const a = Math.max(0, Number(aek) || 0);
  const r = Math.max(0, Number(real) || 0);
  const summe = a + r;
  // Ohne Daten eine ruhige, mittige Linie statt eines zufälligen Ausschlags.
  const anteilA = summe > 0 ? (a / summe) * 100 : 50;
  const zeig = anzeige || ((n) => n.toLocaleString('de-DE'));
  const vorn = summe === 0 ? null : a > r ? 'aek' : r > a ? 'real' : null;

  return (
    <div className={klein ? 'py-2' : 'py-2.5'}>
      <div className={`flex items-baseline gap-2 ${klein ? 'mb-1' : 'mb-1.5'}`}>
        <span className={`${klein ? 'text-footnote' : 'text-callout'} font-bold num-tabular ${
          vorn === 'aek' ? 'text-system-blue' : 'text-text-secondary'}`}>
          {zeig(a)}
        </span>
        <span className="flex-1 text-center text-caption2 text-text-tertiary truncate">
          {label}
          {zusatz ? <span className="block text-[10px] opacity-80">{zusatz}</span> : null}
        </span>
        <span className={`${klein ? 'text-footnote' : 'text-callout'} font-bold num-tabular ${
          vorn === 'real' ? 'text-system-red' : 'text-text-secondary'}`}>
          {zeig(r)}
        </span>
      </div>
      <div className={`relative ${klein ? 'h-1.5' : 'h-2'} rounded-full overflow-hidden bg-bg-tertiary flex`}>
        <div className="bg-system-blue h-full transition-all duration-500"
             style={{ width: `${anteilA}%` }} />
        <div className="bg-system-red h-full transition-all duration-500"
             style={{ width: `${100 - anteilA}%` }} />
        {/* Die Mitte als Bezug: ohne sie sieht man zwar, wo die Trennlinie
            liegt, aber nicht, wie weit sie vom Gleichstand entfernt ist. */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-bg-secondary/70" />
      </div>
      <div className="sr-only">
        {aekName} {zeig(a)}, {realName} {zeig(r)}
      </div>
    </div>
  );
}
