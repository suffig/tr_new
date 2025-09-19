import { useState, useEffect } from 'react';
import { notificationService } from '../services/NotificationService';

export default function NotificationSettings() {
  const [status, setStatus] = useState(notificationService.getStatus());
  const [settings, setSettings] = useState(notificationService.settings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update status when component mounts
    setStatus(notificationService.getStatus());
    setSettings(notificationService.settings);
  }, []);

  const handlePermissionRequest = async () => {
    setIsLoading(true);
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await notificationService.subscribe();
      }
      setStatus(notificationService.getStatus());
    } catch (error) {
      console.error('Permission request failed:', error);
      // Show error toast
      const event = new CustomEvent('show-toast', {
        detail: { 
          message: 'Benachrichtigungen konnten nicht aktiviert werden.', 
          type: 'error' 
        }
      });
      window.dispatchEvent(event);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await notificationService.unsubscribe();
      setStatus(notificationService.getStatus());
    } catch (error) {
      console.error('Unsubscribe failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    notificationService.updateSettings(newSettings);
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.testNotification();
      const event = new CustomEvent('show-toast', {
        detail: { 
          message: 'Test-Benachrichtigung gesendet!', 
          type: 'success' 
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Test notification failed:', error);
    }
  };

  if (!status.supported) {
    return (
      <div className="space-y-6">
        <div className="bg-bg-secondary rounded-lg p-6 border border-border-light">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <span className="text-xl mr-2">📱</span>
            Push-Benachrichtigungen
          </h3>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-500 text-xl flex-shrink-0">⚠️</div>
              <div>
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Nicht unterstützt
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  Ihr Browser unterstützt keine Push-Benachrichtigungen. 
                  Verwenden Sie einen modernen Browser oder installieren Sie die App für Benachrichtigungen.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-light">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <span className="text-xl mr-2">📱</span>
          Push-Benachrichtigungen
        </h3>

        {/* Permission Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
            <div>
              <div className="text-sm font-medium text-text-primary">
                Status
              </div>
              <div className="text-xs text-text-muted">
                {status.permission === 'granted' 
                  ? 'Benachrichtigungen aktiviert' 
                  : status.permission === 'denied'
                  ? 'Benachrichtigungen blockiert'
                  : 'Berechtigung ausstehend'
                }
                {status.isIOS && ' (iOS)'}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              status.permission === 'granted' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
                : status.permission === 'denied'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
            }`}>
              {status.permission === 'granted' ? 'Aktiv' : 
               status.permission === 'denied' ? 'Blockiert' : 'Ausstehend'}
            </div>
          </div>
        </div>

        {/* Permission Actions */}
        {status.permission !== 'granted' && (
          <div className="mb-6">
            <button
              onClick={handlePermissionRequest}
              disabled={isLoading || status.permission === 'denied'}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                status.permission === 'denied'
                  ? 'bg-border-medium text-text-muted cursor-not-allowed'
                  : 'bg-primary-green hover:bg-primary-green-dark text-white'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aktiviere...
                </span>
              ) : status.permission === 'denied' ? (
                'In Browsereinstellungen aktivieren'
              ) : (
                'Benachrichtigungen aktivieren'
              )}
            </button>
            
            {status.permission === 'denied' && (
              <p className="text-xs text-text-muted mt-2 text-center">
                Öffnen Sie die Browsereinstellungen und erlauben Sie Benachrichtigungen für diese Seite.
              </p>
            )}
          </div>
        )}

        {/* Settings */}
        {status.permission === 'granted' && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-text-primary">
              Benachrichtigungseinstellungen
            </h4>
            
            <div className="space-y-3">
              {/* Match Reminders */}
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    ⚽ Spiel-Erinnerungen
                  </div>
                  <div className="text-xs text-text-muted">
                    Erinnerungen vor Spielbeginn
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.matchReminders}
                    onChange={(e) => handleSettingChange('matchReminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border-medium peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-green"></div>
                </label>
              </div>

              {/* Reminder Time */}
              {settings.matchReminders && (
                <div className="ml-4 p-3 bg-bg-tertiary rounded-lg">
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Erinnerungszeit (Minuten vor Spielbeginn)
                  </label>
                  <select
                    value={settings.reminderTime}
                    onChange={(e) => handleSettingChange('reminderTime', parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-border-medium rounded-lg bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-green/50"
                  >
                    <option value={5}>5 Minuten</option>
                    <option value={15}>15 Minuten</option>
                    <option value={30}>30 Minuten</option>
                    <option value={60}>1 Stunde</option>
                    <option value={120}>2 Stunden</option>
                  </select>
                </div>
              )}

              {/* Goals */}
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    ⚽ Tor-Benachrichtigungen
                  </div>
                  <div className="text-xs text-text-muted">
                    Bei Toren während Live-Matches
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.goals}
                    onChange={(e) => handleSettingChange('goals', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border-medium peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-green"></div>
                </label>
              </div>

              {/* Achievements */}
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    🏆 Achievement-Benachrichtigungen
                  </div>
                  <div className="text-xs text-text-muted">
                    Bei freigeschalteten Erfolgen
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.achievements}
                    onChange={(e) => handleSettingChange('achievements', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border-medium peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-green"></div>
                </label>
              </div>

              {/* Events */}
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    🎉 Event-Benachrichtigungen
                  </div>
                  <div className="text-xs text-text-muted">
                    Bei neuen Events und Turnieren
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.events}
                    onChange={(e) => handleSettingChange('events', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border-medium peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-green"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-light">
              <button
                onClick={handleTestNotification}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300"
              >
                Test-Benachrichtigung
              </button>
              
              <button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? 'Deaktiviere...' : 'Deaktivieren'}
              </button>
            </div>
          </div>
        )}

        {/* iOS Notice */}
        {status.isIOS && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <div className="text-blue-500 text-xl flex-shrink-0">📱</div>
              <div>
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  iOS-Hinweis
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p>• Installieren Sie die App über &quot;Zum Home-Bildschirm hinzufügen&quot; für beste Benachrichtigungen</p>
                  <p>• Benachrichtigungen funktionieren nur bei aktiver App oder im Hintergrund</p>
                  <p>• Überprüfen Sie die iOS-Einstellungen für App-Benachrichtigungen</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}