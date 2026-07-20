import { useMemo, useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import LoadingSpinner from '../LoadingSpinner';
import HorizontalNavigation from '../HorizontalNavigation';
import SeasonView from './SeasonView';
import RecordsView from './RecordsView';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { getTeamDisplay } from '../../constants/teams';
import { chronoAsc, chronoDesc } from '../../utils/matchChronology';

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
        if (name && !String(name).startsWith('Eigentore')) scorers[name] = (scorers[name] || 0) + cnt;
      }
    }
  }

  // Order newest-first for streak & form (fall back to date if no id)
  const ordered = [...list].sort(chronoDesc);

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

  const topScorers = Object.entries(scorers)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, goals]) => ({ name, goals }));
  const topScorer = topScorers[0] || null;

  // Per-season head-to-head split (oldest → newest).
  const bySeason = {};
  for (const x of list) {
    const v = x.fifa_version || 'FC25';
    const a = x.goalsa || 0, b = x.goalsb || 0;
    const s = bySeason[v] || (bySeason[v] = { aekW: 0, realW: 0, draws: 0 });
    if (a > b) s.aekW++; else if (b > a) s.realW++; else s.draws++;
  }
  const seasonH2H = Object.entries(bySeason)
    .sort((p, q) => (parseInt(String(p[0]).replace(/\D/g, ''), 10) || 0) - (parseInt(String(q[0]).replace(/\D/g, ''), 10) || 0))
    .map(([v, s], i) => ({ version: v, number: i + 1, ...s }));

  return { total: list.length, aekW, realW, draws, aekG, realG, prizeA, prizeR, biggest, streak, last10, topScorer, topScorers, seasonH2H };
}

// Elo over all matches (K=24, Start 1000) — a form barometer for the rivalry.
function computeElo(matches) {
  const chrono = [...(matches || [])].sort(chronoAsc);
  let a = 1000, r = 1000;
  const series = [{ a, r }];
  for (const m of chrono) {
    const ga = m.goalsa || 0, gb = m.goalsb || 0;
    const expA = 1 / (1 + Math.pow(10, (r - a) / 400));
    const scoreA = ga > gb ? 1 : ga < gb ? 0 : 0.5;
    const delta = 24 * (scoreA - expA);
    a += delta; r -= delta;
    series.push({ a: Math.round(a), r: Math.round(r) });
  }
  return { series, aek: Math.round(a), real: Math.round(r) };
}

// "Abendform": win split by game number within an evening (same date, by id).
// Game 1 = sober, game 3+ = later in the evening — the beer curve, basically.
function computeEvenings(matches) {
  const byDate = {};
  for (const m of (matches || [])) {
    const key = String(m.date || '?');
    (byDate[key] = byDate[key] || []).push(m);
  }
  const buckets = { 1: { aekW: 0, realW: 0, draws: 0 }, 2: { aekW: 0, realW: 0, draws: 0 }, 3: { aekW: 0, realW: 0, draws: 0 } };
  for (const games of Object.values(byDate)) {
    games.sort((p, q) => (p.id || 0) - (q.id || 0));
    games.forEach((m, i) => {
      const pos = Math.min(i + 1, 3); // 3 == "Spiel 3+"
      const a = m.goalsa || 0, b = m.goalsb || 0;
      if (a > b) buckets[pos].aekW++; else if (b > a) buckets[pos].realW++; else buckets[pos].draws++;
    });
  }
  return [1, 2, 3].map((pos) => {
    const s = buckets[pos];
    return { pos, label: pos === 3 ? 'Spiel 3+' : `Spiel ${pos}`, ...s, games: s.aekW + s.realW + s.draws };
  }).filter((b) => b.games > 0);
}

// Sum goals per player within a single match (both goalslist formats).
function matchPlayerGoals(match, resolveName) {
  const tally = {};
  for (const raw of [match.goalslista, match.goalslistb]) {
    for (const g of parseGoals(raw)) {
      const isObj = typeof g === 'object' && g !== null;
      const name = resolveName(isObj ? (g.player ?? g.player_id) : g);
      const cnt = isObj ? (g.count || 1) : 1;
      if (name && !String(name).startsWith('Eigentore')) tally[name] = (tally[name] || 0) + cnt;
    }
  }
  return tally;
}

