import { useMemo } from 'react';
import Icon from './icons/Icon';
import SpielerWappen from './SpielerWappen';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { getTeamDisplay } from '../constants/teams';
import { identityOf, nameKey } from '../utils/playerIdentity';

// Die Laufbahn eines Spielers ueber alle Saisons.
//
// players haelt pro Saison eine eigene Zeile — derselbe Mensch taucht also
// mehrfach auf, teils bei einem anderen Team. Die Spielerkarte zeigte bisher
// nur die Zeile der LAUFENDEN Saison: wer letzte Saison 30 Tore gemacht hat,
// stand mit 0 da, sobald die neue Saison begann.
//
// skipFifaFilter ist hier der Kern — ohne das liefert die Abfrage nur die
// aktuelle Saison zurueck, und genau die hat man ja schon.

const versionNum = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

export default function PlayerKarriere({ player }) {
  const { data: alle, loading } = useSupabaseQuery('players', '*', { skipFifaFilter: true });

  const saisons = useMemo(() => {
    if (!alle || !player) return [];
    const schluessel = identityOf(player);
    return alle
      .filter((p) => identityOf(p) === schluessel || nameKey(p.name) === nameKey(player.name))
      .map((p) => ({
        version: p.fifa_version || 'FC25',
        team: p.team || null,
        goals: Number(p.goals) || 0,
        value: Number(p.value) || 0,
        name: p.name,
      }))
      .sort((a, b) => versionNum(b.version) - versionNum(a.version));
  }, [alle, player]);

  // Eine einzelne Saison ist keine Laufbahn — dann sagt die Spielerkarte
  // darueber ohnehin schon alles.
  if (loading || saisons.length < 2) return null;

  const gesamt = saisons.reduce((s, x) => s + x.goals, 0);
  const beste = Math.max(...saisons.map((s) => s.goals));
  const teams = [...new Set(saisons.map((s) => s.team).filter(Boolean))];
  const schreibweisen = [...new Set(saisons.map((s) => s.name))];

  return (
    <div className="panel-gray rounded-xl p-4">
      <h4 className="text-footnote font-semibold text-text-muted mb-3 flex items-center gap-2">
        <Icon name="calendar" size={16} strokeWidth={2.2} />
        Laufbahn · {saisons.length} Saisons
      </h4>

      <div className="space-y-1.5">
        {saisons.map((s) => (
          <div key={s.version} className="flex items-center gap-2.5">
            <span className="w-14 text-caption2 font-semibold text-text-secondary num-tabular flex-shrink-0">
              {s.version}
            </span>
            <SpielerWappen team={s.team} version={s.version} size="xs" />
            <span className="text-caption2 text-text-tertiary truncate min-w-0 flex-1">
              {s.team ? getTeamDisplay(s.team, s.version) : '—'}
            </span>
            <div className="hidden min-[340px]:block flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden max-w-[5rem]">
              <div className="h-full bg-system-yellow"
                style={{ width: beste > 0 ? `${(s.goals / beste) * 100}%` : '0%' }} />
            </div>
            <span className="num-tabular text-sm font-bold text-text-primary w-8 text-right flex-shrink-0">
              {s.goals}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border-light flex items-baseline justify-between">
        <span className="text-caption2 text-text-tertiary">Tore insgesamt</span>
        <span className="stat-display text-xl text-system-yellow num-tabular">{gesamt}</span>
      </div>

      {teams.length > 1 && (
        <p className="text-caption2 text-text-tertiary mt-2">
          Teamwechsel: {teams.map((t) => getTeamDisplay(t)).join(' → ')}
        </p>
      )}
      {schreibweisen.length > 1 && (
        <p className="text-caption2 text-text-tertiary mt-1">
          {/* Ohne diesen Hinweis wirkt es wie ein Fehler, wenn oben ein leicht
              anderer Name steht als in einer alten Saison. */}
          Auch erfasst als: {schreibweisen.slice(1).join(', ')}
        </p>
      )}
    </div>
  );
}
