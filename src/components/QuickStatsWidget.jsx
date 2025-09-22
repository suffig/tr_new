import { useState, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';

export default function QuickStatsWidget() {
  const { data: matches } = useSupabaseQuery('matches', '*');
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    winRate: 0,
    loading: true
  });

  const loadQuickStats = () => {
    if (!matches || matches.length === 0) {
      setStats({
        totalMatches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        winRate: 0,
        loading: false
      });
      return;
    }

    // Calculate real statistics from matches data
    const totalMatches = matches.length;
    const aekWins = matches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
    const realWins = matches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;
    const draws = matches.filter(m => (m.goalsa || 0) === (m.goalsb || 0)).length;
    const totalGoalsFor = matches.reduce((sum, m) => sum + (m.goalsa || 0), 0);
    const totalGoalsAgainst = matches.reduce((sum, m) => sum + (m.goalsb || 0), 0);
    const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
    
    // Use AEK as primary team for statistics
    const winRate = totalMatches > 0 ? Math.round((aekWins / totalMatches) * 100) : 0;

    setStats({
      totalMatches,
      wins: aekWins,
      draws,
      losses: realWins, // Real wins = AEK losses
      goalsFor: totalGoalsFor,
      goalsAgainst: totalGoalsAgainst,
      totalGoals,
      winRate,
      loading: false
    });
  };

  useEffect(() => {
    loadQuickStats();
  }, [matches]);

  if (stats.loading) {
    return (
      <div className="modern-card p-4 animate-pulse">
        <div className="h-4 bg-bg-tertiary rounded mb-3"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-bg-tertiary rounded"></div>
          <div className="h-12 bg-bg-tertiary rounded"></div>
          <div className="h-12 bg-bg-tertiary rounded"></div>
          <div className="h-12 bg-bg-tertiary rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate recent form from last 5 matches
  const getRecentForm = () => {
    if (!matches || matches.length === 0) return [];
    
    const recentMatches = matches.slice(-5);
    return recentMatches.map(match => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;
      
      if (aekGoals > realGoals) return 'W';
      if (realGoals > aekGoals) return 'L';
      return 'D';
    });
  };

  const recentForm = getRecentForm();

  return (
    <div className="modern-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">
          📊 Liga-Statistiken
        </h3>
        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded-full">
          Gesamt
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Total Matches */}
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-text-primary">{stats.totalMatches}</div>
          <div className="text-xs text-text-secondary">Spiele</div>
        </div>

        {/* Win Rate */}
        <div className="text-center p-3 bg-system-green/10 rounded-lg">
          <div className="text-xl font-bold text-system-green">{stats.winRate}%</div>
          <div className="text-xs text-text-secondary">AEK Siege</div>
        </div>

        {/* Total Goals */}
        <div className="text-center p-3 bg-system-blue/10 rounded-lg">
          <div className="text-xl font-bold text-system-blue">{stats.totalGoals || stats.goalsFor + stats.goalsAgainst}</div>
          <div className="text-xs text-text-secondary">Gesamt Tore</div>
        </div>

        {/* Goal Difference */}
        <div className="text-center p-3 bg-system-orange/10 rounded-lg">
          <div className="text-xl font-bold text-system-orange">
            {stats.goalsFor - stats.goalsAgainst >= 0 ? '+' : ''}{stats.goalsFor - stats.goalsAgainst}
          </div>
          <div className="text-xs text-text-secondary">AEK Differenz</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">AEK Siege:</span>
          <span className="text-system-green font-medium">{stats.wins}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Unentschieden:</span>
          <span className="text-system-orange font-medium">{stats.draws}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Real Siege:</span>
          <span className="text-system-red font-medium">{stats.losses}</span>
        </div>
      </div>

      {/* Performance Bar */}
      {recentForm.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-text-secondary">Form:</span>
            <div className="flex gap-1">
              {recentForm.map((result, index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${
                    result === 'W' ? 'bg-system-green text-white' :
                    result === 'D' ? 'bg-system-orange text-white' :
                    'bg-system-red text-white'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-text-muted">
            Letzte {recentForm.length} Spiele (neueste zuerst)
          </div>
        </div>
      )}
    </div>
  );
}