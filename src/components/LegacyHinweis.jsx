import Icon from './icons/Icon';
import { legacyInfo } from '../utils/legacySaison';
import { useAktuelleSaison } from '../hooks/useAktuelleSaison';

/**
 * Hinweis fuer Saisons, aus denen nur Gesamtzahlen vorliegen.
 *
 * Steht ueber dem Tab-Inhalt, damit man in FC15 nicht erst raten muss, warum
 * Bilanz und Duell leer sind. `kompakt` ist die einzeilige Variante fuer
 * Stellen, die den Hinweis direkt neben den betroffenen Zahlen brauchen.
 */
export default function LegacyHinweis({ version, kompakt = false, className = '' }) {
  const aktuell = useAktuelleSaison();
  const info = legacyInfo(version || aktuell);
  if (!info) return null;

  if (kompakt) {
    return (
      <p className={`flex items-start gap-1.5 text-caption1 text-text-tertiary ${className}`}>
        <Icon name="clock" size={13} strokeWidth={2.2} className="mt-0.5 flex-shrink-0" />
        <span>Legacy-Saison — es wurden nur Gesamtzahlen erfasst, keine einzelnen Spiele.</span>
      </p>
    );
  }

  return (
    <div className={`panel-yellow rounded-2xl px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <Icon name="clock" size={16} strokeWidth={2.2}
              className="mt-0.5 flex-shrink-0 text-system-yellow" />
        <div className="min-w-0">
          <p className="text-footnote font-semibold text-text-primary">
            {info.label} · Legacy-Saison
          </p>
          <p className="text-caption1 text-text-secondary mt-0.5">
            Damals wurde nur mitgezählt, nicht Spiel für Spiel erfasst.
            Vorhanden: {info.vorhanden.join(', ')}. Ohne Einzelspiele bleiben{' '}
            {info.fehlt.slice(1).join(', ')} leer — das ist kein Fehler.
          </p>
        </div>
      </div>
    </div>
  );
}
