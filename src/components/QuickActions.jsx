import { useState } from 'react';

export default function QuickActions({ activeTab, onNavigate, onAction }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getQuickActions = () => {
    const baseActions = [
      {
        id: 'search',
        icon: '🔍',
        label: 'Suchen',
        description: 'Globale Suche (Strg+K)',
        action: () => onAction('global-search')
      },
      {
        id: 'add-match',
        icon: '⚽',
        label: 'Spiel',
        description: 'Neues Spiel hinzufügen',
        action: () => onNavigate('matches', { action: 'add' })
      },
      {
        id: 'add-player',
        icon: '👤',
        label: 'Spieler',
        description: 'Neuen Spieler hinzufügen',
        action: () => onNavigate('squad', { action: 'add' })
      },
      {
        id: 'add-transaction',
        icon: '💰',
        label: 'Transaktion',
        description: 'Neue Transaktion hinzufügen',
        action: () => onNavigate('finanzen', { action: 'add' })
      }
    ];

    // Tab-specific actions
    const tabActions = {
      matches: [
        {
          id: 'formation-planner',
          icon: '🏟️',
          label: 'Formation',
          description: 'Aufstellungsplaner öffnen',
          action: () => onAction('formation-planner')
        },
        {
          id: 'match-stats',
          icon: '📊',
          label: 'Stats',
          description: 'Spielstatistiken anzeigen',
          action: () => onNavigate('stats')
        }
      ],
      squad: [
        {
          id: 'team-balance',
          icon: '⚖️',
          label: 'Balance',
          description: 'Team-Balance prüfen',
          action: () => onAction('team-balance')
        },
        {
          id: 'player-report',
          icon: '📋',
          label: 'Report',
          description: 'Spieler-Report erstellen',
          action: () => onAction('player-report')
        }
      ],
      finanzen: [
        {
          id: 'financial-report',
          icon: '📈',
          label: 'Report',
          description: 'Finanzbericht erstellen',
          action: () => onAction('financial-report')
        },
        {
          id: 'budget-planner',
          icon: '💼',
          label: 'Budget',
          description: 'Budget-Planer öffnen',
          action: () => onAction('budget-planner')
        }
      ],
      bans: [
        {
          id: 'add-ban',
          icon: '🚫',
          label: 'Sperre',
          description: 'Neue Sperre hinzufügen',
          action: () => onAction('add-ban')
        },
        {
          id: 'ban-report',
          icon: '📋',
          label: 'Report',
          description: 'Sperren-Übersicht',
          action: () => onAction('ban-report')
        }
      ],
      stats: [
        {
          id: 'export-stats',
          icon: '📊',
          label: 'Export',
          description: 'Statistiken exportieren',
          action: () => onAction('export-stats')
        },
        {
          id: 'compare-teams',
          icon: '🆚',
          label: 'Vergleich',
          description: 'Team-Vergleich anzeigen',
          action: () => onAction('compare-teams')
        }
      ],
      admin: [
        {
          id: 'backup',
          icon: '💾',
          label: 'Backup',
          description: 'Datensicherung erstellen',
          action: () => onAction('create-backup')
        },
        {
          id: 'settings',
          icon: '⚙️',
          label: 'Einstellungen',
          description: 'App-Einstellungen',
          action: () => onAction('app-settings')
        }
      ]
    };

    const currentTabActions = tabActions[activeTab] || [];
    
    if (isExpanded) {
      return [...baseActions, ...currentTabActions];
    } else {
      // Show most relevant actions for current tab
      return [...baseActions.slice(0, 2), ...currentTabActions.slice(0, 2)];
    }
  };

  const actions = getQuickActions();

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-bg-secondary border-b border-border-light shadow-sm">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="flex items-center gap-2 px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary hover:bg-bg-tertiary hover:border-primary-green transition-all duration-200 whitespace-nowrap group"
                title={action.description}
              >
                <span className="text-lg" aria-hidden="true">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={handleToggleExpanded}
            className="flex items-center gap-1 px-2 py-2 text-text-secondary hover:text-text-primary transition-colors duration-200 ml-2"
            title={isExpanded ? 'Weniger anzeigen' : 'Mehr Aktionen anzeigen'}
          >
            <span className="text-sm">{isExpanded ? 'Weniger' : 'Mehr'}</span>
            <span className="text-xs transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
        </div>
        
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-border-light">
            <div className="text-xs text-text-secondary mb-2">Tastenkombinationen:</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-bg-tertiary px-2 py-1 rounded border border-border-light">
                <strong>Strg+K</strong> Suchen
              </span>
              <span className="bg-bg-tertiary px-2 py-1 rounded border border-border-light">
                <strong>Strg+N</strong> Neu
              </span>
              <span className="bg-bg-tertiary px-2 py-1 rounded border border-border-light">
                <strong>Strg+S</strong> Speichern
              </span>
              <span className="bg-bg-tertiary px-2 py-1 rounded border border-border-light">
                <strong>Strg+E</strong> Export
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}