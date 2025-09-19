import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import LoadingSpinner from '../../LoadingSpinner';

/**
 * Enhanced Player Performance Analytics Component
 * Provides detailed individual player analysis with trends, comparisons, and insights
 */
export default function PlayerPerformanceAnalytics() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [comparisonPlayer, setComparisonPlayer] = useState(null);
  const [timeRange, setTimeRange] = useState('season');
  const [analysisType, setAnalysisType] = useState('overview');

  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');

  const loading = playersLoading || matchesLoading || bansLoading;

  // Enhanced player analytics calculation
  const playerAnalytics = useMemo(() => {
    if (!players || !matches || !selectedPlayer) return null;

    const player = players.find(p => p.id === selectedPlayer);
    if (!player) return null;

    return calculatePlayerAnalytics(player, matches, bans || [], timeRange);
  }, [players, matches, bans, selectedPlayer, timeRange]);

  const comparisonData = useMemo(() => {
    if (!players || !matches || !selectedPlayer || !comparisonPlayer) return null;

    const player1 = players.find(p => p.id === selectedPlayer);
    const player2 = players.find(p => p.id === comparisonPlayer);
    
    if (!player1 || !player2) return null;

    return {
      player1: calculatePlayerAnalytics(player1, matches, bans || [], timeRange),
      player2: calculatePlayerAnalytics(player2, matches, bans || [], timeRange)
    };
  }, [players, matches, bans, selectedPlayer, comparisonPlayer, timeRange]);

  if (loading) {
    return <LoadingSpinner message="Lade Spieler-Analytics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="modern-card">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              🎯 Spieler-Performance Analytics
            </h2>
            <p className="text-text-secondary text-sm">
              Detaillierte Einzelspieler-Analyse mit Trends und Vergleichen
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Player Selection */}
            <select 
              value={selectedPlayer || ''} 
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="modern-select"
            >
              <option value="">Spieler auswählen</option>
              {players?.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>

            {/* Time Range */}
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="modern-select"
            >
              <option value="season">Ganze Saison</option>
              <option value="30d">Letzte 30 Tage</option>
              <option value="90d">Letzte 90 Tage</option>
              <option value="form">Letzte 5 Spiele</option>
            </select>

            {/* Analysis Type */}
            <select 
              value={analysisType} 
              onChange={(e) => setAnalysisType(e.target.value)}
              className="modern-select"
            >
              <option value="overview">Übersicht</option>
              <option value="trends">Trends</option>
              <option value="comparison">Vergleich</option>
              <option value="heatmap">Heatmap</option>
            </select>
          </div>
        </div>
      </div>

      {!selectedPlayer ? (
        <div className="modern-card text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">Spieler auswählen</h3>
          <p className="text-text-secondary">
            Wähle einen Spieler aus, um detaillierte Performance-Analytics zu sehen
          </p>
        </div>
      ) : (
        <>
          {/* Player Overview */}
          {analysisType === 'overview' && playerAnalytics && (
            <PlayerOverview analytics={playerAnalytics} />
          )}

          {/* Performance Trends */}
          {analysisType === 'trends' && playerAnalytics && (
            <PerformanceTrends analytics={playerAnalytics} />
          )}

          {/* Player Comparison */}
          {analysisType === 'comparison' && (
            <PlayerComparison 
              players={players}
              comparisonPlayer={comparisonPlayer}
              setComparisonPlayer={setComparisonPlayer}
              comparisonData={comparisonData}
            />
          )}

          {/* Performance Heatmap */}
          {analysisType === 'heatmap' && playerAnalytics && (
            <PerformanceHeatmap analytics={playerAnalytics} />
          )}
        </>
      )}
    </div>
  );
}

