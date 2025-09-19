import React, { useState } from 'react';
import EAPlayerCard from './EAPlayerCard';

const EASquadOverview = ({ players, loading, onPlayerClick }) => {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [sortBy, setSortBy] = useState('overall'); // 'overall', 'name', 'position', 'team', 'goals'
  const [filterTeam, setFilterTeam] = useState('all');

  const getTeamPlayers = (teamName) => {
    if (!players) return [];
    return players.filter(p => p.team === teamName);
  };

  const aekPlayers = getTeamPlayers('AEK');
  const realPlayers = getTeamPlayers('Real');
  const allActivePlayers = [...aekPlayers, ...realPlayers];

  const filteredPlayers = filterTeam === 'all' ? allActivePlayers :
                         filterTeam === 'AEK' ? aekPlayers :
                         filterTeam === 'Real' ? realPlayers : [];

  const getTeamStats = (teamPlayers) => {
    if (!teamPlayers.length) return { totalGoals: 0, totalValue: 0, avgGoals: 0 };
    
    const totalGoals = teamPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalValue = teamPlayers.reduce((sum, p) => sum + (p.value || 0), 0);
    const avgGoals = totalGoals / teamPlayers.length;
    
    return { totalGoals, totalValue, avgGoals: avgGoals.toFixed(1) };
  };

  const aekStats = getTeamStats(aekPlayers);
  const realStats = getTeamStats(realPlayers);

  const formatValue = (value) => {
    if (typeof value === 'number') return `${value.toFixed(1)}M €`;
    return value || 'N/A';
  };

  if (loading) {
    return (
      <div className="modern-card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
          <span className="ml-3 text-text-muted">Loading player data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ea-squad-overview space-y-6">
      {/* Header and Controls */}
      <div className="modern-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">⚽</span>
              EA Sports FC Squad Overview
            </h2>
            <p className="text-text-muted mt-1">
              FIFA-style player cards with EA Sports FC ratings and statistics
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-bg-secondary p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-primary-blue text-white' 
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <i className="fas fa-th-large mr-1"></i>
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-primary-blue text-white' 
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <i className="fas fa-table mr-1"></i>
                Table
              </button>
            </div>

            {/* Team Filter */}
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="px-3 py-1 rounded-lg bg-bg-secondary text-text-primary border border-border-light text-sm"
            >
              <option value="all">All Teams</option>
              <option value="AEK">AEK Athens</option>
              <option value="Real">Real Madrid</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 rounded-lg bg-bg-secondary text-text-primary border border-border-light text-sm"
            >
              <option value="overall">Overall Rating</option>
              <option value="name">Name</option>
              <option value="position">Position</option>
              <option value="goals">Goals</option>
              <option value="value">Market Value</option>
            </select>
          </div>
        </div>

        {/* Team Comparison Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔵</span>
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">AEK Athens</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-blue-700 dark:text-blue-300">{aekPlayers.length}</div>
                <div className="text-text-muted">Players</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-blue-700 dark:text-blue-300">{aekStats.totalGoals}</div>
                <div className="text-text-muted">Goals</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-blue-700 dark:text-blue-300">{formatValue(aekStats.totalValue)}</div>
                <div className="text-text-muted">Squad Value</div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔴</span>
              <h3 className="font-semibold text-red-700 dark:text-red-300">Real Madrid</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-red-700 dark:text-red-300">{realPlayers.length}</div>
                <div className="text-text-muted">Players</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-red-700 dark:text-red-300">{realStats.totalGoals}</div>
                <div className="text-text-muted">Goals</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-red-700 dark:text-red-300">{formatValue(realStats.totalValue)}</div>
                <div className="text-text-muted">Squad Value</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players Display */}
      <div className="modern-card">
        {viewMode === 'cards' ? (
          <>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fas fa-th-large text-primary-blue"></i>
              Player Cards ({filteredPlayers.length})
            </h3>
            {filteredPlayers.length > 0 ? (
              <div className="ea-squad-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredPlayers.map((player) => (
                  <EAPlayerCard 
                    key={player.id} 
                    player={player} 
                    size="medium" 
                    showDetails={true}
                    onPlayerClick={onPlayerClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <i className="fas fa-users text-4xl mb-4 opacity-50"></i>
                <p>No players found for the selected filters</p>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fas fa-table text-primary-blue"></i>
              Player Statistics Table ({filteredPlayers.length})
            </h3>
            {filteredPlayers.length > 0 ? (
              <div className="ea-squad-table overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left py-3 px-2">Player</th>
                      <th className="text-left py-3 px-2">Team</th>
                      <th className="text-center py-3 px-2">OVR</th>
                      <th className="text-center py-3 px-2">Position</th>
                      <th className="text-center py-3 px-2">PAC</th>
                      <th className="text-center py-3 px-2">SHO</th>
                      <th className="text-center py-3 px-2">PAS</th>
                      <th className="text-center py-3 px-2">DRI</th>
                      <th className="text-center py-3 px-2">DEF</th>
                      <th className="text-center py-3 px-2">PHY</th>
                      <th className="text-center py-3 px-2">Goals</th>
                      <th className="text-right py-3 px-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player) => (
                      <tr key={player.id} className="border-b border-border-light hover:bg-bg-secondary">
                        <td className="py-3 px-2">
                          <div className="font-medium text-text-primary">{player.name}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            player.team === 'AEK' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {player.team}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <EAPlayerCard player={player} size="small" showDetails={false} />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-1 rounded bg-bg-tertiary text-xs">
                            {player.position || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono">-</td>
                        <td className="py-3 px-2 text-center font-mono">-</td>
                        <td className="py-3 px-2 text-center font-mono">-</td>
                        <td className="py-3 px-2 text-center font-mono">-</td>
                        <td className="py-3 px-2 text-center font-mono">-</td>
                        <td className="py-3 px-2 text-center font-mono">-</td>
                        <td className="py-3 px-2 text-center font-bold text-yellow-600">
                          {player.goals || 0}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-green-600">
                          {formatValue(player.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <i className="fas fa-table text-4xl mb-4 opacity-50"></i>
                <p>No players found for the selected filters</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Optimization Notice */}
      <div className="modern-card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 lg:hidden">
        <div className="flex items-start gap-3">
          <i className="fas fa-mobile-alt text-blue-600 dark:text-blue-400 mt-1"></i>
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Mobile Optimized</h4>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              This view is optimized for mobile devices. Swipe horizontally on tables for better navigation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EASquadOverview;