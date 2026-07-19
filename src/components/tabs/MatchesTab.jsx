import Icon from '../icons/Icon';
import { useState, useEffect } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import HorizontalNavigation from '../HorizontalNavigation';
import TeamLogo from '../TeamLogo';
import { getTeamDisplay, getTeamShort } from '../../constants/teams';
import { checkMilestones } from '../../utils/milestoneAlerts';
import { chronoDesc } from '../../utils/matchChronology';
import toast from 'react-hot-toast';
import '../../styles/match-animations.css';

export default function MatchesTab() {
  const [expandedMatches, setExpandedMatches] = useState(new Set());
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // '1week', '4weeks', '3months', 'all'
  const [dateFilter, setDateFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('all'); // 'all', 'aek-wins', 'real-wins'
  const [goalFilter, setGoalFilter] = useState('all'); // 'all', 'high-scoring', 'low-scoring'
  const [activeView, setActiveView] = useState('overview');

  const { data: allMatches, loading, error, refetch } = useSupabaseQuery(
    'matches',
    '*',
    { order: { column: 'date', ascending: false } }
  );
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');

  // Rekord-/Meilenstein-Alarme + Monats-Recap (einmal pro Session, sobald Daten da sind)
  useEffect(() => {
    if (allMatches && allMatches.length > 0) checkMilestones(allMatches);
  }, [allMatches]);

  // Calculate date based on time filter
  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case '1week':
        now.setDate(now.getDate() - 7);
        break;
      case '4weeks':
        now.setDate(now.getDate() - 28);
        break;
      case '3months':
        now.setMonth(now.getMonth() - 3);
        break;
      default:
        return null;
    }
    return now.toISOString().split('T')[0];
  };

  // Filter matches based on current settings
  const getFilteredMatches = () => {
    if (!allMatches) return [];
    
    let filtered = allMatches;
    
    // Apply horizontal navigation view filter first
    switch (activeView) {
      case 'aek-wins':
        filtered = filtered.filter(match => {
          const aekGoals = match.goalsa || 0;
          const realGoals = match.goalsb || 0;
          return aekGoals > realGoals;
        });
        break;
      case 'real-wins':
        filtered = filtered.filter(match => {
          const aekGoals = match.goalsa || 0;
          const realGoals = match.goalsb || 0;
          return realGoals > aekGoals;
        });
        break;
      case 'recent': {
        // Show only the last 2 weeks
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        filtered = filtered.filter(match => new Date(match.date) >= twoWeeksAgo);
        break;
      }
      case 'overview':
      default:
        // No additional filtering for overview
        break;
    }
    
    // Apply date filter if set (exact date) - only if not in horizontal nav filter mode
    if (activeView === 'overview' && dateFilter) {
      filtered = filtered.filter(match => match.date === dateFilter);
    } else if (activeView === 'overview' && timeFilter !== 'all') {
      // Apply time period filter
      const filterDate = getTimeFilterDate();
      if (filterDate) {
        filtered = filtered.filter(match => match.date >= filterDate);
      }
    }
    
    // Apply result filter - only if not using horizontal nav for results
    if (activeView === 'overview' && resultFilter !== 'all') {
      filtered = filtered.filter(match => {
        const aekGoals = match.goalsa || 0;
        const realGoals = match.goalsb || 0;
        
        switch (resultFilter) {
          case 'aek-wins':
            return aekGoals > realGoals;
          case 'real-wins':
            return realGoals > aekGoals;
          default:
            return true;
        }
      });
    }
    
    // Apply goal filter - only if in overview mode
    if (activeView === 'overview' && goalFilter !== 'all') {
      filtered = filtered.filter(match => {
        const totalGoals = (match.goalsa || 0) + (match.goalsb || 0);
        
        switch (goalFilter) {
          case 'high-scoring':
            return totalGoals > 10; // Many goals: >10
          case 'low-scoring':
            return totalGoals < 5; // Few goals: <5
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };
  
  const matches = getFilteredMatches();
  
  const isLoading = loading || playersLoading;

  // Define views for horizontal navigation (removed stats view)
  const views = [
    { id: 'overview', label: 'Übersicht', iconName: 'football' },
    { id: 'recent', label: 'Letzte', iconName: 'calendar' },
    { id: 'aek-wins', label: `${getTeamDisplay('AEK')} Siege`, logoComponent: <TeamLogo team="aek" size="sm" /> },
    { id: 'real-wins', label: `${getTeamDisplay('Real')} Siege`, logoComponent: <TeamLogo team="real" size="sm" /> },
  ];

  // Sync horizontal navigation with dropdown filters
  useEffect(() => {
    switch (activeView) {
      case 'aek-wins':
        if (resultFilter !== 'aek-wins') {
          setResultFilter('aek-wins');
          setTimeFilter('all'); // Reset time filter when using specific view
        }
        break;
      case 'real-wins':
        if (resultFilter !== 'real-wins') {
          setResultFilter('real-wins');
          setTimeFilter('all'); // Reset time filter when using specific view
        }
        break;
      case 'recent':
        if (timeFilter !== '4weeks') {
          setTimeFilter('4weeks');
          setResultFilter('all'); // Reset result filter for recent view
        }
        break;
      case 'overview':
      default:
        // Don't auto-change filters when in overview mode
        break;
    }
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to get player name and value
  const getPlayerInfo = (playerId, playerName) => {
    if (!players) return { name: playerName || 'Unbekannt', value: 0, team: 'Unbekannt' };
    const player = players.find(p => p.id === playerId || p.name === playerName);
    const rawTeam = player?.team || 'Unbekannt';
    return {
      name: player?.name || playerName || 'Unbekannt',
      value: player?.value || 0,
      team: rawTeam === 'Unbekannt' ? 'Unbekannt' : getTeamDisplay(rawTeam)
    };
  };

  const toggleMatchDetails = (matchId) => {
    setExpandedMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  // Spieltag als Text teilen (Web-Share-API mit Zwischenablage-Fallback)
  const shareMatchday = async (dateGroup) => {
    const aek = getTeamShort('AEK');
    const real = getTeamShort('Real');
    const dateStr = new Date(dateGroup.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    const ordered = [...dateGroup.matches].sort((a, b) => a.id - b.id);
    let sumA = 0, sumB = 0;
    const lines = ordered.map((m, i) => {
      const a = m.goalsa || 0, b = m.goalsb || 0;
      sumA += a; sumB += b;
      return `${i + 1}. ${aek} ${a}:${b} ${real}`;
    });
    const text =
      `⚽ FUSTA · Spieltag ${dateStr}\n\n` +
      `${lines.join('\n')}\n\n` +
      `Tagesbilanz: ${aek} ${sumA}:${sumB} ${real}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FUSTA Spieltag', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Spieltag in die Zwischenablage kopiert');
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // Nutzer hat abgebrochen
      try { await navigator.clipboard.writeText(text); toast.success('Spieltag kopiert'); }
      catch { toast.error('Teilen nicht möglich'); }
    }
  };

  // Group matches by date
  const groupMatchesByDate = () => {
    if (!matches) return [];
    
    const groups = {};
    matches.forEach(match => {
      const dateKey = match.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });
    
    // Sort dates descending and return as array
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(date => ({
        date,
        matches: groups[date].sort((a, b) => b.id - a.id) // Sort matches by ID descending
      }));
  };


  if (isLoading) {
    return <LoadingSpinner message="Lade Spiele..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-accent-red mb-4 flex justify-center">
          <Icon name="warning" size={28} strokeWidth={2} />
        </div>
        <p className="text-text-muted mb-4">Fehler beim Laden der Spiele</p>
        <button onClick={refetch} className="btn-primary">
          Erneut versuchen
        </button>
      </div>
    );
  }

  const dateGroups = groupMatchesByDate();

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      {/* Head-to-Head Quick Stats Banner */}
      {allMatches && allMatches.length > 0 && (() => {
        const aekWins = allMatches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
        const realWins = allMatches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;
        const draws = allMatches.length - aekWins - realWins;
        const totalGoalsA = allMatches.reduce((s, m) => s + (m.goalsa || 0), 0);
        const totalGoalsB = allMatches.reduce((s, m) => s + (m.goalsb || 0), 0);
        const last10 = [...allMatches].sort(chronoDesc).slice(0, 10).reverse();
        const resultFor = (m, side) => {
          const a = m.goalsa || 0, b = m.goalsb || 0;
          if (a === b) return 'D';
          return side === 'AEK' ? (a > b ? 'W' : 'L') : (b > a ? 'W' : 'L');
        };
        const formAek = last10.map(m => resultFor(m, 'AEK'));
        const formReal = last10.map(m => resultFor(m, 'Real'));
        // Current win streak (consecutive wins by the same team, newest first; a draw ends it)
        const streak = (() => {
          const ordered = [...allMatches].sort(chronoDesc);
          let who = null, len = 0;
          for (const m of ordered) {
            const a = m.goalsa || 0, b = m.goalsb || 0;
            if (a === b) break;
            const w = a > b ? 'AEK' : 'Real';
            if (who === null) { who = w; len = 1; }
            else if (w === who) len += 1;
            else break;
          }
          return who ? { who, len } : null;
        })();
        const aekName = getTeamDisplay('AEK');
        const realName = getTeamDisplay('Real');
        return (
          <div className="mb-4 bg-bg-secondary border border-border-light rounded-2xl overflow-hidden">
            {/* Top: win counts with team logos */}
            <div className="flex items-center p-3 gap-2">
              <div className="flex-1 flex flex-col items-center gap-1">
                <TeamLogo team="AEK" size="lg" />
                <div className="text-3xl font-black text-blue-500">{aekWins}</div>
                <div className="text-[11px] font-semibold text-blue-400 leading-tight text-center">{aekName}</div>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-1">
                <div className="text-[11px] text-text-muted font-medium">{allMatches.length} Spiele</div>
                <div className="text-xl font-black text-text-secondary tracking-tight">{totalGoalsA}:{totalGoalsB}</div>
                {draws > 0 && <div className="text-[10px] text-text-muted">{draws}× Unentschieden</div>}
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <TeamLogo team="Real" size="lg" />
                <div className="text-3xl font-black text-red-500">{realWins}</div>
                <div className="text-[11px] font-semibold text-red-400 leading-tight text-center">{realName}</div>
              </div>
            </div>
            {/* Current win streak highlight */}
            {streak && streak.len >= 2 && (
              <div className="px-3 pb-2 -mt-1 flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-system-orange bg-system-orange/10 rounded-full px-2.5 py-1">
                  <Icon name="zap" size={12} strokeWidth={2.4} />
                  {(streak.who === 'AEK' ? aekName : realName)} · {streak.len} Siege in Folge
                </span>
              </div>
            )}
            {/* Bottom: Formkurve pro Team (letzte 10, alt -> neu) */}
            <div className="border-t border-border-light px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Formkurve (letzte 10)</span>
                <span className="text-[9px] text-text-tertiary">alt → neu</span>
              </div>
              {[{ name: aekName, form: formAek }, { name: realName, form: formReal }].map((row, ri) => (
                <div key={ri} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary font-medium w-20 truncate shrink-0">{row.name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {row.form.length === 0 && <span className="text-[10px] text-text-tertiary">—</span>}
                    {row.form.map((r, i) => (
                      <span
                        key={i}
                        title={r === 'W' ? 'Sieg' : r === 'D' ? 'Unentschieden' : 'Niederlage'}
                        className={`w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center ${r === 'W' ? 'bg-system-green' : r === 'D' ? 'bg-gray-400' : 'bg-system-red'}`}
                      >
                        {r === 'W' ? 'S' : r === 'D' ? 'U' : 'N'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Horizontal Navigation */}
      <HorizontalNavigation
        views={views}
        selectedView={activeView}
        onViewChange={setActiveView}
      />

      {/* Discreet filter bar */}
      {(() => {
        const timeLabels = { '1week': 'Letzte Woche', '4weeks': 'Letzte 4 Wochen', '3months': 'Letzte 3 Monate', 'all': 'Alle Spiele' };
        const resultLabels = { 'all': 'Alle', 'aek-wins': `${getTeamDisplay('AEK')} Siege`, 'real-wins': `${getTeamDisplay('Real')} Siege` };
        const goalLabels = { 'all': 'Alle', 'high-scoring': 'Torreich', 'low-scoring': 'Torarm' };
        const activeChips = [];
        if (timeFilter !== 'all') activeChips.push({ key: 'time', label: timeLabels[timeFilter], clear: () => setTimeFilter('all') });
        if (resultFilter !== 'all') activeChips.push({ key: 'result', label: resultLabels[resultFilter], clear: () => setResultFilter('all') });
        if (goalFilter !== 'all') activeChips.push({ key: 'goal', label: goalLabels[goalFilter], clear: () => setGoalFilter('all') });
        if (dateFilter) activeChips.push({ key: 'date', label: new Date(dateFilter).toLocaleDateString('de-DE'), clear: () => setDateFilter('') });
        const resetAll = () => { setTimeFilter('all'); setDateFilter(''); setResultFilter('all'); setGoalFilter('all'); };
        return (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-muted">
                {matches.length === (allMatches?.length || 0) ? `${matches.length} Spiele` : `${matches.length} von ${allMatches?.length || 0}`}
              </span>
              <button
                onClick={() => setFilterExpanded(!filterExpanded)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors min-h-[40px] ${
                  filterExpanded || activeChips.length > 0
                    ? 'bg-system-green/12 text-system-green'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon name="filter" size={16} strokeWidth={2.2} />
                Filter
                {activeChips.length > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-system-green text-white text-[11px] font-bold flex items-center justify-center">{activeChips.length}</span>
                )}
                <span className={`transition-transform duration-200 ${filterExpanded ? 'rotate-90' : ''}`}>
                  <Icon name="chevronRight" size={16} strokeWidth={2.2} />
                </span>
              </button>
            </div>

            {/* Active filter chips (visible when collapsed) */}
            {!filterExpanded && activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeChips.map((chip) => (
                  <button key={chip.key} onClick={chip.clear} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium bg-system-green/12 text-system-green">
                    {chip.label}
                    <Icon name="x" size={13} strokeWidth={2.4} />
                  </button>
                ))}
              </div>
            )}

            {/* Expandable filter panel */}
            {filterExpanded && (
              <div className="modern-card mt-3 animate-mobile-slide-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Zeitraum</label>
                    <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none">
                      <option value="1week">Letzte Woche</option>
                      <option value="4weeks">Letzte 4 Wochen</option>
                      <option value="3months">Letzte 3 Monate</option>
                      <option value="all">Alle Spiele</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Ergebnis</label>
                    <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none">
                      <option value="all">Alle Ergebnisse</option>
                      <option value="aek-wins">{getTeamDisplay('AEK')} Siege</option>
                      <option value="real-wins">{getTeamDisplay('Real')} Siege</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Tore</label>
                    <select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none">
                      <option value="all">Alle Spiele</option>
                      <option value="high-scoring">Torreich (&gt;10 Tore)</option>
                      <option value="low-scoring">Torarm (&lt;5 Tore)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Datum</label>
                    <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none" />
                  </div>
                </div>
                {activeChips.length > 0 && (
                  <button onClick={resetAll} className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium btn-soft btn-soft-gray">
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}

            {/* Active filter chips (visible when collapsed) */}
            {!filterExpanded && activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeChips.map((chip) => (
                  <button key={chip.key} onClick={chip.clear} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium bg-system-green/12 text-system-green">
                    {chip.label}
                    <Icon name="x" size={13} strokeWidth={2.4} />
                  </button>
                ))}
              </div>
            )}

            {/* Expandable filter panel */}
            {filterExpanded && (
              <div className="modern-card mt-3 animate-mobile-slide-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Zeitraum</label>
                    <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none">
                      <option value="1week">Letzte Woche</option>
                      <option value="4weeks">Letzte 4 Wochen</option>
                      <option value="3months">Letzte 3 Monate</option>
                      <option value="all">Alle Spiele</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Ergebnis</label>
                    <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none">
                      <option value="all">Alle Ergebnisse</option>
                      <option value="aek-wins">{getTeamDisplay('AEK')} Siege</option>
                      <option value="real-wins">{getTeamDisplay('Real')} Siege</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Tore</label>
                    <select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none">
                      <option value="all">Alle Spiele</option>
                      <option value="high-scoring">Torreich (&gt;10 Tore)</option>
                      <option value="low-scoring">Torarm (&lt;5 Tore)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Datum</label>
                    <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-light rounded-xl text-sm focus:outline-none" />
                  </div>
                </div>
                {activeChips.length > 0 && (
                  <button onClick={resetAll} className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium btn-soft btn-soft-gray">
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {dateGroups && dateGroups.length > 0 ? (
        <div className="space-y-5">
          {dateGroups.map((dateGroup) => (
              <div key={dateGroup.date}>
                {/* Date group label */}
                <div className="flex items-center justify-between px-1 mb-2">
                  <h3 className="text-sm font-semibold text-text-secondary">
                    {new Date(dateGroup.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">
                      {dateGroup.matches.length} Spiel{dateGroup.matches.length !== 1 ? 'e' : ''}
                    </span>
                    <button
                      onClick={() => shareMatchday(dateGroup)}
                      aria-label="Spieltag teilen"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-system-green hover:bg-system-green/10 active:scale-90 transition-all"
                    >
                      <Icon name="share" size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {dateGroup.matches.map((match, matchIndex) => {
                    const isExpanded = expandedMatches.has(match.id);
                    const aekGoals = match.goalsa || 0;
                    const realGoals = match.goalsb || 0;
                    const winner = aekGoals > realGoals ? 'aek' : realGoals > aekGoals ? 'real' : 'draw';
                    const matchNumber = matchIndex + 1;
                    const totalGoals = aekGoals + realGoals;

                    const parseGoals = (raw) => {
                      try {
                        if (typeof raw === 'string') return JSON.parse(raw) || [];
                        if (Array.isArray(raw)) return raw;
                      } catch { /* ignore */ }
                      return [];
                    };

                    return (
                      <div key={match.id} className="modern-card p-0 overflow-hidden">
                        {/* Match summary row */}
                        <button
                          onClick={() => toggleMatchDetails(match.id)}
                          className="w-full px-4 py-3 flex items-center gap-3"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          {/* Team A */}
                          <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
                            <TeamLogo team={match.teama || 'AEK'} size="md" />
                            <div className={`text-[11px] font-semibold text-center leading-tight truncate w-full ${winner === 'aek' ? 'text-system-blue' : 'text-text-tertiary'}`}>
                              {getTeamShort(match.teama || 'AEK')}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex-1 flex flex-col items-center">
                            <div className="text-2xl font-black tracking-tight tabular-nums">
                              <span className={winner === 'aek' ? 'text-system-blue' : 'text-text-secondary'}>{aekGoals}</span>
                              <span className="mx-1.5 text-text-tertiary">:</span>
                              <span className={winner === 'real' ? 'text-system-red' : 'text-text-secondary'}>{realGoals}</span>
                            </div>
                            {match.status && match.status !== 'finished' && (
                              <span className="text-[10px] text-system-orange font-medium">Laufend</span>
                            )}
                          </div>

                          {/* Team B */}
                          <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
                            <TeamLogo team={match.teamb || 'Real'} size="md" />
                            <div className={`text-[11px] font-semibold text-center leading-tight truncate w-full ${winner === 'real' ? 'text-system-red' : 'text-text-tertiary'}`}>
                              {getTeamShort(match.teamb || 'Real')}
                            </div>
                          </div>

                          {/* Chevron */}
                          <span className={`flex-shrink-0 text-text-tertiary transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                          </span>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border-light pt-4 space-y-3">
                            {/* Meta line */}
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <span className="bg-bg-tertiary px-2 py-1 rounded-md font-medium">Match #{matchNumber}</span>
                              <span className="bg-bg-tertiary px-2 py-1 rounded-md">{totalGoals} Tore</span>
                              <span className="bg-bg-tertiary px-2 py-1 rounded-md">{new Date(match.date).toLocaleDateString('de-DE')}</span>
                            </div>

                            {/* Goal scorers */}
                            <div className="bg-bg-tertiary rounded-xl p-3">
                              <h4 className="text-sm font-semibold text-text-primary mb-2 inline-flex items-center gap-2">
                                <Icon name="football" size={16} strokeWidth={2.2} className="text-system-green" />Torschützen
                              </h4>
                              <div className="space-y-3">
                                {[
                                  { team: 'aek', label: getTeamDisplay('AEK'), goals: aekGoals, list: parseGoals(match.goalslista), color: 'text-system-blue' },
                                  { team: 'real', label: getTeamDisplay('Real'), goals: realGoals, list: parseGoals(match.goalslistb), color: 'text-system-red' },
                                ].map((side) => (
                                  <div key={side.team}>
                                    <div className={`flex items-center gap-2 text-xs font-semibold mb-1.5 ${side.color}`}>
                                      <TeamLogo team={side.team} size="xs" /> {side.label} · {side.goals}
                                    </div>
                                    {side.list.length > 0 ? (
                                      <div className="space-y-1">
                                        {side.list.map((goal, idx) => {
                                          const isObject = typeof goal === 'object' && goal !== null;
                                          const playerInfo = isObject ? getPlayerInfo(goal.player_id, goal.player) : getPlayerInfo(null, goal);
                                          return (
                                            <div key={idx} className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2">
                                              <span className="text-sm font-medium text-text-primary truncate">
                                                {playerInfo.name}
                                                {isObject && goal.count > 1 && <span className={`ml-2 text-xs font-bold ${side.color}`}>{goal.count}×</span>}
                                              </span>
                                              <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">{playerInfo.value}M €</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-text-tertiary px-1">Keine Tore</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* MVP + Cards row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* MVP */}
                              <div className="bg-bg-tertiary rounded-xl p-3">
                                <h4 className="text-sm font-semibold text-text-primary mb-2 inline-flex items-center gap-2">
                                  <Icon name="star" size={16} strokeWidth={2.2} className="text-system-orange" />Spieler des Spiels
                                </h4>
                                {match.manofthematch ? (
                                  (() => {
                                    const playerInfo = getPlayerInfo(match.manofthematch_player_id, match.manofthematch);
                                    return (
                                      <div className="bg-system-orange/10 rounded-lg px-3 py-2">
                                        <div className="font-semibold text-text-primary text-sm">{match.manofthematch}</div>
                                        <div className="text-xs text-text-muted mt-0.5">{playerInfo.team} · {playerInfo.value}M €</div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <p className="text-xs text-text-tertiary">Keiner ausgewählt</p>
                                )}
                              </div>

                              {/* Cards */}
                              <div className="bg-bg-tertiary rounded-xl p-3">
                                <h4 className="text-sm font-semibold text-text-primary mb-2 inline-flex items-center gap-2">
                                  <Icon name="ban" size={16} strokeWidth={2.2} className="text-system-red" />Karten
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex items-center justify-between bg-bg-secondary rounded-lg px-2.5 py-1.5">
                                    <span className="text-xs text-text-secondary">{getTeamShort('AEK')}</span>
                                    <span className="font-semibold"><span className="text-system-yellow-dark">{match.yellowa || 0}</span> / <span className="text-system-red">{match.reda || 0}</span></span>
                                  </div>
                                  <div className="flex items-center justify-between bg-bg-secondary rounded-lg px-2.5 py-1.5">
                                    <span className="text-xs text-text-secondary">{getTeamShort('Real')}</span>
                                    <span className="font-semibold"><span className="text-system-yellow-dark">{match.yellowb || 0}</span> / <span className="text-system-red">{match.redb || 0}</span></span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-text-tertiary mt-1.5 flex items-center justify-center gap-3">
                                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-system-yellow-dark" />gelb</span>
                                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-system-red" />rot</span>
                                </div>
                              </div>
                            </div>

                            {/* Prize money */}
                            <div className="bg-bg-tertiary rounded-xl p-3">
                              <h4 className="text-sm font-semibold text-text-primary mb-2 inline-flex items-center gap-2">
                                <Icon name="euro" size={16} strokeWidth={2.2} className="text-system-green" />Preisgelder
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { team: 'aek', short: getTeamShort('AEK'), prize: match.prizeaek || 0 },
                                  { team: 'real', short: getTeamShort('Real'), prize: match.prizereal || 0 },
                                ].map((side) => (
                                  <div key={side.team} className="bg-bg-secondary rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-0.5">
                                      <TeamLogo team={side.team} size="xs" /> {side.short}
                                    </div>
                                    <div className={`font-bold text-sm ${side.prize > 0 ? 'text-system-green' : side.prize < 0 ? 'text-system-red' : 'text-text-secondary'}`}>
                                      {side.prize > 0 ? '+' : ''}{side.prize.toLocaleString('de-DE')} €
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
          ))}
        </div>
      ) : (() => {
        const hasAny = (allMatches?.length || 0) > 0;
        const clearFilters = () => { setTimeFilter('all'); setDateFilter(''); setResultFilter('all'); setGoalFilter('all'); setActiveView('overview'); };
        return (
          <div className="text-center py-12">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
              <Icon name={hasAny ? 'filter' : 'football'} size={28} strokeWidth={1.6} />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {hasAny ? 'Keine Spiele im Filter' : 'Noch keine Spiele'}
            </h3>
            <p className="text-text-muted mb-4">
              {hasAny
                ? `${allMatches.length} Spiele vorhanden – keins passt zum aktuellen Filter.`
                : 'Trage im Verwaltungsbereich das erste Spiel ein.'}
            </p>
            {hasAny && (
              <button onClick={clearFilters} className="btn-brand inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
                <Icon name="undo" size={16} strokeWidth={2.2} />Alle Spiele anzeigen
              </button>
            )}
          </div>
        );
      })()}

    </div>
  );
}