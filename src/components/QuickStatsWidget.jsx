import { useState, useEffect } from 'react';

export default function QuickStatsWidget() {
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

  const loadQuickStats = async () => {
    try {
      // Simulate data loading (in real app, this would come from Supabase)
      // For now, use localStorage or mock data
      const mockStats = {
        totalMatches: 45,
        wins: 28,
        draws: 9,
        losses: 8,
        goalsFor: 89,
        goalsAgainst: 42,
        winRate: 62,
        loading: false
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error loading quick stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadQuickStats();
  }, []);

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

  return (
    <div className="modern-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">
          📊 Schnellstatistiken
        </h3>
        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded-full">
          Saison 2024
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
          <div className="text-xs text-text-secondary">Siege</div>
        </div>

        {/* Goals For */}
        <div className="text-center p-3 bg-system-blue/10 rounded-lg">
          <div className="text-xl font-bold text-system-blue">{stats.goalsFor}</div>
          <div className="text-xs text-text-secondary">Tore</div>
        </div>

        {/* Goal Difference */}
        <div className="text-center p-3 bg-system-orange/10 rounded-lg">
          <div className="text-xl font-bold text-system-orange">
            +{stats.goalsFor - stats.goalsAgainst}
          </div>
          <div className="text-xs text-text-secondary">Differenz</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Siege:</span>
          <span className="text-system-green font-medium">{stats.wins}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Unentschieden:</span>
          <span className="text-system-orange font-medium">{stats.draws}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Niederlagen:</span>
          <span className="text-system-red font-medium">{stats.losses}</span>
        </div>
      </div>

      {/* Performance Bar */}
      <div className="mt-4 pt-3 border-t border-border-light">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-secondary">Form:</span>
          <div className="flex gap-1">
            {['W', 'W', 'D', 'W', 'L'].map((result, index) => (
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
          Letzte 5 Spiele (neueste zuerst)
        </div>
      </div>
    </div>
  );
}