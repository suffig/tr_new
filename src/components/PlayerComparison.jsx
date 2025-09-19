import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import LoadingSpinner from './LoadingSpinner';

export default function PlayerComparison() {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('goals');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: players, loading } = useSupabaseQuery('players', '*');
  const { data: matches } = useSupabaseQuery('matches', '*');

  // Calculate advanced player statistics
  const playersWithStats = useMemo(() => {
    if (!players || !matches) return [];
    
    return players.map(player => {
      // Find matches where this player scored
      const playerMatches = matches.filter(match => {
        const goalScorers = [
          ...(match.goalslista || '').split(',').filter(Boolean),
          ...(match.goalslistb || '').split(',').filter(Boolean)
        ];
        return goalScorers.includes(player.name);
      });

      // Calculate advanced statistics
      const totalMatches = playerMatches.length;
      const goals = player.goals || 0;
      const assists = player.assists || 0;
      const wins = playerMatches.filter(match => {
        const isAEK = player.team === 'AEK';
        return isAEK ? (match.goalsa > match.goalsb) : (match.goalsb > match.goalsa);
      }).length;
      
      const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
      const goalsPerMatch = totalMatches > 0 ? goals / totalMatches : 0;
      const value = player.value || 0;
      const valuePerGoal = goals > 0 ? value / goals : 0;

      // Performance rating calculation
      const performanceRating = Math.min(100, Math.max(0, 
        (goals * 10) + 
        (assists * 5) + 
        (winRate * 0.3) + 
        (goalsPerMatch * 15)
      ));

      return {
        ...player,
        totalMatches,
        wins,
        winRate,
        goalsPerMatch,
        valuePerGoal,
        performanceRating: Math.round(performanceRating)
      };
    });
  }, [players, matches]);

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return playersWithStats;
    return playersWithStats.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [playersWithStats, searchQuery]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      switch (sortBy) {
        case 'goals':
          return (b.goals || 0) - (a.goals || 0);
        case 'assists':
          return (b.assists || 0) - (a.assists || 0);
        case 'winRate':
          return b.winRate - a.winRate;
        case 'goalsPerMatch':
          return b.goalsPerMatch - a.goalsPerMatch;
        case 'value':
          return (b.value || 0) - (a.value || 0);
        case 'performance':
          return b.performanceRating - a.performanceRating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [filteredPlayers, sortBy]);

  const handlePlayerSelect = (player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const getPerformanceColor = (rating) => {
    if (rating >= 80) return 'text-green-600 bg-green-100';
    if (rating >= 60) return 'text-yellow-600 bg-yellow-100';
    if (rating >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatBarWidth = (value, maxValue) => {
    return maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  };

  if (loading) {
    return <LoadingSpinner message="Lade Spielervergleich..." />;
  }

  const maxValues = {
    goals: Math.max(...playersWithStats.map(p => p.goals || 0)),
    assists: Math.max(...playersWithStats.map(p => p.assists || 0)),
    winRate: Math.max(...playersWithStats.map(p => p.winRate)),
    value: Math.max(...playersWithStats.map(p => p.value || 0))
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          🏆 Erweiterte Spieleranalyse
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <i className="fas fa-chart-bar mr-2" />
          Vergleichsmodus
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Spieler suchen
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name oder Team eingeben..."
              className="input-field pl-10"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sortieren nach
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
          >
            <option value="performance">Leistungsrating</option>
            <option value="goals">Tore</option>
            <option value="assists">Assists</option>
            <option value="winRate">Siegquote</option>
            <option value="goalsPerMatch">Tore pro Spiel</option>
            <option value="value">Marktwert</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">
            {playersWithStats.length}
          </div>
          <div className="text-sm text-gray-600">Gesamt Spieler</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">
            {playersWithStats.reduce((sum, p) => sum + (p.goals || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Gesamt Tore</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(playersWithStats.reduce((sum, p) => sum + p.performanceRating, 0) / playersWithStats.length || 0)}
          </div>
          <div className="text-sm text-gray-600">Ø Leistung</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-yellow-600">
            {playersWithStats.reduce((sum, p) => sum + (p.value || 0), 0)}M €
          </div>
          <div className="text-sm text-gray-600">Gesamt Wert</div>
        </div>
      </div>

      {/* Players List */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Spieler
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Rating
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tore
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Assists
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Siegquote
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Wert
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        player.team === 'AEK' ? 'bg-blue-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {player.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {player.team} • {player.totalMatches} Spiele
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      getPerformanceColor(player.performanceRating)
                    }`}>
                      {player.performanceRating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <div className="font-medium">{player.goals || 0}</div>
                      <div className="w-16 h-2 bg-gray-200 rounded mx-auto">
                        <div 
                          className="h-2 bg-green-500 rounded"
                          style={{ width: `${getStatBarWidth(player.goals || 0, maxValues.goals)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <div className="font-medium">{player.assists || 0}</div>
                      <div className="w-16 h-2 bg-gray-200 rounded mx-auto">
                        <div 
                          className="h-2 bg-blue-500 rounded"
                          style={{ width: `${getStatBarWidth(player.assists || 0, maxValues.assists)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <div className="font-medium">{Math.round(player.winRate)}%</div>
                      <div className="w-16 h-2 bg-gray-200 rounded mx-auto">
                        <div 
                          className="h-2 bg-purple-500 rounded"
                          style={{ width: `${getStatBarWidth(player.winRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-medium">{player.value || 0}M €</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handlePlayerSelect(player)}
                      disabled={selectedPlayers.length >= 4 && !selectedPlayers.find(p => p.id === player.id)}
                      className={`text-sm px-3 py-1 rounded ${
                        selectedPlayers.find(p => p.id === player.id)
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      } transition-colors`}
                    >
                      {selectedPlayers.find(p => p.id === player.id) ? 'Entfernen' : 'Vergleichen'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  Spielervergleich ({selectedPlayers.length}/4)
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedPlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Wählen Sie bis zu 4 Spieler aus der Liste aus, um sie zu vergleichen.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedPlayers.map(player => (
                    <div key={player.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <h4 className="font-bold text-lg">{player.name}</h4>
                        <p className="text-sm text-gray-600">{player.team}</p>
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold mt-2 ${
                          getPerformanceColor(player.performanceRating)
                        }`}>
                          Rating: {player.performanceRating}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Tore:</span>
                          <span className="font-medium">{player.goals || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Assists:</span>
                          <span className="font-medium">{player.assists || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Spiele:</span>
                          <span className="font-medium">{player.totalMatches}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Siegquote:</span>
                          <span className="font-medium">{Math.round(player.winRate)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Tore/Spiel:</span>
                          <span className="font-medium">{player.goalsPerMatch.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Marktwert:</span>
                          <span className="font-medium">{player.value || 0}M €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">€/Tor:</span>
                          <span className="font-medium">
                            {player.valuePerGoal > 0 ? `${player.valuePerGoal.toFixed(1)}M` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}