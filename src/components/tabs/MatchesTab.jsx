import { useState, useEffect, useRef } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import HorizontalNavigation from '../HorizontalNavigation';
import TeamLogo from '../TeamLogo';
import '../../styles/match-animations.css';

export default function MatchesTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [expandedMatches, setExpandedMatches] = useState(new Set());
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [timeFilter, setTimeFilter] = useState('4weeks'); // '1week', '4weeks', '3months', 'all'
  const [dateFilter, setDateFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('all'); // 'all', 'aek-wins', 'real-wins'
  const [goalFilter, setGoalFilter] = useState('all'); // 'all', 'high-scoring', 'low-scoring'
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const [animatingMatches, setAnimatingMatches] = useState(new Set());
  const [activeView, setActiveView] = useState('overview');
  const animationTimeouts = useRef(new Map());
  
  const { data: allMatches, loading, error, refetch } = useSupabaseQuery(
    'matches',
    '*',
    { order: { column: 'date', ascending: false } }
  );
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  
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

  // Define views for horizontal navigation
  const views = [
    { id: 'overview', label: 'Übersicht', icon: '⚽' },
    { id: 'recent', label: 'Letzte', icon: '📅' },
    { id: 'aek-wins', label: 'AEK Siege', logoComponent: <TeamLogo team="aek" size="sm" /> },
    { id: 'real-wins', label: 'Real Siege', logoComponent: <TeamLogo team="real" size="sm" /> },
    { id: 'stats', label: 'Statistiken', icon: '📊' },
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
    if (!players) return { name: playerName || 'Unbekannt', value: 0 };
    const player = players.find(p => p.id === playerId || p.name === playerName);
    return {
      name: player?.name || playerName || 'Unbekannt',
      value: player?.value || 0,
      team: player?.team || 'Unbekannt'
    };
  };

  const toggleMatchDetails = (matchId) => {
    const newExpanded = new Set(expandedMatches);
    const isCurrentlyExpanded = newExpanded.has(matchId);
    
    // Add animation state
    setAnimatingMatches(prev => new Set(prev).add(matchId));
    
    // Clear any existing timeout for this match
    if (animationTimeouts.current.has(matchId)) {
      clearTimeout(animationTimeouts.current.get(matchId));
    }
    
    if (isCurrentlyExpanded) {
      newExpanded.delete(matchId);
    } else {
      newExpanded.add(matchId);
    }
    
    setExpandedMatches(newExpanded);
    
    // Remove animation state after animation completes
    const timeout = setTimeout(() => {
      setAnimatingMatches(prev => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
      animationTimeouts.current.delete(matchId);
    }, 300);
    
    animationTimeouts.current.set(matchId, timeout);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      const timeouts = animationTimeouts.current;
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

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

  // Generate color schemes for different dates
  const getDateColorScheme = (index) => {
    const colorSchemes = [
      {
        container: "border-blue-400 bg-blue-50 dark:bg-blue-900",
        header: "text-blue-800 dark:text-blue-100",
        accent: "blue-500"
      },
      {
        container: "border-green-500 bg-green-50 dark:bg-green-900", 
        header: "text-green-800 dark:text-green-100",
        accent: "green-500"
      },
      {
        container: "border-purple-500 bg-purple-50 dark:bg-purple-900",
        header: "text-purple-800 dark:text-purple-100", 
        accent: "purple-500"
      },
      {
        container: "border-red-500 bg-red-50 dark:bg-red-900",
        header: "text-red-800 dark:text-red-100", 
        accent: "red-500"
      },
      {
        container: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900",
        header: "text-yellow-800 dark:text-yellow-100",
        accent: "yellow-500"
      }
    ];
    
    return colorSchemes[index % colorSchemes.length];
  };

  if (isLoading) {
    return <LoadingSpinner message="Lade Spiele..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-accent-red mb-4">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
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
      {/* Enhanced Header with iOS 26 Design - matching StatsTab */}
      <div className="mb-6 animate-mobile-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-info rounded-ios-lg flex items-center justify-center">
            <span className="text-white text-xl">⚽</span>
          </div>
          <div>
            <h2 className="text-title1 font-bold text-text-primary">Spiele</h2>
            <p className="text-footnote text-text-secondary">
              {matches?.length || 0} Spiele gefunden, gruppiert nach Datum
            </p>
          </div>
        </div>
        <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Horizontal Navigation */}
      <HorizontalNavigation
        views={views}
        selectedView={activeView}
        onViewChange={setActiveView}
      />

      {/* Enhanced Filter Controls */}
      <div className="mb-6 modern-card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">🔍 Filter & Suche</h3>
            <p className="text-sm text-text-muted">Finde schnell die Spiele, die dich interessieren</p>
          </div>
          <button
            onClick={() => setFilterExpanded(!filterExpanded)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-bg-secondary hover:bg-bg-tertiary border border-border-light rounded-lg transition-all"
          >
            <span>{filterExpanded ? 'Einklappen' : 'Erweitern'}</span>
            <span className={`text-lg transition-transform duration-200 ${filterExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </button>
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${filterExpanded ? 'max-h-96' : 'max-h-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Period Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                📅 Zeitraum
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
              >
                <option value="1week">Letzte Woche</option>
                <option value="4weeks">Letzte 4 Wochen</option>
                <option value="3months">Letzte 3 Monate</option>
                <option value="all">Alle Spiele</option>
              </select>
            </div>
            
            {/* Result Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                🏆 Ergebnis
              </label>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
              >
                <option value="all">Alle Ergebnisse</option>
                <option value="aek-wins">AEK Siege</option>
                <option value="real-wins">Real Siege</option>
              </select>
            </div>
            
            {/* Goal Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                ⚽ Tore
              </label>
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
              >
                <option value="all">Alle Spiele</option>
                <option value="high-scoring">🔥 Torreich (&gt;10 Tore)</option>
                <option value="low-scoring">🛡️ Torarm (&lt;5 Tore)</option>
              </select>
            </div>
            
            {/* Specific Date Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                📆 Datum
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
              />
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="text-sm text-text-muted">
              {(() => {
                const count = matches.length;
                const total = allMatches?.length || 0;
                if (count === total) return `Zeige alle ${count} Spiele`;
                return `${count} von ${total} Spielen gefiltert`;
              })()}
            </div>
            <button
              onClick={() => {
                setTimeFilter('4weeks');
                setDateFilter('');
                setResultFilter('all');
                setGoalFilter('all');
              }}
              className="px-4 py-2 text-sm bg-accent-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              🔄 Filter zurücksetzen
            </button>
          </div>
        </div>
      </div>

      {dateGroups && dateGroups.length > 0 ? (
        <div className="space-y-4">
          {dateGroups.map((dateGroup, groupIndex) => {
            const colorScheme = getDateColorScheme(groupIndex);
            
            return (
              <div key={dateGroup.date} className={`border-2 ${colorScheme.container} rounded-lg shadow-lg`}>
                <div className="p-4 border-b border-opacity-20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 bg-${colorScheme.accent} rounded-full mr-3 flex-shrink-0`}></div>
                      <div>
                        <h3 className={`text-lg font-bold ${colorScheme.header}`}>
                          {new Date(dateGroup.date).toLocaleDateString('de-DE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                        <p className={`text-sm opacity-75 ${colorScheme.header}`}>
                          {dateGroup.matches.length} Spiel{dateGroup.matches.length !== 1 ? 'e' : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`text-xs bg-${colorScheme.accent} text-white px-3 py-1 rounded-full font-semibold`}>
                      Spieltag
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  {dateGroup.matches.map((match, matchIndex) => {
                    const isExpanded = expandedMatches.has(match.id);
                    const isAnimating = animatingMatches.has(match.id);
                    const isHovered = hoveredMatch === match.id;
                    
                    // Determine winner for styling
                    const aekGoals = match.goalsa || 0;
                    const realGoals = match.goalsb || 0;
                    const winner = aekGoals > realGoals ? 'aek' : realGoals > aekGoals ? 'real' : 'draw';
                    
                    return (
                      <div 
                        key={match.id} 
                        className={`
                          relative overflow-hidden rounded-xl border transition-all duration-300 ease-out transform
                          ${isExpanded ? 'shadow-2xl scale-[1.02]' : 'shadow-lg hover:shadow-xl hover:scale-[1.01]'}
                          ${isHovered ? 'ring-2 ring-blue-400/50' : ''}
                          bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200
                          ${isAnimating ? 'transition-all duration-300' : ''}
                        `}
                        style={{
                          animationDelay: `${matchIndex * 100}ms`,
                          animation: 'slideInUp 0.5s ease-out forwards'
                        }}
                        onMouseEnter={() => setHoveredMatch(match.id)}
                        onMouseLeave={() => setHoveredMatch(null)}
                      >
                        {/* Decorative background pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                        </div>
                        
                        <button
                          onClick={() => toggleMatchDetails(match.id)}
                          className="relative w-full p-6 flex items-center justify-between cursor-pointer hover:bg-white/20 transition-all duration-200 rounded-xl group"
                        >
                          <div className="flex items-center space-x-6">
                            {/* Match result with enhanced styling */}
                            <div className="text-center relative">
                              {/* Winner indicator */}
                              {winner !== 'draw' && (
                                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  winner === 'aek' ? 'bg-blue-500' : 'bg-red-500'
                                }`}>
                                  👑
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4">
                                {/* Team A */}
                                <div className="text-right flex flex-col items-center">
                                  <TeamLogo team={match.teama || 'AEK'} size="lg" />
                                  <div className="text-sm font-medium text-blue-700 mt-1">
                                    {match.teama || 'AEK'}
                                  </div>
                                </div>
                                
                                {/* Score */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                                  <div className="text-2xl font-black text-gray-800">
                                    <span className="text-blue-600">{aekGoals}</span>
                                    <span className="mx-2 text-gray-400">:</span>
                                    <span className="text-red-600">{realGoals}</span>
                                  </div>
                                </div>
                                
                                {/* Team B */}
                                <div className="text-left flex flex-col items-center">
                                  <TeamLogo team={match.teamb || 'Real'} size="lg" />
                                  <div className="text-sm font-medium text-red-700 mt-1">
                                    {match.teamb || 'Real'}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Match status */}
                              {match.status && (
                                <div className="mt-3">
                                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                    match.status === 'finished' 
                                      ? 'bg-green-100 text-green-700 border border-green-200'
                                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                                  }`}>
                                    {match.status === 'finished' ? '✅ Beendet' : '⏱️ Laufend'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Clean result overview - only show expand indicator */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                              {isExpanded ? 'Weniger' : 'Details'}
                            </span>
                            <div className={`
                              p-2 rounded-full bg-white/60 group-hover:bg-white/80 transition-all duration-300
                              ${isExpanded ? 'rotate-90 bg-blue-100' : 'hover:scale-110'}
                            `}>
                              <span className="text-lg block">▶</span>
                            </div>
                          </div>
                        </button>
                        
                        {/* Enhanced expanded details with smooth animation */}
                        {isExpanded && (
                          <div className={`
                            px-6 pb-6 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm
                            transform transition-all duration-300 ease-out
                            ${isAnimating ? 'animate-slideDown' : ''}
                          `}>
                            <div className="mt-6">
                              {/* Enhanced match statistics header */}
                              <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                  📊 Match Details & Statistiken
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span>Match #{match.id}</span>
                                  <span>•</span>
                                  <span>{new Date(match.date).toLocaleDateString('de-DE')}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                
                                {/* Enhanced Goal Scorers Section */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                    ⚽ Torschützen
                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                                      {(match.goalsa || 0) + (match.goalsb || 0)} Tore
                                    </span>
                                  </h4>
                                  <div className="space-y-3">
                                    {(() => {
                                      // Safely parse goalslista
                                      let goalsList = [];
                                      try {
                                        if (typeof match.goalslista === 'string') {
                                          goalsList = JSON.parse(match.goalslista);
                                        } else if (Array.isArray(match.goalslista)) {
                                          goalsList = match.goalslista;
                                        }
                                      } catch (e) {
                                        console.warn('Failed to parse goalslista:', e);
                                        goalsList = [];
                                      }
                                      
                                      return goalsList && goalsList.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                                            <TeamLogo team="aek" size="xs" /> AEK ({match.goalsa || 0} Tore)
                                          </div>
                                          {goalsList.map((goal, idx) => {
                                            const isObject = typeof goal === 'object' && goal !== null;
                                            const playerInfo = isObject 
                                              ? getPlayerInfo(goal.player_id, goal.player)
                                              : getPlayerInfo(null, goal);
                                            return (
                                              <div key={idx} className="group p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-400 hover:shadow-sm transition-all">
                                                <div className="flex items-center justify-between">
                                                  <div>
                                                    <div className="font-semibold text-blue-800 flex items-center gap-2">
                                                      ⚽ {playerInfo.name}
                                                      {isObject && goal.count > 1 && (
                                                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold">
                                                          {goal.count}x Treffer
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-xs text-blue-600 flex items-center gap-3 mt-1">
                                                      <span>💰 {playerInfo.value}M €</span>
                                                      <span>👕 {playerInfo.team}</span>
                                                    </div>
                                                  </div>

                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                          <p className="text-sm text-gray-500 text-center"><TeamLogo team="aek" size="xs" /> AEK: Keine Tore erzielt</p>
                                        </div>
                                      );
                                    })()}
                                    
                                    {(() => {
                                      // Safely parse goalslistb
                                      let goalsList = [];
                                      try {
                                        if (typeof match.goalslistb === 'string') {
                                          goalsList = JSON.parse(match.goalslistb);
                                        } else if (Array.isArray(match.goalslistb)) {
                                          goalsList = match.goalslistb;
                                        }
                                      } catch (e) {
                                        console.warn('Failed to parse goalslistb:', e);
                                        goalsList = [];
                                      }
                                      
                                      return goalsList && goalsList.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                                            <TeamLogo team="real" size="xs" /> Real ({match.goalsb || 0} Tore)
                                          </div>
                                          {goalsList.map((goal, idx) => {
                                            const isObject = typeof goal === 'object' && goal !== null;
                                            const playerInfo = isObject 
                                              ? getPlayerInfo(goal.player_id, goal.player)
                                              : getPlayerInfo(null, goal);
                                            return (
                                              <div key={idx} className="group p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-l-4 border-red-400 hover:shadow-sm transition-all">
                                                <div className="flex items-center justify-between">
                                                  <div>
                                                    <div className="font-semibold text-red-800 flex items-center gap-2">
                                                      ⚽ {playerInfo.name}
                                                      {isObject && goal.count > 1 && (
                                                        <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full font-bold">
                                                          {goal.count}x Treffer
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-xs text-red-600 flex items-center gap-3 mt-1">
                                                      <span>💰 {playerInfo.value}M €</span>
                                                      <span>👕 {playerInfo.team}</span>
                                                    </div>
                                                  </div>

                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                          <p className="text-sm text-gray-500 text-center"><TeamLogo team="real" size="xs" /> Real: Keine Tore erzielt</p>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* Enhanced Player of the Match Section */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                    ⭐ Spieler des Spiels
                                  </h4>
                                  <div className="space-y-2">
                                    {match.manofthematch ? (
                                      <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-l-4 border-yellow-400 relative overflow-hidden">
                                        {/* Sparkle animation background */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/30 to-amber-100/30 animate-pulse"></div>
                                        <div className="relative">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="font-bold text-yellow-800 text-lg flex items-center gap-2">
                                                🏆 {match.manofthematch}
                                                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                                                  MVP
                                                </span>
                                              </div>
                                              {(() => {
                                                const playerInfo = getPlayerInfo(match.manofthematch_player_id, match.manofthematch);
                                                return (
                                                  <div className="text-sm text-yellow-700 flex items-center gap-3 mt-2">
                                                    <span>👕 Team: {playerInfo.team}</span>
                                                    <span>💰 Marktwert: {playerInfo.value}M €</span>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                            <div className="text-4xl animate-bounce">
                                              ⭐
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                        <p className="text-sm text-gray-500 text-center">⭐ Kein Spieler des Spiels ausgewählt</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Enhanced Cards Section */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                    🟨🟥 Karten & Disziplin
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      {/* AEK Cards */}
                                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                                          <TeamLogo team="aek" size="xs" /> AEK
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">🟨 Gelbe Karten</span>
                                            <span className="font-bold text-yellow-600">{match.yellowa || 0}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">🟥 Rote Karten</span>
                                            <span className="font-bold text-red-600">{match.reda || 0}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Real Cards */}
                                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                                          <TeamLogo team="real" size="xs" /> Real
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">🟨 Gelbe Karten</span>
                                            <span className="font-bold text-yellow-600">{match.yellowb || 0}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">🟥 Rote Karten</span>
                                            <span className="font-bold text-red-600">{match.redb || 0}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Total cards summary */}
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                      <div className="text-center text-sm text-gray-600">
                                        Gesamt: 🟨 {(match.yellowa || 0) + (match.yellowb || 0)} | 🟥 {(match.reda || 0) + (match.redb || 0)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Enhanced Prize Money Section */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                    💰 Preisgelder & Finanzen
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-3">
                                      {/* AEK Prize */}
                                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                                            <TeamLogo team="aek" size="xs" /> AEK
                                          </span>
                                          <span className={`font-bold text-lg ${(match.prizeaek || 0) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                            €{match.prizeaek || 0}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Real Prize */}
                                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-red-700 flex items-center gap-2">
                                            <TeamLogo team="real" size="xs" /> Real
                                          </span>
                                          <span className={`font-bold text-lg ${(match.prizereal || 0) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                            €{match.prizereal || 0}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-text-muted mb-4">
            <i className="fas fa-futbol text-4xl opacity-50"></i>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Keine Spiele gefunden
          </h3>
          <p className="text-text-muted">
            Es wurden noch keine Spiele hinzugefügt.
          </p>
        </div>
      )}

      {/* Info Card - Only show on admin page */}
      {showHints && (
        <div className="mt-6 modern-card bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <div className="text-blue-600 mr-3">
              <i className="fas fa-info-circle"></i>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Hinweis</h4>
              <p className="text-blue-700 text-sm">
                Klicken Sie auf ein Spiel, um detaillierte Statistiken wie Torschützen, Karten und Preisgelder anzuzeigen. Neue Spiele können im Verwaltungsbereich hinzugefügt werden.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}