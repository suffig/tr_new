import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import { aggregatePlayers } from '../../../utils/playerIdentity';
import { getTeamDisplay } from '../../../constants/teams';
import { saisonListe } from '../../../utils/saisonNummern';

/**
 * Alle Torschützen über alle Saisons — durchsuchbar und filterbar.
 *
 * Bewusst aus den SPIELERZEILEN (players), nicht aus den Torlisten der
 * Spiele: die Torlisten reichen nur so weit zurueck, wie Einzelspiele
 * erhalten sind (FC25/FC26), waehrend players.goals der gepflegte Stand je
 * Saison ist — inklusive der 332 importierten Spieler aus FC15 bis FC24.
 *
 * aggregatePlayers fasst denselben Menschen ueber Saisons und Schreibweisen
 * zusammen; deshalb steht Ronaldo hier einmal mit der Summe aus FC21, FC23
 * und FC24 statt dreimal einzeln.
 */
export default function TorschuetzenListe({ players, loading }) {
  const [suche, setSuche] = useState('');
  const [saison, setSaison] = useState('alle');
  const [team, setTeam] = useState('alle');
  const [sortierung, setSortierung] = useState('tore');
  const [zeigeAlle, setZeigeAlle] = useState(false);

  const saisons = useMemo(
    () => saisonListe([], players, null).map((s) => s.version).reverse(),
    [players]
  );

  const alle = useMemo(() => aggregatePlayers(players), [players]);

  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    let liste = alle.filter((p) => p.goals > 0);

    if (saison !== 'alle') {
      // Nur Spieler, die IN dieser Saison getroffen haben — und dann zaehlt
      // auch nur diese Saison, sonst waere die Filterung eine Luege.
      liste = liste
        .map((p) => {
          const s = p.seasons.find((x) => x.version === saison);
          return s && s.goals > 0
            ? { ...p, goals: s.goals, currentTeam: s.team, seasons: [s] }
            : null;
        })
        .filter(Boolean);
    }
    if (team !== 'alle') liste = liste.filter((p) => p.currentTeam === team);
    if (suchbegriff) {
      liste = liste.filter((p) =>
        p.name.toLowerCase().includes(suchbegriff) ||
        p.spellings.some((n) => n.toLowerCase().includes(suchbegriff)));
    }

    const sortierer = {
      tore: (a, b) => b.goals - a.goals || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      saisons: (a, b) => b.seasons.length - a.seasons.length || b.goals - a.goals,
    };
    return [...liste].sort(sortierer[sortierung] || sortierer.tore);
  }, [alle, suche, saison, team, sortierung]);

  const summe = gefiltert.reduce((s, p) => s + p.goals, 0);
  const sichtbar = zeigeAlle ? gefiltert : gefiltert.slice(0, 50);
  const beste = gefiltert[0]?.goals || 1;

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Lade Torschützen…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Suche */}
      <div className="relative">
        <Icon name="search" size={16} strokeWidth={2.2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Spieler suchen…"
          className="form-input w-full pl-9"
          aria-label="Torschützen durchsuchen"
        />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <select value={saison} onChange={(e) => setSaison(e.target.value)}
                className="form-input flex-1 min-w-[7rem] text-sm" aria-label="Saison filtern">
          <option value="alle">Alle Saisons</option>
          {saisons.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)}
                className="form-input flex-1 min-w-[7rem] text-sm" aria-label="Team filtern">
          <option value="alle">Alle Teams</option>
          <option value="AEK">{getTeamDisplay('AEK')}</option>
          <option value="Real">{getTeamDisplay('Real')}</option>
          <option value="Ehemalige">Ehemalige</option>
        </select>
        <select value={sortierung} onChange={(e) => setSortierung(e.target.value)}
                className="form-input flex-1 min-w-[7rem] text-sm" aria-label="Sortierung">
          <option value="tore">Nach Toren</option>
          <option value="name">Nach Name</option>
          <option value="saisons">Nach Saisons</option>
        </select>
      </div>

      <div className="flex items-baseline justify-between px-1">
        <span className="text-caption1 text-text-secondary">
          {gefiltert.length} {gefiltert.length === 1 ? 'Spieler' : 'Spieler'}
        </span>
        <span className="text-caption1 text-text-tertiary num-tabular">{summe} Tore</span>
      </div>

      {gefiltert.length === 0 ? (
        <div className="modern-card p-8 text-center">
          <p className="text-text-muted">Kein Spieler passt zur Suche.</p>
        </div>
      ) : (
        <div className="modern-card divide-y divide-border-light">
          {sichtbar.map((p, i) => (
            <div key={p.key} className="flex items-center gap-2.5 px-3 py-2.5">
              <span className={`w-6 text-center text-sm font-bold flex-shrink-0 num-tabular ${
                i === 0 ? 'text-system-yellow' : i === 1 ? 'text-text-secondary'
                : i === 2 ? 'text-system-orange' : 'text-text-tertiary'}`}>
                {i + 1}
              </span>
              <TeamLogo
                team={p.currentTeam === 'AEK' ? 'aek' : p.currentTeam === 'Real' ? 'real' : 'aek'}
                size="xs" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
                <div className="text-caption2 text-text-tertiary truncate">
                  {p.seasons.length === 1
                    ? p.seasons[0].version
                    : `${p.seasons.length} Saisons · ${p.seasons.map((s) => s.version).join(', ')}`}
                </div>
              </div>
              <div className="hidden min-[380px]:block w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden flex-shrink-0">
                <div className="h-full bg-system-orange/70" style={{ width: `${(p.goals / beste) * 100}%` }} />
              </div>
              <span className="stat-display text-[15px] num-tabular text-text-primary w-11 text-right flex-shrink-0">
                {p.goals}
              </span>
            </div>
          ))}
        </div>
      )}

      {!zeigeAlle && gefiltert.length > 50 && (
        <button onClick={() => setZeigeAlle(true)} className="btn-secondary w-full">
          Alle {gefiltert.length} anzeigen
        </button>
      )}

      <p className="text-caption2 text-text-tertiary px-1">
        Aus den Spielerzeilen aller Saisons — derselbe Spieler wird über Saisons
        und Schreibweisen hinweg zusammengefasst.
      </p>
    </div>
  );
}
