import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import { getTeamDisplay } from '../../constants/teams';
import { getCurrentFifaVersion } from '../../utils/fifaVersionManager';

// A "Saison" == a FIFA version. Matches already carry `fifa_version`
// (legacy rows without one count as FC25), so seasons are derived purely from
// existing data — no extra table, no season_id.

function parseGoals(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

function computeStandings(matches) {
  const A = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  const R = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const m of matches) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    A.gf += a; A.ga += b; R.gf += b; R.ga += a;
    if (a > b) { A.w++; R.l++; } else if (b > a) { R.w++; A.l++; } else { A.d++; R.d++; }
  }
  A.pts = A.w * 3 + A.d; R.pts = R.w * 3 + R.d;
  A.gd = A.gf - A.ga; R.gd = R.gf - R.ga;
  return { A, R };
}

function computeAwards(matches, resolveName) {
  const scorers = {}, motm = {};
  for (const m of matches) {
    for (const raw of [m.goalslista, m.goalslistb]) {
      for (const g of parseGoals(raw)) {
        const isObj = typeof g === 'object' && g !== null;
        const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
        const cnt = isObj ? (g.count || 1) : 1;
        if (name && !String(name).startsWith('Eigentore')) scorers[name] = (scorers[name] || 0) + cnt;
      }
    }
    if (m.manofthematch) motm[m.manofthematch] = (motm[m.manofthematch] || 0) + 1;
  }
  const top = (obj) => Object.entries(obj).sort((x, y) => y[1] - x[1])[0] || null;
  return { topScorer: top(scorers), topMotm: top(motm) };
}

const versionNum = (v) => parseInt(String(v).replace(/\D/g, ''), 10) || 0;