// Player Overview Component
function PlayerOverview({ analytics }) {
  const { player, stats, performance, discipline } = analytics;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Player Info Header */}
      <div className="lg:col-span-3 mb-4">
        <h2 className="text-xl font-bold text-primary-green">
          {player.name} ({player.team})
        </h2>
      </div>
      
      {/* Basic Stats */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Basis-Statistiken
        </h3>
        <div className="space-y-3">
          <StatRow label="Spiele" value={stats.matchesPlayed} />
          <StatRow label="Tore" value={stats.goals} highlight />
          <StatRow label="Assists" value={stats.assists} />
          <StatRow label="Tore/Spiel" value={stats.goalsPerGame} />
          <StatRow label="Punkte/Spiel" value={stats.pointsPerGame} />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚡</span> Performance
        </h3>
        <div className="space-y-3">
          <PerformanceBar 
            label="Offensive Rating" 
            value={performance.offensiveRating} 
            max={100}
            color="bg-primary-green"
          />
          <PerformanceBar 
            label="Consistency" 
            value={performance.consistency} 
            max={100}
            color="bg-primary-blue"
          />
          <PerformanceBar 
            label="Form (letzte 5)" 
            value={performance.recentForm} 
            max={100}
            color="bg-accent-orange"
          />
          <StatRow label="Beste Serie" value={`${performance.bestStreak} Spiele`} />
        </div>
      </div>

      {/* Discipline & Awards */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🏆</span> Disziplin & Auszeichnungen
        </h3>
        <div className="space-y-3">
          <StatRow 
            label="Sperren" 
            value={discipline.totalBans} 
            color={discipline.totalBans > 0 ? 'text-red-600' : 'text-green-600'}
          />
          <StatRow label="Disziplin-Score" value={`${discipline.score}/10`} />
          <StatRow label="SdS-Titel" value={stats.sdsCount} highlight />
          <div className="pt-2 border-t">
            <div className="text-sm font-medium mb-1">Auszeichnungen:</div>
            <div className="flex flex-wrap gap-1">
              {performance.awards?.map((award, idx) => (
                <span key={idx} className="text-xs bg-accent-yellow/20 text-accent-yellow px-2 py-1 rounded">
                  {award}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Performance Trends Component
function PerformanceTrends({ analytics }) {
  const { trends, progressions } = analytics;

  return (
    <div className="space-y-6">
      {/* Goals Trend Chart */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">📈 Tor-Trend</h3>
        <div className="h-64 flex items-end gap-2 p-4 bg-gray-50 rounded-lg">
          {trends.goalsHistory.map((week, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-primary-green rounded-t"
                style={{ height: `${(week.goals / Math.max(...trends.goalsHistory.map(w => w.goals)) * 100) || 5}%` }}
              ></div>
              <div className="text-xs mt-1 text-center">W{week.week}</div>
              <div className="text-xs text-gray-600">{week.goals}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard 
          title="Aktuelle Form"
          value={progressions.currentForm}
          trend={progressions.formTrend}
          icon="🔥"
        />
        <TrendCard 
          title="Trefferquote"
          value={`${progressions.goalRate}%`}
          trend={progressions.goalTrend}
          icon="🎯"
        />
        <TrendCard 
          title="Spielzeit"
          value={`${progressions.avgPlaytime}min`}
          trend={progressions.playtimeTrend}
          icon="⏱️"
        />
        <TrendCard 
          title="Impact Score"
          value={progressions.impactScore}
          trend={progressions.impactTrend}
          icon="💥"
        />
      </div>
    </div>
  );
}

// Player Comparison Component
function PlayerComparison({ players, comparisonPlayer, setComparisonPlayer, comparisonData }) {
  return (
    <div className="space-y-6">
      {/* Comparison Player Selection */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">👥 Spieler-Vergleich</h3>
        <select 
          value={comparisonPlayer || ''} 
          onChange={(e) => setComparisonPlayer(e.target.value)}
          className="modern-select w-full max-w-xs"
        >
          <option value="">Vergleichsspieler auswählen</option>
          {players?.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.team})
            </option>
          ))}
        </select>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlayerComparisonCard 
            title={comparisonData.player1.player.name}
            team={comparisonData.player1.player.team}
            analytics={comparisonData.player1}
            isWinner="goals"
          />
          <PlayerComparisonCard 
            title={comparisonData.player2.player.name}
            team={comparisonData.player2.player.team}
            analytics={comparisonData.player2}
          />
        </div>
      )}
    </div>
  );
}

// Performance Heatmap Component
function PerformanceHeatmap({ analytics }) {
  const { heatmap } = analytics;

  return (
    <div className="modern-card">
      <h3 className="text-lg font-semibold mb-4">🗺️ Performance Heatmap</h3>
      <div className="grid grid-cols-7 gap-1 p-4">
        {heatmap.map((day, idx) => (
          <div key={idx} className="aspect-square relative">
            <div 
              className={`w-full h-full rounded ${getHeatmapColor(day.intensity)}`}
              title={`${day.date}: ${day.performance}/10`}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {day.intensity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper Components
function StatRow({ label, value, color = 'text-text-primary', highlight = false }) {
  return (
    <div className={`flex justify-between ${highlight ? 'p-2 bg-primary-green/10 rounded' : ''}`}>
      <span className="text-text-secondary">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function PerformanceBar({ label, value, max, color }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

function TrendCard({ title, value, trend, icon }) {
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600';
  const trendIcon = trend > 0 ? '↗️' : trend < 0 ? '↘️' : '➡️';

  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-sm ${trendColor} flex items-center gap-1`}>
        <span>{trendIcon}</span>
        <span>{Math.abs(trend).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function PlayerComparisonCard({ title, team, analytics, isWinner }) {
  return (
    <div className={`modern-card ${isWinner ? 'ring-2 ring-primary-green' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-lg font-semibold">{title}</h4>
        <span className="text-sm bg-gray-100 px-2 py-1 rounded">{team}</span>
        {isWinner && <span className="text-lg">👑</span>}
      </div>
      
      <div className="space-y-2">
        <StatRow label="Tore" value={analytics.stats.goals} />
        <StatRow label="Assists" value={analytics.stats.assists} />
        <StatRow label="Tore/Spiel" value={analytics.stats.goalsPerGame} />
        <StatRow label="Performance Rating" value={`${analytics.performance.offensiveRating}/100`} />
      </div>
    </div>
  );
}

// Helper Functions
function calculatePlayerAnalytics(player, matches, bans, timeRange) {
  // Filter matches based on time range
  const filteredMatches = filterMatchesByTimeRange(matches, timeRange);
  
  // Calculate basic stats
  const stats = {
    matchesPlayed: filteredMatches.length,
    goals: calculatePlayerGoals(player, filteredMatches),
    assists: player.assists || 0,
    goalsPerGame: 0,
    pointsPerGame: 0,
    sdsCount: player.sds_count || 0
  };
  
  stats.goalsPerGame = stats.matchesPlayed > 0 ? (stats.goals / stats.matchesPlayed).toFixed(2) : '0.00';
  stats.pointsPerGame = stats.matchesPlayed > 0 ? ((stats.goals + stats.assists) / stats.matchesPlayed).toFixed(2) : '0.00';

  // Calculate performance metrics
  const performance = {
    offensiveRating: calculateOffensiveRating(stats),
    consistency: calculateConsistency(player, filteredMatches),
    recentForm: calculateRecentForm(player, filteredMatches.slice(-5)),
    bestStreak: calculateBestStreak(player, filteredMatches),
    awards: generateAwards(stats, player)
  };

  // Calculate discipline metrics
  const playerBans = bans.filter(ban => ban.player_id === player.id);
  const discipline = {
    totalBans: playerBans.length,
    score: Math.max(0, 10 - playerBans.length * 2)
  };

  // Calculate trends and progressions
  const trends = calculateTrends(player, filteredMatches);
  const progressions = calculateProgressions(player, filteredMatches);
  const heatmap = generatePerformanceHeatmap(player, filteredMatches);

  return {
    player,
    stats,
    performance,
    discipline,
    trends,
    progressions,
    heatmap
  };
}

function filterMatchesByTimeRange(matches, timeRange) {
  const now = new Date();
  
  switch (timeRange) {
    case '30d':
      return matches.filter(match => {
        const matchDate = new Date(match.date);
        return (now - matchDate) <= (30 * 24 * 60 * 60 * 1000);
      });
    case '90d':
      return matches.filter(match => {
        const matchDate = new Date(match.date);
        return (now - matchDate) <= (90 * 24 * 60 * 60 * 1000);
      });
    case 'form':
      return matches.slice(-5);
    default:
      return matches;
  }
}

function calculatePlayerGoals(player, matches) {
  let totalGoals = 0;
  
  matches.forEach(match => {
    if (player.team === 'AEK' && match.goalslista) {
      const goals = Array.isArray(match.goalslista) ? match.goalslista : 
                   (typeof match.goalslista === 'string' ? JSON.parse(match.goalslista) : []);
      
      goals.forEach(goal => {
        const goalPlayer = typeof goal === 'string' ? goal : goal.player;
        const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
        if (goalPlayer === player.name) totalGoals += goalCount;
      });
    }
    
    if (player.team === 'Real' && match.goalslistb) {
      const goals = Array.isArray(match.goalslistb) ? match.goalslistb : 
                   (typeof match.goalslistb === 'string' ? JSON.parse(match.goalslistb) : []);
      
      goals.forEach(goal => {
        const goalPlayer = typeof goal === 'string' ? goal : goal.player;
        const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
        if (goalPlayer === player.name) totalGoals += goalCount;
      });
    }
  });
  
  return totalGoals;
}

function calculateOffensiveRating(stats) {
  // Calculate offensive rating based on goals and assists
  const goalsScore = Math.min((stats.goals / Math.max(stats.matchesPlayed, 1)) * 50, 60);
  const assistsScore = Math.min((stats.assists / Math.max(stats.matchesPlayed, 1)) * 25, 40);
  
  return Math.round(goalsScore + assistsScore);
}

function calculateConsistency(player, matches) {
  if (matches.length < 3) return 50;
  
  const goalsByMatch = matches.map(match => calculatePlayerGoals(player, [match]));
  const avgGoals = goalsByMatch.reduce((sum, goals) => sum + goals, 0) / goalsByMatch.length;
  
  const variance = goalsByMatch.reduce((sum, goals) => sum + Math.pow(goals - avgGoals, 2), 0) / goalsByMatch.length;
  const consistency = Math.max(0, 100 - (variance * 20));
  
  return Math.round(consistency);
}

function calculateRecentForm(player, recentMatches) {
  if (recentMatches.length === 0) return 50;
  
  const recentGoals = recentMatches.reduce((sum, match) => sum + calculatePlayerGoals(player, [match]), 0);
  const formScore = Math.min((recentGoals / recentMatches.length) * 50, 100);
  
  return Math.round(formScore);
}

function calculateBestStreak(player, matches) {
  let bestStreak = 0;
  let currentStreak = 0;
  
  matches.forEach(match => {
    const goals = calculatePlayerGoals(player, [match]);
    if (goals > 0) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return bestStreak;
}

function generateAwards(stats, player) {
  const awards = [];
  
  // Use player parameter to add player-specific awards
  if (stats.goals >= 10) awards.push('Torjäger');
  if (stats.assists >= 5) awards.push('Assistkönig');
  if (stats.sdsCount >= 3) awards.push('Spieler des Spiels');
  if (parseFloat(stats.goalsPerGame) >= 1.0) awards.push('Treffsicher');
  if (player.team === 'AEK') awards.push('AEK Legende');
  if (player.team === 'Real') awards.push('Real Star');
  
  return awards;
}

function calculateTrends(player, matches) {
  // Generate weekly goal history for trends
  const goalsHistory = [];
  const weeks = Math.min(12, Math.ceil(matches.length / 3)); // Group matches into weeks
  
  for (let i = 0; i < weeks; i++) {
    const weekMatches = matches.slice(i * 3, (i + 1) * 3);
    const weekGoals = weekMatches.reduce((sum, match) => sum + calculatePlayerGoals(player, [match]), 0);
    
    goalsHistory.push({
      week: i + 1,
      goals: weekGoals,
      matches: weekMatches.length
    });
  }
  
  return { goalsHistory };
}

function calculateProgressions(player, matches) {
  const recentMatches = matches.slice(-5);
  const earlierMatches = matches.slice(-10, -5);
  
  const recentGoals = recentMatches.reduce((sum, match) => sum + calculatePlayerGoals(player, [match]), 0);
  const earlierGoals = earlierMatches.reduce((sum, match) => sum + calculatePlayerGoals(player, [match]), 0);
  
  const goalTrend = earlierGoals > 0 ? ((recentGoals - earlierGoals) / earlierGoals) * 100 : 0;
  
  return {
    currentForm: Math.round((recentGoals / Math.max(recentMatches.length, 1)) * 20),
    formTrend: goalTrend,
    goalRate: Math.round((recentGoals / Math.max(recentMatches.length, 1)) * 100),
    goalTrend: goalTrend,
    avgPlaytime: 90, // Placeholder
    playtimeTrend: 0,
    impactScore: Math.round(recentGoals * 10 + (player.assists || 0) * 5),
    impactTrend: goalTrend
  };
}

function generatePerformanceHeatmap(player, matches) {
  const heatmap = [];
  const weeks = 12;
  const playerName = player.name; // Use player parameter
  console.log('Generating heatmap for', playerName);
  
  for (let i = 0; i < weeks * 7; i++) {
    const dayIndex = Math.floor(i / 7);
    const matchesInWeek = matches.slice(dayIndex * 2, (dayIndex + 1) * 2);
    const performance = matchesInWeek.reduce((sum, match) => sum + calculatePlayerGoals(player, [match]), 0);
    
    heatmap.push({
      date: `W${Math.floor(i / 7) + 1}D${(i % 7) + 1}`,
      performance: Math.min(performance * 2, 10),
      intensity: Math.min(performance, 5)
    });
  }
  
  return heatmap;
}

function getHeatmapColor(intensity) {
  const colors = [
    'bg-gray-100',
    'bg-green-100',
    'bg-green-200', 
    'bg-green-300',
    'bg-green-400',
    'bg-green-500'
  ];
  return colors[Math.min(intensity, colors.length - 1)];
}