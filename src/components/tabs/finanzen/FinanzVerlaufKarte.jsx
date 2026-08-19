import { useMemo, useState } from 'react';
import Verlaufsgrafik from '../../Verlaufsgrafik';
import { finanzVerlauf } from '../../../utils/finanzVerlauf';

const euro = (n) => `${Math.round(Number(n) || 0).toLocaleString('de-DE')} €`;

/**
 * Kontostand über die Zeit.
 *
 * Der Bereich zeigte nur Momentaufnahmen: was heute auf dem Konto ist, und
 * eine Liste der Bewegungen. Ob es bergauf oder bergab geht, sagt weder das
 * eine noch das andere — dafür müssen die Stände nebeneinanderliegen.
 *
 * BEIDE MANNSCHAFTEN AUF EINER SKALA
 * Nur so ist zu sehen, wer vorn liegt. Zwei getrennte Grafiken mit eigenen
 * Skalen sähen gleich aus, egal wie weit die Konten auseinanderliegen.
 *
 * NICHT BEI NULL BEGINNEN
 * Kontostände schwanken um einen hohen Wert. Mit Null als Achsenanfang läge
 * alles als flache Linie am oberen Rand, und genau die Unterschiede, um die
 * es geht, verschwänden.
 */
export default function FinanzVerlaufKarte({ transactions, finances }) {
  const [wer, setWer] = useState('beide');

  const aek = useMemo(() => finanzVerlauf(transactions, finances, 'AEK'), [transactions, finances]);
  const real = useMemo(() => finanzVerlauf(transactions, finances, 'Real'), [transactions, finances]);

  if (aek.length < 2 && real.length < 2) return null;

  // Die längere Reihe gibt die Achse vor; die kürzere wird darauf abgebildet.
  const basis = aek.length >= real.length ? aek : real;
  const kurz = (d) => (d
    ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    : '—');

  const punkteVon = (reihe) => reihe.map((p) => ({
    label: kurz(p.datum),
    wert: p.stand,
    zusatz: p.info ? `${p.info} (${p.betrag > 0 ? '+' : ''}${euro(p.betrag)})` : null,
  }));

  const zeigeAek = wer !== 'real' && aek.length >= 2;
  const zeigeReal = wer !== 'aek' && real.length >= 2;

  // Wenn beide gezeigt werden, ist AEK die erste Reihe und Real die zweite.
  const erste = zeigeAek ? punkteVon(aek) : punkteVon(real);
  const zweite = zeigeAek && zeigeReal
    ? { punkte: punkteVon(real), farbe: 'var(--system-red)', name: 'Philip', nameErste: 'Alexander' }
    : null;

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="karten-titel">Kontostand über die Zeit</span>
        <span className="text-caption2 text-text-tertiary">{basis.length} Bewegungen</span>
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-2.5">
        {[['beide', 'Beide'], ['aek', 'Alexander'], ['real', 'Philip']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setWer(id)}
                  aria-pressed={wer === id}
                  className={`flex-1 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                    wer === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      <Verlaufsgrafik
        punkte={erste}
        farbe={zeigeAek ? 'var(--system-blue)' : 'var(--system-red)'}
        hoehe={150}
        formatWert={euro}
        formatKurz={(n) => `${Math.round((Number(n) || 0) / 1000)}k`}
        nullBasiert={false}
        zweite={zweite}
      />

      <p className="text-caption2 text-text-tertiary mt-1.5">
        Rückwärts aus den Bewegungen berechnet — der letzte Punkt ist der
        heutige Kontostand. Die Achse beginnt nicht bei null, sonst läge alles
        als flache Linie am oberen Rand.
      </p>
    </div>
  );
}
