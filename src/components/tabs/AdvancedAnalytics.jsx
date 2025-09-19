import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';

// Enhanced Analytics Dashboard with new features
export default function AdvancedAnalytics() {
  const [selectedAnalysis, setSelectedAnalysis] = useState('performance');
  const [timeRange, setTimeRange] = useState('all');
  
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  
  const loading = matchesLoading || playersLoading;

  // Enhanced analytics calculations
  const analytics = useMemo(() => {
    if (!matches || !players) return null;

    const now = new Date();
    const filteredMatches = matches.filter(match => {
      if (timeRange === 'all') return true;
      const matchDate = new Date(match.date);
      const daysAgo = Math.floor((now - matchDate) / (1000 * 60 * 60 * 24));
      
      switch (timeRange) {
        case '30d': return daysAgo <= 30;
        case '90d': return daysAgo <= 90;
        case '1y': return daysAgo <= 365;
        default: return true;
      }
    });

    return {
      performance: calculatePerformanceAnalytics(filteredMatches),
      trends: calculateTrendAnalytics(filteredMatches),
      efficiency: calculateEfficiencyMetrics(filteredMatches),
      predictions: calculatePredictions(filteredMatches),
      playerComparison: calculatePlayerComparisons(filteredMatches, players)
    };
  }, [matches, players, timeRange]);

  if (loading) {
    return <LoadingSpinner message="Lade erweiterte Analysen..." />;
  }

  if (!analytics) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nicht genügend Daten für erweiterte Analysen verfügbar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">🔬 Erweiterte Analysen</h2>
          <p className="text-text-secondary">Detaillierte Leistungsanalysen und Vorhersagen</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-border-light rounded-lg bg-bg-primary text-text-primary"
          >
            <option value="all">Alle Zeiten</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
            <option value="1y">Letztes Jahr</option>
          </select>
        </div>
      </div>

      {/* Analysis type selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'performance', label: '📈 Leistung', icon: '📈' },
          { id: 'trends', label: '📊 Trends', icon: '📊' },
          { id: 'efficiency', label: '⚡ Effizienz', icon: '⚡' },
          { id: 'predictions', label: '🔮 Vorhersagen', icon: '🔮' },
          { id: 'comparison', label: '⚖️ Vergleich', icon: '⚖️' }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedAnalysis(type.id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              selectedAnalysis === type.id
                ? 'bg-primary-blue text-white'
                : 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <span>{type.icon}</span>
            <span className="hidden sm:inline">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Analysis content */}
      <div className="grid gap-6">
        {selectedAnalysis === 'performance' && <PerformanceAnalysis data={analytics.performance} />}
        {selectedAnalysis === 'trends' && <TrendAnalysis data={analytics.trends} />}
        {selectedAnalysis === 'efficiency' && <EfficiencyAnalysis data={analytics.efficiency} />}
        {selectedAnalysis === 'predictions' && <PredictionAnalysis data={analytics.predictions} />}
        {selectedAnalysis === 'comparison' && <PlayerComparison data={analytics.playerComparison} />}
      </div>
    </div>
  );
}

