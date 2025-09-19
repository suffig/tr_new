import { useTheme } from '../contexts/ThemeContext';

export default function ThemeSettings() {
  const { theme, autoMode, toggleTheme, setAutoTheme, setManualTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-light">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <span className="text-xl mr-2">🎨</span>
          Design & Darstellung
        </h3>
        
        {/* Theme Mode Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Darstellungsmodus
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Auto Mode */}
              <button
                onClick={() => setAutoTheme(true)}
                className={`p-4 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
                  autoMode
                    ? 'border-primary-green bg-primary-green/10'
                    : 'border-border-medium hover:border-border-dark'
                }`}
              >
                <div className="text-2xl">🌗</div>
                <div className="text-sm font-medium text-text-primary">Automatisch</div>
                <div className="text-xs text-text-muted text-center">
                  Folgt den Systemeinstellungen
                </div>
              </button>

              {/* Light Mode */}
              <button
                onClick={() => setManualTheme('light')}
                className={`p-4 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
                  !autoMode && theme === 'light'
                    ? 'border-primary-green bg-primary-green/10'
                    : 'border-border-medium hover:border-border-dark'
                }`}
              >
                <div className="text-2xl">☀️</div>
                <div className="text-sm font-medium text-text-primary">Hell</div>
                <div className="text-xs text-text-muted text-center">
                  Helle Darstellung
                </div>
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => setManualTheme('dark')}
                className={`p-4 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
                  !autoMode && theme === 'dark'
                    ? 'border-primary-green bg-primary-green/10'
                    : 'border-border-medium hover:border-border-dark'
                }`}
              >
                <div className="text-2xl">🌙</div>
                <div className="text-sm font-medium text-text-primary">Dunkel</div>
                <div className="text-xs text-text-muted text-center">
                  Dunkle Darstellung
                </div>
              </button>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-bg-tertiary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  Aktueller Modus
                </div>
                <div className="text-xs text-text-muted">
                  {autoMode 
                    ? `Automatisch (${theme === 'dark' ? 'Dunkel' : 'Hell'} - basierend auf Systemeinstellung)`
                    : `Manuell (${theme === 'dark' ? 'Dunkel' : 'Hell'})`
                  }
                </div>
              </div>
              <div className="text-2xl">
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </div>
          </div>

          {/* Quick Toggle */}
          <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
            <div>
              <div className="text-sm font-medium text-text-primary">
                Schnellwechsel
              </div>
              <div className="text-xs text-text-muted">
                Wechselt zwischen Hell und Dunkel
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="bg-primary-green hover:bg-primary-green-dark text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="text-sm font-medium">
                Zu {theme === 'dark' ? 'Hell' : 'Dunkel'}
              </span>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl flex-shrink-0">💡</div>
            <div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Darstellungshinweise
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>• <strong>Automatisch:</strong> Wechselt automatisch basierend auf Ihren Systemeinstellungen</p>
                <p>• <strong>Hell:</strong> Optimiert für helle Umgebungen und bessere Akkulaufzeit</p>
                <p>• <strong>Dunkel:</strong> Reduziert Augenbelastung bei schwachem Licht</p>
                <p>• Alle Karten, Modals und UI-Elemente passen sich automatisch an</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}