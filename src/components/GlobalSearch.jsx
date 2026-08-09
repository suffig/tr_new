import Icon from './icons/Icon';
import { useState, useEffect, useCallback } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';

/**
 * `sofortOffen` wird gesetzt, wenn die Suche von aussen geoeffnet wird (Knopf
 * im Kopfbereich oder Strg+K). Ohne das startet die Komponente geschlossen
 * und zeigt nur ihren eigenen Ausloeser — wer sie von aussen einblendet,
 * bekommt dann einen Knopf statt der Suche.
 */
export default function GlobalSearch({ onNavigate, onClose, sofortOffen = false }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(sofortOffen);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');

  // skipFifaFilter: die Suche geht ueber ALLE Saisons. Genau das ist ihr Zweck
  // — sonst muesste man erst die Saison umstellen und dann suchen, und wer
  // einen Spieler von vor drei Jahren sucht, weiss die Saison ja gerade nicht.
  const alle = { skipFifaFilter: true };
  const { data: players } = useSupabaseQuery('players', '*', alle);
  const { data: matches } = useSupabaseQuery('matches', '*', { ...alle, order: { column: 'date', ascending: false } });
  const { data: bans } = useSupabaseQuery('bans', '*', alle);
  const { data: transactions } = useSupabaseQuery('transactions', '*', { ...alle, order: { column: 'date', ascending: false } });
  const { data: biere } = useSupabaseQuery('bier_katalog', '*', alle);

  const allResults = getSearchResults(query, { players, matches, bans, transactions, biere });
  const searchResults = activeFilter === 'all' ? allResults : allResults.filter(result => result.type === activeFilter);

  const filters = [
    { id: 'all', label: 'Alle', icon: 'search' },
    { id: 'player', label: 'Spieler', icon: 'users' },
    { id: 'match', label: 'Spiele', icon: 'football' },
    { id: 'transaction', label: 'Finanzen', icon: 'euro' },
    { id: 'ban', label: 'Sperren', icon: 'ban' },
    { id: 'bier', label: 'Biere', icon: 'beer' }
  ];

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    onClose?.();
  }, [onClose]);

  const handleSelectResult = useCallback((result) => {
    onNavigate?.(result.tab, result.action);
    handleClose();
  }, [onNavigate, handleClose]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelectResult(searchResults[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults, handleClose, handleSelectResult]);

  useEffect(() => {
    if (isOpen) {
      // Focus search input when opened
      const searchInput = document.querySelector('input[placeholder*="suchen"]');
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <>
      {/* Eigener Ausloeser nur im eingebetteten Fall — im Overlay-Fall sitzt
          der Knopf schon im Kopfbereich. */}
      {!sofortOffen && (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200"
        title="Globale Suche (Strg+K)"
      >
        <Icon name="search" size={17} strokeWidth={2.2} />
        <span className="hidden sm:inline text-sm">Suchen...</span>
        <span className="hidden sm:inline text-xs bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-light">
          Strg+K
        </span>
      </button>
      )}

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-bg-primary border border-border-light rounded-lg shadow-xl w-full max-w-2xl mx-4">
            {/* Search Input */}
            <div className="p-4 border-b border-border-light">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Icon name="search" size={17} strokeWidth={2.2} className="text-text-tertiary" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Spieler, Spiele, Biere, Sperren – alle Saisons"
                  className="w-full pl-10 pr-4 py-3 bg-bg-secondary border border-border-light rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                />
              </div>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      activeFilter === filter.id
                        ? 'bg-primary-green text-white'
                        : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-primary border border-border-light'
                    }`}
                  >
                    <Icon name={filter.icon} size={14} strokeWidth={2.2} />
                    <span className="hidden sm:inline">{filter.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.length === 0 ? (
                <div className="p-6 text-center text-text-secondary">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                    <Icon name="search" size={26} strokeWidth={1.8} />
                  </div>
                  <p>Beginne zu tippen um zu suchen...</p>
                  <div className="mt-4 text-sm">
                    <p><strong>Tipps:</strong></p>
                    <p>• Suche nach Spielernamen, Teamnamen</p>
                    <p>• Finde Spiele nach Datum oder Ergebnis</p>
                    <p>• Durchsuche Transaktionen nach Typ</p>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-text-secondary">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                    <Icon name="search" size={26} strokeWidth={1.8} />
                  </div>
                  <p>Keine Ergebnisse für &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="p-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelectResult(result)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        index === selectedIndex
                          ? 'bg-primary-green bg-opacity-10 border border-primary-green'
                          : 'hover:bg-bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                          <Icon name={result.icon} size={16} strokeWidth={2.2} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{result.title}</span>
                            <span className="text-xs bg-bg-tertiary px-2 py-1 rounded border border-border-light text-text-secondary">
                              {result.category}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary truncate">{result.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border-light bg-bg-secondary">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-4">
                  <span>↑↓ Navigation</span>
                  <span>⏎ Auswählen</span>
                  <span>Esc Schließen</span>
                </div>
                <span>{searchResults.length} {searchResults.length === 1 ? 'Ergebnis' : 'Ergebnisse'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** "FC24 · " vor die Beschreibung, sonst weiss man beim Treffer nicht, wann. */
const saison = (zeile) => (zeile?.fifa_version ? `${zeile.fifa_version} · ` : '');

function getSearchResults(query, data) {
  if (!query || query.length < 2) return [];

  const results = [];
  const searchTerm = query.toLowerCase();

  // Biere aus dem Katalog der Bierboerse
  if (data.biere) {
    data.biere.forEach((bier) => {
      if (
        bier.name?.toLowerCase().includes(searchTerm) ||
        bier.brauerei?.toLowerCase().includes(searchTerm) ||
        bier.art?.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          type: 'bier',
          id: `bier-${bier.id}`,
          icon: 'beer',
          title: bier.name,
          description: [bier.brauerei, bier.art,
            bier.alkohol ? `${Number(bier.alkohol).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %` : null]
            .filter(Boolean).join(' • ') || 'Keine weiteren Angaben',
          category: 'Bier',
          tab: 'abend',
          action: { type: 'showBier', bierId: bier.id }
        });
      }
    });
  }

  // Search Players
  if (data.players) {
    data.players.forEach(player => {
      if (
        player.name?.toLowerCase().includes(searchTerm) ||
        player.team?.toLowerCase().includes(searchTerm) ||
        player.position?.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          type: 'player',
          id: player.id,
          icon: 'user',
          title: player.name,
          description: `${saison(player)}${player.team} • ${player.position} • ${(Number(player.value) || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio €`,
          category: 'Spieler',
          tab: 'squad',
          action: { type: 'showPlayer', playerId: player.id }
        });
      }
    });
  }

  // Search Matches
  if (data.matches) {
    data.matches.forEach(match => {
      const matchDate = new Date(match.date).toLocaleDateString('de-DE');
      const searchableText = `${matchDate} AEK ${match.goalsa || 0} ${match.goalsb || 0} Real`;
      
      if (searchableText.toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'match',
          id: match.id,
          icon: 'football',
          title: `AEK ${match.goalsa || 0} - ${match.goalsb || 0} Real`,
          description: `${saison(match)}${matchDate} • ${match.sds ? `⭐ SdS: ${match.sds}` : 'Kein SdS'}`,
          category: 'Spiel',
          tab: 'matches',
          action: { type: 'showMatch', matchId: match.id }
        });
      }
    });
  }

  // Search Bans
  if (data.bans && data.players) {
    data.bans.forEach(ban => {
      const player = data.players.find(p => p.id === ban.player_id);
      const playerName = player?.name || ban.player_name || 'Unbekannt';
      const remaining = (ban.totalgames || 0) - (ban.matchesserved || 0);
      
      if (
        playerName.toLowerCase().includes(searchTerm) ||
        ban.type?.toLowerCase().includes(searchTerm) ||
        ban.reason?.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          type: 'ban',
          id: ban.id,
          icon: 'ban',
          title: playerName,
          description: `${ban.type} • ${remaining > 0 ? `${remaining} ${remaining === 1 ? 'Spiel' : 'Spiele'} verbleibend` : 'Abgelaufen'}`,
          category: 'Sperre',
          tab: 'bans',
          action: { type: 'showBan', banId: ban.id }
        });
      }
    });
  }

  // Search Transactions
  if (data.transactions) {
    data.transactions.forEach(transaction => {
      const amount = transaction.amount || 0;
      const formattedAmount = `${amount > 0 ? '+' : ''}${amount}€`;
      const date = new Date(transaction.date).toLocaleDateString('de-DE');
      
      if (
        transaction.type?.toLowerCase().includes(searchTerm) ||
        transaction.description?.toLowerCase().includes(searchTerm) ||
        formattedAmount.includes(searchTerm)
      ) {
        results.push({
          type: 'transaction',
          id: transaction.id,
          icon: 'euro',
          title: `${transaction.type || 'Transaktion'} • ${formattedAmount}`,
          description: `${date} • ${transaction.description || 'Keine Beschreibung'}`,
          category: 'Finanzen',
          tab: 'finanzen',
          action: { type: 'showTransaction', transactionId: transaction.id }
        });
      }
    });
  }

  // Sort results by relevance (exact matches first, then partial matches)
  return results.sort((a, b) => {
    const aExact = a.title.toLowerCase().includes(searchTerm);
    const bExact = b.title.toLowerCase().includes(searchTerm);
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    return a.title.localeCompare(b.title);
  }).slice(0, 10); // Limit to 10 results
}