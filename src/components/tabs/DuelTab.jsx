import { useMemo } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import LoadingSpinner from '../LoadingSpinner';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { getTeamDisplay } from '../../constants/teams';

// goalslist entries are either a plain name string or { player_id, player, count }
function parseGoals(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

function computeDuel(matches, resolveName) {
  const list = matches || [];
  let aekW = 0, realW = 0, draws = 0, aekG = 0, realG = 0, prizeA = 0, prizeR = 0;
  let biggest = { margin: -1 };
  const scorers = {};

  for (const x of list) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    aekG += a; realG += b;
    prizeA += x.prizeaek || 0; prizeR += x.prizereal || 0;
    if (a > b) aekW++; else if (b > a) realW++; else draws++;

    const margin = Math.abs(a - b);
    if (margin > biggest.margin && a !== b) {
      biggest = { margin, winner: a > b ? 'AEK' : 'Real', score: `${a}:${b}`, date: x.date };
    }

    for (const [raw] of [[x.goalslista], [x.goalslistb]]) {
      for (const g of parseGoals(raw)) {
        const isObj = typeof g === 'object' && g !== null;
        const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
        const cnt = isObj ? (g.count || 1) : 1;
        if (name) scorers[name] = (scorers[name] || 0) + cnt;
      }
    }
  }

  // Order newest-first for streak & form (fall back to date if no id)
  const ordered = [...list].sort((p, q) => (q.id || 0) - (p.id || 0) || String(q.date).localeCompare(String(p.date)));

  let streak = null, who = null, len = 0;
  for (const x of ordered) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    if (a === b) break;
    const w = a > b ? 'AEK' : 'Real';
    if (who === null) { who = w; len = 1; } else if (w === who) len++; else break;
  }
  if (who && len >= 1) streak = { who, len };

  const last10 = ordered.slice(0, 10).map((x) => {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    return a === b ? 'D' : (a > b ? 'AEK' : 'Real');
  });

  let topScorer = null;
  for (const [name, goals] of Object.entries(scorers)) {
    if (!topScorer || goals > topScorer.goals) topScorer = { name, goals };
  }

  return { total: list.length, aekW, realW, draws, aekG, realG, prizeA, prizeR, biggest, streak, last10, topScorer };
}

function StatCard({ iconName, iconClass, label, children }) {
  return (
    <div className="modern-card p-4">
      <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1.5">
        <Icon name={iconName} size={15} strokeWidth={2.2} className={iconClass} />
        {label}
      </div>
      <div className="text-text-primary">{children}</div>
    </div>
  );
}

