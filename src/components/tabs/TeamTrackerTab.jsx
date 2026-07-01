import { useState, useEffect, useMemo } from 'react';
import Icon from '../icons/Icon';
import { FC26_TEAMS } from '../../constants/fc26Teams';
import { loadCollection, saveCollection, syncPull } from '../../utils/teamCollection';

const PEOPLE = [
  { id: 'alexander', name: 'Alexander', accent: 'blue' },
  { id: 'philip', name: 'Philip', accent: 'green' },
];

const ACCENT = {
  blue: { text: 'text-system-blue', chip: 'bg-system-blue/12 text-system-blue', pill: 'bg-system-blue text-white', bar: 'bg-system-blue' },
  green: { text: 'text-system-green', chip: 'bg-system-green/12 text-system-green', pill: 'bg-system-green text-white', bar: 'bg-system-green' },
};

const RATING_TIERS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
const fmtRating = (r) => (r == null ? '—' : r.toFixed(1).replace('.', ','));

// Half-star rating display (0.5 steps) — like the star counter.
function StarRating({ rating, size = 13 }) {
  if (rating == null) {
    return <span className="text-[10px] text-text-tertiary font-medium">Nat.-Team</span>;
  }
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
  const [data, setData] = useState(loadCollection);
  const [person, setPerson] = useState('alexander');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | number | 'none'
  const [openTier, setOpenTier] = useState(5);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { saveCollection(data); }, [data]);

  const isCompare = person === 'compare';
  const isStats = person === 'stats';
  const isPerson = !isCompare && !isStats;
  const current = PEOPLE.find((p) => p.id === person) || PEOPLE[0];
  const accent = ACCENT[current.accent];
  const counts = data[current.id] || {};

  const teamByName = useMemo(() => {
    const m = new Map();
    FC26_TEAMS.forEach((t) => m.set(t.name, t));
    return m;
  }, []);

  const change = (teamName, delta) => {
    const team = teamByName.get(teamName);
    if (!team) return;
    setData((prev) => {
      const pc = { ...(prev[current.id] || {}) };
      const next = Math.max(0, (pc[teamName] || 0) + delta);
      if (next === 0) delete pc[teamName]; else pc[teamName] = next;
      return { ...prev, [current.id]: pc };
    });
    syncPull(current.id, team, delta); // best-effort DB write-through
  };

  // Aggregate stats for a person's collection
  const statsFor = (pid) => {
    const c = data[pid] || {};
    let totalPulls = 0, unique = 0, ratingSum = 0, ratingWeight = 0, best = null, mostTeam = null, mostCount = 0;
    const dist = {};
    for (const [name, cnt] of Object.entries(c)) {
      if (!cnt) continue;
      unique += 1;
      totalPulls += cnt;
      const t = teamByName.get(name);
      if (t && t.rating != null) {
        ratingSum += t.rating * cnt;
        ratingWeight += cnt;
        dist[t.rating] = (dist[t.rating] || 0) + cnt;
        if (!best || t.rating > best.rating) best = t;
      }
      if (cnt > mostCount) { mostCount = cnt; mostTeam = name; }
    }
    return {
      totalPulls, unique,
      avgRating: ratingWeight ? ratingSum / ratingWeight : null,
      best, mostTeam, mostCount, dist,
    };
  };

  const curStats = useMemo(() => statsFor(current.id), [data, current.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const filterActive = !!q || ratingFilter !== 'all';
  const matchesFilter = (t) => {
    if (q && !t.name.toLowerCase().includes(q)) return false;
    if (ratingFilter === 'none') return t.rating == null;
    if (ratingFilter !== 'all' && t.rating !== ratingFilter) return false;
    return true;
  };
  const flatFiltered = useMemo(
    () => (filterActive ? FC26_TEAMS.filter(matchesFilter) : []),
    [q, ratingFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const teamsByTier = useMemo(() => {
    const groups = {};
    RATING_TIERS.forEach((r) => { groups[r] = []; });
    groups.none = [];
    FC26_TEAMS.forEach((t) => {
      const key = t.rating == null ? 'none' : t.rating;
      (groups[key] || (groups[key] = [])).push(t);
    });
    return groups;
  }, []);

  const renderTeamRow = (t) => {
    const cnt = counts[t.name] || 0;
    return (
      <div key={t.name} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl ${cnt > 0 ? accent.chip : 'bg-bg-tertiary'}`}>
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${cnt > 0 ? '' : 'text-text-primary'}`}>{t.name}</div>
          <div className="mt-0.5"><StarRating rating={t.rating} /></div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => change(t.name, -1)}
            disabled={cnt === 0}
            aria-label={`${t.name} verringern`}
            className="w-8 h-8 rounded-lg bg-bg-secondary border border-border-light text-text-secondary flex items-center justify-center text-lg font-semibold disabled:opacity-40"
          >−</button>
          <span className="w-6 text-center font-bold tabular-nums text-text-primary">{cnt}</span>
          <button
            onClick={() => change(t.name, 1)}
            aria-label={`${t.name} bekommen`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-semibold ${accent.pill}`}
          >+</button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-28 mobile-safe-bottom">
      {/* Header */}
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
          const total = Object.values(data[p.id] || {}).reduce((s, n) => s + n, 0);
          return (
            <button
              key={p.id}
              onClick={() => setPerson(p.id)}
              className={`flex-1 min-w-[92px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                active ? `bg-bg-secondary shadow-sm ${a.text}` : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              {p.name}
              <span className="text-xs font-medium opacity-70">{total}</span>
            </button>
          );
        })}
        <button
          onClick={() => setPerson('stats')}
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
            isStats ? 'bg-bg-secondary shadow-sm text-system-purple' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Icon name="chart" size={16} strokeWidth={2.1} />
          Statistik
        </button>
      </div>

      {isStats ? (
        <StatsView people={PEOPLE} statsFor={statsFor} />
      ) : isPerson ? (
        <>
          {/* Person summary */}
          <div className="modern-card mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.chip}`}>
                <Icon name="trophy" size={20} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-text-primary leading-tight">{current.name}</div>
                <div className="text-xs text-text-muted">Sammlung &amp; Ausbeute</div>
              </div>
              {curStats.totalPulls > 0 && (
                <button
                  onClick={() => { if (window.confirm(`Sammlung von ${current.name} zurücksetzen?`)) setData((prev) => ({ ...prev, [current.id]: {} })); }}
                  className="ml-auto text-xs font-medium text-text-tertiary hover:text-system-red px-2 py-1"
                >
                  Zurücksetzen
                </button>
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
          </div>

          {/* Search + discreet rating filter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                <Icon name="search" size={18} strokeWidth={2} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Team suchen…"
                className="w-full pl-11 pr-3 py-3 bg-bg-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none"
              />
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium ${
                ratingFilter !== 'all' || filtersOpen ? 'bg-system-blue/12 text-system-blue' : 'bg-bg-tertiary text-text-secondary'
              }`}
            >
              <Icon name="filter" size={16} strokeWidth={2.2} />
              {ratingFilter !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-system-blue" />}
            </button>
          </div>

          {filtersOpen && (
            <div className="modern-card mb-3 animate-mobile-slide-in">
              <div className="section-label mb-1.5">Nach Rating filtern</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRatingFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === 'all' ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}
                >Alle</button>
                {RATING_TIERS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatingFilter(r)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === r ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}
                  >
                    <Icon name="starFilled" size={11} strokeWidth={0} className={ratingFilter === r ? '' : 'text-system-yellow'} />{fmtRating(r)}
                  </button>
                ))}
                <button
                  onClick={() => setRatingFilter('none')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === 'none' ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}
                >Nationalteams</button>
              </div>
            </div>
          )}

          {/* Team list */}
          {filterActive ? (
            <div className="space-y-1.5">
              <div className="text-xs text-text-tertiary px-1">{flatFiltered.length} Teams</div>
              {flatFiltered.map(renderTeamRow)}
              {flatFiltered.length === 0 && (
                <div className="modern-card text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                    <Icon name="search" size={28} strokeWidth={1.6} />
                  </div>
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
                        <span className="block text-[11px] text-text-tertiary">
                          {owned > 0 ? `${owned} bekommen · ` : ''}{list.length} Teams
                        </span>
                      </span>
                      <span className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                        <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {list.map(renderTeamRow)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── Statistics across both people ────────────────────────────────────────────
function StatsView({ people, statsFor }) {
  const all = people.map((p) => ({ ...p, stats: statsFor(p.id) }));
  const combinedPulls = all.reduce((s, p) => s + p.stats.totalPulls, 0);

  if (combinedPulls === 0) {
    return (
      <div className="modern-card text-center py-10 animate-mobile-slide-in">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
          <Icon name="chart" size={28} strokeWidth={1.6} />
        </div>
        <h4 className="font-medium text-text-primary mb-1">Noch keine Teams erfasst</h4>
        <p className="text-sm text-text-muted">Sobald ihr Mannschaften als bekommen markiert, erscheinen hier die Statistiken.</p>
      </div>
    );
  }

  const maxDist = Math.max(1, ...all.flatMap((p) => Object.values(p.stats.dist)));

  return (
    <div className="space-y-3 animate-mobile-slide-in">
      {all.map((p) => {
        const a = ACCENT[p.accent];
        const s = p.stats;
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
                <div className="font-bold text-system-yellow inline-flex items-center gap-1">
                  <Icon name="starFilled" size={14} strokeWidth={0} />{s.avgRating ? fmtRating(s.avgRating) : '—'}
                </div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3">
                <div className="text-[11px] text-text-tertiary mb-0.5">Bestes Team</div>
                <div className="font-semibold text-text-primary text-sm truncate">{s.best ? s.best.name : '—'}</div>
              </div>
            </div>

            {s.mostTeam && (
              <div className="text-xs text-text-secondary mb-3">
                Am häufigsten: <span className="font-semibold text-text-primary">{s.mostTeam}</span> ({s.mostCount}×)
              </div>
            )}

            {/* Rating distribution */}
            <div className="space-y-1.5">
              {RATING_TIERS.filter((r) => s.dist[r]).map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="w-8 text-[11px] font-semibold text-text-secondary tabular-nums">{fmtRating(r)}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className={`h-full ${a.bar}`} style={{ width: `${(s.dist[r] / maxDist) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-[11px] text-text-tertiary tabular-nums">{s.dist[r]}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="modern-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-system-purple/12 text-system-purple flex items-center justify-center">
            <Icon name="trophy" size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="text-xs text-text-muted">Insgesamt bekommen</div>
            <div className="text-[11px] text-text-tertiary">beide zusammen</div>
          </div>
        </div>
        <div className="text-xl font-bold text-text-primary">{combinedPulls}</div>
      </div>
    </div>
  );
}
