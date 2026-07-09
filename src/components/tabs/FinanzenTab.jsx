import Icon from '../icons/Icon';
import { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import ExportImportManager from '../ExportImportManager';
import HorizontalNavigation from '../HorizontalNavigation';
import CollapsibleCard from '../CollapsibleCard';
import TeamLogo from '../TeamLogo';
import { getTeamDisplay } from '../../constants/teams';
import toast from 'react-hot-toast';
import '../../styles/match-animations.css';

export default function FinanzenTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [expandedMatches, setExpandedMatches] = useState(null); // null = not yet initialized
  const [showExportImport, setShowExportImport] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  // Transaction list: discreet filters + "show only the latest" by default
  const [txFilters, setTxFilters] = useState({ team: 'all', type: 'all', search: '' });
  const [txFiltersOpen, setTxFiltersOpen] = useState(false);
  const [txShowAll, setTxShowAll] = useState(false);
  const [showAllNonMatch, setShowAllNonMatch] = useState(false);
  const TX_PREVIEW_COUNT = 10;
  const NON_MATCH_PREVIEW = 5;
  
  const { data: finances, loading: financesLoading } = useSupabaseQuery('finances', '*');
  const { data: transactions, loading: transactionsLoading } = useSupabaseQuery(
    'transactions', 
    '*', 
    { order: { column: 'id', ascending: false } }
  );
  const { data: matches, loading: matchesLoading } = useSupabaseQuery(
    'matches', 
    '*', 
    { order: { column: 'id', ascending: false } }
  );
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  
  const loading = financesLoading || transactionsLoading || matchesLoading || playersLoading;

  const getTeamFinances = (teamName) => {
    if (!finances) return { balance: 0, debt: 0 };
    return finances.find(f => f.team === teamName) || { balance: 0, debt: 0 };
  };

  const getTeamSquadValue = (teamName) => {
    if (!players) return 0;
    return players
      .filter(p => p.team === teamName)
      .reduce((sum, p) => sum + (p.value || 0), 0);
  };

  const calculateTotalCapital = () => {
    const aekBalance = getTeamFinances('AEK').balance || 0;
    const realBalance = getTeamFinances('Real').balance || 0;
    const aekSquadValueMillions = getTeamSquadValue('AEK');
    const realSquadValueMillions = getTeamSquadValue('Real');
    
    // Convert squad values from millions to euros for total capital calculation
    const aekSquadValueEuros = aekSquadValueMillions * 1_000_000;
    const realSquadValueEuros = realSquadValueMillions * 1_000_000;
    
    return Math.round(aekBalance + realBalance + aekSquadValueEuros + realSquadValueEuros);
  };

  const getTeamTransactions = (teamName) => {
    if (!transactions) return [];
    return transactions.filter(t => t.team === teamName);
  };

  const formatCurrency = (amount) => {
    // Round to whole numbers and format without decimal places
    const roundedAmount = Math.round(amount || 0);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(roundedAmount);
  };

  const formatPlayerValue = (value) => {
    // Helper function for player values which are already stored in millions
    return `${(value || 0).toFixed(1)}M €`;
  };

  // Helper function to get color class for positive/negative amounts
  const getAmountColorClass = (amount) => {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'Preisgeld':
        return '🏆';
      case 'Sonstiges':
        return '📈';
      case 'Strafe':
        return '📉';
      case 'Spielerkauf':
        return '👤';
      case 'Spielerverkauf':
        return '💰';
      case 'SdS Bonus':
        return '⭐';
      case 'Echtgeld-Ausgleich':
        return '💳';
      case 'Echtgeld-Ausgleich (getilgt)':
        return '✅';
      default:
        return '💰';
    }
  };

  const getMatchNetChange = (matchTransactions, team) => {
    return matchTransactions
      .filter(t => t.team === team)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const getExpandedSet = (groups) => {
    if (expandedMatches !== null) return expandedMatches;
    // Auto-open the most recent match group on first render
    const firstId = groups[0]?.match?.id;
    return firstId != null ? new Set([firstId]) : new Set();
  };

  const toggleMatchTransactions = (matchId) => {
    const current = expandedMatches ?? new Set();
    const newExpanded = new Set(current);
    if (newExpanded.has(matchId)) {
      newExpanded.delete(matchId);
    } else {
      newExpanded.add(matchId);
    }
    setExpandedMatches(newExpanded);
  };

  const groupTransactionsByMatch = () => {
    if (!transactions || !matches) return { matchGroups: [], nonMatchTransactions: [] };
    
    // Sort matches by date (newest first)
    const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const matchGroups = [];
    const nonMatchTransactions = [];
    const matchIds = new Set(sortedMatches.map(m => m.id));
    
    // Group transactions by match
    for (const match of sortedMatches) {
      const matchTx = transactions.filter(t => t.match_id === match.id);
      if (matchTx.length) {
        matchGroups.push({ match, transactions: matchTx });
      }
    }
    
    // Find transactions without match_id
    transactions.forEach(t => {
      if (!t.match_id || !matchIds.has(t.match_id)) {
        nonMatchTransactions.push(t);
      }
    });
    
    return { matchGroups, nonMatchTransactions };
  };

  // Distinct transaction types present in the data (for the type filter)
  const transactionTypes = [...new Set((transactions || []).map(t => t.type).filter(Boolean))];

  // Apply the discreet filters (team / type / free-text) to the transaction list
  const getFilteredTransactions = () => {
    let list = transactions || [];
    if (txFilters.team !== 'all') list = list.filter(t => t.team === txFilters.team);
    if (txFilters.type !== 'all') list = list.filter(t => t.type === txFilters.type);
    const q = txFilters.search.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.info || '').toLowerCase().includes(q) ||
        (t.type || '').toLowerCase().includes(q)
      );
    }
    return list;
  };

  const txFiltersActive = txFilters.team !== 'all' || txFilters.type !== 'all' || !!txFilters.search.trim();

  // Define views for horizontal navigation
  const views = [
    { id: 'overview', label: 'Übersicht', iconName: 'wallet' },
    { id: 'aek', label: 'AEK', logoComponent: <TeamLogo team="aek" size="sm" /> },
    { id: 'real', label: 'Real', logoComponent: <TeamLogo team="real" size="sm" /> },
    { id: 'transactions', label: 'Transaktionen', iconName: 'swap' },
    { id: 'analysis', label: 'Analyse', iconName: 'chart' },
  ];

  if (loading) {
    return <LoadingSpinner message="Lade Finanzen..." />;
  }

  const aekFinances = getTeamFinances('AEK');
  const realFinances = getTeamFinances('Real');
  const totalCapital = calculateTotalCapital();

  const { matchGroups, nonMatchTransactions } = groupTransactionsByMatch();

  // Dedicated single-team view: hero stat card + the team's recent transactions
  const renderTeamFinanceView = (team) => {
    const fin = getTeamFinances(team);
    const isAek = team === 'AEK';
    const accent = isAek ? 'text-system-blue' : 'text-system-red';
    const accentBg = isAek ? 'bg-system-blue/12' : 'bg-system-red/12';
    const squadValue = getTeamSquadValue(team);
    const total = fin.balance + squadValue * 1000000;
    const txns = getTeamTransactions(team);

    return (
      <>
        {/* Hero card */}
        <div className="modern-card mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-12 h-12 rounded-xl ${accentBg} flex items-center justify-center`}>
              <TeamLogo team={team.toLowerCase()} size="md" />
            </span>
            <div>
              <h3 className={`font-bold ${accent}`}>{getTeamDisplay(team)}</h3>
              <div className="text-xs text-text-muted">Kontostand</div>
            </div>
          </div>
          <div className={`text-3xl font-bold ${getAmountColorClass(fin.balance)} mb-4`}>{formatCurrency(fin.balance)}</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-bg-tertiary rounded-xl p-3 text-center">
              <div className={`font-bold text-sm ${accent}`}>{formatPlayerValue(squadValue)}</div>
              <div className="text-[11px] text-text-tertiary mt-0.5">Kaderwert</div>
            </div>
            <div className="bg-bg-tertiary rounded-xl p-3 text-center">
              <div className={`font-bold text-sm ${(fin.debt || 0) > 0 ? 'text-system-red' : 'text-text-secondary'}`}>{formatCurrency(fin.debt || 0)}</div>
              <div className="text-[11px] text-text-tertiary mt-0.5">Schulden</div>
            </div>
            <div className="bg-bg-tertiary rounded-xl p-3 text-center">
              <div className="font-bold text-sm text-text-primary">{formatCurrency(total)}</div>
              <div className="text-[11px] text-text-tertiary mt-0.5">Gesamt</div>
            </div>
          </div>
        </div>

        {/* Recent transactions for this team */}
        <div className="modern-card p-0 overflow-hidden mb-6">
          <div className="p-4 border-b border-border-light flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Letzte Transaktionen</h3>
            <span className="text-xs text-text-tertiary">{txns.length}</span>
          </div>
          {txns.length > 0 ? (
            <div className="divide-y divide-border-light">
              {txns.slice(0, 12).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{getTransactionIcon(t.type)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{t.info || t.type || 'Transaktion'}</div>
                      <div className="text-xs text-text-muted">{t.date ? new Date(t.date).toLocaleDateString('de-DE') : t.type}</div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm whitespace-nowrap ${(t.amount || 0) >= 0 ? 'text-system-green' : 'text-system-red'}`}>
                    {(t.amount || 0) > 0 ? '+' : ''}{formatCurrency(t.amount || 0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-text-muted">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                <Icon name="swap" size={24} strokeWidth={1.6} />
              </div>
              <p className="text-sm">Noch keine Transaktionen</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      {/* Enhanced Header with iOS 26 Design - matching StatsTab */}
      <div className="page-header animate-mobile-slide-in">
        <div className="page-header-row">
          <div>
            <h2 className="page-title">Finanzen</h2>
            <p className="page-subtitle">Team-Budgets und Transaktionsübersicht</p>
          </div>
          <div className="page-icon tile-blue"><Icon name="euro" size={22} strokeWidth={2} /></div>
        </div>
        <div className="hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Horizontal Navigation */}
      <HorizontalNavigation
        views={views}
        selectedView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Conditional Content Based on currentView */}
      {currentView === 'transactions' ? (
        (() => {
          const filtered = getFilteredTransactions();
          const visible = txShowAll ? filtered : filtered.slice(0, TX_PREVIEW_COUNT);
          return (
            <div className="space-y-3">
              {/* Header row with a discreet filter toggle */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary leading-tight">Transaktionen</h3>
                  <p className="text-xs text-text-tertiary">
                    {filtered.length} {filtered.length === 1 ? 'Buchung' : 'Buchungen'}
                    {txFiltersActive ? ' (gefiltert)' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setTxFiltersOpen((o) => !o)}
                  aria-expanded={txFiltersOpen}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    txFiltersActive || txFiltersOpen
                      ? 'bg-system-blue/12 text-system-blue'
                      : 'bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <Icon name="filter" size={16} strokeWidth={2.2} />
                  <span>Filter</span>
                  {txFiltersActive && <span className="w-1.5 h-1.5 rounded-full bg-system-blue" />}
                </button>
              </div>

              {/* Collapsible filter panel — hidden by default */}
              {txFiltersOpen && (
                <div className="modern-card space-y-3 animate-mobile-slide-in">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                      <Icon name="search" size={16} strokeWidth={2} />
                    </span>
                    <input
                      type="text"
                      value={txFilters.search}
                      onChange={(e) => setTxFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Suche nach Info oder Typ…"
                      className="form-input !pl-10"
                    />
                  </div>
                  <div>
                    <div className="section-label mb-1.5">Team</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'Alle' },
                        { id: 'AEK', label: getTeamDisplay('AEK') },
                        { id: 'Real', label: getTeamDisplay('Real') },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setTxFilters((f) => ({ ...f, team: opt.id }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            txFilters.team === opt.id ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {transactionTypes.length > 0 && (
                    <div>
                      <div className="section-label mb-1.5">Typ</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setTxFilters((f) => ({ ...f, type: 'all' }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            txFilters.type === 'all' ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'
                          }`}
                        >
                          Alle
                        </button>
                        {transactionTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => setTxFilters((f) => ({ ...f, type }))}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              txFilters.type === type ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'
                            }`}
                          >
                            <span>{getTransactionIcon(type)}</span>{type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {txFiltersActive && (
                    <button
                      onClick={() => setTxFilters({ team: 'all', type: 'all', search: '' })}
                      className="text-xs text-system-red font-medium"
                    >
                      Filter zurücksetzen
                    </button>
                  )}
                </div>
              )}

              {/* Transactions List */}
              <div className="modern-card p-0 overflow-hidden">
                <div className="divide-y divide-border-light">
                  {visible.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 p-3 hover:bg-bg-tertiary/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg flex-shrink-0">{getTransactionIcon(transaction.type)}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {transaction.info || transaction.type || 'Transaktion'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                            <span className={`font-medium ${transaction.team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                              {transaction.team}
                            </span>
                            <span>·</span>
                            <span className="truncate">{new Date(transaction.date).toLocaleDateString('de-DE')}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold text-sm whitespace-nowrap ${
                        (transaction.amount || 0) >= 0 ? 'text-system-green' : 'text-system-red'
                      }`}>
                        {(transaction.amount || 0) > 0 ? '+' : ''}{formatCurrency(transaction.amount || 0)}
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="p-8 text-center text-text-muted">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                        <Icon name="swap" size={28} strokeWidth={1.6} />
                      </div>
                      <p className="text-sm">{txFiltersActive ? 'Keine Treffer für diese Filter' : 'Keine Transaktionen gefunden'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Show all / show less toggle */}
              {filtered.length > TX_PREVIEW_COUNT && (
                <button
                  onClick={() => setTxShowAll((s) => !s)}
                  className="w-full py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium"
                >
                  {txShowAll ? 'Weniger anzeigen' : `Alle ${filtered.length} anzeigen`}
                </button>
              )}
            </div>
          );
        })()
      ) : currentView === 'aek' ? (
        <>
          {renderTeamFinanceView('AEK')}
        </>
      ) : currentView === 'real' ? (
        <>
          {renderTeamFinanceView('Real')}
        </>
      ) : currentView === 'analysis' ? (
        <>
          {/* Echtgeld-Schulden Overview */}
          <div className="modern-card mb-6">
            <h3 className="font-bold text-lg mb-4 inline-flex items-center gap-2">
              <Icon name="swap" size={18} strokeWidth={2.2} className="text-system-green" />Echtgeld-Schulden Übersicht
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className={`p-4 rounded-xl border ${(aekFinances.debt || 0) > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo team="aek" size="sm" />
                    <span className="font-semibold text-text-primary">{getTeamDisplay('AEK')}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${(aekFinances.debt || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {(aekFinances.debt || 0) > 0 ? '⚠️ Schulden' : '✅ Schuldenfrei'}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${(aekFinances.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(aekFinances.debt || 0) > 0 ? `-${aekFinances.debt}€` : '0€'}
                </div>
                <div className="text-xs text-text-muted mt-1">Offene Echtgeld-Schulden</div>
              </div>
              <div className={`p-4 rounded-xl border ${(realFinances.debt || 0) > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo team="real" size="sm" />
                    <span className="font-semibold text-text-primary">{getTeamDisplay('Real')}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${(realFinances.debt || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {(realFinances.debt || 0) > 0 ? '⚠️ Schulden' : '✅ Schuldenfrei'}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${(realFinances.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(realFinances.debt || 0) > 0 ? `-${realFinances.debt}€` : '0€'}
                </div>
                <div className="text-xs text-text-muted mt-1">Offene Echtgeld-Schulden</div>
              </div>
            </div>
            {((aekFinances.debt || 0) === 0 && (realFinances.debt || 0) === 0) && (
              <div className="text-center py-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-green-700 font-medium">🎉 Beide Teams sind schuldenfrei!</span>
              </div>
            )}
          </div>

          {/* Echtgeld Formula Explanation */}
          <div className="modern-card mb-6">
            <h3 className="font-bold text-lg mb-3 inline-flex items-center gap-2">
              <Icon name="bulb" size={18} strokeWidth={2.2} className="text-system-green" />Echtgeld-Berechnung Formel
            </h3>
            <div className="bg-bg-secondary rounded-lg p-4 text-sm space-y-2">
              <p className="text-text-primary font-medium">Für den Verlierer eines Spiels gilt:</p>
              <div className="bg-bg-tertiary rounded-lg p-3 font-mono text-xs text-text-primary">
                konto = Verlierer-Konto nach Preisgeld (min. 0€) + (100.000€ falls SdS-Spieler)<br />
                Betrag = 5 + max(0, runde((|Preisgeld| − konto) / 100.000€))
              </div>
              <ul className="text-text-secondary space-y-1 mt-2">
                <li>• <strong>Basisgebühr:</strong> 5€ (immer)</li>
                <li>• <strong>Aufschlag:</strong> +1€ je 100.000€, das das Preisgeld nicht durch das Verlierer-Konto gedeckt wird</li>
                <li>• <strong>Verlierer-Konto:</strong> Bilanz nach Abzug des Preisgeldes, mindestens 0€ (das Preisgeld zehrt das Guthaben zuerst auf)</li>
                <li>• <strong>SdS-Bonus:</strong> 100.000€ wird dem Konto angerechnet, falls der Spieler des Spiels beim Verlierer spielt</li>
              </ul>
              <p className="text-text-muted text-xs mt-2 italic">
                Beispiel: Verlierer-Konto 300.000€, Preisgeld −700.000€ → Konto nach Preisgeld = 0€ → Aufschlag: max(0, runde((700.000 − 0) / 100.000)) = 7 → Gesamt: 5 + 7 = 12€
              </p>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="modern-card mb-6">
            <h3 className="font-bold text-lg mb-4 inline-flex items-center gap-2">
              <Icon name="chart" size={18} strokeWidth={2.2} className="text-system-green" />Finanz-Kennzahlen
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-bg-secondary rounded-lg">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(aekFinances.balance)}</div>
                <div className="text-xs text-text-muted">{getTeamDisplay('AEK')} Bargeld</div>
              </div>
              <div className="text-center p-3 bg-bg-secondary rounded-lg">
                <div className="text-xl font-bold text-red-600">{formatCurrency(realFinances.balance)}</div>
                <div className="text-xs text-text-muted">{getTeamDisplay('Real')} Bargeld</div>
              </div>
              <div className="text-center p-3 bg-bg-secondary rounded-lg">
                <div className="text-xl font-bold text-text-primary">
                  {formatCurrency(aekFinances.balance + realFinances.balance)}
                </div>
                <div className="text-xs text-text-muted">Gesamt-Bargeld</div>
              </div>
              <div className="text-center p-3 bg-bg-secondary rounded-lg">
                <div className="text-xl font-bold text-text-primary">{formatCurrency(totalCapital)}</div>
                <div className="text-xs text-text-muted">Gesamtkapital</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Real-money debt alert — only shows when a team owes real money */}
          {((aekFinances.debt || 0) > 0 || (realFinances.debt || 0) > 0) && (
            <button
              onClick={() => setCurrentView('analysis')}
              className="w-full mb-4 flex items-center gap-3 p-3 rounded-2xl bg-system-red/10 text-left"
            >
              <span className="w-9 h-9 rounded-xl bg-system-red/15 text-system-red flex items-center justify-center flex-shrink-0">
                <Icon name="swap" size={18} strokeWidth={2.1} />
              </span>
              <span className="flex-1 min-w-0 text-sm text-text-primary">
                <span className="font-semibold">Echtgeld-Schulden offen:</span>{' '}
                {(aekFinances.debt || 0) > 0 && `${getTeamDisplay('AEK')} ${aekFinances.debt}€`}
                {(aekFinances.debt || 0) > 0 && (realFinances.debt || 0) > 0 && ' · '}
                {(realFinances.debt || 0) > 0 && `${getTeamDisplay('Real')} ${realFinances.debt}€`}
              </span>
              <Icon name="chevronRight" size={18} strokeWidth={2.2} className="text-system-red flex-shrink-0" />
            </button>
          )}

          {/* Compact team comparison */}
      <div className="modern-card mb-4 p-0 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border-light">
          {[
            { key: 'AEK', logo: 'aek', accent: 'text-system-blue', fin: aekFinances },
            { key: 'Real', logo: 'real', accent: 'text-system-red', fin: realFinances },
          ].map((t) => (
            <div key={t.key} className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <TeamLogo team={t.logo} size="md" />
                <h3 className={`font-semibold text-sm ${t.accent}`}>{getTeamDisplay(t.key)}</h3>
              </div>
              <div className={`text-2xl font-bold ${getAmountColorClass(t.fin.balance)} animate-numberCount`}>
                {formatCurrency(t.fin.balance)}
              </div>
              <div className="text-[11px] text-text-tertiary mb-3">Kontostand</div>
              <div className="flex justify-center gap-4 text-xs">
                <div>
                  <div className={`font-semibold ${t.accent}`}>{formatPlayerValue(getTeamSquadValue(t.key))}</div>
                  <div className="text-text-tertiary">Kaderwert</div>
                </div>
                <div>
                  <div className={`font-semibold ${(t.fin.debt || 0) > 0 ? 'text-system-red' : 'text-text-secondary'}`}>{formatCurrency(t.fin.debt || 0)}</div>
                  <div className="text-text-tertiary">Schulden</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total capital banner */}
      <div className="modern-card mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-system-green/12 text-system-green flex items-center justify-center">
            <Icon name="wallet" size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="text-xs text-text-muted">Gesamtkapital</div>
            <div className="text-[11px] text-text-tertiary">Bargeld + Kaderwerte</div>
          </div>
        </div>
        <div className="text-xl font-bold text-text-primary">{formatCurrency(totalCapital)}</div>
      </div>

      {/* Financial Management Actions */}
      <CollapsibleCard
        title="Finanz-Management"
        icon="briefcase"
        subtitle="Export/Import, Analyse & Aktivitäten"
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setShowExportImport(true)}
            className="flex items-center justify-center gap-2 btn-soft btn-soft-green py-3 px-4 rounded-xl text-sm"
          >
            <Icon name="save" size={16} strokeWidth={2} />
            <span>Export/Import</span>
          </button>
          <button
            onClick={() => {
              const totalBalance = aekFinances.balance + realFinances.balance;
              const totalSquadValue = (getTeamSquadValue('AEK') + getTeamSquadValue('Real')) * 1000000;
              const liquidity = totalBalance > 0 ? (totalBalance / totalCapital) * 100 : 0;
              
              toast.success(
                `💰 Finanz-Analyse:\n\n` +
                `Bargeld: ${formatCurrency(totalBalance)}\n` +
                `Kaderwerte: ${formatCurrency(totalSquadValue)}\n` +
                `Liquidität: ${liquidity.toFixed(1)}%`,
                { duration: 5000 }
              );
            }}
            className="flex items-center justify-center gap-2 btn-soft btn-soft-blue py-3 px-4 rounded-xl text-sm"
          >
            <Icon name="trendingUp" size={16} strokeWidth={2} />
            <span>Finanz-Analyse</span>
          </button>
          <button
            onClick={() => {
              const recentTransactions = transactions?.slice(0, 5) || [];
              if (recentTransactions.length === 0) {
                toast.error('Keine Transaktionen vorhanden');
                return;
              }
              
              const summary = recentTransactions.map(t => 
                `${t.type}: ${formatCurrency(t.amount)} (${t.team || 'Unbekannt'})`
              ).join('\n');
              
              toast.success(
                `📋 Letzte Transaktionen:\n\n${summary}`,
                { duration: 6000 }
              );
            }}
            className="flex items-center justify-center gap-2 btn-soft btn-soft-purple py-3 px-4 rounded-xl text-sm"
          >
            <Icon name="clipboard" size={16} strokeWidth={2} />
            <span>Letzte Aktivitäten</span>
          </button>
        </div>
      </CollapsibleCard>

      {/* Match-grouped Transactions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Match-Transaktionen
        </h3>
        
        {matchGroups.length > 0 ? (
          <div className="space-y-3">
            {matchGroups.map(({ match, transactions: matchTransactions }) => {
              const expanded = getExpandedSet(matchGroups);
              const isCollapsed = !expanded.has(match.id);
              const aekNet = getMatchNetChange(matchTransactions, 'AEK');
              const realNet = getMatchNetChange(matchTransactions, 'Real');

              return (
                <div key={match.id} className="modern-card p-0 overflow-hidden">
                  <button
                    onClick={() => toggleMatchTransactions(match.id)}
                    className="w-full p-3 sm:p-4 flex items-center gap-2 cursor-pointer hover:bg-bg-tertiary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <TeamLogo team="aek" size="sm" />
                      <div className="text-center">
                        <div className="text-base font-bold text-text-primary leading-none">
                          {match.goalsa || 0}:{match.goalsb || 0}
                        </div>
                        <div className="text-[10px] text-text-tertiary mt-0.5">
                          {new Date(match.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                      <TeamLogo team="real" size="sm" />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <div className="text-right text-xs leading-tight min-w-0">
                        <div className={`flex items-center justify-end gap-1 font-semibold ${aekNet >= 0 ? 'text-system-green' : 'text-system-red'}`}>
                          <TeamLogo team="aek" size="xs" />
                          <span className="whitespace-nowrap">{aekNet > 0 ? '+' : ''}{formatCurrency(aekNet)}</span>
                        </div>
                        <div className={`flex items-center justify-end gap-1 font-semibold mt-0.5 ${realNet >= 0 ? 'text-system-green' : 'text-system-red'}`}>
                          <TeamLogo team="real" size="xs" />
                          <span className="whitespace-nowrap">{realNet > 0 ? '+' : ''}{formatCurrency(realNet)}</span>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-text-tertiary transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                        <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border-light pt-3">
                      {matchTransactions.map((transaction) => (
                        <div key={transaction.id} className="bg-bg-tertiary rounded-xl p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-lg flex-shrink-0">{getTransactionIcon(transaction.type)}</span>
                              <div className="min-w-0">
                                <h5 className="font-medium text-text-primary text-sm truncate">
                                  {transaction.info || 'Transaktion'}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                                  <span className={`font-medium ${transaction.team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                                    {transaction.team}
                                  </span>
                                  <span>·</span>
                                  <span>{transaction.type}</span>
                                </div>
                              </div>
                            </div>
                            <div className={`text-right font-bold text-sm whitespace-nowrap ${transaction.amount >= 0 ? 'text-system-green' : 'text-system-red'}`}>
                              {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount || 0))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="modern-card text-center py-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
              <Icon name="football" size={28} strokeWidth={1.6} />
            </div>
            <h4 className="text-lg font-medium text-text-primary mb-2">
              Keine Match-Transaktionen
            </h4>
            <p className="text-text-muted">
              Es wurden noch keine match-bezogenen Transaktionen erfasst.
            </p>
          </div>
        )}
      </div>

      {/* Non-Match Transactions */}
      {nonMatchTransactions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Sonstige Transaktionen
          </h3>
          
          <div className="modern-card p-0 overflow-hidden">
            <div className="p-4 border-b border-border-light flex items-center justify-between">
              <div className="text-sm font-semibold text-text-secondary">Nicht match-bezogene Buchungen</div>
              <div className="text-xs bg-bg-tertiary text-text-secondary px-2 py-1 rounded-full font-medium">
                {nonMatchTransactions.length} Buchung{nonMatchTransactions.length !== 1 ? 'en' : ''}
              </div>
            </div>

            <div className="p-4 space-y-2">
              {(showAllNonMatch ? nonMatchTransactions : nonMatchTransactions.slice(0, NON_MATCH_PREVIEW)).map((transaction) => (
                <div key={transaction.id} className="bg-bg-tertiary rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">{getTransactionIcon(transaction.type)}</span>
                      <div className="min-w-0">
                        <h5 className="font-medium text-text-primary text-sm truncate">
                          {transaction.info || 'Transaktion'}
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                          <span className={`font-medium ${transaction.team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                            {transaction.team}
                          </span>
                          <span>·</span>
                          <span>{transaction.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-right font-bold text-sm whitespace-nowrap ${transaction.amount >= 0 ? 'text-system-green' : 'text-system-red'}`}>
                      {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount || 0))}
                    </div>
                  </div>
                </div>
              ))}
              {nonMatchTransactions.length > NON_MATCH_PREVIEW && (
                <button
                  onClick={() => setShowAllNonMatch((s) => !s)}
                  className="w-full py-2 rounded-xl bg-bg-secondary text-text-secondary text-sm font-medium mt-1"
                >
                  {showAllNonMatch ? 'Weniger anzeigen' : `Alle ${nonMatchTransactions.length} anzeigen`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Cards - Only show on admin page */}
      {showHints && (
        <>
          <div className="mt-6 modern-card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3 flex-shrink-0">
                <Icon name="bulb" size={18} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Hinweis zu Marktwerten</h4>
                <p className="text-blue-700 text-sm">
                  Spieler-Marktwerte werden in der Datenbank in Millionen Euro gespeichert (z.B. 12.5 = 12,5M €).
                  Für die Gesamtkapital-Berechnung werden diese automatisch in Euro umgerechnet.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 modern-card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3 flex-shrink-0">
                <Icon name="bulb" size={18} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Transaktionen verwalten</h4>
                <p className="text-blue-700 text-sm">
                  Um neue Transaktionen hinzuzufügen, nutzen Sie den Verwaltungsbereich.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export/Import Modal */}
      {showExportImport && (
        <ExportImportManager onClose={() => setShowExportImport(false)} />
      )}
        </>
      )}
    </div>
  );
}