export default function DuelTab() {
  const { data: matches, loading: mLoading } = useSupabaseQuery('matches', '*');
  const { data: players } = useSupabaseQuery('players', '*');
  const { data: managers } = useSupabaseQuery('manager', '*');

  const aekName = managers?.find((m) => m.id === 1)?.name || 'Alexander';
  const realName = managers?.find((m) => m.id === 2)?.name || 'Philip';

  const resolveName = useMemo(() => {
    return (idOrName) => {
      if (idOrName == null) return null;
      if (typeof idOrName === 'string' && !/^\d+$/.test(idOrName)) return idOrName;
      const p = (players || []).find((pl) => pl.id === idOrName || String(pl.id) === String(idOrName));
      return p?.name || (typeof idOrName === 'string' ? idOrName : null);
    };
  }, [players]);

  const d = useMemo(() => computeDuel(matches, resolveName), [matches, resolveName]);

  if (mLoading) return <LoadingSpinner message="Lade Duell…" />;

  if (!d.total) {
    return (
      <div className="p-4 pb-24 text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-orange/12 text-system-orange flex items-center justify-center">
          <Icon name="zap" size={30} strokeWidth={1.8} />
        </div>
        <p className="text-text-muted">Noch keine Spiele erfasst.</p>
        <p className="text-footnote text-text-tertiary mt-1">Sobald ihr spielt, entsteht hier eure Bilanz.</p>
      </div>
    );
  }

  const prizeDiff = d.prizeA - d.prizeR;
  const avgGoals = ((d.aekG + d.realG) / d.total).toFixed(1);
  const fmtEuro = (n) => `${(n / 1).toLocaleString('de-DE')} €`;
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Hero scoreboard */}
      <div className="modern-card p-5">
        <div className="flex items-stretch">
          <div className="flex-1 flex flex-col items-center text-center">
            <TeamLogo team="aek" size="md" />
            <div className="mt-2 text-footnote font-semibold text-system-blue truncate max-w-full">{aekName}</div>
            <div className="text-[11px] text-text-tertiary truncate max-w-full">{getTeamDisplay('AEK')}</div>
            <div className="mt-1 text-[40px] leading-none font-extrabold text-system-blue">{d.aekW}</div>
            <div className="text-[11px] text-text-tertiary">Siege</div>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <div className="text-title3 font-bold text-text-tertiary">{d.draws}</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wide">Remis</div>
            <div className="mt-2 text-[10px] text-text-muted">{d.total} Spiele</div>
          </div>

          <div className="flex-1 flex flex-col items-center text-center">
            <TeamLogo team="real" size="md" />
            <div className="mt-2 text-footnote font-semibold text-system-red truncate max-w-full">{realName}</div>
            <div className="text-[11px] text-text-tertiary truncate max-w-full">{getTeamDisplay('Real')}</div>
            <div className="mt-1 text-[40px] leading-none font-extrabold text-system-red">{d.realW}</div>
            <div className="text-[11px] text-text-tertiary">Siege</div>
          </div>
        </div>

        {/* Win-share bar */}
        <div className="mt-4 h-2.5 rounded-full overflow-hidden bg-bg-tertiary flex">
          <div className="bg-system-blue h-full" style={{ width: `${(d.aekW / d.total) * 100}%` }} />
          <div className="bg-text-tertiary/40 h-full" style={{ width: `${(d.draws / d.total) * 100}%` }} />
          <div className="bg-system-red h-full" style={{ width: `${(d.realW / d.total) * 100}%` }} />
        </div>
      </div>

      {/* Form (last 10) */}
      <div className="modern-card p-4">
        <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-2">
          <Icon name="chart" size={15} strokeWidth={2.2} className="text-system-green" />
          Formkurve (letzte {d.last10.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {d.last10.map((r, i) => (
            <span
              key={i}
              title={r === 'AEK' ? aekName : r === 'Real' ? realName : 'Remis'}
              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                r === 'AEK' ? 'bg-system-blue' : r === 'Real' ? 'bg-system-red' : 'bg-text-tertiary/50'
              }`}
            >
              {r === 'D' ? '–' : r === 'AEK' ? 'A' : 'P'}
            </span>
          ))}
          <span className="text-[10px] text-text-tertiary self-center ml-1">neueste zuerst</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard iconName="football" iconClass="text-system-green" label="Torverhältnis">
          <span className="text-title3 font-bold">
            <span className="text-system-blue">{d.aekG}</span>
            <span className="text-text-tertiary"> : </span>
            <span className="text-system-red">{d.realG}</span>
          </span>
          <div className="text-[11px] text-text-tertiary mt-0.5">Ø {avgGoals} Tore/Spiel</div>
        </StatCard>

        <StatCard iconName="zap" iconClass="text-system-orange" label="Aktuelle Serie">
          {d.streak ? (
            <>
              <span className={`text-title3 font-bold ${d.streak.who === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                {d.streak.len}×
              </span>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                in Folge · {d.streak.who === 'AEK' ? aekName : realName}
              </div>
            </>
          ) : (
            <span className="text-footnote text-text-tertiary">—</span>
          )}
        </StatCard>

        <StatCard iconName="trophy" iconClass="text-system-yellow" label="Höchster Sieg">
          {d.biggest.margin >= 0 ? (
            <>
              <span className={`text-title3 font-bold ${d.biggest.winner === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                {d.biggest.score}
              </span>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                {d.biggest.winner === 'AEK' ? aekName : realName} · {fmtDate(d.biggest.date)}
              </div>
            </>
          ) : <span className="text-footnote text-text-tertiary">—</span>}
        </StatCard>

        <StatCard iconName="euro" iconClass="text-system-green" label="Preisgeld-Saldo">
          {prizeDiff === 0 ? (
            <span className="text-title3 font-bold text-text-tertiary">±0</span>
          ) : (
            <>
              <span className={`text-title3 font-bold ${prizeDiff > 0 ? 'text-system-blue' : 'text-system-red'}`}>
                {prizeDiff > 0 ? '+' : ''}{fmtEuro(prizeDiff)}
              </span>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                Vorsprung {prizeDiff > 0 ? aekName : realName}
              </div>
            </>
          )}
        </StatCard>

        {d.topScorer && (
          <StatCard iconName="star" iconClass="text-system-orange" label="Torschützenkönig">
            <span className="text-title3 font-bold text-text-primary truncate block">{d.topScorer.name}</span>
            <div className="text-[11px] text-text-tertiary mt-0.5">{d.topScorer.goals} Tore gesamt</div>
          </StatCard>
        )}

        <StatCard iconName="football" iconClass="text-text-tertiary" label="Bilanz">
          <span className="text-title3 font-bold">
            <span className="text-system-blue">{d.aekW}</span>
            <span className="text-text-tertiary"> · {d.draws} · </span>
            <span className="text-system-red">{d.realW}</span>
          </span>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {d.aekW === d.realW ? 'Ausgeglichen' : `${d.aekW > d.realW ? aekName : realName} führt`}
          </div>
        </StatCard>
      </div>
    </div>
  );
}
