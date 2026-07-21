import { useEffect, useRef, useState } from 'react';

/**
 * Zaehlt eine Zahl beim ersten Erscheinen hoch.
 * Nur fuer die wenigen Anker-Zahlen gedacht (Duell-Stand, Kontostaende) —
 * in Listen waere das unruhig.
 *
 * Respektiert prefers-reduced-motion: dann steht der Endwert sofort da.
 */
export default function CountUp({ value, duration = 750, decimals = 0, className = '' }) {
  const target = Number(value) || 0;
  // Startet bei 0, damit die Zahl beim ERSTEN Erscheinen hochzaehlt — genau
  // dafuer ist der Effekt gedacht. Spaetere Aenderungen laufen vom alten Wert.
  const [shown, setShown] = useState(0);
  const frame = useRef(null);
  const prev = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // In einem unsichtbaren Tab pausiert der Browser requestAnimationFrame.
    // Ohne diesen Zweig bliebe die Zahl auf dem Startwert stehen — also eine
    // FALSCHE Zahl, nicht bloss eine fehlende Animation.
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (reduce || hidden || target === prev.current) {
      setShown(target);
      prev.current = target;
      return undefined;
    }

    const from = prev.current;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic — schnell los, weich aus
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (target - from) * eased);
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        // Erst am ENDE festschreiben. Sonst ueberspringt React StrictMode die
        // Animation: dort laeuft der Effekt zweimal, der erste Lauf wird
        // abgeraeumt — haette er prev schon gesetzt, saehe der zweite Lauf
        // "Wert unveraendert" und wuerde gar nicht mehr animieren.
        prev.current = target;
      }
    };
    frame.current = requestAnimationFrame(tick);

    // Zweites Sicherheitsnetz: wird der Tab MITTEN in der Animation versteckt,
    // friert rAF ein. Dann steht nach Ablauf der Dauer trotzdem der Endwert da.
    const safety = window.setTimeout(() => {
      setShown(target);
      prev.current = target;
    }, duration + 250);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.clearTimeout(safety);
    };
  }, [target, duration]);

  return (
    <span className={className}>
      {decimals > 0 ? shown.toFixed(decimals) : Math.round(shown)}
    </span>
  );
}
