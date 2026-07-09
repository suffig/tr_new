import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from '../icons/Icon';
import { getCatalog } from '../../utils/fc26Catalog';
import {
  loadPulls, countsInWindow, addPull, removeLatestPull, clearPerson,
  windowStart, TIME_WINDOWS,
} from '../../utils/teamCollection';

const PEOPLE = [
  { id: 'alexander', name: 'Alexander', accent: 'blue' },
  { id: 'philip', name: 'Philip', accent: 'red' },
];

const ACCENT = {
  blue: { text: 'text-system-blue', chip: 'bg-system-blue/12 text-system-blue', pill: 'bg-system-blue text-white', bar: 'bg-system-blue' },
  red: { text: 'text-system-red', chip: 'bg-system-red/12 text-system-red', pill: 'bg-system-red text-white', bar: 'bg-system-red' },
};

const RATING_TIERS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
const fmtRating = (r) => (r == null ? '—' : r.toFixed(1).replace('.', ','));

// Achievement state for a person (all-time) — drives the unlock toast.
// Mirrors the 12 achievements shown in the stats detail sheet.
const MILESTONE_LABELS = {
  first: 'Erstes Team', five: 'Erstes 5★-Team', collector10: 'Sammler (10 Teams)',
  collector50: 'Großsammler (50 Teams)', tophunter: 'Top-Jäger (10 × ≥4,5★)',
  national: 'Nationalstolz (5 Nationalteams)', women3: 'Frauenfußball (3 Teams)',
  repeat5: 'Stammverein (1 Team 5×)', underdog: 'Underdog (0,5★-Team)',
  allTiers: 'Alle Stern-Stufen', veteran: 'Veteran (100× bekommen)', complete5: '5★-Komplett',
};
function computeMilestones(pulls, catalog, pid) {
  const teamOf = new Map(catalog.map((t) => [t.name, t]));
  const total5 = catalog.filter((t) => t.rating === 5).length;
  const counts = new Map();
  let total = 0;
  for (const e of pulls) { if (e.person !== pid) continue; total += 1; counts.set(e.team, (counts.get(e.team) || 0) + 1); }
  let five = 0, top = 0, nat = 0, women = 0, maxCount = 0;
  const tiers = new Set();
  for (const [name, c] of counts) {
    if (c > maxCount) maxCount = c;
    const t = teamOf.get(name); const r = t?.rating;
    if (r === 5) five += 1;
    if (r != null && r >= 4.5) top += 1;
    if (r == null) nat += 1;
    if (t?.women) women += 1;
    if (r != null) tiers.add(r);
  }
  return {
    first: total >= 1, five: five >= 1, collector10: counts.size >= 10, collector50: counts.size >= 50,
    tophunter: top >= 10, national: nat >= 5, women3: women >= 3, repeat5: maxCount >= 5,
    underdog: tiers.has(0.5), allTiers: tiers.size >= RATING_TIERS.length,
    veteran: total >= 100, complete5: total5 > 0 && five >= total5,
  };
}

  };
}

function relTime(ts) {
  const d = Date.now() - new Date(ts).getTime();
  const min = Math.floor(d / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const days = Math.floor(h / 24);
  return `vor ${days} T.`;
}

function StarRating({ rating, size = 13 }) {
  if (rating == null) return <span className="text-[10px] text-text-tertiary font-medium">Nat.-Team</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, rating - (i - 1)));
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <span className="absolute inset-0 text-border-medium"><Icon name="star" size={size} strokeWidth={2} /></span>
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden text-system-yellow" style={{ width: `${fill * 100}%` }}>
                  <Icon name="starFilled" size={size} strokeWidth={0} />
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="text-[11px] font-semibold text-text-secondary tabular-nums">{fmtRating(rating)}</span>
    </span>
  );
}