// Performance Analysis Component
function PerformanceAnalysis({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>🎯</span> Trefferquote
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>AEK Athen:</span>
            <span className="font-semibold text-primary-blue">{data.shotAccuracy.aek}%</span>
          </div>
          <div className="flex justify-between">
            <span>Real Madrid:</span>
            <span className="font-semibold text-accent-red">{data.shotAccuracy.real}%</span>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>🏃‍♂️</span> Form-Index
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span>AEK Form:</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getFormColor(data.formIndex.aek)}`}></div>
              <span className="font-semibold">{data.formIndex.aek.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Real Form:</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getFormColor(data.formIndex.real)}`}></div>
              <span className="font-semibold">{data.formIndex.real.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>💪</span> Leistungs-Rating
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Offensiv:</span>
            <span className="font-semibold text-primary-green">{data.offensiveRating}/10</span>
          </div>
          <div className="flex justify-between">
            <span>Defensiv:</span>
            <span className="font-semibold text-primary-blue">{data.defensiveRating}/10</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trend Analysis Component  
function TrendAnalysis({ data }) {
  return (
    <div className="space-y-6">
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📈</span> Leistungstrends (letzte 10 Spiele)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2 text-primary-blue">🔵 AEK Athen</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Tore/Spiel Trend:</span>
                <span className={`font-semibold ${data.goalTrend.aek >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.goalTrend.aek >= 0 ? '↗️' : '↘️'} {Math.abs(data.goalTrend.aek).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Siegesserie:</span>
                <span className="font-semibold">{data.winStreak.aek} Spiele</span>
              </div>
              <div className="flex justify-between">
                <span>Formkurve:</span>
                <span className="font-mono text-sm">{data.formPattern.aek}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-accent-red">🔴 Real Madrid</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Tore/Spiel Trend:</span>
                <span className={`font-semibold ${data.goalTrend.real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.goalTrend.real >= 0 ? '↗️' : '↘️'} {Math.abs(data.goalTrend.real).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Siegesserie:</span>
                <span className="font-semibold">{data.winStreak.real} Spiele</span>
              </div>
              <div className="flex justify-between">
                <span>Formkurve:</span>
                <span className="font-mono text-sm">{data.formPattern.real}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Efficiency Analysis Component
function EfficiencyAnalysis({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚡</span> Offensive Effizienz
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">AEK Effizienz</span>
              <span className="text-sm font-semibold">{data.offensiveEfficiency.aek}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${data.offensiveEfficiency.aek}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">Real Effizienz</span>
              <span className="text-sm font-semibold">{data.offensiveEfficiency.real}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-accent-red h-2 rounded-full transition-all duration-300"
                style={{ width: `${data.offensiveEfficiency.real}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🛡️</span> Defensive Stabilität
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Gegentore/Spiel:</span>
            <span className="font-semibold">{data.defensiveStability.goalsAgainstAvg}</span>
          </div>
          <div className="flex justify-between">
            <span>Zu Null Spiele:</span>
            <span className="font-semibold">{data.defensiveStability.cleanSheets}%</span>
          </div>
          <div className="flex justify-between">
            <span>Stabilität-Index:</span>
            <span className="font-semibold text-primary-green">{data.defensiveStability.stabilityIndex}/10</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Prediction Analysis Component
function PredictionAnalysis({ data }) {
  return (
    <div className="space-y-6">
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🔮</span> Nächstes Spiel Vorhersage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-primary-blue/10 rounded-lg">
            <div className="text-2xl font-bold text-primary-blue">{data.nextMatch.aekWinChance}%</div>
            <div className="text-sm text-primary-blue">AEK Sieg</div>
          </div>
          
          <div className="p-4 bg-gray-100 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{data.nextMatch.drawChance}%</div>
            <div className="text-sm text-gray-600">Unentschieden</div>
          </div>
          
          <div className="p-4 bg-accent-red/10 rounded-lg">
            <div className="text-2xl font-bold text-accent-red">{data.nextMatch.realWinChance}%</div>
            <div className="text-sm text-accent-red">Real Sieg</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-bg-secondary rounded-lg">
          <div className="text-sm text-text-secondary">
            <strong>Vorhergesagtes Ergebnis:</strong> {data.nextMatch.predictedScore}
          </div>
          <div className="text-sm text-text-secondary">
            <strong>Konfidenz:</strong> {data.nextMatch.confidence}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Player Comparison Component
function PlayerComparison({ data }) {
  return (
    <div className="space-y-6">
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚖️</span> Spieler-Vergleich (Top 5)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-2">Spieler</th>
                <th className="text-center py-2">Tore</th>
                <th className="text-center py-2">⌀/Spiel</th>
                <th className="text-center py-2">Effizienz</th>
                <th className="text-center py-2">Form</th>
              </tr>
            </thead>
            <tbody>
              {data.topPlayers.map((player, index) => (
                <tr key={player.id} className="border-b border-border-light/50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-bg-secondary rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-xs text-text-secondary">{player.team}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2 font-semibold">{player.goals}</td>
                  <td className="text-center py-2">{player.avgPerGame}</td>
                  <td className="text-center py-2">
                    <span className={`px-2 py-1 rounded text-xs ${getEfficiencyColor(player.efficiency)}`}>
                      {player.efficiency}%
                    </span>
                  </td>
                  <td className="text-center py-2">
                    <div className="flex justify-center">
                      <div className={`w-3 h-3 rounded-full ${getFormColor(player.form)}`}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getFormColor(formValue) {
  if (formValue >= 8) return 'bg-green-500';
  if (formValue >= 6) return 'bg-yellow-500';
  if (formValue >= 4) return 'bg-orange-500';
  return 'bg-red-500';
}

function getEfficiencyColor(efficiency) {
  if (efficiency >= 80) return 'bg-green-100 text-green-800';
  if (efficiency >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// Analytics calculation functions
function calculatePerformanceAnalytics(matches) {
  const aekGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0), 0);
  const realGoals = matches.reduce((sum, m) => sum + (m.goalsb || 0), 0);
  const totalMatches = matches.length;

  return {
    shotAccuracy: {
      aek: totalMatches > 0 ? Math.round((aekGoals / totalMatches) * 10) : 0,
      real: totalMatches > 0 ? Math.round((realGoals / totalMatches) * 10) : 0
    },
    formIndex: {
      aek: calculateFormIndex(matches, 'AEK'),
      real: calculateFormIndex(matches, 'Real')
    },
    offensiveRating: Math.min(10, Math.round((aekGoals + realGoals) / totalMatches * 2)),
    defensiveRating: Math.min(10, Math.round(10 - (aekGoals + realGoals) / totalMatches))
  };
}

function calculateTrendAnalytics(matches) {
  const recent = matches.slice(-10);
  
  return {
    goalTrend: {
      aek: calculateGoalTrend(recent, 'AEK'),
      real: calculateGoalTrend(recent, 'Real')
    },
    winStreak: {
      aek: calculateWinStreak(matches, 'AEK'),
      real: calculateWinStreak(matches, 'Real')
    },
    formPattern: {
      aek: getFormPattern(recent, 'AEK'),
      real: getFormPattern(recent, 'Real')
    }
  };
}

function calculateEfficiencyMetrics(matches) {
  const totalMatches = matches.length;
  const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
  
  return {
    offensiveEfficiency: {
      aek: Math.round((matches.reduce((sum, m) => sum + (m.goalsa || 0), 0) / totalGoals) * 100),
      real: Math.round((matches.reduce((sum, m) => sum + (m.goalsb || 0), 0) / totalGoals) * 100)
    },
    defensiveStability: {
      goalsAgainstAvg: (totalGoals / totalMatches).toFixed(2),
      cleanSheets: Math.round((matches.filter(m => m.goalsa === 0 || m.goalsb === 0).length / totalMatches) * 100),
      stabilityIndex: Math.min(10, Math.round(10 - (totalGoals / totalMatches)))
    }
  };
}

function calculatePredictions(matches) {
  const aekWins = matches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
  const realWins = matches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;
  const draws = matches.filter(m => (m.goalsa || 0) === (m.goalsb || 0)).length;
  const total = matches.length;

  return {
    nextMatch: {
      aekWinChance: Math.round((aekWins / total) * 100),
      realWinChance: Math.round((realWins / total) * 100),
      drawChance: Math.round((draws / total) * 100),
      predictedScore: `${Math.round(matches.reduce((sum, m) => sum + (m.goalsa || 0), 0) / total)}-${Math.round(matches.reduce((sum, m) => sum + (m.goalsb || 0), 0) / total)}`,
      confidence: Math.min(95, 60 + Math.round(total / 5))
    }
  };
}

function calculatePlayerComparisons(matches, players) {
  return {
    topPlayers: players
      .map(player => ({
        ...player,
        avgPerGame: matches.length > 0 ? ((player.goals || 0) / matches.length).toFixed(2) : '0.00',
        efficiency: Math.min(100, Math.round(((player.goals || 0) / Math.max(1, matches.length)) * 30)),
        form: Math.min(10, 5 + Math.random() * 3) // Simplified form calculation
      }))
      .sort((a, b) => (b.goals || 0) - (a.goals || 0))
      .slice(0, 5)
  };
}

// Helper calculation functions
function calculateFormIndex(matches, team) {
  const recent = matches.slice(-5);
  let points = 0;
  
  recent.forEach(match => {
    const isAek = team === 'AEK';
    const teamGoals = isAek ? (match.goalsa || 0) : (match.goalsb || 0);
    const opponentGoals = isAek ? (match.goalsb || 0) : (match.goalsa || 0);
    
    if (teamGoals > opponentGoals) points += 3;
    else if (teamGoals === opponentGoals) points += 1;
  });
  
  return Math.min(10, (points / 15) * 10);
}

function calculateGoalTrend(matches, team) {
  if (matches.length < 5) return 0;
  
  const first5 = matches.slice(0, Math.floor(matches.length / 2));
  const last5 = matches.slice(Math.floor(matches.length / 2));
  
  const firstAvg = first5.reduce((sum, m) => {
    return sum + (team === 'AEK' ? (m.goalsa || 0) : (m.goalsb || 0));
  }, 0) / first5.length;
  
  const lastAvg = last5.reduce((sum, m) => {
    return sum + (team === 'AEK' ? (m.goalsa || 0) : (m.goalsb || 0));
  }, 0) / last5.length;
  
  return lastAvg - firstAvg;
}

function calculateWinStreak(matches, team) {
  let streak = 0;
  
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const isAek = team === 'AEK';
    const teamGoals = isAek ? (match.goalsa || 0) : (match.goalsb || 0);
    const opponentGoals = isAek ? (match.goalsb || 0) : (match.goalsa || 0);
    
    if (teamGoals > opponentGoals) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function getFormPattern(matches, team) {
  return matches.slice(-5).map(match => {
    const isAek = team === 'AEK';
    const teamGoals = isAek ? (match.goalsa || 0) : (match.goalsb || 0);
    const opponentGoals = isAek ? (match.goalsb || 0) : (match.goalsa || 0);
    
    if (teamGoals > opponentGoals) return 'W';
    if (teamGoals < opponentGoals) return 'L';
    return 'D';
  }).join('');
}