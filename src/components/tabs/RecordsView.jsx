import { useMemo } from 'react';
import Icon from '../icons/Icon';
import { chronoAsc } from '../../utils/matchChronology';

// All-time records across every season (FIFA version). Pure derivation from
// matches — no backend. Own goals (Eigentore_*) are excluded from scorer stats.

function parseGoals(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

const versionNum = (v) => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
const fmtDay = (s) => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

function computeRecords(matches, resolveName) {
  const list = matches || [];
  let biggest = { margin: -1 };
  let mostGoals = { total: -1 };
  let bestSolo = { goals: 0 };
  const scorers = {}, motm = {};
  const perSeason = {}; // version -> { total, aekW, realW, draws, games }

  for (const m of list) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    const margin = Math.abs(a - b);
    if (a !== b && margin > biggest.margin) biggest = { margin, score: `${a}:${b}`, winner: a > b ? 'AEK' : 'Real', date: m.date };
    if (a + b > mostGoals.total) mostGoals = { total: a + b, score: `${a}:${b}`, date: m.date };

    // per-match player tally (for solo record) + global scorers
    const tally = {};
    for (const raw of [m.goalslista, m.goalslistb]) {
      for (const g of parseGoals(raw)) {
        const isObj = typeof g === 'object' && g !== null;
        const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
        const cnt = isObj ? (g.count || 1) : 1;
        if (name && !String(name).startsWith('Eigentore')) {
          tally[name] = (tally[name] || 0) + cnt;
          scorers[name] = (scorers[name] || 0) + cnt;
        }
      }
    }
    for (const [name, g] of Object.entries(tally)) {
      if (g > bestSolo.goals) bestSolo = { goals: g, name, date: m.date };
    }
    if (m.manofthematch) motm[m.manofthematch] = (motm[m.manofthematch] || 0) + 1;

    const v = m.fifa_version || 'FC25';
    const ps = perSeason[v] || (perSeason[v] = { total: 0, aekW: 0, realW: 0, draws: 0, games: 0 });
    ps.total += a + b; ps.games += 1;
    if (a > b) ps.aekW++; else if (b > a) ps.realW++; else ps.draws++;
  }

  // longest win streak (chronological)
  const chrono = [...list].sort(chronoAsc);
  let maxStreak = { who: null, len: 0 }, curWho = null, curLen = 0;
  for (const m of chrono) {
    const a = m.goalsa || 0, b = m.goalsb || 0;
    if (a === b) { curWho = null; curLen = 0; continue; }
    const w = a > b ? 'AEK' : 'Real';
    if (w === curWho) curLen++; else { curWho = w; curLen = 1; }
    if (curLen > maxStreak.len) maxStreak = { who: w, len: curLen };
  }

  const top = (obj) => Object.entries(obj).sort((x, y) => y[1] - x[1])[0] || null;

  // season superlatives
  const seasons = Object.entries(perSeason).sort((x, y) => versionNum(x[0]) - versionNum(y[0]))
    .map(([v, s], i) => ({ version: v, number: i + 1, ...s, avg: s.games ? s.total / s.games : 0, balance: Math.abs(s.aekW - s.realW) }));
  const richestSeason = seasons.slice().sort((a, b) => b.avg - a.avg)[0] || null;
  const tightestSeason = seasons.filter(s => s.games > 0).slice().sort((a, b) => a.balance - b.balance)[0] || null;

  return {
    total: list.length, biggest, mostGoals, bestSolo, maxStreak,
    topScorer: top(scorers), topMotm: top(motm), richestSeason, tightestSeason, seasons,
  };
}

