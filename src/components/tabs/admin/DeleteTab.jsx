import { useState } from 'react';
import { useSupabaseQuery, useSupabaseMutation } from '../../../hooks/useSupabase';
import { TEAMS } from '../../../constants/teams';
import { deleteMatch } from '../../../services/matchService';
import LoadingSpinner from '../../LoadingSpinner';
import toast from 'react-hot-toast';

export default function DeleteTab() {
  const [activeSection, setActiveSection] = useState('players');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatches, setSelectedMatches] = useState(new Set());

  // Data queries - sorted by newest first
  const { data: players, refetch: refetchPlayers } = useSupabaseQuery('players', '*', {
    order: { column: 'id', ascending: false }
  });
  const { data: matches, refetch: refetchMatches } = useSupabaseQuery('matches', '*', {
    order: { column: 'date', ascending: false }
  });
  const { data: bans, refetch: refetchBans } = useSupabaseQuery('bans', '*', {
    order: { column: 'id', ascending: false }
  });
  const { data: transactions, refetch: refetchTransactions } = useSupabaseQuery('transactions', '*', {
    order: { column: 'date', ascending: false }
  });

  // Mutations
  const { remove: removePlayer } = useSupabaseMutation('players');
  const { remove: removeBan } = useSupabaseMutation('bans');
  const { remove: removeTransaction } = useSupabaseMutation('transactions');

  const sections = [
    { id: 'players', label: 'Spieler löschen', icon: 'fas fa-users' },
    { id: 'matches', label: 'Spiele löschen (Einzel & Bulk)', icon: 'fas fa-futbol' },
    { id: 'bans', label: 'Sperren löschen', icon: 'fas fa-ban' },
    { id: 'transactions', label: 'Transaktionen löschen', icon: 'fas fa-euro-sign' },
  ];

  // Clear search when switching sections
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSearchQuery('');
    setSelectedMatches(new Set()); // Clear selection when switching sections
  };

  // Match selection handlers
  const handleMatchSelection = (matchId, isSelected) => {
    const newSelection = new Set(selectedMatches);
    if (isSelected) {
      newSelection.add(matchId);
    } else {
      newSelection.delete(matchId);
    }
    setSelectedMatches(newSelection);
  };

  const handleSelectAllMatches = (matches) => {
    const filteredMatches = filterMatches(matches);
    if (selectedMatches.size === filteredMatches.length) {
      // Deselect all
      setSelectedMatches(new Set());
    } else {
      // Select all
      setSelectedMatches(new Set(filteredMatches.map(m => m.id)));
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedMatches.size === 0) {
      toast.error('Keine Spiele ausgewählt');
      return;
    }

    const selectedMatchObjects = matches?.filter(m => selectedMatches.has(m.id)) || [];
    const totalTransactions = selectedMatchObjects.reduce((count, match) => {
      return count + (transactions?.filter(t => t.match_id === match.id).length || 0);
    }, 0);

    let confirmMessage = `Sind Sie sicher, dass Sie ${selectedMatches.size} ausgewählte Spiele löschen möchten?`;
    if (totalTransactions > 0) {
      confirmMessage += `\n\nAchtung: ${totalTransactions} zugehörige Transaktion(en) werden ebenfalls gelöscht.`;
    }
    confirmMessage += '\n\nDieser Vorgang kann nicht rückgängig gemacht werden!';

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    let deletedCount = 0;
    let failedCount = 0;

    try {
      // Delete matches one by one to handle individual errors
      for (const matchId of selectedMatches) {
        try {
          console.log(`Deleting match ${matchId}`);
          await deleteMatch(matchId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete match ${matchId}:`, error);
          failedCount++;
        }
      }

      // Clear selection after operation
      setSelectedMatches(new Set());

      // Show results
      if (deletedCount > 0 && failedCount === 0) {
        toast.success(`Alle ${deletedCount} Spiele erfolgreich gelöscht`);
      } else if (deletedCount > 0 && failedCount > 0) {
        toast.success(`${deletedCount} Spiele gelöscht, ${failedCount} fehlgeschlagen`);
      } else {
        toast.error(`Alle ${failedCount} Löschvorgänge fehlgeschlagen`);
      }

      // Refresh data
      refetchMatches();
      refetchTransactions();
      
      // Force refresh after delay
      setTimeout(() => {
        refetchMatches();
        refetchTransactions();
      }, 1000);

    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Fehler beim Bulk-Löschen: ' + error.message);
      setSelectedMatches(new Set());
    } finally {
      setLoading(false);
    }
  };

  // Get counts for current section
  const getCurrentCounts = () => {
    switch (activeSection) {
      case 'players':
        return {
          total: players?.length || 0,
          filtered: filterPlayers(players).length
        };
      case 'matches':
        return {
          total: matches?.length || 0,
          filtered: filterMatches(matches).length
        };
      case 'bans':
        return {
          total: bans?.length || 0,
          filtered: filterBans(bans).length
        };
      case 'transactions':
        return {
          total: transactions?.length || 0,
          filtered: filterTransactions(transactions).length
        };
      default:
        return { total: 0, filtered: 0 };
    }
  };

  const handleDeletePlayer = async (player) => {
    const relatedBans = bans?.filter(ban => ban.player_id === player.id || ban.player_name === player.name) || [];
    
    let confirmMessage = `Sind Sie sicher, dass Sie ${player.name} (${player.team}) löschen möchten?`;
    if (relatedBans.length > 0) {
      confirmMessage += `\n\nAchtung: ${relatedBans.length} zugehörige Sperre(n) werden ebenfalls gelöscht.`;
    }
    if (player.goals && player.goals > 0) {
      confirmMessage += `\nDer Spieler hat ${player.goals} Tor(e) erzielt.`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      await removePlayer(player.id);
      toast.success(`Spieler ${player.name} erfolgreich gelöscht`);
      refetchPlayers();
      if (relatedBans.length > 0) {
        refetchBans(); // Refresh bans in case they were cascade deleted
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Spielers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (match) => {
    const relatedTransactions = transactions?.filter(t => t.match_id === match.id) || [];
    const matchResult = `AEK ${match.goalsa || 0} - ${match.goalsb || 0} Real`;
    
    let confirmMessage = `Sind Sie sicher, dass Sie das Spiel vom ${new Date(match.date).toLocaleDateString('de-DE')} (${matchResult}) löschen möchten?`;
    if (relatedTransactions.length > 0) {
      confirmMessage += `\n\nAchtung: ${relatedTransactions.length} zugehörige Transaktion(en) werden ebenfalls gelöscht.`;
    }
    if (match.manofthematch) {
      confirmMessage += `\nSpieler des Spiels: ${match.manofthematch}`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      // Use the modern deleteMatch service
      console.log(`Attempting to delete match ${match.id}`);
      await deleteMatch(match.id);
      console.log(`Successfully deleted match ${match.id}`);
      toast.success('Spiel erfolgreich gelöscht');
      
      // Refresh all data to ensure UI is updated
      refetchMatches();
      refetchTransactions();
      
      // Also refresh other data that might be affected
      setTimeout(() => {
        // Force a full data refresh after a short delay to ensure all changes are reflected
        refetchMatches();
        refetchTransactions();
      }, 1000);
      
    } catch (error) {
      console.error('Error deleting match:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Fehler beim Löschen des Spiels: ';
      if (error.message.includes('not found')) {
        errorMessage += `Spiel mit ID ${match.id} wurde nicht in der Datenbank gefunden. Möglicherweise wurde es bereits gelöscht.`;
      } else if (error.message.includes('Invalid match ID')) {
        errorMessage += `Ungültige Spiel-ID: ${match.id}`;
      } else if (error.message.includes('fetch failed') || error.message.includes('network')) {
        errorMessage += 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else {
        errorMessage += error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBan = async (ban) => {
    const playerName = ban.player_name || (ban.player_id && players ? 
      players.find(p => p.id === ban.player_id)?.name : 'Unbekannter Spieler');
    const remaining = Math.max(0, (ban.totalgames || 0) - (ban.matchesserved || 0));
    
    let confirmMessage = `Sind Sie sicher, dass Sie die Sperre für ${playerName} löschen möchten?`;
    confirmMessage += `\nSperrtyp: ${ban.type}`;
    if (remaining > 0) {
      confirmMessage += `\nNoch ${remaining} Spiel(e) verbleibend`;
    } else {
      confirmMessage += `\nSperre bereits abgesessen`;
    }
    if (ban.reason) {
      confirmMessage += `\nGrund: ${ban.reason}`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      await removeBan(ban.id);
      toast.success(`Sperre für ${playerName} erfolgreich gelöscht`);
      refetchBans();
    } catch (error) {
      toast.error('Fehler beim Löschen der Sperre: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    const matchContext = transaction.match_id && matches ? 
      matches.find(m => m.id === transaction.match_id) : null;
    
    let confirmMessage = `Sind Sie sicher, dass Sie die Transaktion "${transaction.type}" löschen möchten?`;
    confirmMessage += `\nBetrag: ${transaction.amount > 0 ? '+' : ''}${transaction.amount}M € (${transaction.team})`;
    if (transaction.date) {
      confirmMessage += `\nDatum: ${new Date(transaction.date).toLocaleDateString('de-DE')}`;
    }
    if (transaction.info) {
      confirmMessage += `\nInfo: ${transaction.info}`;
    }
    if (matchContext) {
      confirmMessage += `\nZugehöriges Spiel: ${new Date(matchContext.date).toLocaleDateString('de-DE')} (AEK ${matchContext.goalsa || 0} - ${matchContext.goalsb || 0} Real)`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      await removeTransaction(transaction.id);
      toast.success('Transaktion erfolgreich gelöscht');
      refetchTransactions();
    } catch (error) {
      toast.error('Fehler beim Löschen der Transaktion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTeamIcon = (team) => {
    const teamData = TEAMS.find(t => t.value === team);
    return teamData ? teamData.icon : '⚫';
  };

  // Filter functions
  const filterPlayers = (players) => {
    if (!searchQuery) return players || [];
    return (players || []).filter(player => 
      player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filterMatches = (matches) => {
    if (!searchQuery) return matches || [];
    return (matches || []).filter(match => 
      new Date(match.date).toLocaleDateString('de-DE').includes(searchQuery) ||
      match.manofthematch?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filterBans = (bans) => {
    if (!searchQuery) return bans || [];
    return (bans || []).filter(ban => {
      const playerName = ban.player_name || (ban.player_id && players ? 
        players.find(p => p.id === ban.player_id)?.name : '');
      return playerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ban.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ban.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ban.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const filterTransactions = (transactions) => {
    if (!searchQuery) return transactions || [];
    return (transactions || []).filter(transaction =>
      transaction.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.info?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.amount?.toString().includes(searchQuery)
    );
  };

  const renderPlayersList = () => {
    const filteredPlayers = filterPlayers(players);
    
    if (!filteredPlayers || filteredPlayers.length === 0) {
      return <p className="text-text-muted text-center py-4">
        {searchQuery ? 'Keine Spieler gefunden' : 'Keine Spieler vorhanden'}
      </p>;
    }

    return (
      <div className="space-y-2">
        {filteredPlayers.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getTeamIcon(player.team)}</span>
              <div>
                <h4 className="font-medium text-text-primary">{player.name}</h4>
                <p className="text-sm text-text-muted">
                  {player.team} • {player.position}
                  {player.goals !== undefined && (
                    <span className="ml-2">• {player.goals} Tore</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDeletePlayer(player)}
              disabled={loading}
              className="btn-secondary btn-sm text-accent-red hover:bg-red-50 disabled:opacity-50"
            >
              <i className="fas fa-trash mr-1"></i>
              Löschen
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderMatchesList = () => {
    const filteredMatches = filterMatches(matches);
    
    if (!filteredMatches || filteredMatches.length === 0) {
      return <p className="text-text-muted text-center py-4">
        {searchQuery ? 'Keine Spiele gefunden' : 'Keine Spiele vorhanden'}
      </p>;
    }

    const allSelected = filteredMatches.length > 0 && filteredMatches.every(match => selectedMatches.has(match.id));
    const someSelected = selectedMatches.size > 0;

    return (
      <div className="space-y-4">
        {/* Bulk actions header */}
        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => handleSelectAllMatches(matches)}
                className="w-4 h-4 text-accent-primary focus:ring-accent-primary border-gray-300 rounded"
              />
              <span className="text-sm text-text-primary">
                {allSelected ? 'Alle abwählen' : 'Alle auswählen'} ({filteredMatches.length})
              </span>
            </label>
            {selectedMatches.size > 0 && (
              <span className="text-sm text-accent-primary font-medium">
                {selectedMatches.size} ausgewählt
              </span>
            )}
          </div>
          
          {someSelected && (
            <button
              onClick={handleBulkDeleteSelected}
              disabled={loading}
              className="btn-primary btn-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              <i className="fas fa-trash mr-1"></i>
              {selectedMatches.size} Spiele löschen
            </button>
          )}
        </div>

        {/* Matches list */}
        <div className="space-y-2">
          {filteredMatches.map((match) => (
            <div key={match.id} className="flex items-center space-x-3 p-3 bg-bg-tertiary rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMatches.has(match.id)}
                  onChange={(e) => handleMatchSelection(match.id, e.target.checked)}
                  className="w-4 h-4 text-accent-primary focus:ring-accent-primary border-gray-300 rounded"
                />
              </label>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-text-primary">
                      ID {match.id} • {new Date(match.date).toLocaleDateString('de-DE')}
                    </h4>
                    <p className="text-sm text-text-muted">
                      AEK {match.goalsa || 0} - {match.goalsb || 0} Real
                    </p>
                    {match.manofthematch && (
                      <p className="text-xs text-text-muted mt-1">
                        <i className="fas fa-star mr-1"></i>
                        SdS: {match.manofthematch}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteMatch(match)}
                    disabled={loading}
                    className="btn-secondary btn-sm text-accent-red hover:bg-red-50 disabled:opacity-50"
                  >
                    <i className="fas fa-trash mr-1"></i>
                    Einzeln löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBansList = () => {
    const filteredBans = filterBans(bans);
    
    if (!filteredBans || filteredBans.length === 0) {
      return <p className="text-text-muted text-center py-4">
        {searchQuery ? 'Keine Sperren gefunden' : 'Keine Sperren vorhanden'}
      </p>;
    }

    const getPlayerName = (ban) => {
      if (ban.player_name) return ban.player_name;
      if (ban.player_id && players) {
        const player = players.find(p => p.id === ban.player_id);
        return player ? player.name : 'Unbekannter Spieler';
      }
      return 'Unbekannter Spieler';
    };

    const getRemainingGames = (ban) => {
      const remaining = (ban.totalgames || 0) - (ban.matchesserved || 0);
      return Math.max(0, remaining);
    };

    return (
      <div className="space-y-2">
        {filteredBans.map((ban) => (
          <div key={ban.id} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getTeamIcon(ban.team)}</span>
              <div>
                <h4 className="font-medium text-text-primary">{getPlayerName(ban)}</h4>
                <p className="text-sm text-text-muted">
                  {ban.type} • {ban.totalgames || 0} Spiele 
                  {getRemainingGames(ban) > 0 ? ` (${getRemainingGames(ban)} verbleibend)` : ' (abgesessen)'}
                </p>
                {ban.reason && (
                  <p className="text-xs text-text-muted mt-1">
                    Grund: {ban.reason}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDeleteBan(ban)}
              disabled={loading}
              className="btn-secondary btn-sm text-accent-red hover:bg-red-50 disabled:opacity-50"
            >
              <i className="fas fa-trash mr-1"></i>
              Löschen
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderTransactionsList = () => {
    const filteredTransactions = filterTransactions(transactions);
    
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return <p className="text-text-muted text-center py-4">
        {searchQuery ? 'Keine Transaktionen gefunden' : 'Keine Transaktionen vorhanden'}
      </p>;
    }

    const getMatchContext = (transaction) => {
      if (!transaction.match_id || !matches) return null;
      const match = matches.find(m => m.id === transaction.match_id);
      if (!match) return null;
      return `Match: ${new Date(match.date).toLocaleDateString('de-DE')} (AEK ${match.goalsa || 0} - ${match.goalsb || 0} Real)`;
    };

    return (
      <div className="space-y-2">
        {filteredTransactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getTeamIcon(transaction.team)}</span>
              <div className="flex-1">
                <h4 className="font-medium text-text-primary">{transaction.type}</h4>
                <p className="text-sm text-text-muted">
                  <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}M €
                  </span>
                  {transaction.date && (
                    <span className="ml-2">• {new Date(transaction.date).toLocaleDateString('de-DE')}</span>
                  )}
                </p>
                {transaction.info && (
                  <p className="text-xs text-text-muted mt-1">
                    {transaction.info}
                  </p>
                )}
                {getMatchContext(transaction) && (
                  <p className="text-xs text-blue-600 mt-1">
                    <i className="fas fa-futbol mr-1"></i>
                    {getMatchContext(transaction)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDeleteTransaction(transaction)}
              disabled={loading}
              className="btn-secondary btn-sm text-accent-red hover:bg-red-50 disabled:opacity-50"
            >
              <i className="fas fa-trash mr-1"></i>
              Löschen
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'players':
        return renderPlayersList();
      case 'matches':
        return renderMatchesList();
      case 'bans':
        return renderBansList();
      case 'transactions':
        return renderTransactionsList();
      default:
        return renderPlayersList();
    }
  };

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Daten löschen
        </h3>
        <p className="text-text-muted text-sm">
          Verwalten Sie die Löschung von Spielern, Spielen, Sperren und Transaktionen.
        </p>
      </div>

      {/* Section Navigation */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(section.id)}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-accent-red text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <i className={`${section.icon} mr-2`}></i>
            {section.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder={`${sections.find(s => s.id === activeSection)?.label.replace(' löschen', '')} durchsuchen...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-red focus:border-transparent text-text-primary bg-bg-secondary"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-text-muted"></i>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <div className="flex justify-between items-center mt-2">
          {searchQuery && (
            <p className="text-xs text-text-muted">
              <i className="fas fa-filter mr-1"></i>
              Gefiltert nach: &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          <p className="text-xs text-text-muted ml-auto">
            {(() => {
              const counts = getCurrentCounts();
              return searchQuery 
                ? `${counts.filtered} von ${counts.total} Einträgen`
                : `${counts.total} Einträge`;
            })()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="modern-card">
        {loading && <LoadingSpinner message="Lösche..." />}
        {!loading && renderSectionContent()}
      </div>

      {/* Warning */}
      <div className="mt-6 modern-card bg-red-50 border-red-200">
        <div className="flex items-start">
          <div className="text-red-600 mr-3">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div>
            <h4 className="font-semibold text-red-800 mb-1">Achtung</h4>
            <p className="text-red-700 text-sm">
              Das Löschen von Daten ist permanent und kann nicht rückgängig gemacht werden. 
              Bitte überprüfen Sie Ihre Auswahl sorgfältig, bevor Sie fortfahren.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}