import Icon from '../icons/Icon';
import { useState } from 'react';
import ZahlFeld from '../ZahlFeld';
import { zahl, alsText } from '../../utils/zahlen';
import { useSupabaseQuery, useSupabaseMutation } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import ExportImportManager from '../ExportImportManager';
import PlayerDetailModal from '../PlayerDetailModal';
import CollapsibleCard from '../CollapsibleCard';
import TeamLogo from '../TeamLogo';
import { POSITIONS } from '../../utils/errorHandling';
import { getTeamDisplay } from '../../constants/teams';
import { ADMIN_EMAIL } from '../../constants/navigation';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function KaderTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const { user } = useAuth();
  // Player mutations are admin-only — same rule as the admin area and the "+" FAB.
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [openPanel, setOpenPanel] = useState(null);
  const [showExportImport, setShowExportImport] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerDetail, setShowPlayerDetail] = useState(false);
  
  const { data: players, loading, error, refetch } = useSupabaseQuery('players', '*');
  const { update } = useSupabaseMutation('players');
  
  const POSITION_ORDER = {
    "TH": 0, "IV": 1, "LV": 2, "RV": 3, "ZDM": 4, "ZM": 5,
    "ZOM": 6, "LM": 7, "RM": 8, "LF": 9, "RF": 10, "ST": 11
  };

  // Mannschaftsteil -> Chip-Farbe (die Chip-Klassen sind token-basiert und
  // bringen ihren Dark-Mode selbst mit, siehe modern-design.css).
  const getPositionBadgeClass = (pos) => {
    if (pos === "TH") return "chip chip-green";
    if (["IV", "LV", "RV", "ZDM"].includes(pos)) return "chip chip-blue";
    if (["ZM", "ZOM", "LM", "RM"].includes(pos)) return "chip chip-yellow";
    if (["LF", "RF", "ST"].includes(pos)) return "chip chip-red";
    return "chip chip-gray";
  };

  const getTeamPlayers = (teamName) => {
    return (players || [])
      .filter(p => p.team === teamName)
      .sort((a, b) => (POSITION_ORDER[a.position] || 99) - (POSITION_ORDER[b.position] || 99));
  };

  const getTeamSquadValue = (teamName) => {
    if (!players) return 0;
    return players
      .filter(p => p.team === teamName)
      .reduce((sum, p) => sum + (p.value || 0), 0);
  };

  const formatCurrencyInMillions = (amount) => {
    // Value is already in millions, just format it
    return `${(amount || 0).toFixed(1)}M €`;
  };

  // Teamfarben aus dem Designsystem statt fester Tailwind-Stufen. Vorher stand
  // hier blue-600/red-400 — andere Farbtoene als die app-weiten system-blue /
  // system-red, und im Dunkelmodus unveraendert, weil sie keine CSS-Variablen
  // sind. AEK ist ueberall blau, Real ueberall rot.
  const getTeamCardClass = (teamName) => {
    const base = "modern-card overflow-hidden border-l-4";
    if (teamName === "AEK") return `${base} border-l-system-blue`;
    if (teamName === "Real") return `${base} border-l-system-red`;
    return `${base} border-l-border-strong`;
  };

  const getTeamColor = (teamName) => {
    if (teamName === "AEK") return "text-system-blue";
    if (teamName === "Real") return "text-system-red";
    return "text-text-secondary";
  };

  // Minimal CRUD functions without changing the design
  const handleEditPlayer = async (player) => {
    setEditingPlayer(player);
  };
  
  const handleSavePlayer = async (playerData) => {
    if (!isAdmin) {
      toast.error('Nur der Admin kann Spieler bearbeiten.');
      return;
    }
    try {
      await update(playerData, editingPlayer.id);
      toast.success(`Spieler ${playerData.name} erfolgreich aktualisiert`);
      setEditingPlayer(null);
      refetch();
      window.dispatchEvent(new CustomEvent('fusta-refresh'));
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Spielers: ' + error.message);
    }
  };

  // FIFA functionality
  const handleShowPlayerDetail = (player) => {
    setSelectedPlayer(player);
    setShowPlayerDetail(true);
  };

  const handleClosePlayerDetail = () => {
    setShowPlayerDetail(false);
    setSelectedPlayer(null);
  };

  if (loading) {
    return <LoadingSpinner message="Lade Kader..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-accent-red mb-4 flex justify-center">
          <Icon name="warning" size={28} strokeWidth={2} />
        </div>
        <p className="text-text-muted mb-4">Fehler beim Laden des Kaders</p>
        <button onClick={refetch} className="btn-primary">
          Erneut versuchen
        </button>
      </div>
    );
  }

  const aekPlayers = getTeamPlayers("AEK");
  const realPlayers = getTeamPlayers("Real");
  const ehemaligePlayers = getTeamPlayers("Ehemalige");

  const teams = [
    { 
      id: 'aek', 
      name: 'AEK', 
      displayName: getTeamDisplay('AEK'), 
      players: aekPlayers,
      squadValue: getTeamSquadValue('AEK'),
      logoComponent: <TeamLogo team="aek" size="md" />
    },
    { 
      id: 'real', 
      name: 'Real', 
      displayName: getTeamDisplay('Real'), 
      players: realPlayers,
      squadValue: getTeamSquadValue('Real'),
      logoComponent: <TeamLogo team="real" size="md" />
    },
    { 
      id: 'ehemalige', 
      name: 'Ehemalige', 
      displayName: getTeamDisplay('Ehemalige'), 
      players: ehemaligePlayers,
      squadValue: getTeamSquadValue('Ehemalige'),
      // Kein Emoji: neutrale Icon-Kachel im Stil der beiden Team-Logos
      logoComponent: (
        <span className="w-9 h-9 rounded-full bg-bg-tertiary text-text-tertiary flex items-center justify-center flex-shrink-0">
          <Icon name="users" size={17} strokeWidth={2.2} />
        </span>
      )
    }
  ];

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">

      {/* Team Accordions */}
      <div className="space-y-4">
            {teams.map((team) => (
              <div key={team.id} className={getTeamCardClass(team.name)}>
                {/* Team Header */}
                <button
                  onClick={() => setOpenPanel(openPanel === team.id ? null : team.id)}
                  className="w-full text-left p-4 focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {team.logoComponent || <span className="text-2xl">{team.icon}</span>}
                      <div className="min-w-0">
                        <h3 className={`font-semibold text-callout truncate ${getTeamColor(team.name)}`}>
                          {team.displayName}
                        </h3>
                        <p className="text-footnote text-text-tertiary num-tabular">
                          {team.players.length} Spieler
                          {team.squadValue > 0 && (
                            <span className="ml-2">
                              · {formatCurrencyInMillions(team.squadValue)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`text-text-tertiary transition-transform duration-200 ${openPanel === team.id ? 'rotate-90' : ''}`}>
                      <Icon name="chevronRight" size={20} strokeWidth={2.2} />
                    </span>
                  </div>
                </button>

                {/* Team Players */}
                {openPanel === team.id && (
                  <div className="px-4 pb-4 border-t border-border-light mt-4 pt-4">
                    {team.players.length > 0 ? (
                      <div className="grid gap-3">
                        {team.players.map((player) => (
                          <div key={player.id} className="bg-bg-tertiary rounded-xl p-3 hover:bg-bg-hover transition-colors cursor-pointer group"
                               onClick={() => handleShowPlayerDetail(player)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-text-primary truncate group-hover:text-system-blue transition-colors">
                                  {player.name}
                                </h4>
                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                  <span className={getPositionBadgeClass(player.position)}>
                                    {player.position}
                                  </span>
                                  {player.staerke && (
                                    <span className="text-caption2 text-text-tertiary num-tabular">
                                      Stärke {player.staerke}
                                    </span>
                                  )}
                                  {(player.value !== null && player.value !== undefined) && (
                                    <span className="text-caption2 text-system-green font-medium num-tabular">
                                      {formatCurrencyInMillions(player.value)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowPlayerDetail(player);
                                  }}
                                  className="w-11 h-11 flex items-center justify-center text-text-tertiary hover:text-system-blue transition-colors rounded-lg"
                                  title="Spielerstatistiken"
                                  aria-label={`Statistiken von ${player.name}`}
                                >
                                  <Icon name="chart" size={16} strokeWidth={2} />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPlayer(player);
                                    }}
                                    className="w-11 h-11 flex items-center justify-center text-text-tertiary hover:text-system-green transition-colors rounded-lg"
                                    title="Bearbeiten"
                                    aria-label={`${player.name} bearbeiten`}
                                  >
                                    <Icon name="edit" size={16} strokeWidth={2} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2 flex justify-center">
                          {team.logoComponent || <span>{team.icon}</span>}
                        </div>
                        <p className="text-text-muted">
                          Keine Spieler in {team.displayName}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

      {/* Kader-Management — unter den Kadern (Hauptinhalt zuerst) */}
      <CollapsibleCard
        title="Kader-Management"
        icon="zap"
        subtitle="Export/Import & Analyse"
        className="mt-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setShowExportImport(true)}
            className="flex items-center justify-center space-x-2 btn-soft btn-soft-orange py-3 px-4 rounded-xl text-sm"
          >
            <Icon name="share" size={16} strokeWidth={2} />
            <span>Export/Import</span>
          </button>
          <button
            onClick={() => {
              const totalValue = (getTeamSquadValue('AEK') + getTeamSquadValue('Real') + getTeamSquadValue('Ehemalige'));
              const avgValue = players?.length ? totalValue / players.length : 0;
              toast.success(
                `📈 Kader-Analyse:\n\n` +
                `Gesamtwert: ${formatCurrencyInMillions(totalValue)}\n` +
                `Durchschnitt: ${formatCurrencyInMillions(avgValue)}\n` +
                `Spieler gesamt: ${players?.length || 0}`,
                { duration: 5000 }
              );
            }}
            className="flex items-center justify-center space-x-2 btn-soft btn-soft-teal py-3 px-4 rounded-xl text-sm"
          >
            <Icon name="trendingUp" size={16} strokeWidth={2} />
            <span>Kader-Analyse</span>
          </button>
        </div>
      </CollapsibleCard>

      {/* New Feature Modals */}
      {showExportImport && (
        <ExportImportManager onClose={() => setShowExportImport(false)} />
      )}
      
      {/* Player Detail Modal with FIFA Stats */}
      {showPlayerDetail && selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={showPlayerDetail}
          onClose={handleClosePlayerDetail}
        />
      )}
      
      {/* Player Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {/* bg-bg-elevated statt bg-bg-elevated — die feste Farbe blieb im
              Dunkelmodus weiss. Rundung wie bei den uebrigen Modals. */}
          <div className="bg-bg-elevated border border-border-light rounded-2xl shadow-ios-floating max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Spieler bearbeiten</h3>
                <button
                  onClick={() => setEditingPlayer(null)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <Icon name="x" size={18} strokeWidth={2.2} />
                </button>
              </div>
              
              <PlayerForm
                player={editingPlayer}
                onSave={handleSavePlayer}
                onCancel={() => setEditingPlayer(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Player form component for editing
function PlayerForm({ player, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: player.name || '',
    position: player.position || '',
    value: alsText(player.value || 0),
    team: player.team || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.position || !formData.team) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    onSave({ ...formData, value: zahl(formData.value) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="form-input"
          placeholder="Spielername"
          required
        />
      </div>
      
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Position *
        </label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="form-input"
          required
        >
          <option value="">Position wählen</option>
          {POSITIONS.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Team *
        </label>
        <select
          value={formData.team}
          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
          className="form-input"
          required
        >
          <option value="">Team wählen</option>
          <option value="AEK">{getTeamDisplay('AEK')}</option>
          <option value="Real">{getTeamDisplay('Real')}</option>
          <option value="Ehemalige">{getTeamDisplay('Ehemalige')}</option>
        </select>
      </div>
      
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Marktwert (in Millionen €)
        </label>
        {/* Der Wert bleibt beim Tippen Text. Vorher stand hier parseFloat im
            onChange — damit liess sich nicht einmal ein Komma oder ein Punkt
            eintippen: "1," wurde sofort wieder zu "1". */}
        <ZahlFeld
          wert={formData.value}
          onChange={(w) => setFormData({ ...formData, value: w })}
          onFocus={(e) => e.target.select()}
          className="form-input"
          placeholder="0,0"
        />
      </div>
      
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}