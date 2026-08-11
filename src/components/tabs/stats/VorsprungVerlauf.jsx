import { useId, useMemo } from 'react';
import { chronoAsc } from '../../../utils/matchChronology';
import { useStreifen } from '../../../hooks/useStreifen';

/**
 * Der Vorsprung als Linie.
 *
 * Die Ansicht "Verlauf" bestand aus einer Karte je Monat, in der jede Zahl
 * dreimal stand: Siege als Anzahl, als Prozentsatz und als Balken, Tore als
 * Summe, als Schnitt und noch einmal als Gesamtsumme darunter. Bei einer
 * Saison über sechs Monate waren das sechs bildschirmhohe Karten — und der
 * Verlauf, also die Frage "wer lag wann vorn", stand in keiner davon.
 *
 * Hier ist er. Eine Linie, die bei null anfängt und mit jedem Sieg um eins
 * steigt oder fällt. Über der Null gehört die Fläche dem einen, darunter dem
 * anderen. Man sieht auf einen Blick, ob eine Saison durchgehend einseitig
 * war, wann sie gekippt ist und wie groß der Abstand je wurde — Dinge, die
 * aus Monatssummen nicht hervorgehen.
 *
 * Remis lassen die Linie waagerecht laufen. Das ist die ehrliche Darstellung:
 * ein Unentschieden ändert am Vorsprung nichts.
 */

const HOEHE = 120;
const RAND = 6;            // damit der Scheitel nicht am Rand klebt

