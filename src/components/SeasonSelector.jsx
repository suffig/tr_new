import React, { useState, useEffect } from 'react';
import { 
  getAvailableSeasons, 
  getCurrentSeason, 
  switchToSeason,
  getSeasonMetadata,
  SEASONS,
  SEASON_NAMES
} from '../utils/seasonManager.js';

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

  // Header version - compact indicator
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
          <span className="font-medium text-slate-200">{currentSeasonMeta?.name || 'Legacy'}</span>
          <span className="text-slate-400 text-xs">▼</span>
        </button>

        {showSelector && (
          <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border 
                          border-gray-200 z-50 min-w-64">
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Saison wählen</h3>
              <div className="space-y-2">
                {availableSeasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSeasonSwitch(season.id)}
                    disabled={season.isActive || isChangingSeason}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left
                      ${season.isActive 
                        ? 'border-blue-500 bg-blue-50 text-blue-800' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                      ${!season.hasData ? 'opacity-60' : ''}
                      ${isChangingSeason ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{season.icon}</span>
                        <div>
                          <div className="font-medium">{season.name}</div>
                          <div className="text-sm text-gray-600">{season.description}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {season.isActive && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Aktiv
                          </span>
                        )}
                        {season.hasData && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Daten vorhanden
                          </span>
                        )}
                        {!season.hasData && season.id === SEASONS.FC26 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Neu
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {isChangingSeason && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
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
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl 
                        flex items-center justify-center text-white text-xl font-bold">
          📅
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Saison-Manager</h2>
          <p className="text-gray-600">Wechseln Sie zwischen Legacy und FC26 Daten</p>
        </div>
      </div>

      {/* Current Season Display */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentSeasonMeta?.icon}</span>
          <div>
            <div className="font-semibold text-gray-800">Aktuelle Saison: {currentSeasonMeta?.name}</div>
            <div className="text-sm text-gray-600">{currentSeasonMeta?.description}</div>
          </div>
        </div>
      </div>

      {/* Season Selection */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700">Verfügbare Saisons:</h3>
        
        {availableSeasons.map((season) => (
          <div
            key={season.id}
            className={`p-6 rounded-xl border-2 transition-all
              ${season.isActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
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
                  <h4 className="text-lg font-semibold text-gray-800">{season.name}</h4>
                  <p className="text-gray-600">{season.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Version {season.version}
                    </span>
                    {season.hasData && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Daten vorhanden
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {season.isActive ? (
                  <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
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
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📚</span>
                    <span>Alle bisherigen FIFA-Daten</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🔄</span>
                    <span>Kompatibel mit allen alten Features</span>
                  </div>
                </>
              )}
              {season.id === SEASONS.FC26 && (
                <>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>⚡</span>
                    <span>Neue FIFA Club 26 Saison</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
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
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-xl">💡</span>
          <div className="text-sm text-amber-800">
            <div className="font-medium mb-1">Hinweis zum Saison-Wechsel:</div>
            <ul className="space-y-1 text-amber-700">
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