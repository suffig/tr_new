// Haptik + kleine Feier-Effekte.
//
// Beides ist bewusst "best effort": die Vibration-API kennt iOS Safari nicht,
// und wer Bewegung reduziert haben will, bekommt gar nichts. Nie darf ein
// fehlendes Feature einen Ablauf blockieren — alle Funktionen sind no-ops,
// wenn die Umgebung sie nicht unterstuetzt.

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canVibrate = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/** Kurzer Tap — fuer Zaehler, Stepper, Auswahl. */
export function hapticLight() {
  if (!canVibrate() || reduceMotion()) return;
  try { navigator.vibrate(10); } catch { /* ignore */ }
}

/** Bestaetigung — fuer erfolgreiches Speichern. */
export function hapticSuccess() {
  if (!canVibrate() || reduceMotion()) return;
  try { navigator.vibrate([12, 40, 22]); } catch { /* ignore */ }
}

/** Fehler — kurzes doppeltes Brummen. */
export function hapticError() {
  if (!canVibrate() || reduceMotion()) return;
  try { navigator.vibrate([30, 50, 30]); } catch { /* ignore */ }
}

const CONFETTI_COLORS = ['--system-green', '--system-blue', '--system-orange', '--system-yellow', '--system-red'];

/**
 * Dezenter Konfetti-Ausbruch aus der Bildschirmmitte.
 * Reines DOM, keine Bibliothek; raeumt sich selbst wieder ab.
 */
export function celebrate({ pieces = 28 } = {}) {
  if (typeof document === 'undefined' || reduceMotion()) return;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';

  const styles = getComputedStyle(document.documentElement);
  for (let i = 0; i < pieces; i++) {
    const el = document.createElement('span');
    const color = styles.getPropertyValue(
      CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    ).trim() || '#00A862';
    const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.4;
    const distance = 90 + Math.random() * 150;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 60; // leicht nach oben versetzt
    const size = 6 + Math.random() * 5;

    el.style.cssText = [
      'position:absolute', 'left:50%', 'top:45%',
      `width:${size}px`, `height:${size * 0.6}px`,
      `background:${color}`,
      `border-radius:${Math.random() > 0.5 ? '2px' : '50%'}`,
      'opacity:1',
      'will-change:transform,opacity',
    ].join(';');

    layer.appendChild(el);
    // Animation erst nach dem Einhaengen starten
    requestAnimationFrame(() => {
      el.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0 },
        ],
        {
          duration: 900 + Math.random() * 500,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      );
    });
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1700);
}