function fmtDay(s) {
  return s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
}

// Derive achievements purely from match data (no backend).
function computeAchievements(matches, resolveName, names) {
  const list = matches || [];
  const total = list.length;
  let totalPrize = 0;
  let bestHat = null;       // { player, goals, date }
  let bestKanter = null;    // { score, winner, margin, date }
  let cleanSheet = null;    // { score, winner, date }
  let torfabrik = null;     // { score, total, date }

  for (const x of list) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    // Nur GEWONNENE Preisgelder zählen (Verlierer-Preisgeld ist negativ und
    // würde die Summe sinnlos saldieren).
    totalPrize += Math.max(0, x.prizeaek || 0) + Math.max(0, x.prizereal || 0);

    const tally = matchPlayerGoals(x, resolveName);
    for (const [player, goals] of Object.entries(tally)) {
      if (goals >= 3 && (!bestHat || goals > bestHat.goals)) bestHat = { player, goals, date: x.date };
    }

    const margin = Math.abs(a - b);
    if (a !== b && margin >= 5 && (!bestKanter || margin > bestKanter.margin)) {
      bestKanter = { score: `${a}:${b}`, winner: a > b ? 'AEK' : 'Real', margin, date: x.date };
    }
    if (a !== b && Math.min(a, b) === 0 && !cleanSheet) {
      cleanSheet = { score: `${a}:${b}`, winner: a > b ? 'AEK' : 'Real', date: x.date };
    }
    if (a + b >= 8 && (!torfabrik || a + b > torfabrik.total)) {
      torfabrik = { score: `${a}:${b}`, total: a + b, date: x.date };
    }
  }

  // Longest historical win streak (chronological by id then date).
  const chrono = [...list].sort(chronoAsc);
  let maxStreak = { who: null, len: 0 }, curWho = null, curLen = 0;
  for (const x of chrono) {
    const a = x.goalsa || 0, b = x.goalsb || 0;
    if (a === b) { curWho = null; curLen = 0; continue; }
    const w = a > b ? 'AEK' : 'Real';
    if (w === curWho) curLen++; else { curWho = w; curLen = 1; }
    if (curLen > maxStreak.len) maxStreak = { who: w, len: curLen };
  }

  const who = (t) => (t === 'AEK' ? names.aek : names.real);

  return [
    {
      id: 'hattrick', title: 'Hattrick', icon: 'football', iconClass: 'text-system-green',
      desc: '3 Tore eines Spielers in einem Match',
      unlocked: !!bestHat,
      context: bestHat ? `${bestHat.player} · ${bestHat.goals} Tore · ${fmtDay(bestHat.date)}` : null,
    },
    {
      id: 'kanter', title: 'Kantersieg', icon: 'zap', iconClass: 'text-system-orange',
      desc: 'Sieg mit 5+ Toren Abstand',
      unlocked: !!bestKanter,
      context: bestKanter ? `${bestKanter.score} · ${who(bestKanter.winner)} · ${fmtDay(bestKanter.date)}` : null,
    },
    {
      id: 'cleansheet', title: 'Zu-Null-Sieg', icon: 'trophy', iconClass: 'text-system-blue',
      desc: 'Sieg ohne Gegentor',
      unlocked: !!cleanSheet,
      context: cleanSheet ? `${cleanSheet.score} · ${who(cleanSheet.winner)} · ${fmtDay(cleanSheet.date)}` : null,
    },
    {
      id: 'streak5', title: 'Dominanz', icon: 'zap', iconClass: 'text-system-red',
      desc: '5 Siege in Folge',
      unlocked: maxStreak.len >= 5,
      context: maxStreak.who ? `Rekord: ${maxStreak.len}× · ${who(maxStreak.who)}` : null,
      progress: { current: Math.min(maxStreak.len, 5), target: 5 },
    },
    {
      id: 'torfabrik', title: 'Torfabrik', icon: 'football', iconClass: 'text-system-orange',
      desc: 'Ein Match mit 8+ Toren',
      unlocked: !!torfabrik,
      context: torfabrik ? `${torfabrik.score} · ${torfabrik.total} Tore · ${fmtDay(torfabrik.date)}` : null,
    },
    {
      id: 'prize10m', title: 'Große Kasse', icon: 'euro', iconClass: 'text-system-green',
      desc: '10 Mio € Preisgeld gewonnen (gesamt)',
      unlocked: totalPrize >= 10000000,
      context: `${totalPrize.toLocaleString('de-DE')} € bisher`,
      progress: { current: Math.min(totalPrize, 10000000), target: 10000000 },
    },
    {
      id: 'games50', title: 'Halbes Hundert', icon: 'calendar', iconClass: 'text-system-blue',
      desc: '50 Spiele gespielt',
      unlocked: total >= 50,
      context: `${total} Spiele bisher`,
      progress: { current: Math.min(total, 50), target: 50 },
    },
    {
      id: 'games100', title: 'Jubiläum', icon: 'calendar', iconClass: 'text-system-purple',
      desc: '100 Spiele gespielt',
      unlocked: total >= 100,
      context: `${total} Spiele bisher`,
      progress: { current: Math.min(total, 100), target: 100 },
    },
  ];
}