export default function SeasonView({ matches, players, aekName, realName }) {
  const resolveName = useMemo(() => (idOrName) => {
    if (idOrName == null) return null;
    if (typeof idOrName === 'string' && !/^\d+$/.test(idOrName)) return idOrName;
    const p = (players || []).find((pl) => pl.id === idOrName || String(pl.id) === String(idOrName));
    return p?.name || (typeof idOrName === 'string' ? idOrName : null);
  }, [players]);

  const currentVersion = getCurrentFifaVersion();

  // Seasons = the FIFA versions that appear in the data (plus the current one),
  // ordered oldest→newest so FC25 = Saison 1, FC26 = Saison 2, …
  const seasons = useMemo(() => {
    const set = new Set((matches || []).map((m) => m.fifa_version || 'FC25'));
    set.add(currentVersion);
    return [...set].sort((a, b) => versionNum(a) - versionNum(b)).map((v, i) => ({
      version: v,
      number: i + 1,
      label: `Saison ${i + 1} · ${v}`,
    }));
  }, [matches, currentVersion]);

  const [selected, setSelected] = useState(currentVersion);
  const current = seasons.find((s) => s.version === selected) || seasons[seasons.length - 1];

  const seasonMatches = useMemo(
    () => (matches || []).filter((m) => (m.fifa_version || 'FC25') === current?.version),
    [matches, current]
  );

  const { A, R } = useMemo(() => computeStandings(seasonMatches), [seasonMatches]);
  const awards = useMemo(() => computeAwards(seasonMatches, resolveName), [seasonMatches, resolveName]);

  if (!matches) {
    return <div className="text-center py-16 text-text-muted">Lade Saison…</div>;
  }

  const total = seasonMatches.length;
  const isActive = current?.version === currentVersion;
  const leader = A.pts === R.pts ? null : (A.pts > R.pts ? 'AEK' : 'Real');

  const Row = ({ side, name, s }) => (
    <div className="grid grid-cols-[auto_1fr_repeat(5,minmax(0,2.2rem))] items-center gap-1 py-2 text-sm">
      <TeamLogo team={side === 'AEK' ? 'aek' : 'real'} size="xs" />
      <span className={`font-semibold truncate ${side === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>{name}</span>
      <span className="text-center tabular-nums">{s.w}</span>
      <span className="text-center tabular-nums">{s.d}</span>
      <span className="text-center tabular-nums">{s.l}</span>
      <span className="text-center tabular-nums text-text-secondary">{s.gd > 0 ? '+' : ''}{s.gd}</span>
      <span className="text-center tabular-nums font-bold">{s.pts}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Season selector + status */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={current?.version || ''}
          onChange={(e) => setSelected(e.target.value)}
          className="form-input flex-1 max-w-[62%]"
        >
          {seasons.map((s) => (
            <option key={s.version} value={s.version}>
              {s.label}{s.version === currentVersion ? ' · aktuell' : ''}
            </option>
          ))}
        </select>
        <span className={`text-footnote font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
          isActive ? 'bg-system-green/15 text-system-green' : 'bg-text-tertiary/15 text-text-secondary'
        }`}>
          {isActive ? 'Läuft' : 'Beendet'}
        </span>
      </div>

      {/* Matchup subtitle (version-specific team names) */}
      <div className="text-center text-footnote text-text-tertiary -mt-1">
        {getTeamDisplay('AEK', current?.version)} <span className="text-text-muted">vs</span> {getTeamDisplay('Real', current?.version)}
      </div>

      {/* Standings */}
      <div className="modern-card p-4">
        <div className="grid grid-cols-[auto_1fr_repeat(5,minmax(0,2.2rem))] gap-1 text-[10px] uppercase tracking-wide text-text-tertiary pb-1 border-b border-border-light">
          <span /><span />
          <span className="text-center">S</span>
          <span className="text-center">U</span>
          <span className="text-center">N</span>
          <span className="text-center">TD</span>
          <span className="text-center">Pkt</span>
        </div>
        {(A.pts >= R.pts)
          ? (<><Row side="AEK" name={aekName} s={A} /><Row side="Real" name={realName} s={R} /></>)
          : (<><Row side="Real" name={realName} s={R} /><Row side="AEK" name={aekName} s={A} /></>)}
        <div className="text-[11px] text-text-tertiary mt-2">
          {total} {total === 1 ? 'Spiel' : 'Spiele'} in dieser Saison
        </div>
      </div>

      {total === 0 ? (
        <p className="text-center text-footnote text-text-tertiary py-4">
          Für diese Saison sind noch keine Spiele erfasst.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="modern-card p-4">
            <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
              <Icon name="trophy" size={15} strokeWidth={2.2} className="text-system-yellow" />
              {isActive ? 'Führung' : 'Meister'}
            </div>
            {leader ? (
              <span className={`text-callout font-bold ${leader === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                {leader === 'AEK' ? aekName : realName}
              </span>
            ) : <span className="text-footnote text-text-tertiary">Gleichstand</span>}
          </div>
          <div className="modern-card p-4">
            <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
              <Icon name="star" size={15} strokeWidth={2.2} className="text-system-orange" />
              Torschützenkönig
            </div>
            {awards.topScorer
              ? <span className="text-callout font-bold text-text-primary truncate block">{awards.topScorer[0]} <span className="text-text-tertiary font-medium">({awards.topScorer[1]})</span></span>
              : <span className="text-footnote text-text-tertiary">—</span>}
          </div>
          <div className="modern-card p-4">
            <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
              <Icon name="star" size={15} strokeWidth={2.2} className="text-system-blue" />
              Meiste MVP
            </div>
            {awards.topMotm
              ? <span className="text-callout font-bold text-text-primary truncate block">{awards.topMotm[0]} <span className="text-text-tertiary font-medium">({awards.topMotm[1]})</span></span>
              : <span className="text-footnote text-text-tertiary">—</span>}
          </div>
        </div>
      )}

      <p className="text-[11px] text-text-tertiary text-center">
        Saisons entsprechen den FIFA-Versionen. Neue Spiele zählen automatisch zur aktuellen Version ({currentVersion}); eine neue Version (z.&nbsp;B. FC27) startet die nächste Saison.
      </p>
    </div>
  );
}
