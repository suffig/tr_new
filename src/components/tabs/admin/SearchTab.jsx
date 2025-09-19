import { useState } from 'react';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import EnhancedSearch from '../../EnhancedSearch';
import LoadingSpinner from '../../LoadingSpinner';

export default function SearchTab({ onNavigate }) {
  const [activeSearchType, setActiveSearchType] = useState('players');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch all data
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*', {
    order: { column: 'date', ascending: false }
  });
  const { data: transactions, loading: transactionsLoading } = useSupabaseQuery('transactions', '*', {
    order: { column: 'date', ascending: false }
  });
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*', {
    order: { column: 'id', ascending: false }
  });

  const loading = playersLoading || matchesLoading || transactionsLoading || bansLoading;

  const searchTypes = [
    { 
      id: 'players', 
      label: 'Spieler', 
      icon: 'fas fa-users',
      data: players || [],
      searchFields: ['name', 'position', 'team', 'value'],
      filterOptions: [
        {
          key: 'team',
          label: 'Team',
          options: [
            { value: 'AEK', label: 'AEK Athen' },
            { value: 'Real', label: 'Real Madrid' },
            { value: 'Ehemalige', label: 'Ehemalige' }
          ]
        },
        {
          key: 'position',
          label: 'Position',
          options: [
            { value: 'TH', label: 'Torwart' },
            { value: 'IV', label: 'Innenverteidiger' },
            { value: 'LV', label: 'Linksverteidiger' },
            { value: 'RV', label: 'Rechtsverteidiger' },
            { value: 'ZDM', label: 'Defensives Mittelfeld' },
            { value: 'ZM', label: 'Zentrales Mittelfeld' },
            { value: 'ZOM', label: 'Offensives Mittelfeld' },
            { value: 'LM', label: 'Linkes Mittelfeld' },
            { value: 'RM', label: 'Rechtes Mittelfeld' },
            { value: 'LF', label: 'Linker Flügel' },
            { value: 'RF', label: 'Rechter Flügel' },
            { value: 'ST', label: 'Stürmer' }
          ]
        }
      ]
    },
    {
      id: 'matches',
      label: 'Spiele',
      icon: 'fas fa-futbol',
      data: matches || [],
      searchFields: ['date', 'goalsa', 'goalsb', 'goalscorers', 'manofthematch', 'teama', 'teamb'],
      filterOptions: [],
      searchExtractor: (match) => {
        // Extract searchable content from match data
        const searchableText = [];
        
        // Basic match info
        if (match.date) searchableText.push(new Date(match.date).toLocaleDateString('de-DE'));
        if (match.teama) searchableText.push(match.teama);
        if (match.teamb) searchableText.push(match.teamb);
        if (match.goalsa !== undefined) searchableText.push(match.goalsa.toString());
        if (match.goalsb !== undefined) searchableText.push(match.goalsb.toString());
        
        // Extract goalscorer names from goalslista
        if (match.goalslista) {
          try {
            const goalsList = typeof match.goalslista === 'string' 
              ? JSON.parse(match.goalslista) 
              : match.goalslista;
            
            if (Array.isArray(goalsList)) {
              goalsList.forEach(goal => {
                if (typeof goal === 'string') {
                  searchableText.push(goal);
                } else if (goal && goal.player) {
                  searchableText.push(goal.player);
                }
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Extract goalscorer names from goalslistb
        if (match.goalslistb) {
          try {
            const goalsList = typeof match.goalslistb === 'string' 
              ? JSON.parse(match.goalslistb) 
              : match.goalslistb;
            
            if (Array.isArray(goalsList)) {
              goalsList.forEach(goal => {
                if (typeof goal === 'string') {
                  searchableText.push(goal);
                } else if (goal && goal.player) {
                  searchableText.push(goal.player);
                }
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Add Man of the Match (SdS)
        if (match.manofthematch) {
          searchableText.push(match.manofthematch);
          searchableText.push('Spieler des Spiels');
          searchableText.push('SdS');
        }
        
        return searchableText.join(' ').toLowerCase();
      }
    },
    {
      id: 'transactions',
      label: 'Transaktionen',
      icon: 'fas fa-euro-sign',
      data: transactions || [],
      searchFields: ['type', 'description', 'amount', 'date'],
      filterOptions: [
        {
          key: 'type',
          label: 'Typ',
          options: [
            { value: 'transfer', label: 'Transfer' },
            { value: 'preis', label: 'Preisgeld' },
            { value: 'strafe', label: 'Strafe' },
            { value: 'sonstige', label: 'Sonstige' }
          ],
          filterFn: (transaction, value) => {
            const type = transaction.type?.toLowerCase() || '';
            const desc = transaction.description?.toLowerCase() || '';
            switch (value) {
              case 'transfer': return type.includes('transfer') || desc.includes('transfer');
              case 'preis': return type.includes('preis') || desc.includes('preis') || transaction.amount > 0;
              case 'strafe': return type.includes('strafe') || desc.includes('strafe');
              case 'sonstige': return !type.includes('transfer') && !type.includes('preis') && !type.includes('strafe');
              default: return true;
            }
          }
        }
      ]
    },
    {
      id: 'bans',
      label: 'Sperren',
      icon: 'fas fa-ban',
      data: bans || [],
      searchFields: ['player_name', 'team', 'type', 'reason'],
      filterOptions: [
        {
          key: 'team',
          label: 'Team',
          options: [
            { value: 'AEK', label: 'AEK Athen' },
            { value: 'Real', label: 'Real Madrid' }
          ]
        },
        {
          key: 'type',
          label: 'Typ',
          options: [
            { value: 'Gelbe Karte', label: 'Gelbe Karte' },
            { value: 'Gelb-Rote Karte', label: 'Gelb-Rote Karte' },
            { value: 'Rote Karte', label: 'Rote Karte' },
            { value: 'Verletzung', label: 'Verletzung' }
          ]
        }
      ]
    }
  ];

  const currentSearchType = searchTypes.find(type => type.id === activeSearchType);

  // Handler for clicking on search results
  const handleResultClick = (item, type) => {
    switch (type) {
      case 'players':
        // Navigate to player management
        onNavigate?.('squad'); // or wherever players are managed
        break;
      case 'matches':
        // Navigate to matches view
        onNavigate?.('matches');
        break;
      case 'transactions':
        // Navigate to financial view
        onNavigate?.('finances');
        break;
      case 'bans':
        // Navigate to bans view
        onNavigate?.('bans');
        break;
      default:
        break;
    }
  };

  const renderSearchResults = () => {
    const results = searchResults.length > 0 ? searchResults : currentSearchType.data;
    
    if (results.length === 0) {
      return (
        <div className="p-6 text-center text-text-secondary">
          <i className={`${currentSearchType.icon} text-4xl mb-2`}></i>
          <p>Keine {currentSearchType.label.toLowerCase()} gefunden</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border-light">
        {results.map((item) => (
          <button
            key={item.id}
            onClick={() => handleResultClick(item, activeSearchType)}
            className="w-full p-4 hover:bg-bg-secondary transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-inset"
          >
            {activeSearchType === 'players' && (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{item.name}</h3>
                  <p className="text-sm text-text-secondary">
                    {item.position} • {item.team} • {item.value || 0}M €
                  </p>
                  {(item.goals || 0) > 0 && (
                    <p className="text-xs text-primary-green">⚽ {item.goals || 0} Tore</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-primary-green">
                    {item.value || 0}M €
                  </div>
                  <div className="text-xs text-text-muted">Zum Spieler →</div>
                </div>
              </div>
            )}

            {activeSearchType === 'matches' && (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">
                    {new Date(item.date).toLocaleDateString('de-DE')}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {item.teama || 'AEK'} {item.goalsa || 0} - {item.goalsb || 0} {item.teamb || 'Real'}
                  </p>
                  {/* Show goalscorers if available */}
                  {(() => {
                    const goalscorers = [];
                    
                    // Extract goalscorers from both teams
                    try {
                      if (item.goalslista) {
                        const aekGoals = typeof item.goalslista === 'string' 
                          ? JSON.parse(item.goalslista) 
                          : item.goalslista;
                        if (Array.isArray(aekGoals)) {
                          aekGoals.forEach(goal => {
                            const name = typeof goal === 'string' ? goal : goal?.player;
                            if (name) goalscorers.push(`${name} (AEK)`);
                          });
                        }
                      }
                      
                      if (item.goalslistb) {
                        const realGoals = typeof item.goalslistb === 'string' 
                          ? JSON.parse(item.goalslistb) 
                          : item.goalslistb;
                        if (Array.isArray(realGoals)) {
                          realGoals.forEach(goal => {
                            const name = typeof goal === 'string' ? goal : goal?.player;
                            if (name) goalscorers.push(`${name} (Real)`);
                          });
                        }
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                    
                    return goalscorers.length > 0 ? (
                      <p className="text-xs text-text-muted mt-1">
                        ⚽ {goalscorers.slice(0, 3).join(', ')}
                        {goalscorers.length > 3 ? '...' : ''}
                      </p>
                    ) : null;
                  })()}
                  
                  {/* Show Man of the Match if available */}
                  {item.manofthematch && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⭐ SdS: {item.manofthematch}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-primary-green">
                    {(item.goalsa || 0) + (item.goalsb || 0)} Tore
                  </div>
                  <div className="text-xs text-text-muted">Zum Spiel →</div>
                </div>
              </div>
            )}

            {activeSearchType === 'transactions' && (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{item.type || 'Transaktion'}</h3>
                  <p className="text-sm text-text-secondary">{item.description || 'Keine Beschreibung'}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(item.date).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-lg font-bold ${
                    (item.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(item.amount || 0) > 0 ? '+' : ''}{item.amount || 0}€
                  </div>
                  <div className="text-xs text-text-muted">Zu Finanzen →</div>
                </div>
              </div>
            )}

            {activeSearchType === 'bans' && (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{item.player_name}</h3>
                  <p className="text-sm text-text-secondary">{item.team} • {item.type}</p>
                  {item.reason && (
                    <p className="text-xs text-text-secondary">{item.reason}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm text-accent-red">
                    {item.duration || 1} Spiel{(item.duration || 1) !== 1 ? 'e' : ''}
                  </div>
                  <div className="text-xs text-text-muted">Zu Sperren →</div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Lade Daten..." />;
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">🔍 Globale Suche</h3>
        <p className="text-text-muted text-sm">
          Durchsuche alle Daten zentral an einem Ort
        </p>
      </div>

      {/* Search Type Tabs */}
      <div className="icon-only-nav flex overflow-x-auto space-x-2 pb-2">
        {searchTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setActiveSearchType(type.id);
              setSearchResults([]);
            }}
            className={`search-nav-button flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeSearchType === type.id
                ? 'bg-primary-green text-white'
                : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary'
            }`}
            title={type.label}
            aria-label={type.label}
          >
            <i className={type.icon}></i>
            <span className="font-medium hidden sm:inline">{type.label}</span>
            <span className="text-xs opacity-75">({type.data.length})</span>
          </button>
        ))}
      </div>

      {/* Enhanced Search */}
      <EnhancedSearch
        data={currentSearchType.data}
        searchFields={currentSearchType.searchFields}
        filterOptions={currentSearchType.filterOptions}
        searchExtractor={currentSearchType.searchExtractor}
        onResults={setSearchResults}
        placeholder={`${currentSearchType.label} durchsuchen...`}
      />

      {/* Search Results */}
      <div className="modern-card">
        <div className="p-4 border-b border-border-light">
          <h4 className="font-medium text-text-primary">
            {searchResults.length > 0 ? 'Suchergebnisse' : `Alle ${currentSearchType.label}`}
            <span className="text-text-secondary ml-2">
              ({searchResults.length > 0 ? searchResults.length : currentSearchType.data.length})
            </span>
          </h4>
        </div>
        {renderSearchResults()}
      </div>
    </div>
  );
}