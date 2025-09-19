import { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';

export default function SpielerTab() {
  const [activeView, setActiveView] = useState('tore');
  
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');

  const loading = matchesLoading || playersLoading;

  // Calculate top scorers from goalslista and goalslistb
  const calculateTopScorers = () => {
    if (!matches || !players) return [];
    
    const scorerStats = {};
    
    matches.forEach(match => {
      // Process goalslista (AEK goals)
      if (match.goalslista) {
        const goalsListA = Array.isArray(match.goalslista) 
          ? match.goalslista 
          : (typeof match.goalslista === 'string' ? JSON.parse(match.goalslista) : []);
        
        goalsListA.forEach(goal => {
          // Handle both object format {player, count} and string format
          const playerName = typeof goal === 'object' ? goal.player : goal;
          const goalCount = typeof goal === 'object' ? (goal.count || 1) : 1;
          
          // Ignore own goals (Eigentore_*)
          if (playerName && !playerName.startsWith('Eigentore_')) {
            scorerStats[playerName] = (scorerStats[playerName] || 0) + goalCount;
          }
        });
      }
      
      // Process goalslistb (Real goals)  
      if (match.goalslistb) {
        const goalsListB = Array.isArray(match.goalslistb)
          ? match.goalslistb
          : (typeof match.goalslistb === 'string' ? JSON.parse(match.goalslistb) : []);
        
        goalsListB.forEach(goal => {
          // Handle both object format {player, count} and string format
          const playerName = typeof goal === 'object' ? goal.player : goal;
          const goalCount = typeof goal === 'object' ? (goal.count || 1) : 1;
          
          // Ignore own goals (Eigentore_*)
          if (playerName && !playerName.startsWith('Eigentore_')) {
            scorerStats[playerName] = (scorerStats[playerName] || 0) + goalCount;
          }
        });
      }
    });

    // Convert to array and sort
    const topScorers = Object.entries(scorerStats)
      .map(([name, goals]) => ({
        name,
        goals,
        // Find player details
        player: players.find(p => p.name === name)
      }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);

    return topScorers;
  };

  // Calculate players of the match from manofthematch field
  const calculatePlayersOfMatch = () => {
    if (!matches || !players) return [];
    
    const playerStats = {};
    
    matches.forEach(match => {
      if (match.manofthematch) {
        const playerName = match.manofthematch.trim();
        if (playerName) {
          playerStats[playerName] = (playerStats[playerName] || 0) + 1;
        }
      }
    });

    // Convert to array and sort
    const topPlayers = Object.entries(playerStats)
      .map(([name, awards]) => ({
        name,
        awards,
        // Find player details
        player: players.find(p => p.name === name)
      }))
      .sort((a, b) => b.awards - a.awards)
      .slice(0, 10);

    return topPlayers;
  };

  const getTeamIndicator = (team) => {
    if (team === "Ehemalige") 
      return <span className="w-3 h-3 bg-slate-400 rounded-full inline-block mr-2"></span>;
    if (team === "AEK") 
      return <span className="w-3 h-3 bg-blue-400 rounded-full inline-block mr-2"></span>;
    if (team === "Real") 
      return <span className="w-3 h-3 bg-purple-400 rounded-full inline-block mr-2"></span>;
    return <span className="w-3 h-3 bg-gray-400 rounded-full inline-block mr-2"></span>;
  };

  const getBadge = (index) => {
    if (index === 0) return <span className="text-2xl mr-2">🥇</span>;
    if (index === 1) return <span className="text-2xl mr-2">🥈</span>;
    if (index === 2) return <span className="text-2xl mr-2">🥉</span>;
    return null;
  };

  const getCardClass = (team, position) => {
    const baseClass = "modern-card transition-all duration-300";
    
    if (position < 3) {
      // Top 3 get special styling
      if (team === "AEK") return `${baseClass} bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200`;
      if (team === "Real") return `${baseClass} bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200`;
      if (team === "Ehemalige") return `${baseClass} bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200`;
    }
    
    return baseClass;
  };

  if (loading) {
    return <LoadingSpinner message="Lade Spieler-Statistiken..." />;
  }

  const topScorers = calculateTopScorers();
  const playersOfMatch = calculatePlayersOfMatch();

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Spieler-Übersicht
        </h2>
        
        {/* Tab Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setActiveView('tore')}
            className={`flex-1 transition-all duration-150 font-bold rounded-xl px-4 py-3 shadow-lg focus:ring-2 focus:outline-none min-h-[48px] text-sm sm:text-base ${
              activeView === 'tore'
                ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:from-blue-500 hover:to-blue-700 focus:ring-blue-300'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 focus:ring-gray-300'
            }`}
          >
            <i className="fas fa-futbol mr-2"></i>
            Torschützen
          </button>
          
          <button
            onClick={() => setActiveView('sds')}
            className={`flex-1 transition-all duration-150 font-bold rounded-xl px-4 py-3 shadow-lg focus:ring-2 focus:outline-none min-h-[48px] text-sm sm:text-base ${
              activeView === 'sds'
                ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 hover:from-yellow-400 hover:to-yellow-600 focus:ring-yellow-300'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 focus:ring-gray-300'
            }`}
          >
            <i className="fas fa-star mr-2"></i>
            Spieler des Spiels
          </button>
        </div>
      </div>

      {/* Content */}
      <div id="spieler-content">
        {activeView === 'tore' && (
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              🏆 Top Torschützen
            </h3>
            
            {topScorers.length > 0 ? (
              <div className="space-y-3">
                {topScorers.map((scorer, index) => (
                  <div 
                    key={scorer.name} 
                    className={getCardClass(scorer.player?.team, index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getBadge(index)}
                        {getTeamIndicator(scorer.player?.team)}
                        <div>
                          <div className="font-medium text-text-primary">
                            {scorer.name}
                            {scorer.goals > 1 && (
                              <span className="ml-2 text-xs bg-primary-green text-white px-2 py-1 rounded">
                                {scorer.goals}x
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted">
                            Marktwert: {scorer.player?.value || 0}M € • {scorer.player?.position || 'Unbekannt'}
                          </div>
                          <div className="text-xs text-text-muted">
                            {scorer.player?.team || 'Unbekannt'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-green">
                          {scorer.goals} ⚽
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚽</div>
                <p className="text-text-muted">Noch keine Torschützen verfügbar</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'sds' && (
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              ⭐ Top Spieler des Spiels
            </h3>
            
            {playersOfMatch.length > 0 ? (
              <div className="space-y-3">
                {playersOfMatch.map((player, index) => (
                  <div 
                    key={player.name} 
                    className={getCardClass(player.player?.team, index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getBadge(index)}
                        {getTeamIndicator(player.player?.team)}
                        <div>
                          <div className="font-semibold text-text-primary">
                            {player.name}
                          </div>
                          <div className="text-sm text-text-muted">
                            {player.player?.position || 'Unbekannt'} • {player.player?.team || 'Unbekannt'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent-orange">
                          {player.awards}
                        </div>
                        <div className="text-xs text-text-muted">
                          {player.awards === 1 ? 'Auszeichnung' : 'Auszeichnungen'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⭐</div>
                <p className="text-text-muted">Noch keine Spieler des Spiels verfügbar</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}