function Record({ icon, iconClass, label, value, sub }) {
  return (
    <div className="modern-card p-4">
      <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
        <Icon name={icon} size={15} strokeWidth={2.2} className={iconClass} />
        {label}
      </div>
      <div className="text-title3 font-bold text-text-primary leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}

export default function RecordsView({ matches, players, aekName, realName }) {
  const resolveName = useMemo(() => (idOrName) => {
    if (idOrName == null) return null;
    if (typeof idOrName === 'string' && !/^\d+$/.test(idOrName)) return idOrName;
    const p = (players || []).find((pl) => pl.id === idOrName || String(pl.id) === String(idOrName));
    return p?.name || (typeof idOrName === 'string' ? idOrName : null);
  }, [players]);

  const r = useMemo(() => computeRecords(matches, resolveName), [matches, resolveName]);
  const who = (t) => (t === 'AEK' ? aekName : realName);

  if (!r.total) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-yellow/12 text-system-yellow flex items-center justify-center">
          <Icon name="trophy" size={30} strokeWidth={1.8} />
        </div>
        <p className="text-text-muted">Noch keine Rekorde.</p>
        <p className="text-footnote text-text-tertiary mt-1">Sobald ihr spielt, sammeln sich hier die Bestmarken über alle Saisons.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-footnote text-text-muted">Über alle Saisons · {r.total} Spiele</div>
      <div className="grid grid-cols-2 gap-3">
        {r.biggest.margin >= 0 && (
          <Record icon="trophy" iconClass="text-system-yellow" label="Höchster Sieg"
            value={<span className={r.biggest.winner === 'AEK' ? 'text-system-blue' : 'text-system-red'}>{r.biggest.score}</span>}
            sub={`${who(r.biggest.winner)} · ${fmtDay(r.biggest.date)}`} />
        )}
        <Record icon="football" iconClass="text-system-green" label="Torreichstes Spiel"
          value={r.mostGoals.score} sub={`${r.mostGoals.total} Tore · ${fmtDay(r.mostGoals.date)}`} />
        {r.maxStreak.who && (
          <Record icon="zap" iconClass="text-system-orange" label="Längste Siegesserie"
            value={<span className={r.maxStreak.who === 'AEK' ? 'text-system-blue' : 'text-system-red'}>{r.maxStreak.len}×</span>}
            sub={`in Folge · ${who(r.maxStreak.who)}`} />
        )}
        {r.bestSolo.goals > 0 && (
          <Record icon="star" iconClass="text-system-orange" label="Meiste Tore / Spiel"
            value={`${r.bestSolo.goals}`} sub={`${r.bestSolo.name} · ${fmtDay(r.bestSolo.date)}`} />
        )}
        {r.topScorer && (
          <Record icon="star" iconClass="text-system-red" label="Torschützenkönig (all-time)"
            value={<span className="truncate block">{r.topScorer[0]}</span>} sub={`${r.topScorer[1]} Tore`} />
        )}
        {r.topMotm && (
          <Record icon="star" iconClass="text-system-blue" label="Meiste MVP (all-time)"
            value={<span className="truncate block">{r.topMotm[0]}</span>} sub={`${r.topMotm[1]}×`} />
        )}
        {r.richestSeason && (
          <Record icon="chart" iconClass="text-system-green" label="Torreichste Saison"
            value={`Saison ${r.richestSeason.number}`} sub={`${r.richestSeason.avg.toFixed(1)} Tore/Spiel · ${r.richestSeason.version}`} />
        )}
        {r.tightestSeason && (
          <Record icon="chart" iconClass="text-system-blue" label="Ausgeglichenste Saison"
            value={`Saison ${r.tightestSeason.number}`} sub={`Sieg-Differenz ${r.tightestSeason.balance} · ${r.tightestSeason.version}`} />
        )}
      </div>

      {r.seasons.length > 1 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-medium text-text-muted mb-2">Saison-Vergleich</div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1.5 text-sm">
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary">Saison</span>
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary text-right">Spiele</span>
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary text-right">Tore</span>
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary text-right">Ø</span>
            {r.seasons.map((s) => (
              <FragmentRow key={s.version} s={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ s }) {
  return (
    <>
      <span className="font-medium text-text-primary">Saison {s.number} · {s.version}</span>
      <span className="text-right tabular-nums text-text-secondary">{s.games}</span>
      <span className="text-right tabular-nums text-text-secondary">{s.total}</span>
      <span className="text-right tabular-nums font-semibold">{s.avg.toFixed(1)}</span>
    </>
  );
}
