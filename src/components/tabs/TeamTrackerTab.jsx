import { useState, useEffect, useMemo } from 'react';
import Icon from '../icons/Icon';
import { FC26_LEAGUES, FC26_TOTAL_CLUBS } from '../../constants/fc26Clubs';

const STORAGE_KEY = 'fc26TeamTracker_v1';

const PEOPLE = [
  { id: 'alexander', name: 'Alexander', accent: 'blue' },
  { id: 'philip', name: 'Philip', accent: 'green' },
];

const ACCENT = {
  blue: { text: 'text-system-blue', chip: 'bg-system-blue/12 text-system-blue', pill: 'bg-system-blue text-white', bar: 'bg-system-blue' },
  green: { text: 'text-system-green', chip: 'bg-system-green/12 text-system-green', pill: 'bg-system-green text-white', bar: 'bg-system-green' },
};

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      alexander: Array.isArray(parsed?.alexander) ? parsed.alexander : [],
      philip: Array.isArray(parsed?.philip) ? parsed.philip : [],
    };
  } catch {
    return { alexander: [], philip: [] };
  }
}

export default function TeamTrackerTab() {
  const [data, setData] = useState(loadData);
  const [person, setPerson] = useState('alexander');
  const [search, setSearch] = useState('');
  const [openLeague, setOpenLeague] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  const isCompare = person === 'compare';
  const current = PEOPLE.find((p) => p.id === person) || PEOPLE[0];
  const accent = ACCENT[current.accent];
  const selected = data[person] || [];
  const selectedSet = useMemo(() => new Set(selected.map((c) => c.toLowerCase())), [selected]);
  const has = (club) => selectedSet.has(club.toLowerCase());

  // Comparison between both people (case-insensitive)
  const comparison = useMemo(() => {
    const norm = (arr) => new Map(arr.map((c) => [c.toLowerCase(), c]));
    const aMap = norm(data.alexander || []);
    const pMap = norm(data.philip || []);
    const both = [];
    const onlyA = [];
    const onlyP = [];
    for (const [k, label] of aMap) (pMap.has(k) ? both : onlyA).push(label);
    for (const [k, label] of pMap) if (!aMap.has(k)) onlyP.push(label);
    const sort = (a) => a.sort((x, y) => x.localeCompare(y, 'de'));
    return { both: sort(both), onlyA: sort(onlyA), onlyP: sort(onlyP) };
  }, [data]);

  const toggle = (club) => {
    setData((prev) => {
      const list = prev[person] || [];
      const exists = list.some((c) => c.toLowerCase() === club.toLowerCase());
      return {
        ...prev,
        [person]: exists ? list.filter((c) => c.toLowerCase() !== club.toLowerCase()) : [...list, club],
      };
    });
  };

  const q = search.trim().toLowerCase();
  const filteredLeagues = useMemo(() => {
    if (!q) return FC26_LEAGUES;
    return FC26_LEAGUES
      .map((l) => ({ ...l, clubs: l.clubs.filter((c) => c.toLowerCase().includes(q)) }))
      .filter((l) => l.clubs.length > 0);
  }, [q]);

  return (
    <div className="p-4 pb-28 mobile-safe-bottom">
      {/* Header */}
      <div className="page-header animate-mobile-slide-in">
        <div className="page-header-row">
          <div>
            <h2 className="page-title">Teams</h2>
            <p className="page-subtitle">Alle FC26-Mannschaften — auswählbar pro Person</p>
          </div>
          <div className="page-icon tile-indigo"><Icon name="trophy" size={22} strokeWidth={2} /></div>
        </div>
      </div>

      {/* Person segmented control */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl mb-4">
        {PEOPLE.map((p) => {
          const a = ACCENT[p.accent];
          const isActive = person === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPerson(p.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                isActive ? `bg-bg-secondary shadow-sm ${a.text}` : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              {p.name}
              <span className="text-xs font-medium opacity-70">{(data[p.id] || []).length}</span>
            </button>
          );
        })}
        <button
          onClick={() => setPerson('compare')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
            isCompare ? 'bg-bg-secondary shadow-sm text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Icon name="scale" size={16} strokeWidth={2.1} />
          Vergleich
        </button>
      </div>

      {isCompare ? (
        <div className="space-y-3 animate-mobile-slide-in">
          {/* Totals side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="modern-card text-center">
              <div className="text-2xl font-bold text-system-blue">{(data.alexander || []).length}</div>
              <div className="text-xs text-text-muted">Alexander</div>
            </div>
            <div className="modern-card text-center">
              <div className="text-2xl font-bold text-system-green">{(data.philip || []).length}</div>
              <div className="text-xs text-text-muted">Philip</div>
            </div>
          </div>

          <CompareGroup title="Gemeinsam" count={comparison.both.length} clubs={comparison.both} chip="bg-system-purple/12 text-system-purple" defaultOpen />
          <CompareGroup title="Nur Alexander" count={comparison.onlyA.length} clubs={comparison.onlyA} chip="bg-system-blue/12 text-system-blue" />
          <CompareGroup title="Nur Philip" count={comparison.onlyP.length} clubs={comparison.onlyP} chip="bg-system-green/12 text-system-green" />

          {comparison.both.length === 0 && comparison.onlyA.length === 0 && comparison.onlyP.length === 0 && (
            <div className="modern-card text-center py-8">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                <Icon name="scale" size={28} strokeWidth={1.6} />
              </div>
              <p className="text-text-muted text-sm">Noch keine Teams ausgewählt.</p>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Selection count */}
      <div className="modern-card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.chip}`}>
            <Icon name="check" size={20} strokeWidth={2.4} />
          </span>
          <div>
            <div className="font-semibold text-text-primary leading-tight">{selected.length} ausgewählt</div>
            <div className="text-xs text-text-muted">{current.name} · von {FC26_TOTAL_CLUBS} Teams</div>
          </div>
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => setData((prev) => ({ ...prev, [person]: [] }))}
            className="text-xs font-medium text-text-tertiary hover:text-system-red transition-colors px-3 py-2"
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
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

      {/* League list */}
      <div className="space-y-2">
        {filteredLeagues.map((league) => {
          const isOpen = !!q || openLeague === league.name;
          const selectedInLeague = league.clubs.filter((c) => has(c)).length;
          return (
            <div key={league.name} className="modern-card p-0 overflow-hidden">
              <button
                onClick={() => setOpenLeague(isOpen && !q ? null : league.name)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="text-lg flex-shrink-0">{league.country}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-text-primary text-sm">{league.name}</span>
                  <span className="block text-[11px] text-text-tertiary">
                    {selectedInLeague > 0 ? `${selectedInLeague}/${league.clubs.length} ausgewählt` : `${league.clubs.length} Teams`}
                  </span>
                </span>
                {!q && (
                  <span className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                    <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {league.clubs.map((club) => {
                    const on = has(club);
                    return (
                      <button
                        key={club}
                        onClick={() => toggle(club)}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors min-h-[44px] ${
                          on ? accent.chip : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="truncate">{club}</span>
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${on ? accent.pill : 'border-2 border-border-medium'}`}>
                          {on && <Icon name="check" size={13} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredLeagues.length === 0 && (
          <div className="modern-card text-center py-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
              <Icon name="search" size={28} strokeWidth={1.6} />
            </div>
            <p className="text-text-muted text-sm">Kein Team gefunden.</p>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

function CompareGroup({ title, count, clubs, chip, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="modern-card p-0 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4 text-left" disabled={count === 0}>
        <span className={`min-w-[34px] h-[26px] px-2 rounded-full text-sm font-bold flex items-center justify-center ${chip}`}>{count}</span>
        <span className="flex-1 font-semibold text-text-primary text-sm">{title}</span>
        {count > 0 && (
          <span className={`text-text-tertiary transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
            <Icon name="chevronRight" size={18} strokeWidth={2.2} />
          </span>
        )}
      </button>
      {open && count > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {clubs.map((c) => (
            <span key={c} className={`px-3 py-1.5 rounded-full text-xs font-medium ${chip}`}>{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}
