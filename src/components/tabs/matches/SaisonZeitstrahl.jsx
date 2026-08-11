import { useMemo } from 'react';
import { chronoAsc } from '../../../utils/matchChronology';
import { useStreifen } from '../../../hooks/useStreifen';

/**
 * Die Saison als eine Linie.
 *
 * Über der Spieleliste stand bisher eine Kopfkarte mit Siegzahlen, Torsumme,
 * Serie und Formkurve. Dieselben Zahlen beantwortet inzwischen die Startseite
 * und, ausführlicher, das Duell — an dieser Stelle war es die dritte Kopie.
 *
 * Was auf der Spieleseite dagegen fehlte: der Verlauf. Eine Liste zeigt immer
 * nur den Ausschnitt, durch den man gerade scrollt. 176 Spiele als Striche
 * nebeneinander zeigen die Saison als Form — Läufe in einer Farbe, Kantersiege
 * als Ausschläge, ein Kippen in der Mitte. Das liest man in einer Sekunde und
 * mit keiner einzigen Zahl.
 *
 * Nach oben (blau) die Siege der einen Seite, nach unten (rot) die der
 * anderen, die Höhe ist die Tordifferenz. Unentschieden bleiben als Strich auf
 * der Mittellinie.
 *
 * Als SVG und nicht als 176 Divs: mit `preserveAspectRatio="none"` skaliert
 * nur die x-Achse mit der Kartenbreite, die Balkenhöhen bleiben in Pixeln.
 * Dieselbe Darstellung trägt damit vier Spiele wie 176 — mit Divs hätte eine
 * volle Saison bei 2 px Mindestbreite 527 px gebraucht und die Karte gesprengt.
 *
 * Bedient wird der Streifen mit useStreifen: gestrichen statt getippt, weil
 * ein Strich bei einer vollen Saison keine zwei Pixel breit ist.
 */

const HOEHE = 76;          // Gesamthöhe des Streifens in Pixeln
const HALB = HOEHE / 2;
const MIN_BALKEN = 5;      // damit ein 1:0 nicht auf der Linie verschwindet
const BREITE = 0.78;       // Anteil eines Zeitschritts, den der Balken füllt

const datumKurz = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ''
    : x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function SaisonZeitstrahl({ matches, aekName, realName, onMatchWaehlen }) {
  const spiele = useMemo(() => [...(matches || [])].sort(chronoAsc), [matches]);

  const { aktiv, zeigerProps } = useStreifen(
    spiele.length,
    (i) => spiele[i] && onMatchWaehlen?.(spiele[i]),
  );

  const maxDiff = useMemo(() => {
    let m = 1;
    for (const s of spiele) m = Math.max(m, Math.abs((s.goalsa || 0) - (s.goalsb || 0)));
    return m;
  }, [spiele]);

  if (spiele.length === 0) return null;

  const n = spiele.length;

  const gewaehlt = aktiv != null ? spiele[aktiv] : null;
  const gA = gewaehlt ? gewaehlt.goalsa || 0 : 0;
  const gB = gewaehlt ? gewaehlt.goalsb || 0 : 0;
  const sieger = !gewaehlt ? null : gA > gB ? 'aek' : gB > gA ? 'real' : null;

  return (
    <div className="modern-card p-4 mb-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-footnote font-semibold text-text-muted">Saisonverlauf</span>
        <span className="text-caption2 text-text-tertiary">
          {n} {n === 1 ? 'Spiel' : 'Spiele'}
        </span>
      </div>

      {/* Feste Höhe, damit die Zeile beim Streichen nicht springt. */}
      <div className="h-[34px] mb-1.5">
        {gewaehlt ? (
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={`text-title3 font-bold num-tabular leading-none flex-shrink-0 ${
              sieger === 'aek' ? 'text-system-blue' : sieger === 'real' ? 'text-system-red' : 'text-text-secondary'
            }`}>
              {gA}:{gB}
            </span>
            <span className="text-caption2 text-text-tertiary truncate">
              {datumKurz(gewaehlt.date)}
              {sieger ? ` · ${sieger === 'aek' ? aekName : realName}` : ' · Remis'}
              {` · Spiel ${aktiv + 1}`}
            </span>
          </div>
        ) : (
          <div className="text-caption2 text-text-tertiary leading-tight">
            {aekName} nach oben, {realName} nach unten — Höhe ist die Tordifferenz.
            <span className="block">Zum Erkunden über die Saison streichen.</span>
          </div>
        )}
      </div>

      <div
        className="relative select-none touch-pan-y cursor-crosshair"
        style={{ height: HOEHE }}
        {...zeigerProps}
      >
        <svg
          width="100%" height={HOEHE}
          viewBox={`0 0 ${n} ${HOEHE}`}
          preserveAspectRatio="none"
          className="block overflow-visible"
          aria-hidden="true"
        >
          {/* Mittellinie: der Bezug, ohne den "nach oben" nichts bedeutet.
              vectorEffect, weil die x-Streckung sie sonst nicht, die
              Balkenkanten aber sehr wohl verzerrt. */}
          <line x1={0} y1={HALB} x2={n} y2={HALB}
                stroke="var(--separator)" strokeWidth={1}
                vectorEffect="non-scaling-stroke" />
          {spiele.map((s, i) => {
            const a = s.goalsa || 0, b = s.goalsb || 0;
            const diff = Math.abs(a - b);
            const h = diff === 0 ? 2 : MIN_BALKEN + (diff / maxDiff) * (HALB - MIN_BALKEN);
            const wer = a > b ? 'aek' : b > a ? 'real' : 'remis';
            const farbe = wer === 'aek' ? 'var(--system-blue)'
              : wer === 'real' ? 'var(--system-red)' : 'var(--border-strong)';
            const y = wer === 'aek' ? HALB - h : wer === 'real' ? HALB : HALB - 1;
            return (
              <rect
                key={s.id ?? i}
                x={i + (1 - BREITE) / 2} width={BREITE}
                y={y} height={wer === 'remis' ? 2 : h}
                fill={farbe}
                opacity={aktiv != null && aktiv !== i ? 0.3 : 1}
              />
            );
          })}
          {aktiv != null && (
            <line x1={aktiv + 0.5} y1={0} x2={aktiv + 0.5} y2={HOEHE}
                  stroke="var(--text-primary)" strokeWidth={1} strokeOpacity={0.45}
                  vectorEffect="non-scaling-stroke" />
          )}
        </svg>
      </div>

      <div className="flex justify-between mt-1.5 text-caption2 text-text-tertiary">
        <span>{datumKurz(spiele[0].date)}</span>
        <span>{datumKurz(spiele[n - 1].date)}</span>
      </div>

      {/* Für Vorleseprogramme die Aussage statt der Form — 176 Ergebnisse
          hintereinander wären keine Hilfe. */}
      <div className="sr-only">
        Saisonverlauf von {datumKurz(spiele[0].date)} bis {datumKurz(spiele[n - 1].date)}:{' '}
        {spiele.filter((s) => (s.goalsa || 0) > (s.goalsb || 0)).length} Siege {aekName},{' '}
        {spiele.filter((s) => (s.goalsb || 0) > (s.goalsa || 0)).length} Siege {realName},{' '}
        {spiele.filter((s) => (s.goalsa || 0) === (s.goalsb || 0)).length} Remis.
      </div>
    </div>
  );
}
