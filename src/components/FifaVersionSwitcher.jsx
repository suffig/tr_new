/**
 * FIFA Version Switcher Component
 * Allows users to switch between FC25 and FC26 database versions
 */
import { useState, useEffect } from 'react';
import { 
  getCurrentFifaVersion, 
  setCurrentFifaVersion, 
  getAvailableFifaVersions, 
  getFifaVersionDisplayName 
} from '../utils/fifaVersionManager';

export default function FifaVersionSwitcher() {
  const [currentVersion, setCurrentVersionState] = useState(getCurrentFifaVersion());
  const [versions] = useState(getAvailableFifaVersions());
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const handleFifaVersionChange = (event) => {
      setCurrentVersionState(event.detail.newVersion);
    };

    window.addEventListener('fifaVersionChanged', handleFifaVersionChange);
    return () => {
      window.removeEventListener('fifaVersionChanged', handleFifaVersionChange);
    };
  }, []);

  const handleVersionSwitch = async (newVersion) => {
    if (newVersion === currentVersion || switching) return;
    
    setSwitching(true);
    
    try {
      const success = setCurrentFifaVersion(newVersion);
      if (success) {
        setCurrentVersionState(newVersion);
        // Reload the page to ensure all components pick up the new version
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error switching FIFA version:', error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="fifa-version-switcher bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        FIFA Version
      </h3>
      
      <div className="space-y-2">
        {versions.map((version) => (
          <button
            key={version.id}
            onClick={() => handleVersionSwitch(version.id)}
            disabled={switching}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              version.isActive
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{version.name}</span>
              {version.isActive && (
                <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                  Aktiv
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {version.isLegacy 
                ? 'Alle bisherigen Daten und Statistiken' 
                : 'Neue Saison mit frischen Daten'
              }
            </div>
          </button>
        ))}
      </div>
      
      {switching && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Wechsle Version...
          </div>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <strong>Hinweis:</strong> Das Wechseln der FIFA Version filtert alle Daten 
          (Spiele, Spieler, Sperren, Finanzen) nach der gewählten Version.
        </p>
      </div>
    </div>
  );
}