export default function TeamTrackerTab() {
  const [pulls, setPulls] = useState(loadPulls);
  const [person, setPerson] = useState('alexander');
  const [windowId, setWindowId] = useState('all');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [openTier, setOpenTier] = useState(5);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isStats = person === 'stats';
  const current = PEOPLE.find((p) => p.id === person) || PEOPLE[0];
  const accent = ACCENT[current.accent];
  const sinceTs = windowStart(windowId);

  const catalog = useMemo(() => getCatalog(), []);
  const teamByName = useMemo(() => {
    const m = new Map();
    catalog.forEach((t) => m.set(t.name, t));
    return m;
  }, [catalog]);

  const counts = useMemo(() => countsInWindow(pulls, current.id, sinceTs), [pulls, current.id, sinceTs]);

  const change = (teamName, delta) => {
    const team = teamByName.get(teamName);
    if (!team) return;
    if (delta > 0) {
      // Detect newly unlocked milestones and celebrate them
      const before = computeMilestones(pulls, catalog, current.id);
      const after = computeMilestones([...pulls, { person: current.id, team: team.name }], catalog, current.id);
      for (const k of Object.keys(after)) {
        if (after[k] && !before[k]) toast.success(`🏆 ${current.name}: ${MILESTONE_LABELS[k]}`, { duration: 4000 });
      }
    }
    setPulls((prev) => (delta > 0 ? addPull(prev, current.id, team) : removeLatestPull(prev, current.id, teamName, sinceTs)));
  };

  // Rich stats for a person within the current window
  const statsFor = (pid) => {
    const c = countsInWindow(pulls, pid, sinceTs);
    let totalPulls = 0, unique = 0, ratingSum = 0, ratingWeight = 0, nationals = 0;
    let best = null, worst = null, mostTeam = null, mostCount = 0;
    const dist = {};
    for (const [name, cnt] of Object.entries(c)) {
      if (!cnt) continue;
      unique += 1; totalPulls += cnt;
      const t = teamByName.get(name);
      if (t && t.rating != null) {
        ratingSum += t.rating * cnt; ratingWeight += cnt;
        dist[t.rating] = (dist[t.rating] || 0) + cnt;
        if (!best || t.rating > best.rating) best = t;
        if (!worst || t.rating < worst.rating) worst = t;
      } else if (t && t.rating == null) {
        nationals += cnt;
      }
      if (cnt > mostCount) { mostCount = cnt; mostTeam = name; }
    }
    // last pull in window
    let last = null;
    for (const e of pulls) {
      if (e.person !== pid) continue;
      if (sinceTs && new Date(e.ts).getTime() < sinceTs) continue;
      if (!last || new Date(e.ts) > new Date(last.ts)) last = e;
    }
    return { totalPulls, unique, avgRating: ratingWeight ? ratingSum / ratingWeight : null, ratedTotal: ratingWeight, nationals, best, worst, mostTeam, mostCount, dist, last };
  };

  const curStats = useMemo(() => statsFor(current.id), [pulls, current.id, sinceTs]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const filterActive = !!q || ratingFilter !== 'all';
  const matchesFilter = (t) => {
    if (q && !t.name.toLowerCase().includes(q)) return false;
    if (ratingFilter === 'none') return t.rating == null;
    if (ratingFilter !== 'all' && t.rating !== ratingFilter) return false;
    return true;
  };
  const flatFiltered = useMemo(() => (filterActive ? catalog.filter(matchesFilter) : []), [q, ratingFilter, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const teamsByTier = useMemo(() => {
    const groups = {}; RATING_TIERS.forEach((r) => { groups[r] = []; }); groups.none = [];
    catalog.forEach((t) => { const key = t.rating == null ? 'none' : t.rating; (groups[key] || (groups[key] = [])).push(t); });
    return groups;
  }, [catalog]);

  const renderTeamRow = (t) => {
    const cnt = counts[t.name] || 0;
    return (
      <div key={t.name} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl ${cnt > 0 ? accent.chip : 'bg-bg-tertiary'}`}>
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${cnt > 0 ? '' : 'text-text-primary'}`}>{t.name}</div>
          <div className="mt-0.5"><StarRating rating={t.rating} /></div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => change(t.name, -1)} disabled={cnt === 0} aria-label={`${t.name} verringern`}
            className="w-8 h-8 rounded-lg bg-bg-secondary border border-border-light text-text-secondary flex items-center justify-center text-lg font-semibold disabled:opacity-40">−</button>
          <span className="w-6 text-center font-bold tabular-nums text-text-primary">{cnt}</span>
          <button onClick={() => change(t.name, 1)} aria-label={`${t.name} bekommen`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-semibold ${accent.pill}`}>+</button>
        </div>
      </div>
    );
  };

  const WindowFilter = () => (
    <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-4">
      {TIME_WINDOWS.map((w) => (
        <button key={w.id} onClick={() => setWindowId(w.id)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${windowId === w.id ? 'bg-bg-secondary shadow-sm text-text-primary' : 'text-text-tertiary'}`}>
          {w.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-4 pb-28 mobile-safe-bottom">
      <div className="page-header animate-mobile-slide-in">
        <div className="page-header-row">
          <div>
            <h2 className="page-title">Teams</h2>
            <p className="page-subtitle">Bekommene FC26-Mannschaften &amp; Ratings</p>
          </div>
          <div className="page-icon tile-indigo"><Icon name="trophy" size={22} strokeWidth={2} /></div>
        </div>
      </div>

      {/* Mode segmented control */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl mb-4 overflow-x-auto scrollbar-hide">
        {PEOPLE.map((p) => {
          const a = ACCENT[p.accent];
          const active = person === p.id;
          const total = countsTotal(pulls, p.id, sinceTs);
          return (
            <button key={p.id} onClick={() => setPerson(p.id)}
              className={`flex-1 min-w-[92px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${active ? `bg-bg-secondary shadow-sm ${a.text}` : 'text-text-tertiary hover:text-text-secondary'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              {p.name}
              <span className="text-xs font-medium opacity-70">{total}</span>
            </button>
          );
        })}
        <button onClick={() => setPerson('stats')}
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${isStats ? 'bg-bg-secondary shadow-sm text-system-purple' : 'text-text-tertiary hover:text-text-secondary'}`}>
          <Icon name="chart" size={16} strokeWidth={2.1} />
          Statistik
        </button>
      </div>

      <WindowFilter />

      {isStats ? (
        <StatsView people={PEOPLE} statsFor={statsFor} pulls={pulls} catalog={catalog} sinceTs={sinceTs} windowLabel={TIME_WINDOWS.find((w) => w.id === windowId)?.label} />
      ) : (
        <>
          {/* Person summary */}
          <div className="modern-card mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.chip}`}>
                <Icon name="trophy" size={20} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-text-primary leading-tight">{current.name}</div>
                <div className="text-xs text-text-muted">Sammlung · {TIME_WINDOWS.find((w) => w.id === windowId)?.label}</div>
              </div>
              {countsTotal(pulls, current.id, 0) > 0 && (
                <button onClick={() => { if (window.confirm(`Komplette Sammlung von ${current.name} löschen?`)) setPulls((prev) => clearPerson(prev, current.id)); }}
                  className="ml-auto text-xs font-medium text-text-tertiary hover:text-system-red px-2 py-1">Zurücksetzen</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${accent.text}`}>{curStats.totalPulls}</div>
                <div className="text-[11px] text-text-tertiary">Bekommen</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{curStats.unique}</div>
                <div className="text-[11px] text-text-tertiary">Teams</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-system-yellow inline-flex items-center gap-1">
                  <Icon name="starFilled" size={14} strokeWidth={0} />{curStats.avgRating ? fmtRating(curStats.avgRating) : '—'}
                </div>
                <div className="text-[11px] text-text-tertiary">⌀ Rating</div>
              </div>
            </div>
            {curStats.last && (
              <div className="mt-3 text-xs text-text-muted flex items-center gap-1.5">
                <Icon name="clock" size={13} strokeWidth={2} className="text-text-tertiary" />
                Zuletzt: <span className="font-medium text-text-secondary">{curStats.last.team}</span> · {relTime(curStats.last.ts)}
              </div>
            )}
          </div>

          {/* Star distribution + extended stats (respects the active time window;
              dims non-matching tiers when a rating filter is set) */}
          {curStats.totalPulls > 0 && (() => {
            const maxVal = Math.max(1, ...Object.values(curStats.dist), curStats.nationals);
            const denom = curStats.ratedTotal || 1;
            return (
              <div className="modern-card mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary text-sm inline-flex items-center gap-2">
                    <Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" />Sterne-Verteilung
                  </h3>
                  <span className="text-[11px] text-text-tertiary">
                    {TIME_WINDOWS.find((w) => w.id === windowId)?.label}{ratingFilter !== 'all' ? ' · gefiltert' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {RATING_TIERS.filter((r) => curStats.dist[r]).map((r) => {
                    const val = curStats.dist[r];
                    const dim = ratingFilter !== 'all' && ratingFilter !== r ? 'opacity-40' : '';
                    return (
                      <div key={r} className={`flex items-center gap-2 ${dim}`}>
                        <span className="w-12 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary tabular-nums">
                          <Icon name="starFilled" size={11} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-bg-tertiary overflow-hidden">
                          <div className={`h-full ${accent.bar}`} style={{ width: `${(val / maxVal) * 100}%` }} />
                        </div>
                        <span className="w-16 text-right text-[11px] text-text-tertiary tabular-nums">{val} · {Math.round((val / denom) * 100)}%</span>
                      </div>
                    );
                  })}
                  {curStats.nationals > 0 && (
                    <div className={`flex items-center gap-2 ${ratingFilter !== 'all' && ratingFilter !== 'none' ? 'opacity-40' : ''}`}>
                      <span className="w-12 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                        <Icon name="trophy" size={11} strokeWidth={2} className="text-text-tertiary" />Nat.
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className="h-full bg-text-tertiary" style={{ width: `${(curStats.nationals / maxVal) * 100}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] text-text-tertiary tabular-nums">{curStats.nationals}</span>
                    </div>
                  )}
                </div>

                {/* Extended stat chips */}
                <div className="mt-3 pt-3 border-t border-border-light flex flex-wrap gap-2">
                  {curStats.best && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary text-xs">
                      <Icon name="trophy" size={12} strokeWidth={2} className="text-system-orange" />
                      <span className="text-text-tertiary">Bestes:</span><span className="font-semibold text-text-primary truncate max-w-[110px]">{curStats.best.name}</span>
                    </span>
                  )}
                  {curStats.mostTeam && curStats.mostCount > 1 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary text-xs">
                      <span className="text-text-tertiary">Häufigste:</span><span className="font-semibold text-text-primary truncate max-w-[110px]">{curStats.mostTeam}</span><span className="text-text-tertiary">{curStats.mostCount}×</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Search + rating filter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"><Icon name="search" size={18} strokeWidth={2} /></span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Team suchen…"
                className="w-full pl-11 pr-3 py-3 bg-bg-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none" />
            </div>
            <button onClick={() => setFiltersOpen((o) => !o)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium ${ratingFilter !== 'all' || filtersOpen ? 'bg-system-blue/12 text-system-blue' : 'bg-bg-tertiary text-text-secondary'}`}>
              <Icon name="filter" size={16} strokeWidth={2.2} />
              {ratingFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-system-blue" />}
            </button>
          </div>

          {filtersOpen && (
            <div className="modern-card mb-3 animate-mobile-slide-in">
              <div className="section-label mb-1.5">Nach Rating filtern</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRatingFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === 'all' ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Alle</button>
                {RATING_TIERS.map((r) => (
                  <button key={r} onClick={() => setRatingFilter(r)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === r ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
                    <Icon name="starFilled" size={11} strokeWidth={0} className={ratingFilter === r ? '' : 'text-system-yellow'} />{fmtRating(r)}
                  </button>
                ))}
                <button onClick={() => setRatingFilter('none')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === 'none' ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Nationalteams</button>
              </div>
            </div>
          )}

          {filterActive ? (
            <div className="space-y-1.5">
              <div className="text-xs text-text-tertiary px-1">{flatFiltered.length} Teams</div>
              {flatFiltered.map(renderTeamRow)}
              {flatFiltered.length === 0 && (
                <div className="modern-card text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center"><Icon name="search" size={28} strokeWidth={1.6} /></div>
                  <p className="text-text-muted text-sm">Kein Team gefunden.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[...RATING_TIERS, 'none'].map((tier) => {
                const list = teamsByTier[tier] || [];
                if (list.length === 0) return null;
                const isOpen = openTier === tier;
                const owned = list.reduce((s, t) => s + (counts[t.name] ? 1 : 0), 0);
                const label = tier === 'none' ? 'Nationalmannschaften' : `${fmtRating(tier)} Sterne`;
                return (
                  <div key={tier} className="modern-card p-0 overflow-hidden">
                    <button onClick={() => setOpenTier(isOpen ? null : tier)} className="w-full flex items-center gap-3 p-4 text-left">
                      {tier === 'none'
                        ? <Icon name="trophy" size={18} strokeWidth={2} className="text-text-tertiary flex-shrink-0" />
                        : <span className="flex items-center gap-0.5 flex-shrink-0"><Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" /></span>}
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold text-text-primary text-sm">{label}</span>
                        <span className="block text-[11px] text-text-tertiary">{owned > 0 ? `${owned} bekommen · ` : ''}{list.length} Teams</span>
                      </span>
                      <span className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}><Icon name="chevronRight" size={18} strokeWidth={2.2} /></span>
                    </button>
                    {isOpen && <div className="px-3 pb-3 space-y-1.5">{list.map(renderTeamRow)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function countsTotal(pulls, personId, sinceTs) {
  let n = 0;
  for (const e of pulls) {
    if (e.person !== personId) continue;
    if (sinceTs && new Date(e.ts).getTime() < sinceTs) continue;
    n += 1;
  }
  return n;
}

function StatsView({ people, statsFor, pulls, catalog, sinceTs = 0, windowLabel }) {
  const [openDetails, setOpenDetails] = useState({});
  const [achievePerson, setAchievePerson] = useState(null);
  const all = people.map((p) => ({ ...p, stats: statsFor(p.id) }));
  const combinedPulls = all.reduce((s, p) => s + p.stats.totalPulls, 0);
  const catalogTotal = catalog.length;

  // One lookup for the whole view (previously duplicated three times)
  const teamOf = useMemo(() => new Map(catalog.map((t) => [t.name, t])), [catalog]);
  const ratingOf = (name) => teamOf.get(name)?.rating ?? null;
  const total5star = useMemo(() => catalog.filter((t) => t.rating === 5).length, [catalog]);
  const tierTotals = useMemo(() => {
    const o = {};
    catalog.forEach((t) => { if (t.rating != null) o[t.rating] = (o[t.rating] || 0) + 1; });
    return o;
  }, [catalog]);

  const inWindow = (e) => !sinceTs || new Date(e.ts).getTime() >= sinceTs;
  const topTeams = (s) => RATING_TIERS.filter((r) => r >= 4.5).reduce((sum, r) => sum + (s.dist[r] || 0), 0);

  // Per-match duel (both get a team per match → compare quality), incl. streak
  const duel = (() => {
    const rated = (pid) => pulls
      .filter((e) => e.person === pid && inWindow(e) && ratingOf(e.team) != null)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .map((e) => ratingOf(e.team));
    const A = rated('alexander'); const P = rated('philip');
    const n = Math.min(A.length, P.length);
    let aw = 0, pw = 0, dr = 0;
    const winners = [];
    for (let i = 0; i < n; i++) {
      if (A[i] > P[i]) { aw++; winners.push('alexander'); }
      else if (P[i] > A[i]) { pw++; winners.push('philip'); }
      else { dr++; winners.push(null); }
    }
    let streakWho = null, streakLen = 0;
    for (let i = winners.length - 1; i >= 0; i--) {
      if (winners[i] == null) break;
      if (streakWho == null) { streakWho = winners[i]; streakLen = 1; }
      else if (winners[i] === streakWho) streakLen++;
      else break;
    }
    return { aw, pw, dr, n, streakWho, streakLen };
  })();

  // Helper: unique completion (all-time unique teams)
  const completion = (pid) => {
    const set = new Set();
    for (const e of pulls) if (e.person === pid) set.add(e.team);
    return set.size;
  };

  // All-time metrics per person (achievements + completion)
  const allTime = (pid) => {
    const counts = new Map();
    let total = 0;
    for (const e of pulls) { if (e.person !== pid) continue; total += 1; counts.set(e.team, (counts.get(e.team) || 0) + 1); }
    let five = 0, top = 0, nat = 0, women = 0, maxCount = 0, maxTeam = null;
    const tiers = new Set();
    for (const [name, c] of counts) {
      if (c > maxCount) { maxCount = c; maxTeam = name; }
      const t = teamOf.get(name); const r = t?.rating;
      if (r === 5) five += 1;
      if (r != null && r >= 4.5) top += 1;
      if (r == null) nat += 1;
      if (t?.women) women += 1;
      if (r != null) tiers.add(r);
    }
    return { total, unique: counts.size, five, top, nat, women, maxCount, maxTeam, tiers };
  };

  const achievementsFor = (pid) => {
    const m = allTime(pid);
    return [
      { id: 'first', icon: 'football', label: 'Erstes Team', desc: 'Bekomme dein allererstes Team.', value: Math.min(m.total, 1), target: 1 },
      { id: 'five', icon: 'starFilled', label: 'Erstes 5★-Team', desc: 'Bekomme ein Team mit vollen 5 Sternen.', value: Math.min(m.five, 1), target: 1 },
      { id: 'collector10', icon: 'trophy', label: 'Sammler', desc: 'Bekomme 10 verschiedene Teams.', value: m.unique, target: 10 },
      { id: 'collector50', icon: 'award', label: 'Großsammler', desc: 'Bekomme 50 verschiedene Teams.', value: m.unique, target: 50 },
      { id: 'tophunter', icon: 'trendingUp', label: 'Top-Jäger', desc: 'Bekomme 10 verschiedene Top-Teams (mindestens 4,5 Sterne).', value: m.top, target: 10 },
      { id: 'national', icon: 'grid', label: 'Nationalstolz', desc: 'Bekomme 5 verschiedene Nationalmannschaften.', value: m.nat, target: 5 },
      { id: 'women3', icon: 'users', label: 'Frauenfußball', desc: 'Bekomme 3 verschiedene Frauenteams.', value: m.women, target: 3 },
      { id: 'repeat5', icon: 'swap', label: 'Stammverein', desc: 'Bekomme ein und dasselbe Team 5 Mal.', value: m.maxCount, target: 5, extra: m.maxTeam },
      { id: 'underdog', icon: 'ban', label: 'Underdog', desc: 'Bekomme ein Team mit nur 0,5 Sternen.', value: m.tiers.has(0.5) ? 1 : 0, target: 1 },
      { id: 'allTiers', icon: 'scale', label: 'Alle Stufen', desc: 'Sammle aus jeder Stern-Stufe (0,5 bis 5,0) mindestens ein Team.', value: m.tiers.size, target: RATING_TIERS.length },
      { id: 'veteran', icon: 'clock', label: 'Veteran', desc: 'Bekomme insgesamt 100 Mal ein Team.', value: m.total, target: 100 },
      { id: 'complete5', icon: 'starFilled', label: '5★-Komplett', desc: 'Sammle alle ' + total5star + ' Teams mit 5 Sternen.', value: m.five, target: total5star || 1 },
    ].map((a) => ({ ...a, done: a.value >= a.target }));
  };

  // Milestones-for-display: map computeMilestones -> array with hints/icons (used by the milestones card)
  const milestonesFor = (pid) => {
    const m = computeMilestones(pulls, catalog, pid);
    return [
      { id: 'first', icon: 'football', label: MILESTONE_LABELS.first, done: !!m.first, hint: `${m.first ? 1 : 0}/1` },
      { id: 'five', icon: 'starFilled', label: MILESTONE_LABELS.five, done: !!m.five, hint: `${m.five ? 1 : 0}/1` },
      { id: 'collector10', icon: 'trophy', label: '10 Teams gesammelt', done: !!m.collector10, hint: `${m.collector10 ? 10 : 0}/10` },
      { id: 'tophunter', icon: 'trendingUp', label: MILESTONE_LABELS.tophunter, done: !!m.tophunter, hint: `${m.tophunter ? 10 : 0}/10` },
      { id: 'national', icon: 'grid', label: MILESTONE_LABELS.national, done: !!m.national, hint: `${m.national ? 5 : 0}/5` },
      { id: 'veteran', icon: 'award', label: MILESTONE_LABELS.veteran, done: !!m.veteran, hint: `${m.veteran ? 100 : 0}/100` },
      { id: 'complete5', icon: 'starFilled', label: MILESTONE_LABELS.complete5, done: !!m.complete5, hint: `${m.complete5 ? total5star : 0}/${total5star || '—'}` },
    ];
  };
  const ownedPerTier = (pid) => {
    const seen = new Set(); const owned = {};
    for (const e of pulls) {
      if (e.person !== pid || seen.has(e.team)) continue;
      seen.add(e.team);
      const r = ratingOf(e.team);
      if (r != null) owned[r] = (owned[r] || 0) + 1;
    }
    return owned;
  };

  // Average star rating per MATCHDAY. A matchday is a session: it is dated by
  // the FIRST team of the session, and every team within 24h of that first team
  // belongs to the same matchday. Window-aware, last 6 matchdays.
  const MATCHDAY_MS = 24 * 60 * 60 * 1000;
  const matchdays = (() => {
    const evs = pulls
      .filter((e) => inWindow(e) && ratingOf(e.team) != null)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const sessions = [];
    let cur = null;
    for (const e of evs) {
      const t = new Date(e.ts).getTime();
      if (!cur || t >= cur.start + MATCHDAY_MS) {
        cur = { start: t, sum: {}, cnt: {} };
        sessions.push(cur);
      }
      const r = ratingOf(e.team);
      cur.sum[e.person] = (cur.sum[e.person] || 0) + r;
      cur.cnt[e.person] = (cur.cnt[e.person] || 0) + 1;
    }
    return sessions.slice(-6).map((d) => ({
      ts: d.start,
      label: new Date(d.start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      avg: Object.fromEntries(people.map((p) => [p.id, d.cnt[p.id] ? d.sum[p.id] / d.cnt[p.id] : 0])),
    }));
  })();
  const bestMatchday = matchdays.reduce((best, d) => {
    const top = Math.max(...people.map((p) => d.avg[p.id] || 0));
    return (!best || top > best.val) ? { day: d, val: top } : best;
  }, null);

  const avgA = all[0].stats.avgRating, avgP = all[1].stats.avgRating;
  const qualityLeader = (avgA == null || avgP == null) ? null : (avgA > avgP ? all[0] : (avgP > avgA ? all[1] : null));
  const personName = (pid) => people.find((p) => p.id === pid)?.name || pid;

  if (combinedPulls === 0) {
    return (
      <div className="modern-card text-center py-10 animate-mobile-slide-in">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center"><Icon name="chart" size={28} strokeWidth={1.6} /></div>
        <h4 className="font-medium text-text-primary mb-1">Keine Teams im Zeitraum</h4>
        <p className="text-sm text-text-muted">Für den Zeitraum {windowLabel} wurden noch keine Mannschaften erfasst.</p>
      </div>
    );
  }

  const maxDist = Math.max(1, ...all.flatMap((p) => Object.values(p.stats.dist)));

  return (
    <div className="space-y-3 animate-mobile-slide-in">
            <div className="text-[11px] text-text-tertiary">{all[0].name} · ⌀</div>
          </div>
          <div className="px-2 text-xs font-semibold text-text-tertiary">
            {qualityLeader ? <span className="inline-flex items-center gap-1 text-system-orange">🔥 {qualityLeader.name}</span> : 'Gleichstand'}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold text-system-red tabular-nums inline-flex items-center gap-1"><Icon name="starFilled" size={16} strokeWidth={0} className="text-system-yellow" />{avgP ? fmtRating(avgP) : '—'}</div>
            <div className="text-[11px] text-text-tertiary">{all[1].name} · ⌀</div>
          </div>
        </div>

        {/* Per-match duel: who got the higher-rated team */}
        {duel.n > 0 && (
          <div className="mt-3 pt-3 border-t border-border-light">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-text-secondary">Bessere-Team-Duelle</span>
<div className="mt-3 pt-3 border-t border-border-light">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-text-secondary">Bessere-Team-Duelle</span>
              <span className="text-[11px] text-text-tertiary">
                {duel.n} Spiele{duel.dr ? ' · ' + duel.dr + '× gleich' : ''}
                {duel.streakLen > 1 ? ' · 🔥 ' + personName(duel.streakWho) + ' ' + duel.streakLen + '×' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 text-right text-sm font-bold text-system-blue tabular-nums">{duel.aw}</span>
              <div className="flex-1 h-4 rounded-full overflow-hidden bg-bg-tertiary flex text-[9px] font-bold text-white">
                <div className="bg-system-blue h-full flex items-center justify-center" style={{ width: `${(duel.aw / duel.n) * 100}%` }}>{duel.aw > 0 ? Math.round((duel.aw / duel.n) * 100) + '%' : ''}</div>
                <div className="bg-text-tertiary/40 h-full" style={{ width: `${(duel.dr / duel.n) * 100}%` }} />
                <div className="bg-system-red h-full flex items-center justify-center" style={{ width: `${(duel.pw / duel.n) * 100}%` }}>{duel.pw > 0 ? Math.round((duel.pw / duel.n) * 100) + '%' : ''}</div>
              </div>
              <span className="w-8 text-sm font-bold text-system-red tabular-nums">{duel.pw}</span>
            </div>
          </div>
              </div>
              <span className="w-8 text-sm font-bold text-system-red tabular-nums">{duel.pw}</span>
            </div>
          </div>
        )}

        {/* Quality metrics: Top-Teams (≥4,5★) + Gesamt-Sternwert */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {all.map((p) => {
            const a = ACCENT[p.accent]; const s = p.stats;
            const starSum = s.avgRating ? s.avgRating * s.ratedTotal : 0;
            return (
              <div key={p.id} className="bg-bg-tertiary rounded-xl p-3">
                <div className={`text-xs font-semibold ${a.text} mb-1.5 inline-flex items-center gap-1.5`}><span className={`w-2 h-2 rounded-full ${a.bar}`} />{p.name}</div>
                <div className="flex justify-between text-[11px] text-text-tertiary"><span>Top-Teams (≥4,5★)</span><span className="font-semibold text-text-primary tabular-nums">{topTeams(s)}</span></div>
                <div className="flex justify-between text-[11px] text-text-tertiary mt-0.5"><span>Gesamt-Sternwert</span><span className="font-semibold text-text-primary tabular-nums">{starSum.toFixed(1).replace('.', ',')}</span></div>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      {all.map((p) => {
        const a = ACCENT[p.accent]; const s = p.stats;
        const maxDistVal = Math.max(1, ...Object.values(s.dist), s.nationals);
        const denom = s.ratedTotal || 1;
        const fiveQuota = s.ratedTotal ? Math.round(((s.dist[5] || 0) / s.ratedTotal) * 100) : 0;
        const open = !!openDetails[p.id];
        const doneCount = achievementsFor(p.id).filter((x) => x.done).length;
        return (
          <div key={p.id} className="modern-card">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              <h3 className={`font-semibold ${a.text}`}>{p.name}</h3>
              <span className="ml-auto text-xs text-text-tertiary">{s.totalPulls} bekommen · {s.unique} {s.unique === 1 ? 'Team' : 'Teams'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">⌀ Rating</div>
                <div className="font-bold text-system-yellow inline-flex items-center gap-1"><Icon name="starFilled" size={13} strokeWidth={0} />{s.avgRating ? fmtRating(s.avgRating) : '—'}</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">Bestes Team</div>
                <div className="font-semibold text-text-primary text-sm truncate">{s.best ? s.best.name : '—'}</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">5★-Quote</div>
                <div className="font-bold text-text-primary tabular-nums">{fiveQuota}%</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">Nationalteams</div>
                <div className="font-bold text-text-primary tabular-nums">{s.nationals}</div>
              </div>
            </div>

            {/* Labelled distribution bars */}
            <div className="space-y-1.5">
              {RATING_TIERS.filter((r) => s.dist[r]).map((r) => {
                const val = s.dist[r];
                const pct = Math.round((val / denom) * 100);
                return (
                  <div key={r} className="flex items-center gap-2">
                    <span className="w-11 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary tabular-nums"><Icon name="starFilled" size={10} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}</span>
                    <div className="flex-1 h-4 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className={`h-full ${a.bar} flex items-center justify-end pr-1.5 text-[9px] font-bold text-white`} style={{ width: `${Math.max(10, (val / maxDistVal) * 100)}%` }}>{val}</div>
                    </div>
                    <span className="w-9 text-right text-[11px] text-text-tertiary tabular-nums">{pct}%</span>
                  </div>
                );
              })}
              {s.nationals > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-11 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary"><Icon name="trophy" size={10} strokeWidth={2} className="text-text-tertiary" />Nat.</span>
                  <div className="flex-1 h-4 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full bg-text-tertiary flex items-center justify-end pr-1.5 text-[9px] font-bold text-white" style={{ width: `${Math.max(10, (s.nationals / maxDistVal) * 100)}%` }}>{s.nationals}</div>
                  </div>
                  <span className="w-9" />
                </div>
              )}
            </div>

            {/* Compact facts */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              {s.mostTeam && s.mostCount > 1 && <span className="px-2 py-1 rounded-lg bg-bg-tertiary"><span className="text-text-tertiary">Häufigste:</span> <span className="font-semibold text-text-primary">{s.mostTeam}</span> {s.mostCount}×</span>}
              {s.worst && <span className="px-2 py-1 rounded-lg bg-bg-tertiary"><span className="text-text-tertiary">Schwächstes:</span> <span className="font-semibold text-text-primary">{s.worst.name}</span></span>}
              {s.last && <span className="px-2 py-1 rounded-lg bg-bg-tertiary"><span className="text-text-tertiary">Zuletzt:</span> <span className="font-semibold text-text-primary">{s.last.team}</span> · {relTime(s.last.ts)}</span>}
            </div>

            {/* Collapsible: collection & per-tier completion */}
            <button onClick={() => setOpenDetails((o) => ({ ...o, [p.id]: !o[p.id] }))} className="mt-3 w-full flex items-center justify-between py-2 text-xs font-medium text-text-secondary">
              <span>Sammlung &amp; Vollständigkeit</span>
              <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}><Icon name="chevronRight" size={16} strokeWidth={2.2} /></span>
            </button>
            {open && (() => {
              const done = new Set(pulls.filter((e) => e.person === p.id).map((e) => e.team)).size;
              const pct = catalogTotal ? Math.round((done / catalogTotal) * 100) : 0;
              const owned = ownedPerTier(p.id);
              const tiers = RATING_TIERS.filter((r) => tierTotals[r] && owned[r]);
              return (
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] text-text-tertiary mb-1"><span>Sammlung gesamt</span><span className="tabular-nums">{done}/{catalogTotal} · {pct}%</span></div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mb-3"><div className={`h-full ${a.bar}`} style={{ width: `${Math.max(2, pct)}%` }} /></div>
                  {tiers.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {tiers.map((r) => (
                        <div key={r} className="flex items-center gap-1.5">
                          <span className="w-10 inline-flex items-center gap-0.5 text-[11px] font-semibold text-text-secondary tabular-nums"><Icon name="starFilled" size={10} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden"><div className={`h-full ${a.bar}`} style={{ width: `${(owned[r] / tierTotals[r]) * 100}%` }} /></div>
                          <span className="text-[10px] text-text-tertiary tabular-nums w-9 text-right">{owned[r]}/{tierTotals[r]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
                </div>
              );
            })()}

            {/* Per-tier completion (all-time) */}
            {(() => {
              const owned = ownedPerTier(p.id);
              const tiers = RATING_TIERS.filter((r) => tierTotals[r] && owned[r]);
              if (tiers.length === 0) return null;
              return (
                <div className="mt-3 pt-3 border-t border-border-light">
                  <div className="text-[11px] text-text-tertiary mb-1.5">Vollständigkeit nach Sternen</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {tiers.map((r) => {
                      const done = owned[r]; const total = tierTotals[r];
                      return (
                        <div key={r} className="flex items-center gap-1.5">
                          <span className="w-10 inline-flex items-center gap-0.5 text-[11px] font-semibold text-text-secondary tabular-nums">
                            <Icon name="starFilled" size={10} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden"><div className={`h-full ${a.bar}`} style={{ width: `${(done / total) * 100}%` }} /></div>
                          <span className="text-[10px] text-text-tertiary tabular-nums w-9 text-right">{done}/{total}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Achievements entry */}
            <button onClick={() => setAchievePerson(p.id)} className={`mt-2 w-full flex items-center justify-between px-3 py-2.5 rounded-xl ${a.chip}`}>
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Icon name="award" size={16} strokeWidth={2.2} />Errungenschaften</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums">{doneCount}/12<Icon name="chevronRight" size={15} strokeWidth={2.2} /></span>
            </button>
          </div>
        );
      })}

      {/* Average star rating per matchday — bars carry their value */}
      {matchdays.length > 0 && (
        <div className="modern-card">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-text-primary text-sm inline-flex items-center gap-2"><Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" />Sterne-Ø pro Spieltag</h3>
            {bestMatchday && bestMatchday.val > 0 && <span className="text-[10px] text-text-tertiary whitespace-nowrap">Bester: {bestMatchday.day.label} ({fmtRating(bestMatchday.val)}★)</span>}
          </div>
          <p className="text-[11px] text-text-tertiary mb-3">⌀ Team-Rating je Person und Spieltag</p>
          <div className="flex items-end justify-between gap-2 h-32">
            {matchdays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center gap-1.5" style={{ height: '96px' }}>
                  {people.map((p) => {
                    const v = d.avg[p.id] || 0;
                    return (
                      <div key={p.id} className="relative flex-1 max-w-[16px] h-full flex flex-col justify-end items-center">
                        {v > 0 && <span className="text-[8px] font-bold text-text-secondary tabular-nums mb-0.5 leading-none">{fmtRating(v)}</span>}
                        <div className={`w-full rounded-t ${ACCENT[p.accent].bar}`} style={{ height: `${(v / 5) * 82}%` }} />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-text-tertiary whitespace-nowrap">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-text-tertiary">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-system-blue" />Alexander</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-system-red" />Philip</span>
            <span className="text-text-quaternary">· Skala 0–5★</span>
          </div>
        </div>
      )}
                      </div>
                    );
                  })}
                </div>
      {/* Milestones / achievements (all-time) */}
      <div className="modern-card">
        <h3 className="font-semibold text-text-primary mb-3 inline-flex items-center gap-2"><Icon name="award" size={18} strokeWidth={2.2} className="text-system-orange" />Meilensteine</h3>
        <div className="grid grid-cols-2 gap-3">
          {people.map((p) => {
            const a = ACCENT[p.accent];
            const ms = milestonesFor(p.id);
            const earned = ms.filter((x) => x.done).length;
            return (
              <div key={p.id} className="bg-bg-tertiary rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${a.text} inline-flex items-center gap-1.5`}><span className={`w-2 h-2 rounded-full ${a.bar}`} />{p.name}</span>
                  <span className="text-[11px] text-text-tertiary tabular-nums">{earned}/{ms.length}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {ms.map((x) => (
                    <div
                      key={x.id}
                      title={`${x.label} — ${x.hint}`}
                      className={`aspect-square rounded-lg flex items-center justify-center ${x.done ? `${a.chip}` : 'bg-bg-secondary text-text-quaternary opacity-60'}`}
                    >
                      <Icon name={x.icon} size={16} strokeWidth={x.done ? 2.2 : 1.8} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-text-quaternary mt-2 text-center">Gesamt (alle Zeiträume) · gefüllt = erreicht</p>
      </div>

      <div className="modern-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-system-purple/12 text-system-purple flex items-center justify-center"><Icon name="trophy" size={20} strokeWidth={2} /></span>
          <div>
            <div className="text-xs text-text-muted">Insgesamt ({windowLabel})</div>
            <div className="text-[11px] text-text-tertiary">beide zusammen</div>
          </div>
        </div>
        <div className="text-xl font-bold text-text-primary">{combinedPulls}</div>
      </div>

      {/* Achievement detail sheet */}
      {achievePerson && createPortal((
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Errungenschaften">
          <button className="absolute inset-0 bg-black/50" aria-label="Schließen" onClick={() => setAchievePerson(null)} />
          <div
            className="relative w-full max-w-md bg-bg-elevated rounded-t-3xl sm:rounded-3xl shadow-ios-floating p-4 flex flex-col animate-mobile-slide-in"
            style={{ maxHeight: 'calc(100dvh - 2rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-base font-semibold text-text-primary inline-flex items-center gap-2">
                <Icon name="award" size={18} strokeWidth={2.2} className="text-system-orange" />
                Errungenschaften · {personName(achievePerson)}
              </h3>
              <button onClick={() => setAchievePerson(null)} className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0" aria-label="Schließen">
                <Icon name="x" size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 min-h-0">
              {achievementsFor(achievePerson).map((x) => {
                const pct = Math.min(100, Math.round((x.value / x.target) * 100));
                const acc = ACCENT[people.find((p) => p.id === achievePerson)?.accent || 'blue'];
                return (
                  <div key={x.id} className={`flex gap-3 p-3 rounded-xl ${x.done ? acc.chip : 'bg-bg-tertiary'}`}>
                    <span className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${x.done ? 'bg-bg-elevated/60' : 'bg-bg-secondary text-text-quaternary'}`}>
                      <Icon name={x.icon} size={18} strokeWidth={x.done ? 2.2 : 1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${x.done ? '' : 'text-text-primary'}`}>{x.label}</span>
                        {x.done && <Icon name="check" size={13} strokeWidth={3} />}
                      </div>
                      <p className={`text-[11px] leading-snug ${x.done ? 'opacity-80' : 'text-text-tertiary'}`}>{x.desc}</p>
                      {x.id === 'repeat5' && x.extra && <p className="text-[10px] text-text-tertiary mt-0.5">Bestes: {x.extra} ({x.value}×)</p>}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                          <div className={`h-full ${x.done ? acc.bar : 'bg-text-tertiary/50'}`} style={{ width: `${Math.max(3, pct)}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-text-tertiary flex-shrink-0">{Math.min(x.value, x.target)}/{x.target}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
