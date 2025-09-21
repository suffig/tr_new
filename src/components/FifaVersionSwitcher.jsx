/**
 * FIFA Version Switcher Component
 * Allows users to switch between all available FIFA versions (built-in + custom)
 */
import { useState, useEffect } from 'react';
import { 
  getCurrentFifaVersion, 
  setCurrentFifaVersion, 
  getAvailableFifaVersions
} from '../utils/fifaVersionManager';

export default function FifaVersionSwitcher() {
  const [currentVersion, setCurrentVersionState] = useState(getCurrentFifaVersion());
  const [versions, setVersions] = useState([]);
  const [switching, setSwitching] = useState(false);

  const loadVersions = () => {
    const availableVersions = getAvailableFifaVersions();
    // Sort: active first, then built-in, then custom by creation date
    const sortedVersions = availableVersions.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (!a.isCustom && b.isCustom) return -1;
      if (a.isCustom && !b.isCustom) return 1;
      return 0;
    });
    setVersions(sortedVersions);
  };

  useEffect(() => {
    loadVersions();

    const handleFifaVersionChange = (event) => {
      setCurrentVersionState(event.detail.newVersion);
      loadVersions();
    };

    const handleVersionAdded = () => {
      loadVersions();
    };

    const handleVersionRemoved = () => {
      loadVersions();
    };

    window.addEventListener('fifaVersionChanged', handleFifaVersionChange);
    window.addEventListener('fifaVersionAdded', handleVersionAdded);
    window.addEventListener('fifaVersionRemoved', handleVersionRemoved);
    
    return () => {
      window.removeEventListener('fifaVersionChanged', handleFifaVersionChange);
      window.removeEventListener('fifaVersionAdded', handleVersionAdded);
      window.removeEventListener('fifaVersionRemoved', handleVersionRemoved);
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

  const getVersionIcon = (version) => {
    if (version.isLegacy) return '📚';
    if (version.isCurrent) return '⚡';
    if (version.isCustom) return '🎮';
    return '⚽';
  };

  const getVersionTypeLabel = (version) => {
    if (version.isLegacy) return 'Legacy';
    if (version.isCurrent) return 'Standard';
    if (version.isCustom) return 'Custom';
    return '';
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
            className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors ${
              version.isActive
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getVersionIcon(version)}</span>
                <span className="font-medium">{version.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {getVersionTypeLabel(version) && (
                  <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                    {getVersionTypeLabel(version)}
                  </span>
                )}
                {version.isActive && (
                  <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                    Aktiv
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {version.description || version.metadata?.description || 
                (version.isLegacy ? 'Alle bisherigen Daten und Statistiken' : 
                 version.isCurrent ? 'Standard FIFA Version' : 
                 'Custom FIFA Version')}
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
          nach der gewählten Version. {versions.filter(v => v.isCustom).length > 0 && 
          'Custom Versionen können im Admin-Bereich verwaltet werden.'}
        </p>
      </div>
    </div>
  );
}