function AchievementCard({ a }) {
  const pct = a.progress ? Math.round((a.progress.current / a.progress.target) * 100) : 0;
  return (
    <div className={`modern-card p-4 ${a.unlocked ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          a.unlocked ? 'bg-system-green/12' : 'bg-bg-tertiary'
        }`}>
          <Icon name={a.unlocked ? a.icon : 'ban'} size={20} strokeWidth={2}
                className={a.unlocked ? a.iconClass : 'text-text-tertiary'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-callout font-semibold text-text-primary">{a.title}</span>
            {a.unlocked && <Icon name="check" size={14} strokeWidth={3} className="text-system-green" />}
          </div>
          <p className="text-[11px] text-text-tertiary leading-snug">{a.desc}</p>
          {a.context && (
            <p className={`text-[11px] mt-1 ${a.unlocked ? 'text-text-secondary font-medium' : 'text-text-tertiary'}`}>
              {a.context}
            </p>
          )}
          {!a.unlocked && a.progress && (
            <div className="mt-1.5 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
              <div className="h-full bg-system-green/60" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

// Shareable season-recap image drawn on a canvas (portrait 1080x1350).
function WrappedView({ d, aekName, realName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !d.total) return;
    const W = 1080, H = 1350;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cx = W / 2;
    const font = (size, weight = '700') => `${weight} ${size}px -apple-system, "Segoe UI", Roboto, sans-serif`;

    // Background + accent orbs
    ctx.fillStyle = '#0A1119'; ctx.fillRect(0, 0, W, H);
    const orb = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(10,17,25,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    };
    orb(170, 170, 460, '#3D9BFF', 0.28);
    orb(920, 240, 460, '#FF453A', 0.24);

    const at = (t, x, y, size, color, weight = '700', align = 'center') => {
      ctx.fillStyle = color; ctx.textAlign = align; ctx.font = font(size, weight);
      ctx.fillText(t, x, y);
    };

    // Header
    at('DAS DUELL', cx, 160, 78, '#FFFFFF', '800');
    at('FUSTA · Rückblick', cx, 214, 34, '#8A93A0', '600');

    // Scoreboard
    const lx = 285, rx = W - 285;
    at(aekName, lx, 360, 42, '#3D9BFF', '700');
    at(realName, rx, 360, 42, '#FF453A', '700');
    at(String(d.aekW), lx, 510, 150, '#3D9BFF', '800');
    at(String(d.realW), rx, 510, 150, '#FF453A', '800');
    at(':', cx, 505, 100, '#5A6472', '700');
    at(`${d.total} Spiele · ${d.draws} Remis`, cx, 585, 34, '#8A93A0', '600');

    // Stat rows
    let y = 720;
    const rowH = 104;
    const row = (label, value, valueColor = '#FFFFFF') => {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(90, y - 54); ctx.lineTo(W - 90, y - 54); ctx.stroke();
      at(label, 90, y, 34, '#8A93A0', '600', 'left');
      at(value, W - 90, y, 40, valueColor, '700', 'right');
      y += rowH;
    };
    row('Torverhältnis', `${d.aekG} : ${d.realG}`);
    row('Ø Tore / Spiel', ((d.aekG + d.realG) / d.total).toFixed(1));
    if (d.biggest.margin >= 0) {
      row('Höchster Sieg', `${d.biggest.score}  ${d.biggest.winner === 'AEK' ? aekName : realName}`,
        d.biggest.winner === 'AEK' ? '#3D9BFF' : '#FF453A');
    }
    if (d.topScorer) row('Torschützenkönig', `${d.topScorer.name} (${d.topScorer.goals})`);
    const pd = d.prizeA - d.prizeR;
    row('Preisgeld-Saldo', pd === 0 ? '±0 €' : `${pd > 0 ? '+' : ''}${pd.toLocaleString('de-DE')} € ${pd > 0 ? aekName : realName}`,
      pd === 0 ? '#8A93A0' : pd > 0 ? '#3D9BFF' : '#FF453A');
    if (d.streak) row('Aktuelle Serie', `${d.streak.len}× ${d.streak.who === 'AEK' ? aekName : realName}`,
      d.streak.who === 'AEK' ? '#3D9BFF' : '#FF453A');

    // Footer
    at(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }), 90, H - 70, 30, '#5A6472', '600', 'left');
    at('FUSTA', W - 90, H - 70, 34, '#2FD97C', '800', 'right');
  }, [d, aekName, realName]);

  const filename = `fusta-rueckblick-${new Date().toISOString().slice(0, 10)}.png`;

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Rückblick gespeichert');
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'FUSTA Rückblick' });
      } else {
        save();
      }
    } catch { /* user cancelled */ }
  };

  if (!d.total) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-green/12 text-system-green flex items-center justify-center">
          <Icon name="star" size={30} strokeWidth={1.8} />
        </div>
        <p className="text-text-muted">Noch kein Rückblick möglich.</p>
        <p className="text-footnote text-text-tertiary mt-1">Nach den ersten Spielen entsteht hier eure teilbare Grafik.</p>
      </div>
    );
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

  return (
    <div className="space-y-4">
      <div className="modern-card p-3">
        <canvas ref={canvasRef} className="w-full h-auto rounded-xl" style={{ aspectRatio: '1080 / 1350' }} />
      </div>
      <div className="flex gap-3">
        <button onClick={save} className="flex-1 btn-primary inline-flex items-center justify-center gap-2">
          <Icon name="chevronDown" size={16} strokeWidth={2.4} /> Speichern
        </button>
        {canShare && (
          <button onClick={share} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary font-medium">
            <Icon name="zap" size={16} strokeWidth={2.4} /> Teilen
          </button>
        )}
      </div>
    </div>
  );
}

