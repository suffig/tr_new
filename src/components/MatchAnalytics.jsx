import { useState, useEffect } from 'react';

// Enhanced Match Analytics Component
export function MatchAnalytics({ matches, currentMatch }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matches && matches.length > 0) {
      const stats = calculateMatchAnalytics(matches, currentMatch);
      setAnalytics(stats);
      setLoading(false);
    }
  }, [matches, currentMatch]);

  if (loading || !analytics) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
      <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
        🔮 Match Analytics & Insights
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Team Performance */}
        <div className="bg-white/80 rounded-lg p-3 border border-indigo-100">
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">{analytics.aekWinRate}%</div>
            <div className="text-xs text-indigo-700">AEK Siegquote</div>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 border border-indigo-100">
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">{analytics.realWinRate}%</div>
            <div className="text-xs text-indigo-700">Real Siegquote</div>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 border border-indigo-100">
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">{analytics.avgGoalsPerMatch}</div>
            <div className="text-xs text-indigo-700">⌀ Tore/Spiel</div>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 border border-indigo-100">
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">{analytics.currentStreak}</div>
            <div className="text-xs text-indigo-700">{analytics.streakTeam} Serie</div>
          </div>
        </div>
      </div>
      
      {/* Prediction for next match */}
      {analytics.prediction && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-blue-800">🔮 Nächstes Spiel Prognose</div>
              <div className="text-sm text-blue-700">{analytics.prediction.team} mit {analytics.prediction.confidence}% Wahrscheinlichkeit</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-600">Erwarteter Score</div>
              <div className="font-bold text-blue-800">{analytics.prediction.expectedScore}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Live Match Tracker Component
export function LiveMatchTracker({ onStartMatch, onEndMatch }) {
  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState({
    startTime: null,
    goals: { aek: 0, real: 0 },
    events: []
  });

  const startLiveMatch = () => {
    setIsLive(true);
    setLiveData({
      startTime: new Date(),
      goals: { aek: 0, real: 0 },
      events: []
    });
    onStartMatch && onStartMatch();
  };

  const endLiveMatch = () => {
    setIsLive(false);
    onEndMatch && onEndMatch(liveData);
  };

  const addGoal = (team) => {
    setLiveData(prev => ({
      ...prev,
      goals: {
        ...prev.goals,
        [team]: prev.goals[team] + 1
      },
      events: [
        ...prev.events,
        {
          type: 'goal',
          team,
          time: new Date(),
          minute: Math.floor((new Date() - prev.startTime) / 60000)
        }
      ]
    }));
  };

  if (!isLive) {
    return (
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-green-800 flex items-center gap-2">
              🔴 Live Match Tracking
            </h4>
            <p className="text-sm text-green-700">Verfolge Spiele in Echtzeit</p>
          </div>
          <button
            onClick={startLiveMatch}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <span className="animate-pulse">🔴</span>
            Live starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 rounded-lg p-4 border border-red-200 relative overflow-hidden">
      {/* Live indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className="animate-pulse text-red-600 text-sm font-bold">● LIVE</span>
      </div>
      
      <h4 className="font-bold text-red-800 mb-3">🔴 Live Match</h4>
      
      {/* Live score */}
      <div className="bg-white/80 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">AEK</div>
            <div className="text-3xl font-black text-blue-800">{liveData.goals.aek}</div>
            <button
              onClick={() => addGoal('aek')}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Tor +
            </button>
          </div>
          
          <div className="text-center">
            <div className="text-gray-500 text-sm">
              {liveData.startTime && Math.floor((new Date() - liveData.startTime) / 60000)}&apos;
            </div>
            <div className="text-4xl font-bold text-gray-600">:</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">Real</div>
            <div className="text-3xl font-black text-red-800">{liveData.goals.real}</div>
            <button
              onClick={() => addGoal('real')}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              Tor +
            </button>
          </div>
        </div>
      </div>
      
      {/* Live events */}
      {liveData.events.length > 0 && (
        <div className="mb-4">
          <h5 className="font-semibold text-red-700 mb-2">🏃‍♂️ Events</h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {liveData.events.slice(-5).reverse().map((event, idx) => (
              <div key={idx} className="text-sm p-2 bg-white/60 rounded flex items-center gap-2">
                <span className="font-mono text-xs">{event.minute}&apos;</span>
                <span>⚽</span>
                <span className={`font-semibold ${event.team === 'aek' ? 'text-blue-600' : 'text-red-600'}`}>
                  {event.team.toUpperCase()} Tor!
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={endLiveMatch}
        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Match beenden
      </button>
    </div>
  );
}

// Match Comparison Component
export function MatchComparison({ match1, match2 }) {
  if (!match1 || !match2) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-center text-gray-500">Wähle zwei Spiele zum Vergleichen</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
      <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
        ⚖️ Spielvergleich
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Match 1 */}
        <div className="bg-white/80 rounded-lg p-3 border border-yellow-100">
          <div className="text-center mb-2">
            <div className="font-semibold text-yellow-700">Spiel 1</div>
            <div className="text-sm text-yellow-600">{new Date(match1.date).toLocaleDateString()}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {match1.teama} {match1.goalsa || 0} : {match1.goalsb || 0} {match1.teamb}
            </div>
          </div>
        </div>
        
        {/* Match 2 */}
        <div className="bg-white/80 rounded-lg p-3 border border-yellow-100">
          <div className="text-center mb-2">
            <div className="font-semibold text-yellow-700">Spiel 2</div>
            <div className="text-sm text-yellow-600">{new Date(match2.date).toLocaleDateString()}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {match2.teama} {match2.goalsa || 0} : {match2.goalsb || 0} {match2.teamb}
            </div>
          </div>
        </div>
      </div>
      
      {/* Comparison stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="text-center">
          <div className="font-semibold text-yellow-700">Tore</div>
          <div className="flex justify-between">
            <span>{(match1.goalsa || 0) + (match1.goalsb || 0)}</span>
            <span>vs</span>
            <span>{(match2.goalsa || 0) + (match2.goalsb || 0)}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-yellow-700">Karten</div>
          <div className="flex justify-between">
            <span>{(match1.yellowa || 0) + (match1.reda || 0) + (match1.yellowb || 0) + (match1.redb || 0)}</span>
            <span>vs</span>
            <span>{(match2.yellowa || 0) + (match2.reda || 0) + (match2.yellowb || 0) + (match2.redb || 0)}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-yellow-700">Preisgeld</div>
          <div className="flex justify-between">
            <span>€{(match1.prizeaek || 0) + (match1.prizereal || 0)}</span>
            <span>vs</span>
            <span>€{(match2.prizeaek || 0) + (match2.prizereal || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate match analytics
function calculateMatchAnalytics(matches) {
  if (!matches || matches.length === 0) return null;

  const totalMatches = matches.length;
  let aekWins = 0;
  let realWins = 0;
  let totalGoals = 0;
  let currentStreak = 0;
  let streakTeam = '';

  // Calculate basic stats
  matches.forEach((match, index) => {
    const aekGoals = match.goalsa || 0;
    const realGoals = match.goalsb || 0;
    totalGoals += aekGoals + realGoals;

    if (aekGoals > realGoals) {
      aekWins++;
    } else if (realGoals > aekGoals) {
      realWins++;
    }

    // Calculate current streak (from most recent matches)
    if (index === matches.length - 1) {
      let lastWinner = aekGoals > realGoals ? 'AEK' : realGoals > aekGoals ? 'Real' : null;
      if (lastWinner) {
        streakTeam = lastWinner;
        currentStreak = 1;
        
        // Check previous matches for streak
        for (let i = matches.length - 2; i >= 0; i--) {
          const prevMatch = matches[i];
          const prevAekGoals = prevMatch.goalsa || 0;
          const prevRealGoals = prevMatch.goalsb || 0;
          const prevWinner = prevAekGoals > prevRealGoals ? 'AEK' : prevRealGoals > prevAekGoals ? 'Real' : null;
          
          if (prevWinner === lastWinner) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
  });

  const aekWinRate = Math.round((aekWins / totalMatches) * 100);
  const realWinRate = Math.round((realWins / totalMatches) * 100);
  const avgGoalsPerMatch = (totalGoals / totalMatches).toFixed(1);

  // Simple prediction based on recent form
  let prediction = null;
  if (matches.length >= 3) {
    const recentMatches = matches.slice(-3);
    let aekRecentForm = 0;
    let realRecentForm = 0;

    recentMatches.forEach(match => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;
      if (aekGoals > realGoals) aekRecentForm += 3;
      else if (realGoals > aekGoals) realRecentForm += 3;
      else { aekRecentForm += 1; realRecentForm += 1; }
    });

    const totalForm = aekRecentForm + realRecentForm;
    if (totalForm > 0) {
      const aekChance = Math.round((aekRecentForm / totalForm) * 100);
      const realChance = Math.round((realRecentForm / totalForm) * 100);
      
      prediction = {
        team: aekChance > realChance ? 'AEK' : 'Real',
        confidence: Math.max(aekChance, realChance),
        expectedScore: `${Math.round(avgGoalsPerMatch / 2)}:${Math.round(avgGoalsPerMatch / 2)}`
      };
    }
  }

  return {
    aekWinRate,
    realWinRate,
    avgGoalsPerMatch,
    currentStreak,
    streakTeam,
    prediction,
    totalMatches
  };
}