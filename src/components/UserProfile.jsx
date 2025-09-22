import { useState } from 'react';
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
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-text-primary">
              Benutzerinformationen
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">E-Mail:</span>
                <span className="text-text-primary font-medium">{stats.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Mitglied seit:</span>
                <span className="text-text-primary font-medium">{stats.memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Lieblingsverein:</span>
                <span className="text-text-primary font-medium">
                  {stats.favoriteTeam || 'Kein Favorit'}
                </span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Einstellungen
            </h3>

            {/* Favorite Team */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Lieblingsverein
              </label>
              <select
                value={preferences.favoriteTeam}
                onChange={(e) => handlePreferenceChange('favoriteTeam', e.target.value)}
                className="form-input w-full"
              >
                {teams.map(team => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Dunkler Modus
              </label>
              <input
                type="checkbox"
                checked={preferences.darkMode}
                onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
                className="rounded border-border-medium"
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Benachrichtigungen
              </label>
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                className="rounded border-border-medium"
              />
            </div>

            {/* Compact View */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Kompakte Ansicht
              </label>
              <input
                type="checkbox"
                checked={preferences.compactView}
                onChange={(e) => handlePreferenceChange('compactView', e.target.checked)}
                className="rounded border-border-medium"
              />
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