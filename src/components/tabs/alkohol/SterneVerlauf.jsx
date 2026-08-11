import { useMemo } from 'react';
import Icon from '../../icons/Icon';
import { sterneVerlauf } from '../../../utils/ziehungsStatistik';

// Der Sterne-Zaehler zeigt bisher nur den Endstand und eine Liste. Hier steht,
// WIE er zustande kam: wann wer davongezogen ist, wie gross der Abstand ueber
// die Zeit war und wie viel davon aus Spielduellen kommt statt von Hand.

const B = { w: 300, h: 96, pad: 4 };

const fmtZahl = (n) => (n % 1 === 0 ? String(n) : n.toFixed(1).replace('.', ','));
const fmtDatum = (ts) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
};

export default function SterneVerlauf({ history, namen }) {
  const reihe = useMemo(() => sterneVerlauf(history), [history]);

  // Unter drei Eintraegen ist eine Kurve nur eine Behauptung.
  if (reihe.length < 3) return null;

  const max = Math.max(1, ...reihe.map((p) => Math.max(p.alex, p.philip)));
  const x = (i) => B.pad + (i / (reihe.length - 1)) * (B.w - 2 * B.pad);
  const y = (v) => B.h - B.pad - (v / max) * (B.h - 2 * B.pad);
  const pfad = (key) => reihe.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');

  const letzte = reihe[reihe.length - 1];
  const abstand = Math.abs(letzte.alex - letzte.philip);
  const vorn = letzte.alex === letzte.philip ? null : (letzte.alex > letzte.philip ? 'alex' : 'philip');

  const ausDuell = reihe.filter((p) => p.ausDuell).length;
  const summeDuell = reihe.filter((p) => p.ausDuell).reduce((s, p) => s + p.gained, 0);
  const summeGesamt = reihe.reduce((s, p) => s + p.gained, 0);
  const groesste = reihe.reduce((b, p) => (p.gained > (b?.gained ?? -1) ? p : b), null);

  return (
    <div className="modern-card">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h4 className="karten-titel inline-flex items-center gap-2">
          <Icon name="trendingUp" size={17} strokeWidth={2.2} className="text-system-yellow" />
          Sterne-Verlauf
        </h4>
        <span className="text-[11px] text-text-tertiary whitespace-nowrap">
          {reihe.length} Einträge
        </span>
      </div>

      <svg viewBox={`0 0 ${B.w} ${B.h}`} className="w-full h-24" role="img"
        aria-label={`Verlauf der Sterne: ${namen.alex} ${fmtZahl(letzte.alex)}, ${namen.philip} ${fmtZahl(letzte.philip)}`}>
        <path d={pfad('alex')} fill="none" stroke="var(--system-blue)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        <path d={pfad('philip')} fill="none" stroke="var(--system-red)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        {/* Endpunkte markieren, damit der aktuelle Stand ablesbar bleibt */}
        <circle cx={x(reihe.length - 1)} cy={y(letzte.alex)} r="3" fill="var(--system-blue)" />
        <circle cx={x(reihe.length - 1)} cy={y(letzte.philip)} r="3" fill="var(--system-red)" />
      </svg>

      <div className="flex items-center justify-between text-[11px] text-text-tertiary mt-1">
        <span>{fmtDatum(reihe[0].timestamp)}</span>
        <span>{fmtDatum(letzte.timestamp)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-system-blue" />
          <span className="text-text-secondary">{namen.alex}</span>
          <span className="num-tabular font-semibold text-text-primary">{fmtZahl(letzte.alex)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-system-red" />
          <span className="text-text-secondary">{namen.philip}</span>
          <span className="num-tabular font-semibold text-text-primary">{fmtZahl(letzte.philip)}</span>
        </span>
        <span className="ml-auto text-text-tertiary">
          {vorn ? `${vorn === 'alex' ? namen.alex : namen.philip} +${fmtZahl(abstand)}` : 'Gleichstand'}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-border-light grid grid-cols-2 gap-2">
        <div className="bg-bg-tertiary rounded-xl p-3 text-center">
          <div className="stat-display text-base text-text-primary">
            {summeGesamt > 0 ? `${Math.round((summeDuell / summeGesamt) * 100)}%` : '—'}
          </div>
          <div className="text-[11px] text-text-tertiary">aus Spielduellen</div>
        </div>
        <div className="bg-bg-tertiary rounded-xl p-3 text-center">
          <div className="stat-display text-base text-text-primary">
            {groesste ? `+${fmtZahl(groesste.gained)}` : '—'}
          </div>
          <div className="text-[11px] text-text-tertiary">größte Gutschrift</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-text-tertiary">
        {ausDuell} von {reihe.length} Einträgen stammen aus einem Spielduell, der Rest wurde von Hand eingetragen.
      </p>
    </div>
  );
}
