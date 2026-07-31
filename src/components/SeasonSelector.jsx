import React, { useState, useEffect } from 'react';
import { 
  getAvailableSeasons, 
  getCurrentSeason, 
  switchToSeason,
  getSeasonMetadata,
  SEASONS,
  SEASON_NAMES
} from '../utils/seasonManager.js';
import { getCurrentFifaVersion } from '../utils/fifaVersionManager.js';

const SeasonSelector = ({ className = '', showInHeader = false }) => {
  const [currentSeason, setCurrentSeason] = useState(getCurrentSeason());
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [isChangingSeason, setIsChangingSeason] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    // Load available seasons
    const seasons = getAvailableSeasons();
    setAvailableSeasons(seasons);
    setCurrentSeason(getCurrentSeason());

    // Listen for season changes
    const handleSeasonChange = (event) => {
      setCurrentSeason(event.detail.newSeason);
      setShowSelector(false);
    };

    window.addEventListener('seasonChanged', handleSeasonChange);
    return () => window.removeEventListener('seasonChanged', handleSeasonChange);
  }, []);

  const handleSeasonSwitch = async (targetSeason) => {
    if (targetSeason === currentSeason || isChangingSeason) return;

    setIsChangingSeason(true);
    
    try {
      const success = switchToSeason(targetSeason);
      if (success) {
        // Component will be remounted due to page reload in switchToSeason
        console.log(`Switching to ${SEASON_NAMES[targetSeason]}...`);
      } else {
        console.error('Failed to switch season');
        setIsChangingSeason(false);
      }
    } catch (error) {
      console.error('Error switching season:', error);
      setIsChangingSeason(false);
    }
  };

  const currentSeasonMeta = getSeasonMetadata(currentSeason);
  const currentFifaVersion = getCurrentFifaVersion();

  // Get the short version name (FC25, FC26, etc.) for prominent display
  const getShortVersionName = () => {
    if (currentFifaVersion === 'FC25') return 'FC25';
    if (currentFifaVersion === 'FC26') return 'FC26';
    // For custom versions, return the version ID directly
    return currentFifaVersion;
  };

  // Header version - compact indicator with prominent version number
  if (showInHeader) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 
                     border border-slate-600 rounded-lg transition-colors text-sm"
          style={{ color: currentSeasonMeta?.color || '#6B7280' }}
        >
          <span className="text-base">{currentSeasonMeta?.icon || '📅'}</span>
          <div className="flex flex-col items-start">
            <span className="font-bold text-slate-100 text-sm leading-none">{getShortVersionName()}</span>
            <span className="font-medium text-slate-300 text-xs leading-none">{currentSeasonMeta?.name || 'Legacy'}</span>
          </div>
          <span className="text-slate-400 text-xs">▼</span>
        </button>

        {showSelector && (
          <div className="absolute top-full right-0 mt-1 bg-bg-elevated rounded-lg shadow-xl border 
                          border-border-light z-50 min-w-64">
            <div className="p-4">
              <h3 className="font-semibold text-text-primary mb-3">Saison wählen</h3>
              <div className="space-y-2">
                {availableSeasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSeasonSwitch(season.id)}
                    disabled={season.isActive || isChangingSeason}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left
                      ${season.isActive 
                        ? 'border-system-blue bg-system-blue/10 text-system-blue' 
                        : 'border-border-light hover:border-border-medium hover:bg-bg-tertiary'
                      }
                      ${!season.hasData ? 'opacity-60' : ''}
                      ${isChangingSeason ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{season.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">
                              {season.id === SEASONS.LEGACY ? 'FC25' : 'FC26'}
                            </span>
                            <span className="font-medium text-text-secondary">{season.name}</span>
                          </div>
                          <div className="text-sm text-text-secondary">{season.description}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {season.isActive && (
                          <span className="text-xs bg-system-blue/15 text-system-blue px-2 py-1 rounded">
                            Aktiv
                          </span>
                        )}
                        {season.hasData && (
                          <span className="text-xs bg-system-green/15 text-system-green px-2 py-1 rounded">
                            Daten vorhanden
                          </span>
                        )}
                        {!season.hasData && season.id === SEASONS.FC26 && (
                          <span className="text-xs bg-system-yellow/15 text-system-yellow px-2 py-1 rounded">
                            Neu
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {isChangingSeason && (
                <div className="mt-3 p-2 bg-system-blue/10 rounded-lg">
                  <div className="flex items-center gap-2 text-system-blue text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-system-blue border-t-transparent rounded-full"></div>
                    <span>Saison wird gewechselt...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full page version - detailed selector
  return (
    <div className={`modern-card ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-system-blue rounded-xl 
                        flex items-center justify-center text-white text-xl font-bold">
          📅
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Saison-Manager</h2>
          <p className="text-text-secondary">Wechseln Sie zwischen Legacy und FC26 Daten</p>
        </div>
      </div>

      {/* Current Season Display */}
      <div className="mb-6 p-4 bg-system-blue rounded-lg border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentSeasonMeta?.icon}</span>
          <div>
            <div className="font-semibold text-text-primary">Aktuelle Saison: {currentSeasonMeta?.name}</div>
            <div className="text-sm text-text-secondary">{currentSeasonMeta?.description}</div>
          </div>
        </div>
      </div>

      {/* Season Selection */}
      <div className="space-y-4">
        <h3 className="font-medium text-text-secondary">Verfügbare Saisons:</h3>
        
        {availableSeasons.map((season) => (
          <div
            key={season.id}
            className={`p-6 rounded-xl border-2 transition-all
              ${season.isActive 
                ? 'border-system-blue bg-system-blue/10' 
                : 'border-border-light hover:border-border-medium'
              }
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                     style={{ backgroundColor: season.color + '20', color: season.color }}>
                  {season.icon}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-text-primary">{season.name}</h4>
                  <p className="text-text-secondary">{season.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-1 rounded">
                      Version {season.version}
                    </span>
                    {season.hasData && (
                      <span className="text-xs bg-system-green/15 text-system-green px-2 py-1 rounded">
                        ✓ Daten vorhanden
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {season.isActive ? (
                  <div className="px-4 py-2 bg-system-blue/15 text-system-blue rounded-lg text-sm font-medium">
                    Aktuelle Saison
                  </div>
                ) : (
                  <button
                    onClick={() => handleSeasonSwitch(season.id)}
                    disabled={isChangingSeason}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg 
                               text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isChangingSeason ? 'Wechselt...' : 'Wechseln'}
                  </button>
                )}
              </div>
            </div>

            {/* Season specific information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {season.id === SEASONS.LEGACY && (
                <>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span>📚</span>
                    <span>Alle bisherigen FIFA-Daten</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span>🔄</span>
                    <span>Kompatibel mit allen alten Features</span>
                  </div>
                </>
              )}
              {season.id === SEASONS.FC26 && (
                <>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span>⚡</span>
                    <span>Neue FIFA Club 26 Saison</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span>🆕</span>
                    <span>Frische Daten ohne Legacy-Ballast</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-system-orange/10 border border-system-orange/25 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-system-orange text-xl">💡</span>
          <div className="text-sm text-system-orange">
            <div className="font-medium mb-1">Hinweis zum Saison-Wechsel:</div>
            <ul className="space-y-1 text-system-orange">
              <li>• Legacy-Daten bleiben erhalten und können jederzeit aufgerufen werden</li>
              <li>• FC26 startet mit einer komplett leeren Datenbank</li>
              <li>• Jede Saison hat separate Speicherbereiche</li>
              <li>• Sie können beliebig zwischen den Saisons wechseln</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonSelector;