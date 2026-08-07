import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import { getTeamDisplay } from '../../../constants/teams';
import { istLegacySaison } from '../../../utils/legacySaison';

/**
 * Ein Spieler über alle Saisons hinweg.
 *
 * Zeigt, was tatsächlich vorliegt: Tore je Saison, Team, Marktwert,
 * Auszeichnungen und Sperren. Aus den Altsaisons gibt es keine Einzelspiele,
 * deshalb steht dort auch keine Quote „Tore pro Spiel" — die liesse sich nur
 * für FC25/FC26 rechnen und wäre daneben irreführend.
 *
 * Als Portal an document.body: der Tab-Inhalt steckt in `.tab-transition`,
 * und deren `will-change: opacity` erzeugt einen Stapelkontext, aus dem ein
 * z-index allein nicht herauskommt.
 */
export default function SpielerVerlauf({ spieler, sds, sperren, onSchliessen }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onSchliessen(); };
    document.addEventListener('keydown', esc);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = vorher;
    };
  }, [onSchliessen]);

  const zeilen = useMemo(() => {
    if (!spieler) return [];
    const namen = new Set(spieler.spellings.map((n) => n.toLowerCase()));
    return [...spieler.seasons]
      .sort((a, b) => (parseInt(String(b.version).replace(/\D/g, ''), 10) || 0)
                    - (parseInt(String(a.version).replace(/\D/g, ''), 10) || 0))
      .map((s) => ({
        ...s,
        // Auszeichnungen und Sperren derselben Saison, ueber alle
        // Schreibweisen des Spielers.
        sds: (sds || [])
          .filter((x) => (x.fifa_version || 'FC25') === s.version && namen.has(String(x.name).toLowerCase()))
          .reduce((sum, x) => sum + (x.count || 0), 0),
        // Sperren haengen ueber player_id an genau dieser Saisonzeile.
        sperren: s.id == null ? 0
          : (sperren || []).filter((x) => x.player_id === s.id).length,
      }));
  }, [spieler, sds, sperren]);

  if (!spieler) return null;

  const gesamtTore = zeilen.reduce((s, z) => s + z.goals, 0);
  const gesamtSds = zeilen.reduce((s, z) => s + z.sds, 0);
  const beste = Math.max(...zeilen.map((z) => z.goals), 1);
  const besteSaison = zeilen.reduce((a, b) => (b.goals > (a?.goals ?? -1) ? b : a), null);
  // Vereinsnamen je Saison aufloesen, nicht ueber die laufende Saison: FC25
  // hiess Real Madrid, FC26 heisst Schalke — sonst steht im Kopf ein anderer
  // Verein als in der Zeile darunter.
  const stationen = [];
  for (const z of [...zeilen].reverse()) {
    if (!z.team) continue;
    const name = getTeamDisplay(z.team, z.version);
    if (stationen[stationen.length - 1] !== name) stationen.push(name);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
         onClick={onSchliessen} role="dialog" aria-modal="true" aria-label={`Laufbahn von ${spieler.name}`}>
      <div className="bg-bg-secondary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88dvh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg-secondary px-4 py-3 border-b border-border-light flex items-center gap-2.5 z-10">
          <SpielerWappen team={spieler.currentTeam} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="text-callout font-semibold text-text-primary truncate">{spieler.name}</h3>
            <p className="text-caption2 text-text-tertiary truncate">
              {zeilen.length} {zeilen.length === 1 ? 'Saison' : 'Saisons'}
              {stationen.length > 0 ? ` · ${stationen.join(' → ')}` : ''}
            </p>
          </div>
          <button onClick={onSchliessen}
                  className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                  aria-label="Schließen">
            <Icon name="x" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-4">
          {/* Kennzahlen */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Tore', gesamtTore, 'football', 'text-system-orange'],
              ['Auszeichnungen', gesamtSds, 'star', 'text-system-blue'],
              ['Saisons', zeilen.length, 'calendar', 'text-system-purple'],
            ].map(([label, wert, icon, farbe]) => (
              <div key={label} className="panel-gray rounded-xl p-3 text-center">
                <Icon name={icon} size={15} strokeWidth={2.2} className={`${farbe} mx-auto mb-1`} />
                <div className="stat-display text-lg num-tabular text-text-primary">{wert}</div>
                <div className="text-caption2 text-text-tertiary leading-tight">{label}</div>
              </div>
            ))}
          </div>

          {besteSaison && zeilen.length > 1 && (
            <p className="text-caption1 text-text-secondary">
              Stärkste Saison: <span className="font-semibold text-text-primary">{besteSaison.version}</span>
              {' '}mit {besteSaison.goals} {besteSaison.goals === 1 ? 'Tor' : 'Toren'}.
            </p>
          )}

          {/* Saison für Saison */}
          <div>
            <div className="text-footnote font-semibold text-text-muted mb-2">Saison für Saison</div>
            <div className="divide-y divide-border-light">
              {zeilen.map((z) => (
                <div key={z.version} className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-12 text-footnote font-bold num-tabular text-text-primary flex-shrink-0">
                      {z.version}
                    </span>
                    <SpielerWappen team={z.team} version={z.version} size="xs" />
                    <span className="text-caption1 text-text-secondary truncate min-w-0 flex-1">
                      {z.team ? getTeamDisplay(z.team, z.version) : '—'}
                    </span>
                    <span className="stat-display text-[15px] num-tabular text-text-primary w-8 text-right flex-shrink-0">
                      {z.goals}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1.5">
                    <div className="h-full bg-system-orange/70"
                         style={{ width: `${(z.goals / beste) * 100}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-caption2 text-text-tertiary mt-1">
                    {z.value > 0 && <span className="num-tabular">Marktwert {z.value} Mio</span>}
                    {z.sds > 0 && <span className="num-tabular">{z.sds}× Spieler des Spiels</span>}
                    {z.sperren > 0 && (
                      <span className="num-tabular">
                        {z.sperren} {z.sperren === 1 ? 'Sperre' : 'Sperren'}
                      </span>
                    )}
                    {istLegacySaison(z.version) && <span>nur Gesamtzahlen</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {spieler.spellings.length > 1 && (
            <p className="text-caption2 text-text-tertiary">
              {/* Ohne diesen Hinweis wirkt es wie ein Fehler, wenn oben ein
                  anderer Name steht als in einer alten Saison. */}
              Auch erfasst als: {spieler.spellings.filter((n) => n !== spieler.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
