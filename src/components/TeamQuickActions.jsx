import { useState } from 'react';

export default function TeamQuickActions({ onNavigate }) {
  const [favoriteTeam, setFavoriteTeam] = useState(
    localStorage.getItem('userFavoriteTeam') || 'AEK'
  );

  const teams = [
    { value: 'AEK', label: 'AEK', emoji: '💙', color: 'blue' },
    { value: 'Real', label: 'Real', emoji: '🤍', color: 'gray' },
    { value: 'Ehemalige', label: 'Ehemalige', emoji: '👴', color: 'orange' }
  ];

  const quickActions = [
    {
      id: 'squad',
      label: 'Kader',
      icon: '👥',
      description: 'Team-Übersicht',
      color: 'bg-system-blue/10 text-system-blue'
    },
    {
      id: 'stats',
      label: 'Statistiken',
      icon: '📊',
      description: 'Team-Stats',
      color: 'bg-system-green/10 text-system-green'
    },
    {
      id: 'finanzen',
      label: 'Finanzen',
      icon: '€',
      description: 'Geld & Ausgaben',
      color: 'bg-system-orange/10 text-system-orange'
    },
    {
      id: 'bans',
      label: 'Sperren',
      icon: '🚫',
      description: 'Aktuelle Sperren',
      color: 'bg-system-red/10 text-system-red'
    }
  ];

  const handleTeamChange = (teamValue) => {
    setFavoriteTeam(teamValue);
    localStorage.setItem('userFavoriteTeam', teamValue);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('userPreferencesChanged', {
      detail: { favoriteTeam: teamValue }
    }));
  };

  const currentTeam = teams.find(t => t.value === favoriteTeam) || teams[0];

  return (
    <div className="modern-card p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentTeam.emoji}</span>
          <h3 className="text-lg font-bold text-text-primary">
            Team {currentTeam.label}
          </h3>
        </div>
        
        {/* Team Selector */}
        <select
          value={favoriteTeam}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="text-sm border border-border-light rounded-lg px-2 py-1 bg-bg-secondary text-text-primary"
        >
          {teams.map(team => (
            <option key={team.value} value={team.value}>
              {team.emoji} {team.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className={`p-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${action.color}`}
          >
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
              <span className="text-xs opacity-75">{action.description}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Activity Hint */}
      <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>💡</span>
          <span>
            Tipp: Wähle dein Lieblingsteam aus, um personalisierte Inhalte zu erhalten
          </span>
        </div>
      </div>
    </div>
  );
}