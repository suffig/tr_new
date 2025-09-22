import { useState, useMemo } from 'react';

export default function MatchDayOverview({ matches }) {
  const [selectedDate, setSelectedDate] = useState(null);

  // Group matches by date
  const matchesByDate = useMemo(() => {
    if (!matches) return {};
    
    return matches.reduce((grouped, match) => {
      const date = match.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(match);
      return grouped;
    }, {});
  }, [matches]);

  // Get unique dates sorted by newest first
  const matchDates = useMemo(() => {
    return Object.keys(matchesByDate)
      .sort((a, b) => new Date(b) - new Date(a));
  }, [matchesByDate]);

  // Calculate interesting stats for a specific date
  const calculateMatchDayStats = (dateMatches) => {
    if (!dateMatches || dateMatches.length === 0) return null;

    const totalGoals = dateMatches.reduce((sum, match) => 
      sum + (match.goalsa || 0) + (match.goalsb || 0), 0);
    
    const totalMatches = dateMatches.length;
    const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0';
    
    // Find highest scoring match
    const highestScoringMatch = dateMatches.reduce((highest, match) => {
      const matchGoals = (match.goalsa || 0) + (match.goalsb || 0);
      const highestGoals = (highest.goalsa || 0) + (highest.goalsb || 0);
      return matchGoals > highestGoals ? match : highest;
    }, dateMatches[0]);

    // Calculate team performance for this day
    let aekWins = 0, realWins = 0, aekGoals = 0, realGoals = 0;
    
    dateMatches.forEach(match => {
      const aekMatchGoals = match.goalsa || 0;
      const realMatchGoals = match.goalsb || 0;
      
      aekGoals += aekMatchGoals;
      realGoals += realMatchGoals;
      
      if (aekMatchGoals > realMatchGoals) aekWins++;
      else if (realMatchGoals > aekMatchGoals) realWins++;
    });

    // Find most productive player of the day
    const playerGoals = {};
    dateMatches.forEach(match => {
      // Process AEK goals
      if (match.goalslista) {
        const aekGoalsList = typeof match.goalslista === 'string' 
          ? JSON.parse(match.goalslista) 
          : match.goalslista;
        
        aekGoalsList.forEach(goal => {
          const playerName = typeof goal === 'string' ? goal : goal.player;
          const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
          playerGoals[playerName] = (playerGoals[playerName] || 0) + goalCount;
        });
      }

      // Process Real goals
      if (match.goalslistb) {
        const realGoalsList = typeof match.goalslistb === 'string' 
          ? JSON.parse(match.goalslistb) 
          : match.goalslistb;
        
        realGoalsList.forEach(goal => {
          const playerName = typeof goal === 'string' ? goal : goal.player;
          const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
          playerGoals[playerName] = (playerGoals[playerName] || 0) + goalCount;
        });
      }
    });

    const topScorer = Object.entries(playerGoals).reduce((top, [player, goals]) => 
      goals > (top.goals || 0) ? { player, goals } : top, { player: null, goals: 0 });

    // Calculate margin statistics
    const margins = dateMatches.map(match => 
      Math.abs((match.goalsa || 0) - (match.goalsb || 0))
    );
    const avgMargin = margins.length > 0 
      ? (margins.reduce((sum, margin) => sum + margin, 0) / margins.length).toFixed(1)
      : '0.0';

    const closeGames = margins.filter(margin => margin <= 1).length;
    const blowouts = margins.filter(margin => margin >= 3).length;

    // Check for special events (hat-tricks, clean sheets, etc.)
    const specialEvents = [];
    
    dateMatches.forEach(match => {
      // Check for hat-tricks
      Object.entries(playerGoals).forEach(([player, goals]) => {
        if (goals >= 3) {
          specialEvents.push({
            type: 'hat-trick',
            player,
            goals,
            description: `${player} erzielte ${goals} Tore`
          });
        }
      });

      // Check for clean sheets
      if ((match.goalsa || 0) === 0) {
        specialEvents.push({
          type: 'clean-sheet',
          team: 'Real',
          description: 'Real hielt die Null'
        });
      }
      if ((match.goalsb || 0) === 0) {
        specialEvents.push({
          type: 'clean-sheet',
          team: 'AEK',
          description: 'AEK hielt die Null'
        });
      }

      // Check for high-scoring games
      const totalMatchGoals = (match.goalsa || 0) + (match.goalsb || 0);
      if (totalMatchGoals >= 6) {
        specialEvents.push({
          type: 'high-scoring',
          goals: totalMatchGoals,
          description: `Torspektakel mit ${totalMatchGoals} Toren`
        });
      }
    });

    return {
      totalMatches,
      totalGoals,
      avgGoalsPerMatch,
      aekWins,
      realWins,
      aekGoals,
      realGoals,
      topScorer,
      highestScoringMatch,
      avgMargin,
      closeGames,
      blowouts,
      specialEvents,
      playerGoals
    };
  };

  const selectedDateStats = selectedDate ? calculateMatchDayStats(matchesByDate[selectedDate]) : null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="modern-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">📅</span>
          </div>
          <div>
            <h3 className="text-title3 font-bold text-text-primary">Spieltag-Übersicht</h3>
            <p className="text-caption1 text-text-secondary">
              Detaillierte Analyse pro Spieltag mit interessanten Statistiken
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Spieltag auswählen ({matchDates.length} verfügbar)
          </label>
          <select
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value || null)}
            className="form-input w-full max-w-md"
          >
            <option value="">-- Spieltag wählen --</option>
            {matchDates.map(date => (
              <option key={date} value={date}>
                {formatDate(date)} ({matchesByDate[date].length} Spiel{matchesByDate[date].length !== 1 ? 'e' : ''})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Overview of All Match Days */}
        {!selectedDate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchDates.slice(0, 6).map(date => {
              const dayStats = calculateMatchDayStats(matchesByDate[date]);
              return (
                <div
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="p-4 bg-bg-secondary rounded-lg border border-border-light hover:border-primary-blue cursor-pointer transition-all duration-200 hover:scale-105"
                >
                  <div className="text-sm font-medium text-text-primary mb-2">
                    {formatShortDate(date)}
                  </div>
                  <div className="text-xs text-text-secondary mb-2">
                    {dayStats.totalMatches} Spiel{dayStats.totalMatches !== 1 ? 'e' : ''}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Tore:</span>
                      <span className="font-medium">{dayStats.totalGoals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⌀ pro Spiel:</span>
                      <span className="font-medium">{dayStats.avgGoalsPerMatch}</span>
                    </div>
                    {dayStats.topScorer.player && (
                      <div className="flex justify-between">
                        <span>Top:</span>
                        <span className="font-medium text-primary-green">
                          {dayStats.topScorer.player.split(' ').slice(-1)[0]} ({dayStats.topScorer.goals})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Selected Date Statistics */}
      {selectedDate && selectedDateStats && (
        <div className="space-y-6">
          {/* Selected Date Header */}
          <div className="modern-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  {formatDate(selectedDate)}
                </h3>
                <p className="text-text-secondary">
                  {selectedDateStats.totalMatches} Spiel{selectedDateStats.totalMatches !== 1 ? 'e' : ''} an diesem Tag
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            {/* Special Events */}
            {selectedDateStats.specialEvents.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-text-primary mb-2">🌟 Besondere Ereignisse</h4>
                <div className="space-y-2">
                  {selectedDateStats.specialEvents.map((event, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg text-sm ${
                        event.type === 'hat-trick' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                        event.type === 'clean-sheet' ? 'bg-green-50 text-green-800 border border-green-200' :
                        event.type === 'high-scoring' ? 'bg-red-50 text-red-800 border border-red-200' :
                        'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {event.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="modern-card text-center">
              <div className="text-2xl font-bold text-text-primary">{selectedDateStats.totalGoals}</div>
              <div className="text-sm text-text-secondary">Tore insgesamt</div>
              <div className="text-xs text-text-muted">⌀ {selectedDateStats.avgGoalsPerMatch} pro Spiel</div>
            </div>
            
            <div className="modern-card text-center">
              <div className="text-2xl font-bold text-primary-blue">{selectedDateStats.aekWins}</div>
              <div className="text-sm text-text-secondary">AEK Siege</div>
              <div className="text-xs text-text-muted">{selectedDateStats.aekGoals} Tore erzielt</div>
            </div>
            
            <div className="modern-card text-center">
              <div className="text-2xl font-bold text-primary-red">{selectedDateStats.realWins}</div>
              <div className="text-sm text-text-secondary">Real Siege</div>
              <div className="text-xs text-text-muted">{selectedDateStats.realGoals} Tore erzielt</div>
            </div>
            
            <div className="modern-card text-center">
              <div className="text-2xl font-bold text-primary-green">
                {selectedDateStats.topScorer.player ? selectedDateStats.topScorer.goals : '0'}
              </div>
              <div className="text-sm text-text-secondary">Meiste Tore</div>
              <div className="text-xs text-text-muted">
                {selectedDateStats.topScorer.player ? 
                  selectedDateStats.topScorer.player.split(' ').slice(-1)[0] : 
                  'Kein Torschütze'
                }
              </div>
            </div>
          </div>

          {/* Match Details */}
          <div className="modern-card">
            <h4 className="font-semibold text-text-primary mb-4">⚽ Spiele im Detail</h4>
            <div className="space-y-4">
              {matchesByDate[selectedDate].map((match) => (
                <div key={match.id} className="p-4 bg-bg-secondary rounded-lg border border-border-light">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded text-xs flex items-center justify-center font-bold">A</span>
                        <span className="font-medium">AEK</span>
                      </div>
                      <div className="text-xl font-bold">
                        {match.goalsa || 0} : {match.goalsb || 0}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Real</span>
                        <span className="w-6 h-6 bg-red-500 text-white rounded text-xs flex items-center justify-center font-bold">R</span>
                      </div>
                    </div>
                    <div className="text-sm text-text-muted">
                      {(() => {
                        const totalMatchGoals = (match.goalsa || 0) + (match.goalsb || 0);
                        const margin = Math.abs((match.goalsa || 0) - (match.goalsb || 0));
                        
                        if (totalMatchGoals === 0) return 'Torlos';
                        if (totalMatchGoals >= 6) return 'Torspektakel';
                        if (margin === 0) return 'Unentschieden';
                        if (margin >= 3) return 'Deutlicher Sieg';
                        if (margin === 1) return 'Knapper Sieg';
                        return 'Normales Spiel';
                      })()}
                    </div>
                  </div>

                  {/* Goal Scorers */}
                  {(match.goalslista || match.goalslistb) && (
                    <div className="space-y-2">
                      {match.goalslista && JSON.parse(match.goalslista).length > 0 && (
                        <div className="text-sm">
                          <span className="text-primary-blue font-medium">AEK Torschützen: </span>
                          {JSON.parse(match.goalslista).map((goal, goalIndex) => {
                            const player = typeof goal === 'string' ? goal : goal.player;
                            const count = typeof goal === 'string' ? 1 : (goal.count || 1);
                            return (
                              <span key={goalIndex} className="mr-2">
                                {player} {count > 1 ? `(${count})` : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      
                      {match.goalslistb && JSON.parse(match.goalslistb).length > 0 && (
                        <div className="text-sm">
                          <span className="text-primary-red font-medium">Real Torschützen: </span>
                          {JSON.parse(match.goalslistb).map((goal, goalIndex) => {
                            const player = typeof goal === 'string' ? goal : goal.player;
                            const count = typeof goal === 'string' ? 1 : (goal.count || 1);
                            return (
                              <span key={goalIndex} className="mr-2">
                                {player} {count > 1 ? `(${count})` : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Man of the Match */}
                  {match.manofthematch && (
                    <div className="mt-2 text-sm">
                      <span className="text-yellow-600 font-medium">⭐ Spieler des Spiels: </span>
                      <span>{match.manofthematch}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="modern-card">
              <h4 className="font-semibold text-text-primary mb-4">📊 Spielanalyse</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Durchschnittliche Tordifferenz:</span>
                  <span className="font-medium">{selectedDateStats.avgMargin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Enge Spiele (≤1 Tor):</span>
                  <span className="font-medium">{selectedDateStats.closeGames}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Deutliche Siege (≥3 Tore):</span>
                  <span className="font-medium">{selectedDateStats.blowouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Höchste Toranzahl:</span>
                  <span className="font-medium">
                    {(selectedDateStats.highestScoringMatch.goalsa || 0) + (selectedDateStats.highestScoringMatch.goalsb || 0)} Tore
                  </span>
                </div>
              </div>
            </div>

            <div className="modern-card">
              <h4 className="font-semibold text-text-primary mb-4">👤 Top-Torschützen des Tages</h4>
              <div className="space-y-2">
                {Object.entries(selectedDateStats.playerGoals)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([player, goals], index) => (
                    <div key={player} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{player}</span>
                      </div>
                      <span className="font-bold text-primary-green">{goals} Tor{goals !== 1 ? 'e' : ''}</span>
                    </div>
                  ))
                }
                {Object.keys(selectedDateStats.playerGoals).length === 0 && (
                  <div className="text-center text-text-muted py-4">
                    Keine Torschützen an diesem Tag
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}