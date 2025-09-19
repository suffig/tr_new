import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Enhanced push-up notification system for FIFA Tracker
export default function NotificationSystem({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(false);
  // const [isVisible, setIsVisible] = useState(true); // Currently unused
  const notificationId = useRef(0);

  // Enhanced notification function with better animations
  const showNotification = useCallback((type, data) => {
    const id = ++notificationId.current;
    const notification = {
      id,
      type,
      title: getNotificationTitle(type, data),
      message: getNotificationMessage(type, data),
      timestamp: new Date(),
      read: false,
      data,
      exitAnimation: false
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep max 10 notifications

    // Show browser notification if enabled and document is hidden (iOS compatible)
    if (isEnabled && document.hidden) {
      try {
        // iOS Safari has different behavior, so we use a more compatible approach
        const notificationOptions = {
          body: notification.message,
          icon: '/tr_new/assets/icon-180.png', // Updated path for subdir
          badge: '/tr_new/assets/icon-180.png',
          tag: `fifa-tracker-${type}-${id}`,
          requireInteraction: type === 'match-result' || type === 'match-created', // Keep match notifications visible
          silent: false,
          timestamp: Date.now(),
          data: {
            type,
            matchId: data?.matchId,
            url: getNotificationUrl(type, data)
          }
        };

        // Only add vibrate for non-iOS devices
        if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          notificationOptions.vibrate = [200, 100, 200];
        }

        const browserNotification = new Notification(notification.title, notificationOptions);
        
        // Handle notification click for navigation
        browserNotification.onclick = () => {
          window.focus();
          // Navigate to appropriate page
          if (type === 'match-created' && data?.matchId) {
            // This would need to be handled by the main app navigation
            window.dispatchEvent(new CustomEvent('notification-navigate', {
              detail: { type, data }
            }));
          }
          browserNotification.close();
        };
      } catch (error) {
        console.warn('Failed to show browser notification:', error);
      }
    }

    // Enhanced auto-remove with exit animation
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, exitAnimation: true } : n)
      );
      
      // Remove after exit animation completes
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 300);
    }, 4000);
  }, [isEnabled]);

  // Initialize notification system
  useEffect(() => {
    // Check if notifications are supported and request permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setIsEnabled(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setIsEnabled(permission === 'granted');
        });
      }
    }

    // Listen for custom events to trigger notifications
    const handleNotificationEvent = (event) => {
      const { type, data } = event.detail;
      showNotification(type, data);
    };

    window.addEventListener('fifa-notification', handleNotificationEvent);
    return () => window.removeEventListener('fifa-notification', handleNotificationEvent);
  }, [showNotification]);

  const getNotificationUrl = (type, data) => {
    switch (type) {
      case 'match-created':
      case 'match-result':
        return `/tr_new/#matches${data?.matchId ? `?match=${data.matchId}` : ''}`;
      case 'player-ban':
        return `/tr_new/#bans${data?.banId ? `?ban=${data.banId}` : ''}`;
      case 'financial-milestone':
        return `/tr_new/#finances${data?.team ? `?team=${data.team}` : ''}`;
      case 'achievement-unlocked':
        return `/tr_new/#stats${data?.achievementId ? `?achievement=${data.achievementId}` : ''}`;
      default:
        return '/tr_new/#matches';
    }
  };

  const getNotificationTitle = (type, data) => {
    switch (type) {
      case 'match-created':
        return '⚽ Neues Spiel erstellt';
      case 'match-result':
        return `🏆 Spielergebnis: AEK ${data.goalsa} - ${data.goalsb} Real`;
      case 'player-ban':
        return '🚫 Spieler gesperrt';
      case 'financial-milestone':
        return '💰 Finanzmeilenstein erreicht';
      case 'achievement-unlocked':
        return '🏅 Achievement freigeschaltet';
      case 'system-update':
        return '🔄 System aktualisiert';
      default:
        return '📢 FIFA Tracker';
    }
  };

  const getNotificationMessage = (type, data) => {
    switch (type) {
      case 'match-created': {
        const matchResult = `AEK ${data.goalsa || 0} - ${data.goalsb || 0} Real`;
        const motmText = data.manofthematch ? ` • SdS: ${data.manofthematch}` : '';
        return `${matchResult} vom ${new Date(data.date).toLocaleDateString('de-DE')}${motmText}`;
      }
      case 'match-result':
        return data.manofthematch ? `Spieler des Spiels: ${data.manofthematch}` : 'Spiel beendet';
      case 'player-ban':
        return `${data.playerName} wurde für ${data.games} Spiele gesperrt`;
      case 'financial-milestone':
        return `${data.team} hat ${data.amount}M € erreicht`;
      case 'achievement-unlocked':
        return `"${data.name}" - ${data.description}`;
      case 'system-update':
        return data.message || 'Die Anwendung wurde aktualisiert';
      default:
        return 'Neue Aktivität im FIFA Tracker';
    }
  };

  const dismissNotification = (id, immediate = false) => {
    if (immediate) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, exitAnimation: true } : n)
      );
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 300);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!onNavigate) return;

    switch (notification.type) {
      case 'match-created':
        // Navigate to matches tab and highlight the new match
        onNavigate('matches', { 
          scrollToTop: true,
          highlightMatch: notification.data?.matchId || 'latest'
        });
        break;
      case 'match-result':
        // Navigate to matches tab and show the specific match details
        onNavigate('matches', { 
          expandMatch: notification.data?.matchId,
          scrollToMatch: notification.data?.matchId
        });
        break;
      case 'player-ban':
        // Navigate to bans tab and highlight the ban
        onNavigate('bans', { 
          highlightBan: notification.data?.banId,
          filterByPlayer: notification.data?.playerName
        });
        break;
      case 'financial-milestone':
        // Navigate to finances tab
        onNavigate('finances', { 
          team: notification.data?.team?.toLowerCase(),
          showMilestone: true
        });
        break;
      case 'achievement-unlocked':
        // Navigate to stats tab
        onNavigate('stats', { 
          highlightAchievement: notification.data?.achievementId
        });
        break;
      default:
        // Default navigation to matches
        onNavigate('matches');
        break;
    }

    // Auto-dismiss notification after navigation
    setTimeout(() => {
      dismissNotification(notification.id);
    }, 1000);
  };

  const clearAll = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`
            pointer-events-auto w-full bg-bg-elevated backdrop-blur-lg rounded-ios-lg border border-border-light
            transform transition-all duration-300 ease-out
            ${notification.exitAnimation ? 'push-notification-exit' : 'push-notification'}
            ${notification.read ? 'opacity-70' : 'opacity-100'}
            hover:scale-105 hover:shadow-floating
            shadow-ios-lg cursor-pointer
          `}
          onClick={() => {
            setNotifications(prev => 
              prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
            );
            handleNotificationClick(notification);
          }}
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 relative">
                <div className={`
                  w-4 h-4 rounded-full mt-0.5 shadow-sm
                  ${notification.read ? 'bg-text-tertiary' : getNotificationColor(notification.type)}
                  ${!notification.read ? 'notification-badge-pulse' : ''}
                `} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-footnote font-semibold text-text-primary leading-tight">
                  {notification.title}
                </p>
                <p className="mt-1 text-caption1 text-text-secondary leading-tight">
                  {notification.message}
                </p>
                <p className="mt-2 text-caption2 text-text-tertiary">
                  {notification.timestamp.toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notification.id);
                }}
                className="ml-2 flex-shrink-0 text-text-tertiary hover:text-text-secondary transition-colors duration-200 p-1 rounded-full hover:bg-bg-tertiary icon-bounce-hover"
                aria-label="Benachrichtigung schließen"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>
          </div>
          
          {/* Subtle bottom border for visual separation */}
          <div className={`h-0.5 bg-gradient-to-r ${getNotificationGradient(notification.type)} opacity-60`} />
        </div>
      ))}
      
      {/* Enhanced clear all button */}
      {notifications.length > 1 && (
        <div className="pointer-events-auto flex justify-end pt-2">
          <button
            onClick={clearAll}
            className="text-caption1 text-text-secondary hover:text-text-primary bg-bg-elevated backdrop-blur-sm px-3 py-1.5 rounded-ios shadow-sm border border-border-light hover:shadow-md transition-all duration-200 btn-spring-press"
          >
            <i className="fas fa-trash-alt mr-1 text-xs" />
            Alle löschen
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

const getNotificationColor = (type) => {
  switch (type) {
    case 'match-created':
    case 'match-result':
      return 'bg-system-green';
    case 'player-ban':
      return 'bg-system-red';
    case 'financial-milestone':
      return 'bg-system-yellow';
    case 'achievement-unlocked':
      return 'bg-system-purple';
    case 'system-update':
      return 'bg-system-blue';
    default:
      return 'bg-system-blue';
  }
};

const getNotificationGradient = (type) => {
  switch (type) {
    case 'match-created':
    case 'match-result':
      return 'from-system-green to-system-green-light';
    case 'player-ban':
      return 'from-system-red to-system-red-light';
    case 'financial-milestone':
      return 'from-system-yellow to-system-orange';
    case 'achievement-unlocked':
      return 'from-system-purple to-system-purple-light';
    case 'system-update':
      return 'from-system-blue to-system-blue-light';
    default:
      return 'from-system-blue to-system-blue-light';
  }
};

// Helper function to trigger notifications from anywhere in the app
export const triggerNotification = (type, data) => {
  const event = new CustomEvent('fifa-notification', {
    detail: { type, data }
  });
  window.dispatchEvent(event);
};