export default function DuelTab() {
  // skipFifaFilter → all matches across every FIFA version (all-time rivalry);
  // the Saison sub-view then splits them back out per version.
  const { data: matches, loading: mLoading, error: mError, refetch: refetchMatches } = useSupabaseQuery('matches', '*', { skipFifaFilter: true });
  const { data: players } = useSupabaseQuery('players', '*', { skipFifaFilter: true });
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
  const [view, setView] = useState('uebersicht');
  const [mode, setMode] = useState('alltime'); // Übersicht: All-Time vs. Saison
  const achievements = useMemo(
    () => computeAchievements(matches, resolveName, { aek: aekName, real: realName }),
    [matches, resolveName, aekName, realName]
  );
  const elo = useMemo(() => computeElo(matches), [matches]);
  const evenings = useMemo(() => computeEvenings(matches), [matches]);

  if (mLoading) return <LoadingSpinner message="Lade Duell…" />;

  if (mError && !matches) {
    return (
      <div className="p-4 text-center py-12">
        <div className="text-accent-red mb-4 flex justify-center">
          <Icon name="warning" size={28} strokeWidth={2} />
        </div>
        <p className="text-text-muted mb-4">Fehler beim Laden der Duell-Daten</p>
        <button onClick={refetchMatches} className="btn-primary">Erneut versuchen</button>
      </div>
    );
  }

  const views = [
    { id: 'uebersicht', label: 'Übersicht', iconName: 'zap' },
    { id: 'rekorde', label: 'Rekorde', iconName: 'trophy' },
    { id: 'erfolge', label: 'Erfolge', iconName: 'star' },
    { id: 'rueckblick', label: 'Rückblick', iconName: 'calendar' },
  ];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const prizeDiff = d.prizeA - d.prizeR;
  const avgGoals = d.total ? ((d.aekG + d.realG) / d.total).toFixed(1) : '0.0';
  const fmtEuro = (n) => `${(n / 1).toLocaleString('de-DE')} €`;
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

  return (
    <div className="p-4 pb-24 space-y-4">
      <HorizontalNavigation views={views} selectedView={view} onViewChange={setView} />

      {view === 'rekorde' ? (
        <RecordsView matches={matches} players={players} aekName={aekName} realName={realName} />
      ) : view === 'erfolge' ? (
        <div>
          <div className="text-footnote text-text-muted mb-3">
            {unlockedCount} von {achievements.length} freigeschaltet
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((a) => <AchievementCard key={a.id} a={a} />)}
          </div>
        </div>
      ) : view === 'rueckblick' ? (
        <WrappedView d={d} aekName={aekName} realName={realName} />
      ) : (
        /* Übersicht: All-Time ↔ Saison */
        <>
          <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
            {[['alltime', 'All-Time'], ['saison', 'Saison']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
                  mode === m ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'saison' ? (
            <SeasonView matches={matches} players={players} aekName={aekName} realName={realName} />
          ) : !d.total ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-orange/12 text-system-orange flex items-center justify-center">
                <Icon name="zap" size={30} strokeWidth={1.8} />
              </div>
              <p className="text-text-muted">Noch keine Spiele erfasst.</p>
              <p className="text-footnote text-text-tertiary mt-1">Sobald ihr spielt, entsteht hier eure Bilanz.</p>
            </div>
          ) : (
            <>
      {/* Hero scoreboard — broadcast look: team-colour gradient + big numerals */}
      <div className="modern-card p-5 relative overflow-hidden bg-gradient-to-br from-system-blue/15 via-transparent to-system-red/15">
        <div className="flex items-stretch">
          <div className="flex-1 flex flex-col items-center text-center">
            <TeamLogo team="aek" size="md" />
            <div className="mt-2 text-footnote font-semibold text-system-blue truncate max-w-full">{aekName}</div>
            <div className="text-[11px] text-text-tertiary truncate max-w-full">{getTeamDisplay('AEK')}</div>
            <div className="mt-1 text-[54px] leading-none font-black tracking-tight tabular-nums text-system-blue">{d.aekW}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">Siege</div>
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
            <div className="mt-1 text-[54px] leading-none font-black tracking-tight tabular-nums text-system-red">{d.realW}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">Siege</div>
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

      {/* Top-Torschützen (all-time) */}
      {d.topScorers.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-2">
            <Icon name="star" size={15} strokeWidth={2.2} className="text-system-orange" />
            Top-Torschützen
          </div>
          <div className="space-y-1.5">
            {d.topScorers.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={`w-5 text-center text-sm font-bold ${i === 0 ? 'text-system-yellow' : i === 2 ? 'text-system-orange' : 'text-text-tertiary'}`}>{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-text-primary truncate">{s.name}</span>
                <div className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div className="h-full bg-system-orange/70" style={{ width: `${(s.goals / d.topScorers[0].goals) * 100}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums w-6 text-right">{s.goals}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Head-to-Head je Saison */}
      {d.seasonH2H.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-2">
            <Icon name="calendar" size={15} strokeWidth={2.2} className="text-system-blue" />
            Bilanz je Saison
          </div>
          <div className="space-y-2.5">
            {d.seasonH2H.map((s) => {
              const tot = s.aekW + s.realW + s.draws || 1;
              return (
                <div key={s.version}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-text-secondary font-medium">Saison {s.number} · {s.version}</span>
                    <span className="tabular-nums">
                      <span className="text-system-blue font-semibold">{s.aekW}</span>
                      <span className="text-text-tertiary"> · {s.draws} · </span>
                      <span className="text-system-red font-semibold">{s.realW}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
                    <div className="bg-system-blue h-full" style={{ width: `${(s.aekW / tot) * 100}%` }} />
                    <div className="bg-text-tertiary/40 h-full" style={{ width: `${(s.draws / tot) * 100}%` }} />
                    <div className="bg-system-red h-full" style={{ width: `${(s.realW / tot) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Formbarometer: Elo-Verlauf beider Personen */}
      {elo.series.length > 2 && (() => {
        const all = elo.series.flatMap((p) => [p.a, p.r]);
        const min = Math.min(...all), max = Math.max(...all);
        const span = Math.max(1, max - min);
        const W = 300, H = 64;
        const pts = (key) => elo.series.map((p, i) =>
          `${(i / (elo.series.length - 1)) * W},${H - 6 - ((p[key] - min) / span) * (H - 12)}`).join(' ');
        const leader = elo.aek === elo.real ? null : (elo.aek > elo.real ? 'AEK' : 'Real');
        return (
          <div className="modern-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-footnote font-medium text-text-muted">
                <Icon name="chart" size={15} strokeWidth={2.2} className="text-system-green" />
                Formbarometer (Elo)
              </div>
              <span className="text-[11px] tabular-nums">
                <span className="text-system-blue font-bold">{elo.aek}</span>
                <span className="text-text-tertiary"> : </span>
                <span className="text-system-red font-bold">{elo.real}</span>
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
              <polyline points={pts('a')} fill="none" strokeWidth="2" stroke="currentColor" className="text-system-blue" />
              <polyline points={pts('r')} fill="none" strokeWidth="2" stroke="currentColor" className="text-system-red" />
            </svg>
            <div className="text-[11px] text-text-tertiary mt-1">
              {leader ? `${leader === 'AEK' ? aekName : realName} ist aktuell in Form` : 'Aktuell exakt gleichauf'} · K=24, Start 1000
            </div>
          </div>
        );
      })()}

      {/* Abendform: Siegquote nach Spiel-Nummer des Abends */}
      {evenings.length > 1 && (
        <div className="modern-card p-4">
          <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-2">
            <Icon name="beer" size={15} strokeWidth={2.2} className="text-system-orange" />
            Abendform
          </div>
          <div className="space-y-2.5">
            {evenings.map((b) => {
              const tot = b.games || 1;
              return (
                <div key={b.pos}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-text-secondary font-medium">{b.label}</span>
                    <span className="tabular-nums">
                      <span className="text-system-blue font-semibold">{b.aekW}</span>
                      <span className="text-text-tertiary"> · {b.draws} · </span>
                      <span className="text-system-red font-semibold">{b.realW}</span>
                      <span className="text-text-tertiary"> ({b.games})</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
                    <div className="bg-system-blue h-full" style={{ width: `${(b.aekW / tot) * 100}%` }} />
                    <div className="bg-text-tertiary/40 h-full" style={{ width: `${(b.draws / tot) * 100}%` }} />
                    <div className="bg-system-red h-full" style={{ width: `${(b.realW / tot) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-text-tertiary mt-2">
            Wer wird im Laufe des Abends stärker? Spiel 1 = nüchtern, Spiel 3+ = später am Abend.
          </p>
        </div>
      )}
            </>
          )}
        </>
      )}
    </div>
  );
}
