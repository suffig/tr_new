import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import LoadingSpinner from './LoadingSpinner';

export default function RecentActivity({ limit = 10, showTitle = true, onNavigate }) {
  const [filter, setFilter] = useState('all');
  
  // Fetch all data
  const { data: matches, loading: matchesLoading } = useSupabaseQuery(
    'matches', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery(
    'bans', 
    '*', 
    { order: { column: 'id', ascending: false } }
  );
  const { data: transactions, loading: transactionsLoading } = useSupabaseQuery(
    'transactions', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );

  const loading = matchesLoading || playersLoading || bansLoading || transactionsLoading;

  const recentActivities = useMemo(() => {
    if (!matches || !players || !bans || !transactions) return [];

    const activities = [];

    // Recent Matches
    matches?.slice(0, 5).forEach(match => {
      const date = new Date(match.date);
      activities.push({
        id: `match-${match.id}`,
        type: 'match',
        icon: '⚽',
        title: `AEK ${match.goalsa || 0} - ${match.goalsb || 0} Real`,
        description: match.sds ? `⭐ SdS: ${match.sds}` : 'Spiel gespielt',
        date: date,
        dateText: formatRelativeDate(date),
        action: () => onNavigate?.('matches', { highlightMatch: match.id })
      });
    });

    // Recent Bans
    bans?.slice(0, 3).forEach(ban => {
      const player = players.find(p => p.id === ban.player_id);
      const playerName = player?.name || ban.player_name || 'Unbekannt';
      const remaining = (ban.totalgames || 0) - (ban.matchesserved || 0);
      
      activities.push({
        id: `ban-${ban.id}`,
        type: 'ban',
        icon: '🚫',
        title: `Sperre: ${playerName}`,
        description: `${ban.type} • ${remaining > 0 ? `${remaining} Spiele verbleibend` : 'Abgelaufen'}`,
        date: new Date(), // Bans don't have creation date, use current
        dateText: 'Kürzlich',
        action: () => onNavigate?.('bans', { highlightBan: ban.id })
      });
    });

    // Recent Transactions
    transactions?.slice(0, 5).forEach(transaction => {
      const date = new Date(transaction.date);
      const amount = transaction.amount || 0;
      
      activities.push({
        id: `transaction-${transaction.id}`,
        type: 'transaction',
        icon: amount > 0 ? '💰' : '💸',
        title: `${amount > 0 ? '+' : ''}${amount}€`,
        description: transaction.description || transaction.type || 'Transaktion',
        date: date,
        dateText: formatRelativeDate(date),
        action: () => onNavigate?.('finanzen', { highlightTransaction: transaction.id })
      });
    });

    // Sort by date (most recent first)
    const sorted = activities.sort((a, b) => b.date - a.date);

    // Apply filter
    const filtered = filter === 'all' ? sorted : sorted.filter(activity => activity.type === filter);

    return filtered.slice(0, limit);
  }, [matches, players, bans, transactions, filter, limit, onNavigate]);

  const activityCounts = useMemo(() => {
    if (!matches || !bans || !transactions) return {};
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      matches: matches.filter(m => new Date(m.date) >= sevenDaysAgo).length,
      bans: bans.filter(b => {
        const remaining = (b.totalgames || 0) - (b.matchesserved || 0);
        return remaining > 0;
      }).length,
      transactions: transactions.filter(t => new Date(t.date) >= sevenDaysAgo).length
    };
  }, [matches, bans, transactions]);

  if (loading) {
    return <LoadingSpinner message="Lade Aktivitäten..." />;
  }

  return (
    <div className="bg-bg-primary border border-border-light rounded-lg shadow-sm">
      {showTitle && (
        <div className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Letzte Aktivitäten</h3>
            <div className="flex items-center gap-2">
              {/* Activity Summary */}
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200">
                  {activityCounts.matches || 0} Spiele (7T)
                </span>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200">
                  {activityCounts.bans || 0} aktive Sperren
                </span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200">
                  {activityCounts.transactions || 0} Transaktionen (7T)
                </span>
              </div>
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 mt-3">
            {[
              { key: 'all', label: 'Alle', count: recentActivities.length },
              { key: 'match', label: 'Spiele', count: recentActivities.filter(a => a.type === 'match').length },
              { key: 'transaction', label: 'Finanzen', count: recentActivities.filter(a => a.type === 'transaction').length },
              { key: 'ban', label: 'Sperren', count: recentActivities.filter(a => a.type === 'ban').length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                  filter === key
                    ? 'bg-primary-green text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                {label} {count > 0 && `(${count})`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-border-light">
        {recentActivities.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <div className="text-4xl mb-2" aria-hidden="true">📊</div>
            <p>Keine Aktivitäten gefunden</p>
            <p className="text-sm mt-1">
              {filter === 'all' ? 'Beginne Daten hinzuzufügen' : `Keine ${filter === 'match' ? 'Spiele' : filter === 'transaction' ? 'Transaktionen' : 'Sperren'} gefunden`}
            </p>
          </div>
        ) : (
          recentActivities.map((activity) => (
            <button
              key={activity.id}
              onClick={activity.action}
              className="w-full p-4 text-left hover:bg-bg-secondary transition-colors duration-200 focus:outline-none focus:bg-bg-secondary"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-text-primary truncate">{activity.title}</h4>
                    <span className="text-xs text-text-secondary whitespace-nowrap ml-2">
                      {activity.dateText}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">{activity.description}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {recentActivities.length > 0 && showTitle && (
        <div className="p-3 border-t border-border-light bg-bg-secondary">
          <div className="text-center">
            <button 
              onClick={() => onNavigate?.('stats')}
              className="text-sm text-primary-green hover:text-primary-green-dark transition-colors duration-200"
            >
              Alle Statistiken anzeigen →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Gerade eben';
  if (diffInMinutes < 60) return `vor ${diffInMinutes}m`;
  if (diffInHours < 24) return `vor ${diffInHours}h`;
  if (diffInDays < 7) return `vor ${diffInDays}d`;
  if (diffInDays < 30) return `vor ${Math.floor(diffInDays / 7)}w`;
  
  return date.toLocaleDateString('de-DE', { 
    day: 'numeric', 
    month: 'short'
  });
}