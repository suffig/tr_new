import { useState } from 'react';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { MatchBusinessLogic } from '../../../utils/matchBusinessLogic';
import { triggerNotification } from '../../NotificationSystem';
import toast from 'react-hot-toast';

export default function AddMatchTab() {
  const { data: players } = useSupabaseQuery('players', '*');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    // Teams are now fixed - no longer selectable
    teama: 'AEK',
    teamb: 'Real',
    date: new Date().toISOString().split('T')[0],
    // Goals are now calculated from player scores
    goalsa: 0,
    goalsb: 0,
    // New structure: array of {player: name, count: number}
    goalslista: [],
    goalslistb: [],
    // Own goals tracking
    ownGoalsA: 0,
    ownGoalsB: 0,
    yellowa: 0,
    reda: 0,
    yellowb: 0,
    redb: 0,
    prizeaek: 0,
    prizereal: 0,
    manofthematch: '',
    motmTeamFilter: 'all' // Add team filter for man of the match
  });
  const [loading, setLoading] = useState(false);

  // Calculate total goals from player scores and own goals
  // Own goals count for the opponent team!
  const calculateTotalGoals = (goalsList, ownGoals, opponentOwnGoals) => {
    const playerGoals = goalsList.reduce((sum, scorer) => sum + scorer.count, 0);
    return playerGoals + opponentOwnGoals; // Add opponent's own goals to this team's score
  };

  // Update form data and recalculate totals
  const updateFormData = (updates) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      
      // Recalculate total goals - own goals count for opponent
      updated.goalsa = calculateTotalGoals(updated.goalslista, updated.ownGoalsA, updated.ownGoalsB);
      updated.goalsb = calculateTotalGoals(updated.goalslistb, updated.ownGoalsB, updated.ownGoalsA);
      
      // Auto-calculate prize money when goals or cards change
      const { prizeaek, prizereal } = MatchBusinessLogic.calculatePrizeMoney(
        updated.goalsa, updated.goalsb, updated.yellowa, updated.reda, updated.yellowb, updated.redb
      );
      
      updated.prizeaek = prizeaek;
      updated.prizereal = prizereal;
      
      return updated;
    });
  };

  const handleInputChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert new goal structure to format expected by business logic
      // These variables are prepared for future use with business logic integration
      // const convertedGoalsA = [];
      // const convertedGoalsB = [];
      
