import React, { useState, useEffect } from 'react';
import Icon from '../../icons/Icon';
import SeasonSelector from '../../SeasonSelector';
import { 
  getAvailableSeasons, 
  exportSeasonData,
  SEASONS,
  SEASON_NAMES
} from '../../../utils/seasonManager.js';
import { useSeason } from '../../../hooks/useSeasonData.js';

const SeasonManagerTab = () => {
  const [seasons, setSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentSeason } = useSeason();

  // Load season data
  useEffect(() => {
    const loadSeasonData = () => {
      setSeasons(getAvailableSeasons());
    };

    loadSeasonData();

    // Listen for season changes
    const handleSeasonChange = () => {
      setTimeout(loadSeasonData, 100); // Small delay to ensure data is updated
    };

    window.addEventListener('seasonChanged', handleSeasonChange);
    window.addEventListener('legacyDataMigrated', handleSeasonChange);
    window.addEventListener('fc26EnvironmentInitialized', handleSeasonChange);

    return () => {
      window.removeEventListener('seasonChanged', handleSeasonChange);
      window.removeEventListener('legacyDataMigrated', handleSeasonChange);
      window.removeEventListener('fc26EnvironmentInitialized', handleSeasonChange);
    };
  }, []);

  const handleExportSeason = async (seasonId) => {
    try {
      setIsLoading(true);
      const exportData = exportSeasonData(seasonId);
      
      if (exportData) {
        // Create download link
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fifa-tracker-${seasonId}-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`Exported ${seasonId} data successfully`);
      } else {
        console.error('Failed to export season data');
      }
    } catch (error) {
      console.error('Error exporting season data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDataTypeCounts = (seasonId) => {
    const dataTypes = ['matches', 'players', 'bans', 'transactions', 'alcoholCalculator'];
    const counts = {};
    
    dataTypes.forEach(dataType => {
      try {
        const storageKey = `fifa_season_${seasonId}_${dataType}`;
        const data = localStorage.getItem(storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            counts[dataType] = parsed.length;
          } else if (typeof parsed === 'object') {
            counts[dataType] = 1; // Single object like alcoholCalculator
          }
        } else {
          counts[dataType] = 0;
        }
      } catch (error) {
        counts[dataType] = 0;
      }
    });
    
    return counts;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center gap-6 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl 
                        flex items-center justify-center text-white shadow-lg border border-emerald-300">
          <Icon name="calendar" size={28} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-text-primary mb-1">Saison-Manager</h2>
          <p className="text-text-secondary text-lg">Verwalten Sie Legacy- und FC26-Daten</p>
        </div>
      </div>

      {/* Current Season Status */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 border border-emerald-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg text-white">
              <Icon name="calendar" size={24} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary mb-1">Aktuelle Saison</h3>
              <p className="text-2xl font-bold text-emerald-600">
                {SEASON_NAMES[currentSeason]}
              </p>
              <p className="text-text-secondary text-sm mt-1">
                Alle Aktionen werden in dieser Saison gespeichert
              </p>
            </div>
          </div>
          <div className="text-6xl opacity-20">
            {currentSeason === SEASONS.FC26 ? '⚡' : '📚'}
          </div>
        </div>
      </div>

      {/* Season Selector */}
      <SeasonSelector />

      {/* Season Overview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Datenübersicht pro Saison</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {seasons.map(season => {
            const counts = getDataTypeCounts(season.id);
            const totalItems = Object.values(counts).reduce((sum, count) => sum + count, 0);
            
            return (
              <div
                key={season.id}
                className={`p-6 rounded-xl border-2 ${
                  season.isActive 
                    ? 'border-blue-500 bg-system-blue/10' 
                    : 'border-border-light bg-bg-secondary'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: season.color + '20', color: season.color }}
                    >
                      {season.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary">{season.name}</h4>
                      <p className="text-sm text-text-secondary">{season.description}</p>
                    </div>
                  </div>
                  
                  {season.isActive && (
                    <span className="px-3 py-1 bg-system-blue/10 text-system-blue rounded-full text-sm font-medium">
                      Aktiv
                    </span>
                  )}
                </div>

                {/* Data Statistics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Gesamt Einträge:</span>
                    <span className="font-medium text-text-primary">{totalItems}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">⚽ Spiele:</span>
                      <span className="font-medium">{counts.matches || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">👥 Spieler:</span>
                      <span className="font-medium">{counts.players || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">🚫 Sperren:</span>
                      <span className="font-medium">{counts.bans || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">💰 Transaktionen:</span>
                      <span className="font-medium">{counts.transactions || 0}</span>
                    </div>
                  </div>

                  {counts.alcoholCalculator > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-border-light">
                      <span className="text-text-secondary">🍺 Alkohol-Tracker:</span>
                      <span className="font-medium text-system-green">Konfiguriert</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-border-light">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportSeason(season.id)}
                      disabled={!season.hasData || isLoading}
                      className="flex-1 px-3 py-2 bg-bg-tertiary hover:bg-bg-tertiary text-text-secondary 
                                 rounded-lg text-sm transition-colors disabled:opacity-50 
                                 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Exportiert...' : '📥 Export'}
                    </button>
                    
                    {season.hasData && (
                      <div className="flex-1 px-3 py-2 text-center text-sm">
                        <span className="text-system-green font-medium">✓ Daten vorhanden</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-amber-800 mb-2">FC26 Saison-System</h4>
            <div className="space-y-2 text-sm text-amber-700">
              <p>• <strong>Legacy:</strong> Alle bisherigen FIFA-Daten bleiben erhalten und zugänglich</p>
              <p>• <strong>FC26:</strong> Neue Saison mit frischen Daten für FIFA Club 26</p>
              <p>• <strong>Isolation:</strong> Jede Saison hat separate Speicherbereiche</p>
              <p>• <strong>Wechsel:</strong> Beliebig zwischen Saisons wechseln möglich</p>
              <p>• <strong>Export:</strong> Backup-Funktion für alle Saisondaten</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-bg-tertiary rounded-xl p-6">
        <h4 className="font-semibold text-text-primary mb-3">Technische Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
          <div>
            <strong>Speicher-System:</strong><br />
            • Lokaler Browser-Speicher<br />
            • Automatische Datenmigration<br />
            • Versionsverwaltung
          </div>
          <div>
            <strong>Datentypen:</strong><br />
            • Spiele und Ergebnisse<br />
            • Spieler und Teams<br />
            • Finanzen und Statistiken
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonManagerTab;