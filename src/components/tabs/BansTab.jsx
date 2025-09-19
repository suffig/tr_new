import { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import { BAN_TYPES, getBanTypeColor, getBanIcon } from '../../constants/banTypes';
import HorizontalNavigation from '../HorizontalNavigation';
import TeamLogo from '../TeamLogo';

export default function BansTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [selectedType, setSelectedType] = useState('active'); // Changed from 'all' to 'active'
  
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  
  const loading = bansLoading || playersLoading;

  const getPlayerName = (playerId) => {
    if (!players) return 'Unbekannt';
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unbekannt';
  };

  const getPlayerTeam = (playerId) => {
    if (!players) return 'Unbekannt';
    const player = players.find(p => p.id === playerId);
    return player?.team || 'Unbekannt';
  };

  const filteredBans = (() => {
    // Use search results if available, otherwise use all bans
    const bansToFilter = (bans || []);
    
    return bansToFilter.filter(ban => {
      if (selectedType === 'all') return true;
      if (selectedType === 'active') return (ban.totalgames - ban.matchesserved) > 0;
      if (selectedType === 'completed') return (ban.totalgames - ban.matchesserved) === 0;
      return ban.type === selectedType;
    });
  })();

  const activeBans = bans?.filter(ban => (ban.totalgames - ban.matchesserved) > 0) || [];
  const completedBans = bans?.filter(ban => (ban.totalgames - ban.matchesserved) === 0) || [];

  // Define views for horizontal navigation
  const views = [
    { id: 'all', label: 'Alle', icon: '📋', count: bans?.length || 0 },
    { id: 'active', label: 'Aktiv', icon: '🔴', count: activeBans.length },
    { id: 'completed', label: 'Beendet', icon: '✅', count: completedBans.length },
    ...BAN_TYPES.map(type => ({
      id: type.value,
      label: type.label,
      icon: getBanIcon(type.value) || '⚠️',
      count: bans?.filter(ban => ban.type === type.value).length || 0
    }))
  ];

  if (loading) {
    return <LoadingSpinner message="Lade Sperren..." />;
  }

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      {/* Enhanced Header with iOS 26 Design - matching StatsTab */}
      <div className="mb-6 animate-mobile-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-info rounded-ios-lg flex items-center justify-center">
            <span className="text-white text-xl">🚫</span>
          </div>
          <div>
            <h2 className="text-title1 font-bold text-text-primary">Sperren</h2>
            <p className="text-footnote text-text-secondary">Übersicht aller Spielersperren</p>
          </div>
        </div>
        <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Horizontal Navigation */}
      <HorizontalNavigation
        views={views.map(view => ({
          ...view,
          label: `${view.label} (${view.count})`
        }))}
        selectedView={selectedType}
        onViewChange={setSelectedType}
      />



      {/* Bans Display */}
      {selectedType === 'active' || selectedType === 'all' ? (
        <>
          {/* Active Bans Section - moved below filters and statistics cards */}
          {activeBans.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                🔴 Aktive Sperren ({activeBans.length})
              </h3>
              <div className="space-y-4">
                {activeBans.map((ban) => {
                  const remainingGames = (ban.totalgames || 0) - (ban.matchesserved || 0);
                  const progress = (ban.totalgames || 0) > 0 ? ((ban.matchesserved || 0) / (ban.totalgames || 0)) * 100 : 0;
                  
                  return (
                    <div key={ban.id} className="modern-card hover:bg-bg-secondary transition-colors cursor-pointer group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="text-2xl group-hover:scale-110 transition-transform">
                            {getBanIcon(ban.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-text-primary group-hover:text-primary-green transition-colors">
                                {getPlayerName(ban.player_id)}
                              </h3>
                              <TeamLogo team={getPlayerTeam(ban.player_id)} size="sm" className="group-hover:scale-110 transition-transform" />
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border transition-all group-hover:scale-105 ${getBanTypeColor(ban.type)}`}>
                                {ban.type}
                              </span>
                              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 transition-all group-hover:scale-105">
                                🔴 Aktiv - {remainingGames} Spiel{remainingGames !== 1 ? 'e' : ''} verbleibend
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-text-muted mb-1">
                                <span>Fortschritt: {ban.matchesserved || 0} / {ban.totalgames || 0} Spiele</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full bg-red-500 transition-all duration-300"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {ban.reason && (
                              <p className="text-sm text-text-muted">
                                Grund: {ban.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Large remaining games indicator */}
                        <div className="text-center ml-4">
                          <div className="text-2xl font-bold text-red-600">
                            {remainingGames}
                          </div>
                          <div className="text-xs text-red-600 uppercase font-medium">
                            Verbleibend
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Info Card - Moved under active bans as requested */}
              {showHints && (
                <div className="mt-6 modern-card bg-red-50 border-red-200">
                  <div className="flex items-start">
                    <div className="text-red-600 mr-3">
                      <i className="fas fa-info-circle"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-800 mb-1">Hinweis</h4>
                      <p className="text-red-700 text-sm">
                        Um neue Sperren hinzuzufügen oder zu verwalten, nutzen Sie den Verwaltungsbereich.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Completed Bans Section */}
          {(selectedType === 'all' && completedBans.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                ✅ Beendete Sperren ({completedBans.length})
              </h3>
              <div className="space-y-4">
                {completedBans.map((ban) => {
                  const progress = 100; // Completed bans are always 100%
                  
                  return (
                    <div key={ban.id} className="modern-card hover:bg-bg-secondary transition-colors cursor-pointer group opacity-75">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="text-2xl group-hover:scale-110 transition-transform">
                            {getBanIcon(ban.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-text-primary group-hover:text-primary-green transition-colors">
                                {getPlayerName(ban.player_id)}
                              </h3>
                              <TeamLogo team={getPlayerTeam(ban.player_id)} size="sm" className="group-hover:scale-110 transition-transform" />
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border transition-all group-hover:scale-105 ${getBanTypeColor(ban.type)}`}>
                                {ban.type}
                              </span>
                              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200 transition-all group-hover:scale-105">
                                ✅ Beendet
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-text-muted mb-1">
                                <span>Fortschritt: {ban.matchesserved || 0} / {ban.totalgames || 0} Spiele</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full bg-green-500 transition-all duration-300"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {ban.reason && (
                              <p className="text-sm text-text-muted">
                                Grund: {ban.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Filtered bans display (for specific ban types) */
        <>
          {filteredBans.length > 0 ? (
            <div className="space-y-4">
              {filteredBans.map((ban) => {
                const remainingGames = (ban.totalgames || 0) - (ban.matchesserved || 0);
                const progress = (ban.totalgames || 0) > 0 ? ((ban.matchesserved || 0) / (ban.totalgames || 0)) * 100 : 0;
                const isActive = remainingGames > 0;
                
                return (
                  <div key={ban.id} className="modern-card hover:bg-bg-secondary transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="text-2xl group-hover:scale-110 transition-transform">
                          {getBanIcon(ban.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-text-primary group-hover:text-primary-green transition-colors">
                              {getPlayerName(ban.player_id)}
                            </h3>
                            <TeamLogo team={getPlayerTeam(ban.player_id)} size="sm" className="group-hover:scale-110 transition-transform" />
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border transition-all group-hover:scale-105 ${getBanTypeColor(ban.type)}`}>
                              {ban.type}
                            </span>
                            {isActive ? (
                              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 transition-all group-hover:scale-105">
                                🔴 Aktiv - {remainingGames} Spiel{remainingGames !== 1 ? 'e' : ''} verbleibend
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200 transition-all group-hover:scale-105">
                                ✅ Beendet
                              </span>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-text-muted mb-1">
                              <span>Fortschritt: {ban.matchesserved || 0} / {ban.totalgames || 0} Spiele</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isActive ? 'bg-red-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {ban.reason && (
                            <p className="text-sm text-text-muted">
                              Grund: {ban.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Large remaining games indicator for active bans */}
                      {isActive && (
                        <div className="text-center ml-4">
                          <div className="text-2xl font-bold text-red-600">
                            {remainingGames}
                          </div>
                          <div className="text-xs text-red-600 uppercase font-medium">
                            Verbleibend
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🚫</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {selectedType === 'completed' ? 'Keine beendeten Sperren' : `Keine ${selectedType} Sperren`}
              </h3>
              <p className="text-text-muted">
                {selectedType === 'completed' 
                  ? 'Es gibt noch keine beendeten Sperren.'
                  : 'Versuche einen anderen Filter oder erstelle neue Sperren.'
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state for all tabs */}
      {((selectedType === 'active' && activeBans.length === 0) || 
        (selectedType === 'all' && bans?.length === 0)) && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🚫</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {selectedType === 'all' ? 'Keine Sperren gefunden' : 'Keine aktiven Sperren'}
          </h3>
          <p className="text-text-muted">
            {selectedType === 'all' 
              ? 'Es wurden noch keine Sperren erstellt.'
              : 'Aktuell sind keine Sperren aktiv.'
            }
          </p>
        </div>
      )}

      {/* Statistics Cards - moved to the end as requested */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div className="modern-card text-center hover:bg-bg-secondary transition-colors cursor-pointer group">
          <div className="text-2xl font-bold text-accent-red group-hover:scale-110 transition-transform">
            {activeBans.length}
          </div>
          <div className="text-sm text-text-muted group-hover:text-text-primary transition-colors">Aktive Sperren</div>
        </div>
        <div className="modern-card text-center hover:bg-bg-secondary transition-colors cursor-pointer group">
          <div className="text-2xl font-bold text-primary-green group-hover:scale-110 transition-transform">
            {completedBans.length}
          </div>
          <div className="text-sm text-text-muted group-hover:text-text-primary transition-colors">Beendete Sperren</div>
        </div>
        <div className="modern-card text-center hover:bg-bg-secondary transition-colors cursor-pointer group">
          <div className="text-2xl font-bold text-accent-orange group-hover:scale-110 transition-transform">
            {bans?.length || 0}
          </div>
          <div className="text-sm text-text-muted group-hover:text-text-primary transition-colors">Gesamt Sperren</div>
        </div>
        <div className="modern-card text-center hover:bg-bg-secondary transition-colors cursor-pointer group">
          <div className="text-2xl font-bold text-accent-blue group-hover:scale-110 transition-transform">
            {BAN_TYPES.length}
          </div>
          <div className="text-sm text-text-muted group-hover:text-text-primary transition-colors">Sperr-Arten</div>
        </div>
      </div>
    </div>
  );
}