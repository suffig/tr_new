import Icon from '../icons/Icon';
import { useState } from 'react';
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

  const getTeamCardClass = (teamName) => {
    const baseClass = "modern-card";
    if (teamName === "AEK") return `${baseClass} border-l-4 border-blue-400`;
    if (teamName === "Real") return `${baseClass} border-l-4 border-red-400`;
    if (teamName === "Ehemalige") return `${baseClass} border-l-4 border-slate-400`;
    return baseClass;
  };

  const getTeamColor = (teamName) => {
    if (teamName === "AEK") return "text-blue-600";
    if (teamName === "Real") return "text-red-600";
    if (teamName === "Ehemalige") return "text-slate-600";
    return "text-gray-600";
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {team.logoComponent || <span className="text-2xl">{team.icon}</span>}
                      <div>
                        <h3 className={`font-semibold text-lg ${getTeamColor(team.name)}`}>
                          {team.displayName}
                        </h3>
                        <p className="text-sm text-text-muted">
                          {team.players.length} Spieler
                          {team.squadValue > 0 && (
                            <span className="ml-2">
                              • Kaderwert: {formatCurrencyInMillions(team.squadValue)}
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
                          <div key={player.id} className="bg-bg-tertiary rounded-lg p-3 hover:bg-bg-secondary transition-colors cursor-pointer relative group"
                               onClick={() => handleShowPlayerDetail(player)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <h4 className="font-medium text-text-primary group-hover:text-blue-400 transition-colors">
                                      {player.name}
                                    </h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className={getPositionBadgeClass(player.position)}>
                                        {player.position}
                                      </span>
                                      {player.staerke && (
                                        <span className="text-xs text-text-muted">
                                          Stärke: {player.staerke}
                                        </span>
                                      )}
                                      {(player.value !== null && player.value !== undefined) && (
                                        <span className="text-xs text-primary-green font-medium">
                                          {formatCurrencyInMillions(player.value)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowPlayerDetail(player);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-full hover:bg-blue-400/10"
                                  title="FIFA Statistics"
                                >
                                  <Icon name="chart" size={16} strokeWidth={2} />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPlayer(player);
                                    }}
                                    className="text-text-muted hover:text-primary-green transition-colors p-1"
                                    title="Bearbeiten"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
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
    value: player.value || 0,
    team: player.team || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.position || !formData.team) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
          placeholder="Spielername"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Position *
        </label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
          required
        >
          <option value="">Position wählen</option>
          {POSITIONS.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Team *
        </label>
        <select
          value={formData.team}
          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
          className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
          required
        >
          <option value="">Team wählen</option>
          <option value="AEK">{getTeamDisplay('AEK')}</option>
          <option value="Real">{getTeamDisplay('Real')}</option>
          <option value="Ehemalige">{getTeamDisplay('Ehemalige')}</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Marktwert (in Millionen €)
        </label>
        <input
          type="number" inputMode="decimal"
          min="0"
          step="0.1"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
          onFocus={(e) => e.target.select()}
          className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
          placeholder="0.0"
        />
      </div>
      
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary-green text-white py-2 px-4 rounded-lg hover:bg-primary-green/90 transition-colors"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-bg-secondary text-text-muted py-2 px-4 rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}