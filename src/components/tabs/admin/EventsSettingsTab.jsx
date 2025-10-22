import { useState } from 'react';
import { triggerNotification } from '../../NotificationSystem';

export default function EventsSettingsTab() {
  const [eventsEnabled, setEventsEnabled] = useState(() => {
    const saved = localStorage.getItem('eventsTabEnabled');
    return saved !== null ? JSON.parse(saved) : false; // Default hidden
  });
  
  const [customNotification, setCustomNotification] = useState({
    title: '',
    message: '',
    type: 'general'
  });

  const [savedEvents, setSavedEvents] = useState(() => {
    const saved = localStorage.getItem('customEvents');
    return saved ? JSON.parse(saved) : [];
  });

  // Save events tab setting
  const toggleEventsTab = (enabled) => {
    setEventsEnabled(enabled);
    localStorage.setItem('eventsTabEnabled', JSON.stringify(enabled));
    
    // Trigger page reload to update navigation
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Send custom notification
  const sendCustomNotification = () => {
    if (!customNotification.title || !customNotification.message) {
      alert('Bitte Titel und Nachricht eingeben');
      return;
    }

    triggerNotification(customNotification.type, {
      title: customNotification.title,
      message: customNotification.message,
      timestamp: new Date().toISOString(),
      custom: true
    });

    // Save to history
    const newEvent = {
      id: Date.now(),
      ...customNotification,
      timestamp: new Date().toISOString()
    };
    
    const updatedEvents = [newEvent, ...savedEvents.slice(0, 9)];
    setSavedEvents(updatedEvents);
    localStorage.setItem('customEvents', JSON.stringify(updatedEvents));

    // Reset form
    setCustomNotification({
      title: '',
      message: '',
      type: 'general'
    });

    alert('Benachrichtigung gesendet!');
  };

  const notificationTypes = [
    { value: 'general', label: '📢 Allgemein', color: 'bg-gray-500' },
    { value: 'match-created', label: '⚽ Spiel erstellt', color: 'bg-green-500' },
    { value: 'player-ban', label: '🚫 Spieler gesperrt', color: 'bg-red-500' },
    { value: 'financial-milestone', label: '💰 Finanzmeilenstein', color: 'bg-yellow-500' },
    { value: 'achievement-unlocked', label: '🏅 Achievement', color: 'bg-purple-500' },
    { value: 'system-update', label: '🔄 System Update', color: 'bg-blue-500' }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Events Tab Toggle */}
      <div className="modern-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <span className="mr-2">🎉</span>
          Events Tab Konfiguration
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-border-light">
            <div>
              <div className="font-medium text-text-primary">Events Tab anzeigen</div>
              <div className="text-sm text-text-muted">
                Zeigt den Events Tab in der Navigation an oder blendet ihn aus
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={eventsEnabled}
                onChange={(e) => toggleEventsTab(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Hinweis:</strong> Der Events Tab ist standardmäßig ausgeblendet. 
              Nach dem Aktivieren wird die Seite neu geladen um die Navigation zu aktualisieren.
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Notifications */}
      <div className="modern-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <span className="mr-2">🚀</span>
          Schnell-Tests für Push-Benachrichtigungen
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => triggerNotification('match-result', {
              goalsa: 3,
              goalsb: 1,
              manofthematch: 'Max Müller',
              date: new Date().toISOString()
            })}
            className="btn-secondary text-sm py-3 px-4 card-hover-lift btn-spring-press flex items-center justify-center gap-2"
          >
            <span>⚽</span>
            Spielergebnis-Test
          </button>
          
          <button
            onClick={() => triggerNotification('player-ban', {
              playerName: 'Tom Schmidt',
              games: 3
            })}
            className="btn-secondary text-sm py-3 px-4 card-hover-lift btn-spring-press flex items-center justify-center gap-2"
          >
            <span>🚫</span>
            Spieler-Sperre
          </button>
          
          <button
            onClick={() => triggerNotification('financial-milestone', {
              team: getTeamDisplay('AEK'),
              amount: 250
            })}
            className="btn-secondary text-sm py-3 px-4 card-hover-lift btn-spring-press flex items-center justify-center gap-2"
          >
            <span>💰</span>
            Finanzmeilenstein
          </button>
          
          <button
            onClick={() => triggerNotification('achievement-unlocked', {
              name: 'Torjäger',
              description: '10 Tore in einer Saison'
            })}
            className="btn-secondary text-sm py-3 px-4 card-hover-lift btn-spring-press flex items-center justify-center gap-2"
          >
            <span>🏅</span>
            Achievement
          </button>
          
          <button
            onClick={() => triggerNotification('system-update', {
              message: 'Neue Funktionen verfügbar!'
            })}
            className="btn-secondary text-sm py-3 px-4 card-hover-lift btn-spring-press flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            System-Update
          </button>
          
          <button
            onClick={() => {
              // Send multiple notifications to test stacking
              setTimeout(() => triggerNotification('match-created', { date: new Date().toISOString() }), 0);
              setTimeout(() => triggerNotification('player-ban', { playerName: 'Test Player', games: 1 }), 300);
              setTimeout(() => triggerNotification('financial-milestone', { team: getTeamDisplay('Real'), amount: 100 }), 600);
            }}
            className="btn-secondary text-sm py-3 px-4 card-hover-lift btn-spring-press flex items-center justify-center gap-2"
          >
            <span>📚</span>
            Mehrere Tests
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tipp:</strong> Diese Buttons testen die neuen Push-Up Benachrichtigungen mit realistischen Daten und Animationen.
          </div>
        </div>
      </div>

      {/* Custom Notifications */}
      <div className="modern-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <span className="mr-2">📢</span>
          Individuelle Push-Benachrichtigungen
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nachrichtentyp
            </label>
            <select
              value={customNotification.type}
              onChange={(e) => setCustomNotification(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
            >
              {notificationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Titel
            </label>
            <input
              type="text"
              value={customNotification.title}
              onChange={(e) => setCustomNotification(prev => ({ ...prev, title: e.target.value }))}
              placeholder="z.B. Neues Tournament startet"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nachricht
            </label>
            <textarea
              value={customNotification.message}
              onChange={(e) => setCustomNotification(prev => ({ ...prev, message: e.target.value }))}
              placeholder="z.B. Das Weihnachts-Tournament beginnt morgen um 19:00 Uhr!"
              rows={3}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors resize-none"
            />
          </div>

          <button
            onClick={sendCustomNotification}
            disabled={!customNotification.title || !customNotification.message}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-paper-plane mr-2"></i>
            Benachrichtigung senden
          </button>
        </div>
      </div>

      {/* Notification History */}
      {savedEvents.length > 0 && (
        <div className="modern-card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Gesendete Benachrichtigungen
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {savedEvents.map(event => (
              <div key={event.id} className="p-3 bg-bg-secondary rounded-lg border border-border-light">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-text-primary text-sm flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        notificationTypes.find(t => t.value === event.type)?.color || 'bg-gray-500'
                      }`}></span>
                      {event.title}
                    </div>
                    <div className="text-xs text-text-muted mt-1">{event.message}</div>
                    <div className="text-xs text-text-muted mt-1">
                      {new Date(event.timestamp).toLocaleString('de-DE')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {savedEvents.length >= 10 && (
            <div className="text-xs text-text-muted mt-2 text-center">
              Nur die letzten 10 Benachrichtigungen werden angezeigt
            </div>
          )}
        </div>
      )}
    </div>
  );
}