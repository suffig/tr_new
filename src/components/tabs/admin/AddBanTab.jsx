import { useState } from 'react';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { supabaseDb } from '../../../utils/supabase';
import { TEAMS, getTeamDisplay } from '../../../constants/teams';
import toast from 'react-hot-toast';
import { BAN_TYPES } from '../../../constants/banTypes';

export default function AddBanTab() {
  const { data: players } = useSupabaseQuery('players', '*');
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [formData, setFormData] = useState({
    player_id: '',
    type: '',
    reason: '',
    customDuration: 1
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset player selection when team changes
    if (field === 'team') {
      setFormData(prev => ({ ...prev, player_id: '' }));
    }
  };

  // Get filtered players based on selected team
  const getFilteredPlayers = () => {
    if (!players || !selectedTeam) return [];
    return players.filter(p => p.team === selectedTeam);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedPlayer = players?.find(p => p.id === parseInt(formData.player_id));
      const selectedBanType = BAN_TYPES.find(type => type.value === formData.type);
      
      if (!selectedPlayer) {
        throw new Error('Spieler nicht gefunden');
      }
      
      if (!selectedBanType) {
        throw new Error('Sperrart nicht gefunden');
      }

      // Check if player already has an active ban
      const existingBans = await supabaseDb.select('bans', '*', { 
        eq: { player_id: selectedPlayer.id } 
      });

      const activeBan = existingBans.data?.find(ban => 
        (ban.matchesserved || 0) < (ban.totalgames || 0)
      );

      if (activeBan) {
        throw new Error(`Spieler "${selectedPlayer.name}" ist bereits gesperrt (${activeBan.totalgames - activeBan.matchesserved} Spiele verbleibend)`);
      }

      const finalDuration = selectedBanType.fixedDuration ? selectedBanType.duration : formData.customDuration;

      const result = await supabaseDb.insert('bans', {
        player_id: selectedPlayer.id,
        team: selectedPlayer.team,
        type: selectedBanType.value,
        totalgames: finalDuration,
        matchesserved: 0,
        reason: formData.reason || selectedBanType.value
      });

      if (result.error) {
        throw new Error(`Ban insert failed: ${result.error.message}`);
      }
      
      // Reset form and close modal
      setFormData({
        player_id: '',
        type: '',
        reason: '',
        customDuration: 1
      });
      setSelectedTeam('');
      setShowModal(false);
      
      // Show success message
      toast.success(`Sperre für "${selectedPlayer.name}" erfolgreich hinzugefügt!`);
    } catch (error) {
      console.error('Ban submission error:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen der Sperre');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = selectedTeam && formData.player_id && formData.type;
  const selectedBanType = BAN_TYPES.find(type => type.value === formData.type);

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Neue Sperre hinzufügen
        </h3>
        <p className="text-text-muted text-sm">
          Erstellen Sie eine neue Spielersperre in der Datenbank.
        </p>
      </div>

      <div className="modern-card">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🚫</div>
          <h4 className="text-lg font-medium text-text-primary mb-2">
            Sperre hinzufügen
          </h4>
          <p className="text-text-muted mb-6">
            Klicken Sie auf den Button, um eine neue Spielersperre zu erfassen.
          </p>
          
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <i className="fas fa-plus mr-2"></i>
            Neue Sperre erfassen
          </button>
        </div>
      </div>

      {/* Ban Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-bg-secondary rounded-lg max-w-md w-full modal-content modal-mobile-safe">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-text-primary">Neue Sperre</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-muted hover:text-text-primary text-2xl"
                  disabled={loading}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Team Selection */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Team *
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => {
                      setSelectedTeam(e.target.value);
                      setFormData(prev => ({ ...prev, player_id: '' }));
                    }}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">Team wählen</option>
                    {TEAMS.filter(team => team.value !== 'Ehemalige').map((team) => (
                      <option key={team.value} value={team.value}>
                        {getTeamDisplay(team.value)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Player Selection */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Spieler *
                  </label>
                  <select
                    value={formData.player_id}
                    onChange={(e) => handleInputChange('player_id', e.target.value)}
                    className="form-input"
                    required
                    disabled={loading || !selectedTeam}
                  >
                    <option value="">
                      {!selectedTeam ? 'Bitte zuerst Team wählen' : 'Spieler wählen'}
                    </option>
                    {getFilteredPlayers().map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.position})
                      </option>
                    ))}
                  </select>
                  {selectedTeam && getFilteredPlayers().length === 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      Keine Spieler im gewählten Team verfügbar.
                    </p>
                  )}
                </div>

                {/* Ban Type */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Sperrart *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">Sperrart wählen</option>
                    {BAN_TYPES.map((banType) => (
                      <option key={banType.value} value={banType.value}>
                        {banType.icon} {banType.label}
                        {banType.fixedDuration 
                          ? ` (${banType.duration} Spiel${banType.duration !== 1 ? 'e' : ''})`
                          : ` (1-${banType.maxDuration} Spiele)`
                        }
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Duration for non-fixed ban types */}
                {selectedBanType && !selectedBanType.fixedDuration && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Anzahl Spiele *
                    </label>
                    <select
                      value={formData.customDuration}
                      onChange={(e) => handleInputChange('customDuration', parseInt(e.target.value))}
                      className="form-input"
                      required
                      disabled={loading}
                    >
                      {Array.from({ length: selectedBanType.maxDuration }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num} Spiel{num !== 1 ? 'e' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-text-muted mt-1">
                      Wählen Sie zwischen {selectedBanType.minDuration} und {selectedBanType.maxDuration} Spielen
                    </p>
                  </div>
                )}

                {selectedBanType && selectedBanType.fixedDuration && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <i className="fas fa-info-circle mr-2"></i>
                      Gelb-Rote Karten haben immer eine feste Sperre von 1 Spiel.
                    </p>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Zusätzlicher Grund (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className="form-input"
                    placeholder="Weitere Details zur Sperre..."
                    disabled={loading}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-border-light rounded-lg text-text-secondary hover:bg-bg-tertiary transition-colors"
                    disabled={loading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid || loading || !players || players.length === 0}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Speichern...
                      </div>
                    ) : (
                      'Speichern'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Available Ban Types */}
      <div className="mt-6 modern-card">
        <h4 className="font-semibold text-text-primary mb-3">Verfügbare Sperrarten</h4>
        <div className="space-y-2">
          {BAN_TYPES.map((banType) => (
            <div key={banType.value} className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg">
              <div className="flex items-center">
                <span className="text-xl mr-2">{banType.icon}</span>
                <span className="font-medium text-text-primary">{banType.label}</span>
              </div>
              <span className="text-sm text-text-muted">
                {banType.fixedDuration 
                  ? `${banType.duration} Spiel${banType.duration !== 1 ? 'e' : ''} (fest)`
                  : `1-${banType.maxDuration} Spiele (variabel)`
                }
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 modern-card bg-yellow-50 border-yellow-200">
        <div className="flex items-start">
          <div className="text-yellow-600 mr-3">
            <i className="fas fa-info-circle"></i>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-800 mb-1">Hinweis</h4>
            <p className="text-yellow-700 text-sm">
              Nach dem Hinzufügen können Sie die Sperre in der Sperren-Übersicht einsehen und verwalten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}