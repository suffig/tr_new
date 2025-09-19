import { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import toast from 'react-hot-toast';

export default function SmartNotifications({ onNavigate }) {
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fifa-tracker-dismissed-notifications') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch data for analysis
  const { data: matches } = useSupabaseQuery(
    'matches', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: players } = useSupabaseQuery('players', '*');
  const { data: bans } = useSupabaseQuery('bans', '*');
  const { data: transactions } = useSupabaseQuery(
    'transactions', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: finances } = useSupabaseQuery('finances', '*');

  // Generate smart notifications
  const notifications = useMemo(() => {
    if (!matches || !players || !bans || !transactions || !finances) return [];

    const alerts = [];
    const now = new Date();

    // 1. Upcoming ban expirations
    bans.forEach(ban => {
      const remaining = (ban.totalgames || 0) - (ban.matchesserved || 0);
      if (remaining === 1) {
        const player = players.find(p => p.id === ban.player_id);
        const playerName = player?.name || ban.player_name || 'Unbekannt';
        
        alerts.push({
          id: `ban-expiring-${ban.id}`,
          type: 'warning',
          priority: 'high',
          icon: '⚠️',
          title: 'Sperre läuft bald aus',
          message: `${playerName} ist nach dem nächsten Spiel wieder spielberechtigt`,
          action: () => onNavigate?.('bans', { highlightBan: ban.id }),
          actionLabel: 'Sperren anzeigen'
        });
      }
    });

    // 2. Financial alerts
    const aekFinances = finances.find(f => f.team === 'AEK') || { balance: 0 };
    const realFinances = finances.find(f => f.team === 'Real') || { balance: 0 };

    if (aekFinances.balance < 0) {
      alerts.push({
        id: 'aek-negative-balance',
        type: 'error',
        priority: 'high',
        icon: '💸',
        title: 'AEK im Minus',
        message: `AEK hat einen negativen Kontostand von ${aekFinances.balance}€`,
        action: () => onNavigate?.('finanzen'),
        actionLabel: 'Finanzen verwalten'
      });
    }

    if (realFinances.balance < 0) {
      alerts.push({
        id: 'real-negative-balance',
        type: 'error',
        priority: 'high',
        icon: '💸',
        title: 'Real im Minus',
        message: `Real hat einen negativen Kontostand von ${realFinances.balance}€`,
        action: () => onNavigate?.('finanzen'),
        actionLabel: 'Finanzen verwalten'
      });
    }

    // 3. Team balance alerts
    const aekPlayers = players.filter(p => p.team === 'AEK');
    const realPlayers = players.filter(p => p.team === 'Real');
    const playerDifference = Math.abs(aekPlayers.length - realPlayers.length);

    if (playerDifference >= 3) {
      const largerTeam = aekPlayers.length > realPlayers.length ? 'AEK' : 'Real';
      const smallerTeam = aekPlayers.length > realPlayers.length ? 'Real' : 'AEK';
      
      alerts.push({
        id: 'team-imbalance',
        type: 'warning',
        priority: 'medium',
        icon: '⚖️',
        title: 'Team-Ungleichgewicht',
        message: `${largerTeam} hat ${playerDifference} Spieler mehr als ${smallerTeam}`,
        action: () => onNavigate?.('squad'),
        actionLabel: 'Kader ausgleichen'
      });
    }

    // 4. Recent performance alerts
    const recentMatches = matches.slice(0, 5);
    if (recentMatches.length >= 3) {
      const aekWins = recentMatches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
      const realWins = recentMatches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;

      if (aekWins === recentMatches.length) {
        alerts.push({
          id: 'aek-winning-streak',
          type: 'success',
          priority: 'low',
          icon: '🔥',
          title: 'AEK Siegesserie!',
          message: `AEK hat die letzten ${aekWins} Spiele gewonnen`,
          action: () => onNavigate?.('stats'),
          actionLabel: 'Statistiken anzeigen'
        });
      } else if (realWins === recentMatches.length) {
        alerts.push({
          id: 'real-winning-streak',
          type: 'success',
          priority: 'low',
          icon: '🔥',
          title: 'Real Siegesserie!',
          message: `Real hat die letzten ${realWins} Spiele gewonnen`,
          action: () => onNavigate?.('stats'),
          actionLabel: 'Statistiken anzeigen'
        });
      }
    }

    // 5. High-value transfers needed
    const aekValue = aekPlayers.reduce((sum, p) => sum + (p.value || 0), 0);
    const realValue = realPlayers.reduce((sum, p) => sum + (p.value || 0), 0);
    const valueDifference = Math.abs(aekValue - realValue);

    if (valueDifference > 50) { // 50M € difference
      const higherTeam = aekValue > realValue ? 'AEK' : 'Real';
      const lowerTeam = aekValue > realValue ? 'Real' : 'AEK';
      
      alerts.push({
        id: 'value-imbalance',
        type: 'info',
        priority: 'medium',
        icon: '💎',
        title: 'Marktwert-Ungleichgewicht',
        message: `${higherTeam} ist ${valueDifference.toFixed(1)}M € wertvoller als ${lowerTeam}`,
        action: () => onNavigate?.('squad'),
        actionLabel: 'Transfer-Tipps anzeigen'
      });
    }

    // 6. Missing recent activity
    const daysSinceLastMatch = matches.length > 0 
      ? Math.floor((now - new Date(matches[0].date)) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceLastMatch > 7) {
      alerts.push({
        id: 'no-recent-matches',
        type: 'info',
        priority: 'low',
        icon: '⚽',
        title: 'Lange kein Spiel',
        message: `Das letzte Spiel war vor ${daysSinceLastMatch} Tagen`,
        action: () => onNavigate?.('matches', { action: 'add' }),
        actionLabel: 'Spiel hinzufügen'
      });
    }

    // Filter out dismissed notifications
    return alerts.filter(alert => !dismissedNotifications.includes(alert.id));
  }, [matches, players, bans, transactions, finances, dismissedNotifications, onNavigate]);

  // Persist dismissed notifications
  useEffect(() => {
    localStorage.setItem('fifa-tracker-dismissed-notifications', JSON.stringify(dismissedNotifications));
  }, [dismissedNotifications]);

  // Show toast notifications for high priority alerts
  useEffect(() => {
    const highPriorityAlerts = notifications.filter(n => n.priority === 'high');
    
    highPriorityAlerts.forEach(alert => {
      const toastId = `toast-${alert.id}`;
      
      if (!sessionStorage.getItem(toastId)) {
        toast(alert.message, {
          icon: alert.icon,
          duration: 8000,
          position: 'top-center'
        });
        
        sessionStorage.setItem(toastId, 'shown');
      }
    });
  }, [notifications]);

  const dismissNotification = (notificationId) => {
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  const clearAllNotifications = () => {
    setDismissedNotifications(prev => [...prev, ...notifications.map(n => n.id)]);
  };

  if (notifications.length === 0) {
    return null;
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
      default:
        return '🔵';
    }
  };

  return (
    <div className="bg-bg-primary border border-border-light rounded-lg shadow-sm">
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span aria-hidden="true">🔔</span>
            Smart Notifications
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {notifications.length} aktiv
            </span>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors duration-200"
                title="Alle verwerfen"
              >
                Alle verwerfen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-border-light max-h-80 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 ${getTypeStyles(notification.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1">
                <span className="text-lg" aria-hidden="true">{notification.icon}</span>
                <span className="text-xs" title={`Priorität: ${notification.priority}`}>
                  {getPriorityIndicator(notification.priority)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1">{notification.title}</h4>
                <p className="text-sm mb-3">{notification.message}</p>
                
                <div className="flex items-center gap-2">
                  {notification.action && (
                    <button
                      onClick={notification.action}
                      className="text-sm bg-white bg-opacity-80 hover:bg-opacity-100 px-3 py-1 rounded border transition-colors duration-200"
                    >
                      {notification.actionLabel}
                    </button>
                  )}
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="text-sm opacity-60 hover:opacity-100 transition-opacity duration-200"
                  >
                    Verwerfen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}