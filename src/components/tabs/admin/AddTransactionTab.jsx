import { useState } from 'react';
import { supabaseDb } from '../../../utils/supabase';
import { TEAMS, getTeamDisplay } from '../../../constants/teams';
import toast from 'react-hot-toast';

const TRANSACTION_TYPES = [
  { value: 'Preisgeld', label: 'Preisgeld', icon: '🏆' },
  { value: 'Strafe', label: 'Strafe', icon: '📉' },
  { value: 'Spielerkauf', label: 'Spielerkauf', icon: '👤' },
  { value: 'Spielerverkauf', label: 'Spielerverkauf', icon: '💰' },
  { value: 'Echtgeld-Ausgleich', label: 'Echtgeld-Ausgleich', icon: '💳' },
  { value: 'SdS Bonus', label: 'Spieler des Spiels Bonus', icon: '⭐' },
  { value: 'Sonstiges', label: 'Sonstiges', icon: '📈' },
];

export default function AddTransactionTab() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    team: '',
    type: '',
    amount: '',
    info: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      
      // Insert the transaction
      const transactionResult = await supabaseDb.insert('transactions', {
        date: formData.date,
        type: formData.type.trim(),
        team: formData.team.trim(),
        amount: amount,
        info: formData.info.trim(),
        match_id: null
      });

      if (transactionResult.error) {
        throw new Error(`Transaction insert failed: ${transactionResult.error.message}`);
      }

      // Update finances based on transaction type
      await updateFinances(formData.team.trim(), formData.type.trim(), amount);
      
      // Reset form and close modal
      setFormData({
        team: '',
        type: '',
        amount: '',
        info: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowModal(false);
      
      // Show success message
      toast.success('Transaktion erfolgreich hinzugefügt!');
    } catch (error) {
      console.error('Transaction submission error:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen der Transaktion');
    } finally {
      setLoading(false);
    }
  };

  // Function to update finances based on transaction
  const updateFinances = async (team, type, amount) => {
    try {
      // Get current finances for the team
      const financeResult = await supabaseDb.select('finances', '*', { eq: { team } });
      let currentFinance = financeResult.data && financeResult.data.length > 0 
        ? financeResult.data[0] 
        : { team, balance: 0, debt: 0 };

      // Update balance or debt based on transaction type
      let updateData = {};
      
      if (type === "Echtgeld-Ausgleich") {
        // Echtgeld-Ausgleich affects debt
        updateData.debt = (currentFinance.debt || 0) + amount;
      } else {
        // Other transactions affect balance
        let newBalance = (currentFinance.balance || 0) + amount;
        if (newBalance < 0) newBalance = 0; // Balance cannot go below 0
        updateData.balance = newBalance;
      }

      // Update or create finance record
      if (currentFinance.id) {
        await supabaseDb.update('finances', updateData, currentFinance.id);
      } else {
        await supabaseDb.insert('finances', { 
          team, 
          balance: updateData.balance || 0, 
          debt: updateData.debt || 0 
        });
      }
    } catch (error) {
      console.warn('Failed to update finances:', error);
      // Don't throw here as the transaction was already saved
    }
  };

  const isFormValid = formData.team && formData.type && formData.amount && formData.date;

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Neue Transaktion hinzufügen
        </h3>
        <p className="text-text-muted text-sm">
          Erfassen Sie eine neue finanzielle Transaktion.
        </p>
      </div>

      <div className="modern-card">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💰</div>
          <h4 className="text-lg font-medium text-text-primary mb-2">
            Transaktion hinzufügen
          </h4>
          <p className="text-text-muted mb-6">
            Klicken Sie auf den Button, um eine neue Transaktion zu erfassen.
          </p>
          
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <i className="fas fa-plus mr-2"></i>
            Neue Transaktion erfassen
          </button>
        </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-bg-secondary rounded-lg max-w-md w-full modal-content modal-mobile-safe">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-text-primary">Neue Transaktion</h3>
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
                    value={formData.team}
                    onChange={(e) => handleInputChange('team', e.target.value)}
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

                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Transaktionsart *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="form-input"
                    required
                    disabled={loading}
                  >
                    <option value="">Typ wählen</option>
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Betrag (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="form-input"
                    placeholder="0.00"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Negative Werte für Ausgaben, positive für Einnahmen
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Beschreibung
                  </label>
                  <input
                    type="text"
                    value={formData.info}
                    onChange={(e) => handleInputChange('info', e.target.value)}
                    className="form-input"
                    placeholder="Zusätzliche Informationen..."
                    disabled={loading}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="form-input"
                    required
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

      {/* Transaction Types Reference */}
      <div className="mt-6 modern-card">
        <h4 className="font-semibold text-text-primary mb-3">Transaktionsarten</h4>
        <div className="grid grid-cols-2 gap-2">
          {TRANSACTION_TYPES.map((type) => (
            <div key={type.value} className="p-3 bg-bg-secondary rounded-lg text-center">
              <div className="text-2xl mb-2">{type.icon}</div>
              <span className="font-medium text-text-primary">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Teams Reference */}
      <div className="mt-6 modern-card">
        <h4 className="font-semibold text-text-primary mb-3">Verfügbare Teams</h4>
        <div className="grid grid-cols-2 gap-2">
          {TEAMS.filter(team => team.value !== 'Ehemalige').map((team) => (
            <div key={team.value} className="p-3 bg-bg-secondary rounded-lg text-center">
              <span className={`font-medium ${team.color === 'blue' ? 'text-blue-600' : 'text-red-600'}`}>
                {getTeamDisplay(team.value)}
              </span>
              <div className="text-xs text-text-muted mt-1">({team.value})</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 modern-card bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <div className="text-blue-600 mr-3">
            <i className="fas fa-info-circle"></i>
          </div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Hinweis</h4>
            <p className="text-blue-700 text-sm">
              Nach dem Hinzufügen können Sie die Transaktion in der Finanzen-Übersicht einsehen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}