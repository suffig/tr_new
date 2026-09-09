import logo90Proof from '../assets/logo-90proof.png';
export default function LoadingSpinner({ message = 'Lädt...', size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'loader-sm',
    md: '',
    lg: 'loader-lg'
  };

  return (
    <div className={`flex items-center justify-center py-8 ${className}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className={`loader-dots ${sizeClasses[size]}`} aria-label="Lädt">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="text-sm text-text-muted font-medium" aria-live="polite">
          {message}
        </div>
      </div>
    </div>
  );
}

/**
 * Der Startbildschirm beim Laden der App.
 *
 * Hier stand eine graue Spinner-Kachel auf halbdurchsichtigem Schwarz — der
 * erste Eindruck der App war eine Ladebox. Jetzt ist es das Logo auf dem
 * Schwarz, auf dem es gebaut ist: derselbe Anblick wie das iOS-Startbild,
 * sodass der Übergang vom Startbild in die App nicht springt.
 *
 * KEINE ZAHL DES TAGES
 * Naheliegend wäre "3 Spiele heute" oder der offene Ausgleich. In diesem
 * Moment ist aber noch nichts geladen — genau deshalb ist der Bildschirm ja
 * da. Eine Zahl hier wäre entweder leer oder geraten. Was ansteht, sagt die
 * Karte „Steht an" auf der Startseite, sobald es etwas zu sagen gibt.
 */
export function FullScreenLoader({ message = 'Lädt...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
         style={{ background: '#000' }}
         role="status" aria-live="polite">
      <img src={logo90Proof} alt=""
           className="w-28 h-28 rounded-3xl object-cover animate-scale-in"
           /* alt bleibt leer: der Name steht direkt darunter als Text, und
              eine Vorleseansage wuerde ihn sonst zweimal nennen. */ />
      <div className="text-center">
        <div className="text-title2 font-extrabold tracking-tight" style={{ color: '#FBFBFA' }}>
          90Proof
        </div>
        <div className="text-caption1 mt-0.5" style={{ color: '#F4B60B' }}>
          Fußball & Feierabend
        </div>
      </div>
      {/* Der Ladebalken statt eines Rings: er nimmt die Bernsteinlinie unter
          dem Schriftzug im Logo auf. */}
      <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.14)' }}>
        <div className="h-full rounded-full ladebalken" style={{ background: '#F4B60B' }} />
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );
}

export function InlineSpinner({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
      aria-label="Lädt"
      role="status"
    ></div>
  );
}
