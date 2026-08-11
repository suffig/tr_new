import { useTheme } from '../contexts/ThemeContext';
import Icon from './icons/Icon';

export default function ThemeSettings() {
  const { theme, autoMode, toggleTheme, setAutoTheme, setManualTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-light">
        <h3 className="karten-titel mb-4 flex items-center">
          <Icon name="sparkles" size={18} strokeWidth={2.1} className="mr-2 text-system-purple" />
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
                    ? 'border-fifa-green bg-fifa-green/10'
                    : 'border-border-medium hover:border-border-strong'
                }`}
              >
                <div className="text-text-secondary"><Icon name="grid" size={22} strokeWidth={2.1} /></div>
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
                    ? 'border-fifa-green bg-fifa-green/10'
                    : 'border-border-medium hover:border-border-strong'
                }`}
              >
                <div className="text-system-yellow"><Icon name="sun" size={22} strokeWidth={2.1} /></div>
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
                    ? 'border-fifa-green bg-fifa-green/10'
                    : 'border-border-medium hover:border-border-strong'
                }`}
              >
                <div className="text-system-indigo"><Icon name="moon" size={22} strokeWidth={2.1} /></div>
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
              <div className={theme === 'dark' ? 'text-system-indigo' : 'text-system-yellow'}>
                <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={22} strokeWidth={2.1} />
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
              className="bg-fifa-green hover:bg-system-green-dark text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} strokeWidth={2.1} />
              <span className="text-sm font-medium">
                Zu {theme === 'dark' ? 'Hell' : 'Dunkel'}
              </span>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-system-blue/10 dark:bg-system-blue/20 rounded-lg border border-system-blue/25 dark:border-system-blue">
          <div className="flex items-start space-x-3">
            <div className="text-system-blue flex-shrink-0"><Icon name="bulb" size={18} strokeWidth={2.1} /></div>
            <div>
              <div className="text-sm font-medium text-system-blue dark:text-blue-200 mb-1">
                Darstellungshinweise
              </div>
              <div className="text-xs text-system-blue dark:text-system-blue space-y-1">
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