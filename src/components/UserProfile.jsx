import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function UserProfile({ onClose, onNavigate }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    favoriteTeam: localStorage.getItem('userFavoriteTeam') || '',
    darkMode: localStorage.getItem('darkMode') === 'true',
    notifications: localStorage.getItem('userNotifications') !== 'false',
    language: localStorage.getItem('userLanguage') || 'de',
    compactView: localStorage.getItem('compactView') === 'true'
  });

  // Load data immediately on opening and set default favorites
  useEffect(() => {
    if (user?.email) {
      let defaultFavorite = localStorage.getItem('userFavoriteTeam');
      
      // Set default favorites based on email if not already set
      if (!defaultFavorite) {
        if (user.email === 'philip-melchert@live.de') {
          defaultFavorite = 'Real';
        } else if (user.email === 'alexander-lueckmann@web.de') {
          defaultFavorite = 'AEK';
        }
        
        if (defaultFavorite) {
          localStorage.setItem('userFavoriteTeam', defaultFavorite);
          setPreferences(prev => ({
            ...prev,
            favoriteTeam: defaultFavorite
          }));
        }
      }
    }
  }, [user?.email]);

  const teams = [
    { value: '', label: 'Kein Favorit' },
    { value: 'AEK', label: 'AEK' },
    { value: 'Real', label: 'Real' },
    { value: 'Ehemalige', label: 'Ehemalige' }
  ];

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Save to localStorage
    localStorage.setItem(
      key === 'favoriteTeam' ? 'userFavoriteTeam' :
      key === 'darkMode' ? 'darkMode' :
      key === 'notifications' ? 'userNotifications' :
      key === 'language' ? 'userLanguage' : 'compactView',
      value.toString()
    );

    // Apply dark mode immediately
    if (key === 'darkMode') {
      document.documentElement.classList.toggle('dark', value);
    }

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('userPreferencesChanged', {
      detail: { [key]: value }
    }));
  };

  const getUserStats = () => {
    // Get basic user stats from localStorage
    const stats = {
      favoriteTeam: preferences.favoriteTeam,
      memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt',
      email: user?.email || 'Unbekannt'
    };
    return stats;
  };

  const stats = getUserStats();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-primary border border-border-light rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <h2 className="text-xl font-bold text-text-primary">
            👤 Benutzerprofil
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-2xl p-1"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-bg-secondary rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span className="text-xl">👤</span>
              Benutzerinformationen
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📧</span>
                  <div>
                    <span className="text-sm font-medium text-text-primary">E-Mail</span>
                    <p className="text-xs text-text-muted">Deine Anmelde-E-Mail</p>
                  </div>
                </div>
                <span className="text-sm text-text-primary font-medium">{stats.email}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <span className="text-sm font-medium text-text-primary">Mitglied seit</span>
                    <p className="text-xs text-text-muted">Registrierungsdatum</p>
                  </div>
                </div>
                <span className="text-sm text-text-primary font-medium">{stats.memberSince}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚽</span>
                  <div>
                    <span className="text-sm font-medium text-text-primary">Lieblingsverein</span>
                    <p className="text-xs text-text-muted">Dein Favorit</p>
                  </div>
                </div>
                <span className="text-sm text-text-primary font-medium">
                  {stats.favoriteTeam || 'Kein Favorit'}
                </span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-text-primary">
                Einstellungen
              </h3>
              <p className="text-sm text-text-muted">
                Personalisiere deine App-Erfahrung mit diesen Einstellungen
              </p>
            </div>

            {/* Favorite Team */}
            <div className="bg-bg-secondary rounded-lg p-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  ⚽ Lieblingsverein
                </label>
                <p className="text-xs text-text-muted">
                  Wähle deinen Favoriten für personalisierte Inhalte
                </p>
              </div>
              <select
                value={preferences.favoriteTeam}
                onChange={(e) => handlePreferenceChange('favoriteTeam', e.target.value)}
                className="form-input w-full rounded-lg"
              >
                {teams.map(team => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Apple-like Toggle Switches */}
            <div className="bg-bg-secondary rounded-lg p-4 space-y-4">
              {/* Dark Mode */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌙</span>
                    <label className="text-sm font-medium text-text-primary">
                      Dunkler Modus
                    </label>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Schont die Augen bei schwachem Licht
                  </p>
                </div>
                <AppleSwitch
                  checked={preferences.darkMode}
                  onChange={(checked) => handlePreferenceChange('darkMode', checked)}
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <label className="text-sm font-medium text-text-primary">
                      Benachrichtigungen
                    </label>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Erhalte Push-Nachrichten für neue Spiele und Events
                  </p>
                </div>
                <AppleSwitch
                  checked={preferences.notifications}
                  onChange={(checked) => handlePreferenceChange('notifications', checked)}
                />
              </div>

              {/* Compact View */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <label className="text-sm font-medium text-text-primary">
                      Kompakte Ansicht
                    </label>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Zeigt mehr Inhalte auf kleineren Bildschirmen
                  </p>
                </div>
                <AppleSwitch
                  checked={preferences.compactView}
                  onChange={(checked) => handlePreferenceChange('compactView', checked)}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-text-primary">
              Schnellzugriff
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onNavigate('stats');
                  onClose();
                }}
                className="btn-secondary text-sm py-2"
              >
                📊 Statistiken
              </button>
              <button
                onClick={() => {
                  onNavigate('matches');
                  onClose();
                }}
                className="btn-secondary text-sm py-2"
              >
                ⚽ Spiele
              </button>
              {preferences.favoriteTeam && (
                <>
                  <button
                    onClick={() => {
                      onNavigate('squad');
                      onClose();
                    }}
                    className="btn-secondary text-sm py-2"
                  >
                    👥 {preferences.favoriteTeam} Kader
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('finanzen');
                      onClose();
                    }}
                    className="btn-secondary text-sm py-2"
                  >
                    € Finanzen
                  </button>
                </>
              )}
            </div>
          </div>

          {/* App Info */}
          <div className="text-center pt-4 border-t border-border-light">
            <p className="text-xs text-text-muted">
              FIFA Tracker v1.0 • React App
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Apple-style Switch Component
function AppleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 ${
        checked ? 'bg-primary-green' : 'bg-gray-300 dark:bg-gray-600'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}