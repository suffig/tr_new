import { useState, useEffect, useRef } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import { getTeamShort } from '../../constants/teams';

// Live capture for a running match: tap goals (with scorer) and cards as they
// happen. Writes NOTHING to the DB — on finish it hands the collected data to
// the normal AddMatch form (review + save via the existing, tested flow).
// State is persisted to localStorage so a reload never loses a live match.

const STORE_KEY = 'fusta_live_match_v1';

const emptyLive = () => ({
  startedAt: new Date().toISOString(),
  goals: [],            // [{ team: 'AEK'|'Real', player }]
  yellowa: 0, reda: 0, yellowb: 0, redb: 0,
});

export function hasStoredLiveMatch() {
  try { return !!localStorage.getItem(STORE_KEY); } catch { return false; }
}

export default function LiveMatchModal({ players, onClose, onFinish }) {
  const [live, setLive] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && s.startedAt) return s;
    } catch { /* ignore */ }
    return emptyLive();
  });
  const [picker, setPicker] = useState(null); // 'AEK' | 'Real' | null
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef(null);

  // persist every change (crash safe)
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(live)); } catch { /* ignore */ }
  }, [live]);

  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(live.startedAt).getTime()) / 1000)));
    tick();
    timer.current = setInterval(tick, 1000);
    return () => clearInterval(timer.current);
  }, [live.startedAt]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const scoreA = live.goals.filter((g) => g.team === 'AEK').length;
  const scoreB = live.goals.filter((g) => g.team === 'Real').length;
  const teamPlayers = (team) => (players || []).filter((p) => p.team === team);

  const addGoal = (team, player) => {
    setLive((l) => ({ ...l, goals: [...l.goals, { team, player }] }));
    setPicker(null);
  };
  const undoGoal = () => setLive((l) => ({ ...l, goals: l.goals.slice(0, -1) }));
  const bump = (key, delta) => setLive((l) => ({ ...l, [key]: Math.max(0, (l[key] || 0) + delta) }));

  const clearStore = () => { try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ } };

  const cancel = () => {
    if (live.goals.length > 0 || live.yellowa + live.reda + live.yellowb + live.redb > 0) {
      if (!window.confirm('Live-Match wirklich verwerfen? Alle erfassten Ereignisse gehen verloren.')) return;
    }
    clearStore();
    onClose();
  };

  const finish = () => {
    // goals[] → goalslist format [{ player, count }]
    const toList = (team) => {
      const counts = {};
      for (const g of live.goals) if (g.team === team) counts[g.player] = (counts[g.player] || 0) + 1;
      return Object.entries(counts).map(([player, count]) => ({ player, count }));
    };
    clearStore();
    onFinish({
      goalslista: toList('AEK'),
      goalslistb: toList('Real'),
      yellowa: live.yellowa, reda: live.reda, yellowb: live.yellowb, redb: live.redb,
    });
  };

  const lastGoal = live.goals[live.goals.length - 1];

  const TeamCol = ({ team, score }) => (
    <div className="flex-1 flex flex-col items-center gap-2">
      <TeamLogo team={team === 'AEK' ? 'aek' : 'real'} size="sm" />
      <div className={`text-footnote font-semibold ${team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
        {getTeamShort(team)}
      </div>
      <div className="text-[44px] leading-none font-black tabular-nums text-text-primary">{score}</div>
      <button
        onClick={() => setPicker(picker === team ? null : team)}
        className={`w-full py-2.5 rounded-xl font-semibold text-white ${team === 'AEK' ? 'bg-system-blue' : 'bg-system-red'} active:scale-95 transition-transform`}
      >
        + Tor
      </button>
      <div className="w-full grid grid-cols-2 gap-1.5 text-[11px]">
        <CardStepper label="🟨" value={team === 'AEK' ? live.yellowa : live.yellowb} onChange={(d) => bump(team === 'AEK' ? 'yellowa' : 'yellowb', d)} />
        <CardStepper label="🟥" value={team === 'AEK' ? live.reda : live.redb} onChange={(d) => bump(team === 'AEK' ? 'reda' : 'redb', d)} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
      <div className="bg-bg-secondary rounded-2xl max-w-md w-full modal-content modal-mobile-safe">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-system-red animate-pulse" />
              <span className="text-footnote font-bold text-text-primary uppercase tracking-wide">Live</span>
              <span className="text-footnote tabular-nums text-text-secondary">{fmt(elapsed)}</span>
            </div>
            <button onClick={cancel} className="text-text-muted hover:text-text-primary text-2xl leading-none">×</button>
          </div>

          <div className="flex items-start gap-3">
            <TeamCol team="AEK" score={scoreA} />
            <div className="pt-10 text-title3 font-bold text-text-tertiary">:</div>
            <TeamCol team="Real" score={scoreB} />
          </div>

          {picker && (
            <div className="modern-card p-3">
              <div className="text-[11px] font-semibold text-text-muted mb-2">Torschütze ({getTeamShort(picker)})</div>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {teamPlayers(picker).map((p) => (
                  <button key={p.id} onClick={() => addGoal(picker, p.name)}
                    className="px-2 py-2 rounded-lg bg-bg-tertiary text-sm font-medium text-text-primary text-left truncate hover:bg-bg-primary">
                    {p.name}
                  </button>
                ))}
                <button onClick={() => addGoal(picker, picker === 'AEK' ? 'Eigentore_Real' : 'Eigentore_AEK')}
                  className="px-2 py-2 rounded-lg bg-bg-tertiary text-sm font-medium text-text-tertiary text-left">
                  Eigentor Gegner
                </button>
              </div>
            </div>
          )}

          {lastGoal && (
            <div className="flex items-center justify-between text-footnote bg-bg-tertiary rounded-xl px-3 py-2">
              <span className="text-text-secondary truncate">
                ⚽ {lastGoal.player} <span className={lastGoal.team === 'AEK' ? 'text-system-blue' : 'text-system-red'}>({getTeamShort(lastGoal.team)})</span>
              </span>
              <button onClick={undoGoal} className="text-system-red font-semibold flex-shrink-0 ml-2">Rückgängig</button>
            </div>
          )}

          <button onClick={finish} disabled={scoreA === scoreB}
            className="w-full btn-primary py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Icon name="check" size={16} strokeWidth={2.4} />
            Beenden &amp; übernehmen
          </button>
          {scoreA === scoreB && (
            <p className="text-[11px] text-text-tertiary text-center -mt-2">Kein Remis möglich — ein Team muss führen.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CardStepper({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between bg-bg-tertiary rounded-lg px-1.5 py-1">
      <button onClick={() => onChange(-1)} className="w-6 h-6 rounded text-text-secondary font-bold">−</button>
      <span className="tabular-nums font-semibold">{label} {value}</span>
      <button onClick={() => onChange(1)} className="w-6 h-6 rounded text-text-secondary font-bold">+</button>
    </div>
  );
}
