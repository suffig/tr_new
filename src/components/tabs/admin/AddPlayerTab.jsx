import { useState } from 'react';
import { supabaseDb } from '../../../utils/supabase';
import { TEAMS, getTeamDisplay } from '../../../constants/teams';
import toast from 'react-hot-toast';

const POSITIONS = [
  { value: 'TH', label: 'Torwart (TH)' },
  { value: 'IV', label: 'Innenverteidiger (IV)' },
  { value: 'AV', label: 'Außenverteidiger (AV)' },
  { value: 'ZM', label: 'Zentrales Mittelfeld (ZM)' },
  { value: 'OM', label: 'Offensives Mittelfeld (OM)' },
  { value: 'ST', label: 'Stürmer (ST)' },
];

export default function AddPlayerTab() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    position: '',
    goals: 0,
    value: 0,
    //status: 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if player already exists
      const existingPlayer = await supabaseDb.select('players', '*', { 
        eq: { name: formData.name.trim(), team: formData.team.trim() } 
      });

      if (existingPlayer.data && existingPlayer.data.length > 0) {
        throw new Error(`Spieler "${formData.name}" existiert bereits im Team "${formData.team}"`);
      }

      const result = await supabaseDb.insert('players', {
        name: formData.name.trim(),
        team: formData.team.trim(),
        position: formData.position.trim().toUpperCase(),
        goals: parseInt(formData.goals) || 0,
        value: parseFloat(formData.value) || 0,
        //status: formData.status || 'active'
      });

      if (result.error) {
        throw new Error(`Player insert failed: ${result.error.message}`);
      }
      
      // Reset form and close modal
      setFormData({
        name: '',
        team: '',
        position: '',
        goals: 0,
        value: 0,
        //status: 'active'
      });
      setShowModal(false);
      
      // Show success message
      toast.success(`Spieler "${formData.name}" erfolgreich hinzugefügt!`);
    } catch (error) {
      console.error('Player submission error:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen des Spielers');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name && formData.team && formData.position && formData.value !== '';

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Neuen Spieler hinzufügen
        </h3>
        <p className="text-text-muted text-sm">
          Fügen Sie einen neuen Spieler zur Datenbank hinzu.
        </p>
      </div>

      <div className="modern-card">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">👤</div>
          <h4 className="text-lg font-medium text-text-primary mb-2">
            <i className="fas fa-user-plus mr-2"></i>
            Spieler hinzufügen
          </h4>
          <p className="text-text-muted mb-6">
            Klicken Sie auf den Button, um einen neuen Spieler zu erfassen.
          </p>
          
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <i className="fas fa-plus mr-2"></i>
            Neuen Spieler erfassen
          </button>
        </div>
      </div>

      {/* Player Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-bg-secondary rounded-lg max-w-md w-full modal-content modal-mobile-safe">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-text-primary">Neuer Spieler</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-muted hover:text-text-primary text-2xl"
                  disabled={loading}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Player Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Spielername *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="form-input"
                    placeholder="z.B. Max Mustermann"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Team Selection */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Team *
                  </label>
                  <select
                    value={formData.team}
                    onChange={(e) => handleInputChange('team', e.target.value)}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">Team wählen</option>
                    {TEAMS.map((team) => (
                      <option key={team.value} value={team.value}>
                        {getTeamDisplay(team.value)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Position *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">Position wählen</option>
                    {POSITIONS.map((position) => (
                      <option key={position.value} value={position.value}>
                        {position.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Market Value */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Marktwert (Millionen €) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="form-input"
                    placeholder="0.0"
                    disabled={loading}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Marktwert in Millionen Euro (z.B. 1.5 für 1.5M €)
                  </p>
                </div>
				
				{/* Goals */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Anzahl Tore
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.goals}
                    onChange={(e) => handleInputChange('goals', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="form-input"
                    placeholder="0"
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
                    disabled={!isFormValid || loading}
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

      {/* Teams Reference */}
      <div className="mt-6 modern-card">
        <h4 className="font-semibold text-text-primary mb-3">Verfügbare Teams</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {TEAMS.map((team) => (
            <div key={team.value} className="p-3 bg-bg-secondary rounded-lg text-center">
              <span className={`font-medium ${
                team.color === 'blue' ? 'text-blue-600' : 
                team.color === 'red' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {getTeamDisplay(team.value)}
              </span>
              <div className="text-xs text-text-muted mt-1">({team.value})</div>
            </div>
          ))}
        </div>
      </div>

      {/* Positions Reference */}
      <div className="mt-6 modern-card">
        <h4 className="font-semibold text-text-primary mb-3">Verfügbare Positionen</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {POSITIONS.map((position) => (
            <div key={position.value} className="p-3 bg-bg-secondary rounded-lg text-center">
              <span className="font-medium text-text-primary text-sm">{position.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 modern-card bg-green-50 border-green-200">
        <div className="flex items-start">
          <div className="text-green-600 mr-3">
            <i className="fas fa-info-circle"></i>
          </div>
          <div>
            <h4 className="font-semibold text-green-800 mb-1">Hinweis</h4>
            <p className="text-green-700 text-sm">
              Nach dem Hinzufügen können Sie den Spieler in der Kader-Übersicht einsehen und verwalten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}