/*      // Convert player goals to array format for business logic
      formData.goalslista.forEach(scorer => {
        for (let i = 0; i < scorer.count; i++) {
          convertedGoalsA.push(scorer.player);
        }
      });
      
      formData.goalslistb.forEach(scorer => {
        for (let i = 0; i < scorer.count; i++) {
          convertedGoalsB.push(scorer.player);
        }
      });
*/
      // Use the comprehensive business logic
      const result = await MatchBusinessLogic.submitMatch({
        date: formData.date,
        teama: formData.teama.trim(),
        teamb: formData.teamb.trim(),
        goalsa: formData.goalsa,
        goalsb: formData.goalsb,
        //goalslista: convertedGoalsA,
        //goalslistb: convertedGoalsB,
		goalslista: formData.goalslista,        // [{player, count}, ...]
		goalslistb: formData.goalslistb,
        ownGoalsA: formData.ownGoalsA,
        ownGoalsB: formData.ownGoalsB,
        yellowa: parseInt(formData.yellowa) || 0,
        reda: parseInt(formData.reda) || 0,
        yellowb: parseInt(formData.yellowb) || 0,
        redb: parseInt(formData.redb) || 0,
        manofthematch: formData.manofthematch || null
      });
      
      // Reset form and close modal
      setFormData({
        teama: 'AEK',
        teamb: 'Real',
        date: new Date().toISOString().split('T')[0],
        goalsa: 0,
        goalsb: 0,
        goalslista: [],
        goalslistb: [],
        ownGoalsA: 0,
        ownGoalsB: 0,
        yellowa: 0,
        reda: 0,
        yellowb: 0,
        redb: 0,
        prizeaek: 0,
        prizereal: 0,
        manofthematch: '',
        motmTeamFilter: 'all'
      });
      setShowModal(false);
      
      // Show success message with comprehensive feedback
      toast.success(result.message);
      
      // Trigger push notification for new match with correct match ID
      triggerNotification('match-created', {
        matchId: result.matchId || 'latest',
        date: formData.date,
        teama: formData.teama,
        teamb: formData.teamb,
        goalsa: formData.goalsa,
        goalsb: formData.goalsb,
        manofthematch: formData.manofthematch
      });
    } catch (error) {
      console.error('Match submission error:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen des Spiels');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    // Basic requirements
    if (!formData.date) return false;
    
    // No draws allowed - one team must win
    if (formData.goalsa === formData.goalsb) return false;
    
    // At least one goal must be scored (no 0:0 matches)
    if (formData.goalsa === 0 && formData.goalsb === 0) return false;
    
    // SdS (Spieler des Spiels) must be selected
    if (!formData.manofthematch || formData.manofthematch.trim() === '') return false;
    
    // If goals are scored, there must be goal scorers (except for own goals only)
    if (formData.goalsa > 0) {
      const playerGoalsA = formData.goalslista.reduce((sum, scorer) => sum + scorer.count, 0);
      const ownGoalsFromB = formData.ownGoalsB || 0;
      if (playerGoalsA + ownGoalsFromB < formData.goalsa) return false;
    }
    
    if (formData.goalsb > 0) {
      const playerGoalsB = formData.goalslistb.reduce((sum, scorer) => sum + scorer.count, 0);
      const ownGoalsFromA = formData.ownGoalsA || 0;
      if (playerGoalsB + ownGoalsFromA < formData.goalsb) return false;
    }
    
    return true;
  };

  // Get validation status for UI feedback
  const getValidationStatus = () => {
    const issues = [];
    
    if (!formData.date) issues.push('Datum fehlt');
    if (formData.goalsa === 0 && formData.goalsb === 0) issues.push('Mindestens ein Tor erforderlich');
    if (formData.goalsa === formData.goalsb && (formData.goalsa > 0 || formData.goalsb > 0)) issues.push('Unentschieden nicht erlaubt');
    if (!formData.manofthematch || formData.manofthematch.trim() === '') issues.push('Spieler des Spiels fehlt');
    
    // Check goal scorer validation
    if (formData.goalsa > 0) {
      const playerGoalsA = formData.goalslista.reduce((sum, scorer) => sum + scorer.count, 0);
      const ownGoalsFromB = formData.ownGoalsB || 0;
      if (playerGoalsA + ownGoalsFromB < formData.goalsa) {
        issues.push(`AEK Torschützen fehlen (${playerGoalsA + ownGoalsFromB}/${formData.goalsa})`);
      }
    }
    
    if (formData.goalsb > 0) {
      const playerGoalsB = formData.goalslistb.reduce((sum, scorer) => sum + scorer.count, 0);
      const ownGoalsFromA = formData.ownGoalsA || 0;
      if (playerGoalsB + ownGoalsFromA < formData.goalsb) {
        issues.push(`Real Torschützen fehlen (${playerGoalsB + ownGoalsFromA}/${formData.goalsb})`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  };

  // Helper functions for card management
  const adjustCards = (cardType, delta) => {
    const newValue = Math.max(0, (formData[cardType] || 0) + delta);
    updateFormData({ [cardType]: newValue });
  };

  // Helper functions for live goal scoring
  const getTeamPlayers = (teamName) => {
    if (!players) return [];
    return players.filter(p => p.team === teamName);
  };

  // Get filtered players for man of the match
  const getFilteredPlayersForMOTM = () => {
    if (!players) return [];
    if (formData.motmTeamFilter === 'all') return players;
    return players.filter(p => p.team === formData.motmTeamFilter);
  };

  // Add goal to a specific player
  const addPlayerGoal = (team, playerName) => {
    const fieldName = team === 'AEK' ? 'goalslista' : 'goalslistb';
    
    updateFormData({
      [fieldName]: formData[fieldName].map(scorer => 
        scorer.player === playerName 
          ? { ...scorer, count: scorer.count + 1 }
          : scorer
      ).concat(
        formData[fieldName].find(s => s.player === playerName) 
          ? [] 
          : [{ player: playerName, count: 1 }]
      )
    });
  };

  // Remove goal from a specific player
  const removePlayerGoal = (team, playerName) => {
    const fieldName = team === 'AEK' ? 'goalslista' : 'goalslistb';
    
    updateFormData({
      [fieldName]: formData[fieldName]
        .map(scorer => scorer.player === playerName 
          ? { ...scorer, count: Math.max(0, scorer.count - 1) }
          : scorer
        )
        .filter(scorer => scorer.count > 0)
    });
  };


  // Add/remove own goals
  const adjustOwnGoals = (team, delta) => {
    const fieldName = team === 'AEK' ? 'ownGoalsA' : 'ownGoalsB';
    const newValue = Math.max(0, formData[fieldName] + delta);
    updateFormData({ [fieldName]: newValue });
  };

  // Add scorer from dropdown
  const addScorer = (team, playerName) => {
    if (!playerName) return;
    const fieldName = team === 'AEK' ? 'goalslista' : 'goalslistb';
    
    const existingScorer = formData[fieldName].find(s => s.player === playerName);
    if (existingScorer) {
      // If player already exists, increment count
      updateFormData({
        [fieldName]: formData[fieldName].map(scorer => 
          scorer.player === playerName 
            ? { ...scorer, count: scorer.count + 1 }
            : scorer
        )
      });
    } else {
      // Add new scorer
      updateFormData({
        [fieldName]: [...formData[fieldName], { player: playerName, count: 1 }]
      });
    }
  };

  // Remove scorer entirely
  const removeScorer = (team, playerName) => {
    const fieldName = team === 'AEK' ? 'goalslista' : 'goalslistb';
    updateFormData({
      [fieldName]: formData[fieldName].filter(scorer => scorer.player !== playerName)
    });
  };

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Neues Spiel hinzufügen
        </h3>
        <p className="text-text-muted text-sm">
          Fügen Sie ein neues Spiel zur Datenbank hinzu.
        </p>
      </div>

      <div className="modern-card">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚽</div>
          <h4 className="text-lg font-medium text-text-primary mb-2">
            Spiel hinzufügen
          </h4>
          <p className="text-text-muted mb-6">
            Klicken Sie auf den Button, um ein neues Spiel zu erfassen.
          </p>
          
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <i className="fas fa-plus mr-2"></i>
            Neues Spiel erfassen
          </button>
        </div>
      </div>

      {/* Match Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-[60] p-2 sm:p-4 overflow-y-auto">
          <div className="bg-bg-secondary rounded-lg w-full max-w-lg modal-content match-modal-content modal-mobile-safe my-4 sm:my-8" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="p-4 sm:p-6 overflow-y-auto mobile-safe-bottom" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-bg-secondary z-10 pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Neues Spiel</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-secondary hover:text-text-primary text-2xl font-bold bg-bg-tertiary hover:bg-bg-hover rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  disabled={loading}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Fixed Teams Display */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">⚽ Spielpaarung</h4>
                    <div className="flex items-center justify-center space-x-4">
                      <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium">
                        AEK Athen
                      </div>
                      <div className="text-gray-500 font-bold text-xl">vs</div>
                      <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium">
                        Real Madrid
                      </div>
                    </div>
                  </div>
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

                {/* Live Goal Scoring */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3">⚽ Live Torwertung</h4>
                  
                  {/* Enhanced Score Display */}
                  <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-xl p-6 mb-4 text-center border border-gray-200 shadow-sm">
                    <div className="text-4xl font-bold text-gray-800 mb-2">
                      <span className="text-blue-600">{formData.goalsa}</span>
                      <span className="mx-4 text-gray-400">:</span>
                      <span className="text-red-600">{formData.goalsb}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium text-blue-700">AEK Athen</span>
                      <span className="mx-2">vs</span>
                      <span className="font-medium text-red-700">Real Madrid</span>
                    </div>
                    {(formData.goalsa > 0 || formData.goalsb > 0) && (
                      <div className="text-xs text-gray-500 mt-2">
                        {formData.goalsa > formData.goalsb ? '🏆 AEK führt' : 
                         formData.goalsb > formData.goalsa ? '🏆 Real führt' : '⚖️ Unentschieden'}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* AEK Scoring */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <h5 className="text-sm font-medium text-blue-600 mb-3">⚽ AEK Athen Torschützen</h5>
                      </div>
                      
                      {/* AEK Scorers List */}
                      <div className="space-y-2">
                        {formData.goalslista.map((scorer, index) => (
                          <div key={`aek-${scorer.player}-${index}`} className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-700">{scorer.player}</div>
                              <div className="text-xs text-gray-500">{scorer.count} Tor{scorer.count !== 1 ? 'e' : ''}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => removePlayerGoal('AEK', scorer.player)}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                disabled={loading}
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-bold text-lg text-gray-700">
                                {scorer.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => addPlayerGoal('AEK', scorer.player)}
                                className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                disabled={loading}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeScorer('AEK', scorer.player)}
                                className="w-8 h-8 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                                disabled={loading}
                                title="Torschütze entfernen"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add AEK Scorer Button */}
                      <div className="border-t pt-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addScorer('AEK', e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full form-input bg-blue-100 border-blue-300 text-blue-800"
                          disabled={loading}
                        >
                          <option value="">+ Torschütze hinzufügen</option>
                          {getTeamPlayers('AEK').map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name} ({player.position})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* AEK Own Goals */}
                      <div className="flex items-center justify-between bg-orange-50 rounded-lg p-2 border border-orange-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">Eigentore</div>
                          <div className="text-xs text-gray-500">Zählen für Real Madrid</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => adjustOwnGoals('AEK', -1)}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                            disabled={loading || formData.ownGoalsA === 0}
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-bold text-lg text-gray-700">
                            {formData.ownGoalsA}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustOwnGoals('AEK', 1)}
                            className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                            disabled={loading}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Real Scoring */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <h5 className="text-sm font-medium text-red-600 mb-3">⚽ Real Madrid Torschützen</h5>
                      </div>
                      
                      {/* Real Scorers List */}
                      <div className="space-y-2">
                        {formData.goalslistb.map((scorer, index) => (
                          <div key={`real-${scorer.player}-${index}`} className="flex items-center justify-between bg-red-50 rounded-lg p-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-700">{scorer.player}</div>
                              <div className="text-xs text-gray-500">{scorer.count} Tor{scorer.count !== 1 ? 'e' : ''}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => removePlayerGoal('Real', scorer.player)}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                disabled={loading}
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-bold text-lg text-gray-700">
                                {scorer.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => addPlayerGoal('Real', scorer.player)}
                                className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                disabled={loading}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeScorer('Real', scorer.player)}
                                className="w-8 h-8 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                                disabled={loading}
                                title="Torschütze entfernen"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Real Scorer Button */}
                      <div className="border-t pt-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addScorer('Real', e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full form-input bg-red-100 border-red-300 text-red-800"
                          disabled={loading}
                        >
                          <option value="">+ Torschütze hinzufügen</option>
                          {getTeamPlayers('Real').map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name} ({player.position})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Real Own Goals */}
                      <div className="flex items-center justify-between bg-orange-50 rounded-lg p-2 border border-orange-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">Eigentore</div>
                          <div className="text-xs text-gray-500">Zählen für AEK Athen</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => adjustOwnGoals('Real', -1)}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                            disabled={loading || formData.ownGoalsB === 0}
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-bold text-lg text-gray-700">
                            {formData.ownGoalsB}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustOwnGoals('Real', 1)}
                            className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                            disabled={loading}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3">🟨🟥 Karten</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p className="text-xs text-blue-600 font-medium">AEK Athen</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-text-muted mb-1">
                            🟨 Gelbe Karten
                          </label>
                          <div className="flex items-center justify-center bg-yellow-50 border border-yellow-300 rounded-lg p-2">
                            <button
                              type="button"
                              onClick={() => adjustCards('yellowa', -1)}
                              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading || formData.yellowa <= 0}
                            >
                              −
                            </button>
                            <span className="mx-3 text-lg font-bold text-gray-700 min-w-[2rem] text-center">
                              {formData.yellowa}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustCards('yellowa', 1)}
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-1">
                            🟥 Rote Karten
                          </label>
                          <div className="flex items-center justify-center bg-red-50 border border-red-300 rounded-lg p-2">
                            <button
                              type="button"
                              onClick={() => adjustCards('reda', -1)}
                              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading || formData.reda <= 0}
                            >
                              −
                            </button>
                            <span className="mx-3 text-lg font-bold text-gray-700 min-w-[2rem] text-center">
                              {formData.reda}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustCards('reda', 1)}
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-red-600 font-medium">Real Madrid</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-text-muted mb-1">
                            🟨 Gelbe Karten
                          </label>
                          <div className="flex items-center justify-center bg-yellow-50 border border-yellow-300 rounded-lg p-2">
                            <button
                              type="button"
                              onClick={() => adjustCards('yellowb', -1)}
                              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading || formData.yellowb <= 0}
                            >
                              −
                            </button>
                            <span className="mx-3 text-lg font-bold text-gray-700 min-w-[2rem] text-center">
                              {formData.yellowb}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustCards('yellowb', 1)}
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-1">
                            🟥 Rote Karten
                          </label>
                          <div className="flex items-center justify-center bg-red-50 border border-red-300 rounded-lg p-2">
                            <button
                              type="button"
                              onClick={() => adjustCards('redb', -1)}
                              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading || formData.redb <= 0}
                            >
                              −
                            </button>
                            <span className="mx-3 text-lg font-bold text-gray-700 min-w-[2rem] text-center">
                              {formData.redb}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustCards('redb', 1)}
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                              disabled={loading}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player of the Match */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3">⭐ Spieler des Spiels</h4>
                  
                  {/* Team Filter */}
                  <div className="mb-3">
                    <label className="block text-xs text-text-muted mb-2">Team Filter:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleInputChange('motmTeamFilter', 'all')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          formData.motmTeamFilter === 'all'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        disabled={loading}
                      >
                        Alle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('motmTeamFilter', 'AEK')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          formData.motmTeamFilter === 'AEK'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        disabled={loading}
                      >
                        AEK
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('motmTeamFilter', 'Real')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          formData.motmTeamFilter === 'Real'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        disabled={loading}
                      >
                        Real
                      </button>
                    </div>
                  </div>
                  
                  {/* Player Selection */}
                  <select
                    value={formData.manofthematch}
                    onChange={(e) => handleInputChange('manofthematch', e.target.value)}
                    className="form-input"
                    disabled={loading}
                  >
                    <option value="">Keinen Spieler auswählen</option>
                    {getFilteredPlayersForMOTM().map((player) => (
                      <option key={player.id} value={player.name}>
                        {player.name} ({player.team} - {player.position})
                      </option>
                    ))}
                  </select>
                  {!players || players.length === 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      Keine Spieler verfügbar. Bitte fügen Sie erst Spieler hinzu.
                    </p>
                  )}
                </div>

                {/* Prize Money */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3">💰 Preisgelder (automatisch berechnet)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Preisgeld AEK (€)
                      </label>
                      <input
                        type="number"
                        value={formData.prizeaek}
                        className="form-input bg-gray-100"
                        placeholder="Automatisch berechnet"
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Preisgeld Real (€)
                      </label>
                      <input
                        type="number"
                        value={formData.prizereal}
                        className="form-input bg-gray-100"
                        placeholder="Automatisch berechnet"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Basierend auf Ergebnis und Karten: Gewinner 1M€ - (Verlierer-Tore × 50k€) - (Karten × 20k€/50k€)
                  </p>
                </div>

                {/* Validation Messages */}
                {formData.goalsa === formData.goalsb && (formData.goalsa > 0 || formData.goalsb > 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="text-red-600 mr-2">⚠️</div>
                      <div>
                        <h5 className="font-medium text-red-800">Unentschieden nicht erlaubt</h5>
                        <p className="text-sm text-red-700">Ein Team muss gewinnen. Unentschieden sind in dieser App nicht möglich.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!formData.manofthematch && (formData.goalsa > 0 || formData.goalsb > 0) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="text-yellow-600 mr-2">⭐</div>
                      <div>
                        <h5 className="font-medium text-yellow-800">Spieler des Spiels erforderlich</h5>
                        <p className="text-sm text-yellow-700">Bitte wählen Sie einen Spieler des Spiels aus, bevor Sie das Match speichern.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Match Summary Preview */}
                {isFormValid() && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-800 mb-3 flex items-center">
                      <i className="fas fa-check-circle mr-2"></i>
                      Spiel-Zusammenfassung
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Datum:</span>
                        <span className="font-medium text-green-800">{new Date(formData.date).toLocaleDateString('de-DE')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Ergebnis:</span>
                        <span className="font-medium text-green-800">AEK {formData.goalsa} : {formData.goalsb} Real</span>
                      </div>
                      {formData.manofthematch && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Spieler des Spiels:</span>
                          <span className="font-medium text-green-800">{formData.manofthematch}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-green-700">Preisgelder:</span>
                        <span className="font-medium text-green-800">
                          AEK {formData.prizeaek.toLocaleString()}€, Real {formData.prizereal.toLocaleString()}€
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Validation Status */}
                {!isFormValid() && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <div className="text-red-600 mr-2 mt-1">⚠️</div>
                      <div className="flex-1">
                        <h5 className="font-medium text-red-800 mb-1">Formular unvollständig</h5>
                        <ul className="text-sm text-red-700 space-y-1">
                          {getValidationStatus().issues.map((issue, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-4 pb-20 sm:pb-4">
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
                    disabled={loading || !isFormValid()}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFormValid() 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-red-500 text-white cursor-not-allowed opacity-75'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Speichern...
                      </div>
                    ) : (
                      isFormValid() ? '✅ Spiel speichern' : `❌ ${getValidationStatus().issues[0] || 'Eingaben unvollständig'}`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}