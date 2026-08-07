import { useEffect, useRef, useState } from 'react';
import Icon from './icons/Icon';
import TeamLogo from './TeamLogo';
import { getAllFifaVersions, setCurrentFifaVersion } from '../utils/fifaVersionManager';
import { getVersionTeamDisplay } from '../utils/versionTeamManager';
import { istLegacySaison } from '../utils/legacySaison';
import { useAktuelleSaison } from '../hooks/useAktuelleSaison';

const K_AKTIV = 'fifa_active_version';

const nummer = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/** Die Saison, in der laut Datenbank gespielt wird (siehe fifaVersionsSync). */
function laufendeSaison() {
  try {
    return localStorage.getItem(K_AKTIV) || null;
  } catch {
    return null;
  }
}

/**
 * Saisonwechsel im Kopf der App — ohne Neuladen.
 *
 * Frueher lud der Wechsel die Seite komplett neu. Noetig war das, weil die
 * Abfragen die Saison erst beim Aufruf aus dem localStorage lesen und von
 * selbst nicht neu luden. Das erledigt jetzt ein Abo in useSupabaseQuery
 * ('fifaVersionChanged'), hier bleibt ein reiner Zustandswechsel.
 *
 * Bewusst NICHT mit setActiveVersionInDB verbunden: sich eine alte Saison
 * anzusehen darf nicht die Saison umstellen, in der der andere gerade spielt.
 */
export default function SaisonWechsler({ className = '' }) {
  const aktuell = useAktuelleSaison();
  const [offen, setOffen] = useState(false);
  const [laufend, setLaufend] = useState(laufendeSaison);
  const box = useRef(null);

  useEffect(() => {
    const auffrischen = () => setLaufend(laufendeSaison());
    window.addEventListener('fifaVersionsHydrated', auffrischen);
    return () => window.removeEventListener('fifaVersionsHydrated', auffrischen);
  }, []);

  // Tippen ausserhalb schliesst — sonst bleibt das Menue auf dem Handy stehen.
  useEffect(() => {
    if (!offen) return;
    const zu = (e) => { if (box.current && !box.current.contains(e.target)) setOffen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOffen(false); };
    document.addEventListener('pointerdown', zu);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', zu);
      document.removeEventListener('keydown', esc);
    };
  }, [offen]);

  // Bewusst erst beim Oeffnen berechnet statt gemerkt: die Liste kommt aus dem
  // localStorage und kann sich durch die Synchronisierung mit der Datenbank
  // aendern. Ein useMemo wuerde eine dazugekommene Saison verschlucken.
  const saisons = !offen ? [] : Object.keys(getAllFifaVersions())
    .sort((a, b) => nummer(a) - nummer(b))
    .map((v, i) => ({
      version: v,
      nr: i + 1,
      aek: getVersionTeamDisplay('AEK', v)?.label || 'AEK',
      real: getVersionTeamDisplay('Real', v)?.label || 'Real',
      legacy: istLegacySaison(v),
      laeuft: v === laufend,
    }));

  const wechseln = (v) => {
    setOffen(false);
    if (v === aktuell) return;
    setCurrentFifaVersion(v);
  };

  const archiv = laufend && aktuell !== laufend;

  return (
    <div className={`relative ${className}`} ref={box}>
      <button
        onClick={() => setOffen((o) => !o)}
        className={`flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-full transition-all press-scale
          ${archiv
            ? 'bg-system-yellow/15 text-system-yellow hover:bg-system-yellow/25'
            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'}`}
        aria-haspopup="listbox"
        aria-expanded={offen}
        aria-label={`Saison ${aktuell} — andere Saison wählen`}
      >
        {archiv && <Icon name="clock" size={14} strokeWidth={2.4} />}
        <span className="text-footnote font-bold num-tabular">{aktuell}</span>
        <Icon name="chevronDown" size={14} strokeWidth={2.6}
              className={`transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>

      {offen && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-2 w-[15.5rem] max-w-[calc(100vw-2rem)] z-50
                     bg-bg-elevated rounded-2xl shadow-ios-floating border border-border-light
                     overflow-hidden animate-scale-in origin-top-right"
        >
          <div className="px-3 pt-2.5 pb-1.5 text-caption2 font-semibold uppercase tracking-wide text-text-tertiary">
            Saison
          </div>
          <div className="max-h-[60vh] overflow-y-auto pb-1">
            {saisons.map((s) => {
              const gewaehlt = s.version === aktuell;
              return (
                <button
                  key={s.version}
                  role="option"
                  aria-selected={gewaehlt}
                  onClick={() => wechseln(s.version)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                    ${gewaehlt ? 'bg-system-blue/10' : 'hover:bg-bg-tertiary active:bg-bg-tertiary'}`}
                >
                  <div className="flex -space-x-1 flex-shrink-0">
                    <TeamLogo team="aek" size="xs" version={s.version} />
                    <TeamLogo team="real" size="xs" version={s.version} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-footnote font-bold num-tabular ${gewaehlt ? 'text-system-blue' : 'text-text-primary'}`}>
                        {s.version}
                      </span>
                      <span className="text-caption2 text-text-tertiary">Saison {s.nr}</span>
                      {s.laeuft && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-system-green/15 text-system-green">
                          läuft
                        </span>
                      )}
                      {s.legacy && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-system-yellow/15 text-system-yellow">
                          Archiv
                        </span>
                      )}
                    </div>
                    <div className="text-caption2 text-text-secondary truncate">
                      {s.aek} · {s.real}
                    </div>
                  </div>
                  {gewaehlt && (
                    <Icon name="check" size={16} strokeWidth={2.8} className="text-system-blue flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {archiv && (
            <p className="px-3 py-2 text-caption2 text-text-tertiary border-t border-border-light">
              Du siehst eine vergangene Saison. Gespielt wird in {laufend}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
