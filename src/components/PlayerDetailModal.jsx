import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTeamDisplay } from '../constants/teams';
import { dez } from '../utils/zahlen';
import Icon from './icons/Icon';
import SpielerWappen from './SpielerWappen';
import PlayerKarriere from './PlayerKarriere';

/**
 * Spielerkarte.
 *
 * Vorher hingen hier 250 Zeilen SoFIFA-Anbindung: Gesamtwertung, Attribute,
 * Skill-Gruppen, ein Link "View on SoFIFA". Die Daten kamen nie an — der
 * Dialog zeigte in der Praxis immer "FIFA Data Not Available". Mit dem
 * Rauswurf entfallen auch fifaDataService (3343 Zeilen), sofifaIntegration
 * (804) und EAFCAPIService (367), die ausschliesslich daran hingen.
 *
 * Was bleibt, sind die Daten, die es wirklich gibt: Stammdaten aus `players`
 * und die Laufbahn ueber alle Saisons.
 *
 * Als Portal an document.body — `.tab-transition` setzt `will-change: opacity`
 * und erzeugt damit einen Stapelkontext, aus dem kein z-index herausfuehrt.
 */
export default function PlayerDetailModal({ player, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = vorher;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const wert = Number(player.value) || 0;
  const akzent = player.team === 'AEK' ? 'text-system-blue'
    : player.team === 'Real' ? 'text-system-red' : 'text-text-secondary';

  const stamm = [
    ['Team', getTeamDisplay(player.team) || player.team || '—', akzent],
    ['Position', player.position || '—', 'text-text-primary'],
    ['Marktwert', wert > 0 ? `${dez(wert, 1)} Mio €` : 'nicht bewertet', 'text-text-primary'],
    ['Tore', String(player.goals ?? 0), 'text-text-primary'],
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
         onClick={onClose} role="dialog" aria-modal="true" aria-label={player.name}>
      <div className="bg-bg-secondary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88dvh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg-secondary px-4 py-3 border-b border-border-light flex items-center gap-2.5 z-10">
          <SpielerWappen team={player.team} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="karten-titel truncate">{player.name}</h3>
            <div className={`text-caption2 truncate ${akzent}`}>
              {[getTeamDisplay(player.team) || player.team, player.position].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                  aria-label="Schließen">
            <Icon name="x" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {stamm.map(([label, wertText, farbe]) => (
              <div key={label} className="panel-gray rounded-xl p-3">
                <div className="text-caption2 text-text-tertiary">{label}</div>
                <div className={`text-callout font-semibold truncate num-tabular ${farbe}`}>{wertText}</div>
              </div>
            ))}
          </div>

          <PlayerKarriere player={player} />
        </div>
      </div>
    </div>,
    document.body
  );
}
