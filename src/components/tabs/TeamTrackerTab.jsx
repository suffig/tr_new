import { useState, useMemo } from 'react';
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
  const all = people.map((p) => ({ ...p, stats: statsFor(p.id) }));
  const combinedPulls = all.reduce((s, p) => s + p.stats.totalPulls, 0);
  const catalogTotal = catalog.length;

  const ratingByNameQ = new Map(catalog.map((t) => [t.name, t.rating]));
  const topTeams = (s) => RATING_TIERS.filter((r) => r >= 4.5).reduce((sum, r) => sum + (s.dist[r] || 0), 0);

  // Per-match duel: pair each person's rated pulls chronologically and compare
  // ratings — since both get a team per match, this shows who got the better one.
  const duel = (() => {
    const rated = (pid) => pulls
      .filter((e) => e.person === pid && (!sinceTs || new Date(e.ts).getTime() >= sinceTs) && ratingByNameQ.get(e.team) != null)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .map((e) => ratingByNameQ.get(e.team));
    const A = rated('alexander'); const P = rated('philip');
    const n = Math.min(A.length, P.length);
    let aw = 0, pw = 0, dr = 0;
    for (let i = 0; i < n; i++) { if (A[i] > P[i]) aw++; else if (P[i] > A[i]) pw++; else dr++; }
    return { aw, pw, dr, n };
  })();

  // All-time collection completion (unique teams ever obtained)
  const completion = (pid) => {
    const set = new Set();
    for (const e of pulls) if (e.person === pid) set.add(e.team);
    return set.size;
  };

  // Per-star-tier completion (unique owned all-time vs total teams in that tier)
  const ratingByName = new Map(catalog.map((t) => [t.name, t.rating]));
  const tierTotals = {};
  catalog.forEach((t) => { if (t.rating != null) tierTotals[t.rating] = (tierTotals[t.rating] || 0) + 1; });
  const ownedPerTier = (pid) => {
    const seen = new Set(); const owned = {};
    for (const e of pulls) {
      if (e.person !== pid || seen.has(e.team)) continue;
      seen.add(e.team);
      const r = ratingByName.get(e.team);
      if (r != null) owned[r] = (owned[r] || 0) + 1;
    }
    return owned;
  };

  // Average star rating per person per MATCHDAY (only days that had teams,
  // not every calendar day); respects the active time window, last 8 matchdays.
  const matchdays = (() => {
    const byDay = new Map();
    for (const e of pulls) {
      if (sinceTs && new Date(e.ts).getTime() < sinceTs) continue;
      const r = ratingByNameQ.get(e.team);
      if (r == null) continue; // only rated teams contribute to a star average
      const d = new Date(e.ts); d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      if (!byDay.has(key)) byDay.set(key, { ts: key, sum: {}, cnt: {} });
      const g = byDay.get(key);
      g.sum[e.person] = (g.sum[e.person] || 0) + r;
      g.cnt[e.person] = (g.cnt[e.person] || 0) + 1;
    }
    return [...byDay.values()].sort((a, b) => a.ts - b.ts).slice(-8).map((d) => ({
      ts: d.ts,
      label: new Date(d.ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      avg: Object.fromEntries(people.map((p) => [p.id, d.cnt[p.id] ? d.sum[p.id] / d.cnt[p.id] : 0])),
    }));
  })();
  // Leader = better average rating (quality), not quantity (counts are equal)
  const avgA = all[0].stats.avgRating, avgP = all[1].stats.avgRating;
  const qualityLeader = (avgA == null || avgP == null) ? null : (avgA > avgP ? all[0] : (avgP > avgA ? all[1] : null));

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
      {/* Quality comparison banner — beide bekommen pro Spiel ein Team,
          also zählt die Team-QUALITÄT (Rating), nicht die Menge. */}
      <div className="modern-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary inline-flex items-center gap-2"><Icon name="scale" size={18} strokeWidth={2.2} className="text-system-purple" />Wer bekommt die besseren Teams?</h3>
          <span className="text-xs text-text-tertiary">{windowLabel}</span>
        </div>
        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <div className="text-2xl font-bold text-system-blue tabular-nums inline-flex items-center gap-1"><Icon name="starFilled" size={16} strokeWidth={0} className="text-system-yellow" />{avgA ? fmtRating(avgA) : '—'}</div>
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
              <span className="text-[11px] text-text-tertiary">{duel.n} Spiele{duel.dr ? ` · ${duel.dr} × gleich` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 text-right text-sm font-bold text-system-blue tabular-nums">{duel.aw}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-bg-tertiary flex">
                <div className="bg-system-blue h-full" style={{ width: `${(duel.aw / duel.n) * 100}%` }} />
                <div className="bg-text-tertiary/40 h-full" style={{ width: `${(duel.dr / duel.n) * 100}%` }} />
                <div className="bg-system-red h-full" style={{ width: `${(duel.pw / duel.n) * 100}%` }} />
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
            );
          })}
        </div>
      </div>

      {all.map((p) => {
        const a = ACCENT[p.accent]; const s = p.stats;
        return (
          <div key={p.id} className="modern-card">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              <h3 className={`font-semibold ${a.text}`}>{p.name}</h3>
              <span className="ml-auto text-xs text-text-tertiary">{s.totalPulls} bekommen · {s.unique} {s.unique === 1 ? 'Team' : 'Teams'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-bg-tertiary rounded-xl p-3">
                <div className="text-[11px] text-text-tertiary mb-0.5">⌀ Rating</div>
                <div className="font-bold text-system-yellow inline-flex items-center gap-1"><Icon name="starFilled" size={14} strokeWidth={0} />{s.avgRating ? fmtRating(s.avgRating) : '—'}</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3">
                <div className="text-[11px] text-text-tertiary mb-0.5">Bestes Team</div>
                <div className="font-semibold text-text-primary text-sm truncate">{s.best ? s.best.name : '—'}</div>
              </div>
            </div>
            {(s.mostTeam || s.last) && (
              <div className="space-y-1 mb-3 text-xs text-text-secondary">
                {s.mostTeam && <div>Am häufigsten: <span className="font-semibold text-text-primary">{s.mostTeam}</span> ({s.mostCount}×)</div>}
                {s.worst && s.worst.name !== (s.best && s.best.name) && <div>Schwächstes: <span className="font-semibold text-text-primary">{s.worst.name}</span> ({fmtRating(s.worst.rating)})</div>}
                {s.last && <div>Zuletzt: <span className="font-semibold text-text-primary">{s.last.team}</span> · {relTime(s.last.ts)}</div>}
              </div>
            )}
            <div className="space-y-1.5">
              {RATING_TIERS.filter((r) => s.dist[r]).map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="w-8 text-[11px] font-semibold text-text-secondary tabular-nums">{fmtRating(r)}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden"><div className={`h-full ${a.bar}`} style={{ width: `${(s.dist[r] / maxDist) * 100}%` }} /></div>
                  <span className="w-6 text-right text-[11px] text-text-tertiary tabular-nums">{s.dist[r]}</span>
                </div>
              ))}
            </div>

            {/* All-time collection completion */}
            {(() => {
              const done = completion(p.id);
              const pct = catalogTotal ? Math.round((done / catalogTotal) * 100) : 0;
              return (
                <div className="mt-3 pt-3 border-t border-border-light">
                  <div className="flex justify-between text-[11px] text-text-tertiary mb-1">
                    <span>Sammlung gesamt</span>
                    <span className="tabular-nums">{done}/{catalogTotal} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden"><div className={`h-full ${a.bar}`} style={{ width: `${Math.max(2, pct)}%` }} /></div>
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
          </div>
        );
      })}

      {/* Average star rating per matchday */}
      {matchdays.length > 0 && (
        <div className="modern-card">
          <h3 className="font-semibold text-text-primary mb-1 inline-flex items-center gap-2"><Icon name="starFilled" size={16} strokeWidth={0} className="text-system-yellow" />Sterne-Ø pro Spieltag</h3>
          <p className="text-[11px] text-text-tertiary mb-3">Durchschnittliches Team-Rating je Person und Spieltag</p>
          <div className="flex items-end justify-between gap-2 h-28">
            {matchdays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center gap-1" style={{ height: '84px' }}>
                  {people.map((p) => {
                    const v = d.avg[p.id] || 0;
                    return (
                      <div key={p.id} className="relative flex-1 max-w-[14px] h-full flex items-end">
                        <div className={`w-full rounded-t ${ACCENT[p.accent].bar}`} style={{ height: `${(v / 5) * 100}%` }} title={`${p.name}: ${v ? v.toFixed(1).replace('.', ',') : '—'}★`} />
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
    </div>
  );
}
