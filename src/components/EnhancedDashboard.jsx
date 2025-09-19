import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import LoadingSpinner from './LoadingSpinner';
import RecentActivity from './RecentActivity';

export default function EnhancedDashboard({ onNavigate }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  
  // Fetch all data
  const { data: matches, loading: matchesLoading } = useSupabaseQuery(
    'matches', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');
  const { data: transactions, loading: transactionsLoading } = useSupabaseQuery(
    'transactions', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: finances, loading: financesLoading } = useSupabaseQuery('finances', '*');

  const loading = matchesLoading || playersLoading || bansLoading || transactionsLoading || financesLoading;

  // Calculate insights
  const insights = useMemo(() => {
    if (!matches || !players || !bans || !transactions || !finances) return null;

    const now = new Date();
    const timeframes = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      all: new Date(0)
    };

    const filterDate = timeframes[selectedTimeframe] || timeframes.all;
    
    // Filter data by timeframe
    const filteredMatches = matches.filter(m => new Date(m.date) >= filterDate);
    const filteredTransactions = transactions.filter(t => new Date(t.date) >= filterDate);

    // Team Records
    const teamRecords = {
      AEK: { wins: 0, losses: 0, goals: 0, goalsAgainst: 0 },
      Real: { wins: 0, losses: 0, goals: 0, goalsAgainst: 0 }
    };

    filteredMatches.forEach(match => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;
      
      teamRecords.AEK.goals += aekGoals;
      teamRecords.AEK.goalsAgainst += realGoals;
      teamRecords.Real.goals += realGoals;
      teamRecords.Real.goalsAgainst += aekGoals;

      if (aekGoals > realGoals) {
        teamRecords.AEK.wins++;
        teamRecords.Real.losses++;
      } else if (realGoals > aekGoals) {
        teamRecords.Real.wins++;
        teamRecords.AEK.losses++;
      }
    });

    // Player Stats
    const playerStats = {};
    players.forEach(player => {
      playerStats[player.id] = {
        name: player.name,
        team: player.team,
        goals: 0,
        matches: 0,
        value: player.value || 0
      };
    });

    filteredMatches.forEach(match => {
      // Count goals for each player
      ['goalscorer1a', 'goalscorer2a', 'goalscorer3a', 'goalscorer4a', 'goalscorer5a'].forEach(scorer => {
        if (match[scorer] && playerStats[match[scorer]]) {
          playerStats[match[scorer]].goals++;
          playerStats[match[scorer]].matches++;
        }
      });
      ['goalscorer1b', 'goalscorer2b', 'goalscorer3b', 'goalscorer4b', 'goalscorer5b'].forEach(scorer => {
        if (match[scorer] && playerStats[match[scorer]]) {
          playerStats[match[scorer]].goals++;
          playerStats[match[scorer]].matches++;
        }
      });
    });

    // Financial Summary
    const aekFinances = finances.find(f => f.team === 'AEK') || { balance: 0 };
    const realFinances = finances.find(f => f.team === 'Real') || { balance: 0 };
    
    const totalIncome = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Ban Statistics
    const activeBans = bans.filter(ban => {
      const remaining = (ban.totalgames || 0) - (ban.matchesserved || 0);
      return remaining > 0;
    });

    const teamBans = {
      AEK: activeBans.filter(ban => {
        const player = players.find(p => p.id === ban.player_id);
        return player?.team === 'AEK';
      }).length,
      Real: activeBans.filter(ban => {
        const player = players.find(p => p.id === ban.player_id);
        return player?.team === 'Real';
      }).length
    };

    // Top Players
    const sortedPlayers = Object.values(playerStats)
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);

    return {
      teamRecords,
      playerStats: sortedPlayers,
      finances: {
        aek: aekFinances.balance || 0,
        real: realFinances.balance || 0,
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses
      },
      bans: {
        active: activeBans.length,
        aek: teamBans.AEK,
        real: teamBans.Real
      },
      totals: {
        matches: filteredMatches.length,
        players: players.length,
        transactions: filteredTransactions.length
      }
    };
  }, [matches, players, bans, transactions, finances, selectedTimeframe]);

  if (loading) {
    return <LoadingSpinner message="Lade Dashboard..." />;
  }

  if (!insights) {
    return (
      <div className="p-6 text-center text-text-secondary">
        <div className="text-4xl mb-2" aria-hidden="true">📊</div>
        <p>Keine Daten verfügbar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">Dashboard</h2>
        <div className="flex gap-2">
          {[
            { key: 'week', label: 'Woche' },
            { key: 'month', label: 'Monat' },
            { key: 'all', label: 'Gesamt' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedTimeframe(key)}
              className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                selectedTimeframe === key
                  ? 'bg-primary-green text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon="⚽"
          title="Spiele"
          value={insights.totals.matches}
          subtitle={selectedTimeframe === 'all' ? 'Gesamt' : 'Im Zeitraum'}
          color="blue"
          onClick={() => onNavigate?.('matches')}
        />
        <MetricCard
          icon="👥"
          title="Spieler"
          value={insights.totals.players}
          subtitle="Aktive Spieler"
          color="green"
          onClick={() => onNavigate?.('squad')}
        />
        <MetricCard
          icon="⚽"
          title="Tore"
          value={insights.teamRecords.AEK.goals + insights.teamRecords.Real.goals}
          subtitle={selectedTimeframe === 'all' ? 'Gesamt' : 'Im Zeitraum'}
          color="green"
          onClick={() => onNavigate?.('matches')}
        />
        <MetricCard
          icon="🚫"
          title="Sperren"
          value={insights.bans.active}
          subtitle="Aktive Sperren"
          color="red"
          onClick={() => onNavigate?.('bans')}
        />
      </div>

      {/* Team Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-bg-primary border border-border-light rounded-lg shadow-sm">
          <div className="p-4 border-b border-border-light">
            <h3 className="text-lg font-semibold text-text-primary">Team-Vergleich</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {/* AEK */}
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">🔵</span>
                  <div>
                    <div className="font-semibold text-blue-900">AEK</div>
                    <div className="text-sm text-blue-700">
                      {insights.teamRecords.AEK.wins}S / {insights.teamRecords.AEK.losses}N
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-900">
                    {insights.teamRecords.AEK.goals}:{insights.teamRecords.AEK.goalsAgainst}
                  </div>
                  <div className="text-sm text-blue-700">
                    {insights.bans.aek} Sperren
                  </div>
                </div>
              </div>

              {/* Real */}
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">🔴</span>
                  <div>
                    <div className="font-semibold text-red-900">Real</div>
                    <div className="text-sm text-red-700">
                      {insights.teamRecords.Real.wins}S / {insights.teamRecords.Real.losses}N
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-900">
                    {insights.teamRecords.Real.goals}:{insights.teamRecords.Real.goalsAgainst}
                  </div>
                  <div className="text-sm text-red-700">
                    {insights.bans.real} Sperren
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Scorers */}
        <div className="bg-bg-primary border border-border-light rounded-lg shadow-sm">
          <div className="p-4 border-b border-border-light">
            <h3 className="text-lg font-semibold text-text-primary">Top Torschützen</h3>
          </div>
          <div className="p-4">
            {insights.playerStats.length === 0 ? (
              <div className="text-center text-text-secondary py-4">
                <div className="text-2xl mb-2" aria-hidden="true">⚽</div>
                <p>Keine Tore im Zeitraum</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.playerStats.map((player, index) => (
                  <div key={player.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-green text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className={player.team === 'AEK' ? 'text-blue-600' : 'text-red-600'}>
                        {player.team === 'AEK' ? '🔵' : '🔴'}
                      </span>
                      <div>
                        <div className="font-medium text-text-primary">{player.name}</div>
                        <div className="text-sm text-text-secondary">{player.value?.toFixed(1)}M €</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-text-primary">{player.goals} Tore</div>
                      <div className="text-sm text-text-secondary">{player.matches} Spiele</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity onNavigate={onNavigate} limit={5} />
    </div>
  );
}

function MetricCard({ icon, title, value, subtitle, color = 'gray', onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${colorClasses[color]} ${
        onClick ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <div className="text-left">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-75">{title}</div>
          <div className="text-xs opacity-60">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}