const datumKurz = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ''
    : x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function VorsprungVerlauf({ matches, aekName, realName }) {
  const spiele = useMemo(() => [...(matches || [])].sort(chronoAsc), [matches]);

  const verlauf = useMemo(() => {
    let stand = 0;
    return spiele.map((m) => {
      const a = m.goalsa || 0, b = m.goalsb || 0;
      stand += a > b ? 1 : b > a ? -1 : 0;
      return stand;
    });
  }, [spiele]);

  const { aktiv, zeigerProps } = useStreifen(spiele.length);
  // Eigene IDs je Instanz — zwei Kurven auf einer Seite wuerden sich sonst
  // gegenseitig die Schnittmasken wegnehmen.
  const id = useId().replace(/:/g, '');

  const hoch = useMemo(() => {
    // Der größte Vorsprung je Seite — die zweite Aussage der Kurve nach
    // "wer führt am Ende".
    let aek = 0, real = 0, aekBei = -1, realBei = -1;
    verlauf.forEach((v, i) => {
      if (v > aek) { aek = v; aekBei = i; }
      if (-v > real) { real = -v; realBei = i; }
    });
    return { aek, real, aekBei, realBei };
  }, [verlauf]);

  if (spiele.length < 2) return null;

  const n = spiele.length;
  const spanne = Math.max(1, ...verlauf.map((v) => Math.abs(v)));
  const mitte = HOEHE / 2;
  const y = (v) => mitte - (v / spanne) * (mitte - RAND);

  // Nullpunkt vor dem ersten Spiel, damit die Kurve nicht in der Luft beginnt.
  const punkte = [[0, y(0)], ...verlauf.map((v, i) => [i + 1, y(v)])];
  const linie = punkte.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ');
  const flaeche = `${linie} L${n} ${y(0)} L0 ${y(0)} Z`;

  const stand = aktiv != null ? verlauf[aktiv] : verlauf[n - 1];
  const fuehrt = stand > 0 ? 'aek' : stand < 0 ? 'real' : null;

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-footnote font-semibold text-text-muted">Vorsprung im Verlauf</span>
        <span className="text-caption2 text-text-tertiary">{n} Spiele</span>
      </div>

      {/* Feste Höhe, damit die Kurve beim Streichen nicht springt. */}
      <div className="h-[38px] mb-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`text-title2 font-bold num-tabular leading-none flex-shrink-0 ${
            fuehrt === 'aek' ? 'text-system-blue' : fuehrt === 'real' ? 'text-system-red' : 'text-text-secondary'
          }`}>
            {stand === 0 ? '±0' : `${stand > 0 ? '+' : '−'}${Math.abs(stand)}`}
          </span>
          <span className="text-caption2 text-text-tertiary truncate">
            {fuehrt ? `${fuehrt === 'aek' ? aekName : realName} vorn` : 'Gleichstand'}
            {aktiv != null
              ? ` · nach Spiel ${aktiv + 1} · ${datumKurz(spiele[aktiv].date)}`
              : ' · Endstand'}
          </span>
        </div>
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
          className="block"
          aria-hidden="true"
        >
          <defs>
            {/* Die Fläche wird zweimal gezeichnet und je zur Hälfte
                abgeschnitten. So bekommt jede Seite der Nulllinie ihre Farbe,
                ohne die Kurve in Segmente zerlegen zu müssen. */}
            <clipPath id={`${id}-oben`}><rect x="0" y="0" width={n} height={y(0)} /></clipPath>
            <clipPath id={`${id}-unten`}><rect x="0" y={y(0)} width={n} height={HOEHE - y(0)} /></clipPath>
          </defs>

          <path d={flaeche} fill="var(--system-blue)" opacity="0.18" clipPath={`url(#${id}-oben)`} />
          <path d={flaeche} fill="var(--system-red)" opacity="0.18" clipPath={`url(#${id}-unten)`} />

          {/* Nulllinie: ohne sie bedeutet "oben" nichts. */}
          <line x1={0} y1={y(0)} x2={n} y2={y(0)}
                stroke="var(--separator)" strokeWidth={1} vectorEffect="non-scaling-stroke" />

          <path d={linie} fill="none"
                stroke={fuehrt === 'real' ? 'var(--system-red)' : 'var(--system-blue)'}
                strokeWidth={2} strokeLinejoin="round"
                vectorEffect="non-scaling-stroke" />

          {aktiv != null && (
            <line x1={aktiv + 1} y1={0} x2={aktiv + 1} y2={HOEHE}
                  stroke="var(--text-primary)" strokeWidth={1} strokeOpacity={0.45}
                  vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* Der Punkt sitzt als HTML ueber dem SVG und nicht darin: im
            gestreckten Koordinatensystem wuerde aus einem Kreis bei 176
            Spielen eine liegende Ellipse. */}
        {aktiv != null && (
          <span
            className={`absolute w-2.5 h-2.5 rounded-full border-2 bg-bg-secondary pointer-events-none ${
              stand < 0 ? 'border-system-red' : 'border-system-blue'}`}
            style={{
              left: `${((aktiv + 1) / n) * 100}%`,
              top: y(verlauf[aktiv]),
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>

      <div className="flex justify-between mt-1 text-caption2 text-text-tertiary">
        <span>{datumKurz(spiele[0].date)}</span>
        <span>{datumKurz(spiele[n - 1].date)}</span>
      </div>

      {/* Die zweite Aussage der Kurve: wie weit ist jede Seite je vorn gewesen?
          Das ist etwas anderes als der Endstand — eine Saison kann kippen. */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border-light">
        {[
          { name: aekName, wert: hoch.aek, bei: hoch.aekBei, farbe: 'text-system-blue' },
          { name: realName, wert: hoch.real, bei: hoch.realBei, farbe: 'text-system-red' },
        ].map((s) => (
          <div key={s.name} className="flex-1 min-w-0">
            <div className="text-caption2 text-text-tertiary truncate">Größter Vorsprung {s.name}</div>
            <div className={`text-callout font-bold num-tabular ${s.wert > 0 ? s.farbe : 'text-text-tertiary'}`}>
              {s.wert > 0 ? `+${s.wert}` : '—'}
              {s.wert > 0 && s.bei >= 0 && (
                <span className="text-caption2 font-normal text-text-tertiary">
                  {' '}nach Spiel {s.bei + 1}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sr-only">
        Vorsprung im Verlauf über {n} Spiele. Endstand:{' '}
        {stand === 0 ? 'Gleichstand' : `${stand > 0 ? aekName : realName} ${Math.abs(stand)} Siege vorn`}.
        Größter Vorsprung {aekName}: {hoch.aek}. Größter Vorsprung {realName}: {hoch.real}.
      </div>
    </div>
  );
}
