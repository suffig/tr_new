import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { MatchBusinessLogic } from '../../../utils/matchBusinessLogic';
import { triggerNotification } from '../../NotificationSystem';
import toast from 'react-hot-toast';
import { getTeamDisplay } from '../../../constants/teams';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';

const DRAFTS_KEY = 'fusta_match_drafts_v1';

const loadDraftsFromStorage = () => {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistDrafts = (drafts) => {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // ignore quota / serialization errors
  }
};

const makeEmptyForm = () => ({
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

export default function AddMatchTab() {
  const { data: players } = useSupabaseQuery('players', '*');
  const { data: finances } = useSupabaseQuery('finances', '*');
  const [showModal, setShowModal] = useState(false);
  const [drafts, setDrafts] = useState(loadDraftsFromStorage);
  const [editingDraftId, setEditingDraftId] = useState(null);
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

  // Persist drafts to localStorage whenever they change
  useEffect(() => {
    persistDrafts(drafts);
  }, [drafts]);

  // A draft is worth keeping once any score / scorer / card has been entered
  const hasMeaningfulInput = () => {
    return (
      formData.goalsa > 0 || formData.goalsb > 0 ||
      formData.goalslista.length > 0 || formData.goalslistb.length > 0 ||
      formData.yellowa > 0 || formData.reda > 0 ||
      formData.yellowb > 0 || formData.redb > 0 ||
      !!formData.manofthematch
    );
  };

  const openNewMatch = () => {
    setEditingDraftId(null);
    setFormData(makeEmptyForm());
    setShowModal(true);
  };

  // Save current form as a draft (localStorage only — no DB write)
  const saveDraft = () => {
    if (!hasMeaningfulInput()) {
      toast.error('Noch nichts zum Speichern – trage zuerst ein Ergebnis ein.');
      return;
    }
    const now = new Date().toISOString();
    if (editingDraftId) {
      setDrafts(prev => prev.map(d =>
        d.id === editingDraftId ? { ...d, savedAt: now, formData: { ...formData } } : d
      ));
      toast.success('Entwurf aktualisiert');
    } else {
      const id = `draft_${Date.now()}`;
      setDrafts(prev => [{ id, savedAt: now, formData: { ...formData } }, ...prev]);
      setEditingDraftId(id);
      toast.success('Als Entwurf gespeichert');
    }
    setShowModal(false);
  };

  // Closing the modal (× or "Schließen") keeps the work: if anything was
  // entered, it is silently stored/updated as a draft instead of being lost.
  const closeModal = () => {
    if (hasMeaningfulInput()) {
      const now = new Date().toISOString();
      if (editingDraftId) {
        setDrafts(prev => prev.map(d =>
          d.id === editingDraftId ? { ...d, savedAt: now, formData: { ...formData } } : d
        ));
        toast.success('Als Entwurf gespeichert');
      } else {
        const id = `draft_${Date.now()}`;
        setDrafts(prev => [{ id, savedAt: now, formData: { ...formData } }, ...prev]);
        toast.success('Als Entwurf gespeichert');
      }
    }
    setEditingDraftId(null);
    setShowModal(false);
  };

  const loadDraft = (draft) => {
    setFormData({ ...makeEmptyForm(), ...draft.formData });
    setEditingDraftId(draft.id);
    setShowModal(true);
  };

  const deleteDraft = (id) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (editingDraftId === id) setEditingDraftId(null);
    toast.success('Entwurf gelöscht');
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
      
      // Match is now on the DB — drop the draft it came from (if any)
      if (editingDraftId) {
        setDrafts(prev => prev.filter(d => d.id !== editingDraftId));
        setEditingDraftId(null);
      }

      // Reset form and close modal
      setFormData(makeEmptyForm());
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
        issues.push(`${getTeamDisplay('AEK')} Torschützen fehlen (${playerGoalsA + ownGoalsFromB}/${formData.goalsa})`);
      }
    }
    
    if (formData.goalsb > 0) {
      const playerGoalsB = formData.goalslistb.reduce((sum, scorer) => sum + scorer.count, 0);
      const ownGoalsFromA = formData.ownGoalsA || 0;
      if (playerGoalsB + ownGoalsFromA < formData.goalsb) {
        issues.push(`${getTeamDisplay('Real')} Torschützen fehlen (${playerGoalsB + ownGoalsFromA}/${formData.goalsb})`);
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

  // Calculate a live Echtgeld-Ausgleich preview that mirrors the real
  // tracker_full_v1 processing: SdS bonus + prize are applied to the loser's
  // balance (clamped to 0) BEFORE the real-money amount is derived.
  const previewEchtgeld = () => {
    if (formData.goalsa === formData.goalsb) return null;

    const winner = formData.goalsa > formData.goalsb ? 'AEK' : 'Real';
    const loser = winner === 'AEK' ? 'Real' : 'AEK';

    const aekBalance = finances?.find(f => f.team === 'AEK')?.balance || 0;
    const realBalance = finances?.find(f => f.team === 'Real')?.balance || 0;

    const loserBalance = loser === 'AEK' ? aekBalance : realBalance;
    const loserPrize = loser === 'AEK' ? formData.prizeaek : formData.prizereal;
    const loserHasSds = !!(formData.manofthematch && players?.find(p => p.name === formData.manofthematch && p.team === loser));

    // Replicate processFinancialTransactions: add SdS bonus, then prize, clamp ≥ 0
    let loserPostPrize = loserBalance + (loserHasSds ? 100000 : 0) + loserPrize;
    if (loserPostPrize < 0) loserPostPrize = 0;

    const loserBetrag = MatchBusinessLogic.calculateEchtgeldBetrag(loserPostPrize, loserPrize, loserHasSds ? 1 : 0);

    return { winner, loser, loserBetrag, aekBalance, realBalance };
  };

  const echtgeldPreview = previewEchtgeld();

  // Compact +/- stepper used for scorers, own goals and cards
  const renderStepper = (value, onDec, onInc, decDisabled = false) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDec}
        className="w-8 h-8 rounded-lg bg-bg-secondary border border-border-light text-text-secondary hover:bg-bg-hover flex items-center justify-center text-lg font-semibold disabled:opacity-40 transition-colors"
        disabled={loading || decDisabled}
      >
        −
      </button>
      <span className="w-7 text-center font-bold text-text-primary tabular-nums">{value}</span>
      <button
        type="button"
        onClick={onInc}
        className="w-8 h-8 rounded-lg bg-system-green/15 text-system-green hover:bg-system-green/25 flex items-center justify-center text-lg font-semibold disabled:opacity-40 transition-colors"
        disabled={loading}
      >
        +
      </button>
    </div>
  );

  // One team's scoring column (scorers list + add dropdown + own goals)
  const renderTeamScoring = (team) => {
    const isAek = team === 'AEK';
    const accent = isAek ? 'text-system-blue' : 'text-system-red';
    const fieldName = isAek ? 'goalslista' : 'goalslistb';
    const ownField = isAek ? 'ownGoalsA' : 'ownGoalsB';
    const opponent = isAek ? 'Real' : 'AEK';

    return (
      <div className="space-y-2">
        <h5 className={`text-xs font-semibold ${accent} flex items-center gap-1.5`}>
          <TeamLogo team={team.toLowerCase()} size="xs" />{getTeamDisplay(team)}
        </h5>

        {formData[fieldName].map((scorer, index) => (
          <div key={`${team}-${scorer.player}-${index}`} className="flex items-center justify-between gap-2 bg-bg-tertiary rounded-lg p-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{scorer.player}</div>
              <div className="text-[11px] text-text-muted">{scorer.count} Tor{scorer.count !== 1 ? 'e' : ''}</div>
            </div>
            {renderStepper(
              scorer.count,
              () => removePlayerGoal(team, scorer.player),
              () => addPlayerGoal(team, scorer.player)
            )}
          </div>
        ))}

        <select
          onChange={(e) => { if (e.target.value) { addScorer(team, e.target.value); e.target.value = ''; } }}
          className="form-input text-sm"
          disabled={loading}
        >
          <option value="">+ Torschütze hinzufügen</option>
          {getTeamPlayers(team).map((player) => (
            <option key={player.id} value={player.name}>
              {player.name} ({player.position})
            </option>
          ))}
        </select>

        <div className="flex items-center justify-between gap-2 rounded-lg p-2 bg-system-orange/10">
          <div className="min-w-0">
            <div className="text-sm font-medium text-text-primary">Eigentore</div>
            <div className="text-[11px] text-text-muted">Zählen für {getTeamDisplay(opponent)}</div>
          </div>
          {renderStepper(
            formData[ownField],
            () => adjustOwnGoals(team, -1),
            () => adjustOwnGoals(team, 1),
            formData[ownField] === 0
          )}
        </div>
      </div>
    );
  };

  // One card counter (yellow/red) for a team
  const renderCardCounter = (label, field) => (
    <div>
      <label className="block text-[11px] text-text-muted mb-1">{label}</label>
      <div className="flex items-center justify-between bg-bg-tertiary rounded-lg px-2 py-1.5">
        {renderStepper(
          formData[field] || 0,
          () => adjustCards(field, -1),
          () => adjustCards(field, 1),
          (formData[field] || 0) <= 0
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Neues Spiel hinzufügen
        </h3>
      </div>

      <div className="modern-card">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-green/12 text-system-green flex items-center justify-center">
            <Icon name="football" size={32} strokeWidth={1.8} />
          </div>
          <h4 className="text-lg font-medium text-text-primary mb-6">
            Spiel hinzufügen
          </h4>

          <button
            onClick={openNewMatch}
            className="btn-brand inline-flex items-center gap-2 px-6 py-3 rounded-xl"
          >
            <Icon name="football" size={18} strokeWidth={2} />
            Neues Spiel erfassen
          </button>
        </div>
      </div>

      {/* Draft matches — saved locally, not yet on the DB */}
      {drafts.length > 0 && (
        <div className="modern-card mt-4">
          <h4 className="font-semibold text-text-primary mb-1 inline-flex items-center gap-2">
            <Icon name="clipboard" size={18} strokeWidth={2.2} className="text-system-orange" />
            Entwürfe
            <span className="text-xs font-medium bg-system-orange/15 text-system-orange px-2 py-0.5 rounded-full">{drafts.length}</span>
          </h4>
          <p className="text-text-muted text-xs mb-3">
            Zwischengespeicherte Spiele. Noch nicht in der Datenbank – jederzeit weiter bearbeiten und abschließen.
          </p>
          <div className="space-y-2">
            {drafts.map((draft) => {
              const d = draft.formData || {};
              return (
                <div key={draft.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-tertiary border border-border-light">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary text-sm">
                      {getTeamDisplay(d.teama || 'AEK')} {d.goalsa ?? 0} : {d.goalsb ?? 0} {getTeamDisplay(d.teamb || 'Real')}
                    </div>
                    <div className="text-xs text-text-muted">
                      {d.date || '—'} · gespeichert {new Date(draft.savedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={() => loadDraft(draft)}
                    className="btn-soft btn-soft-green px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    Weiter
                  </button>
                  <button
                    onClick={() => deleteDraft(draft.id)}
                    aria-label="Entwurf löschen"
                    className="btn-soft btn-soft-red w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  >
                    <Icon name="trash" size={16} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match Modal — rendered in a portal so `position: fixed` is relative to
          the viewport (a transformed .tab-transition ancestor would otherwise
          become the containing block and misplace/mis-size the dialog). */}
      {showModal && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4">
          <div
            className="bg-bg-secondary rounded-lg w-full max-w-lg modal-content match-modal-content modal-mobile-safe flex flex-col"
            style={{ maxHeight: 'calc(100dvh - 1rem)' }}
          >
            <div className="p-4 sm:p-6 overflow-y-auto mobile-safe-bottom flex-1 min-h-0">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-bg-secondary z-10 pb-4">
                <h3 className="text-xl font-semibold text-text-primary">{editingDraftId ? 'Entwurf bearbeiten' : 'Neues Spiel'}</h3>
                <button
                  onClick={closeModal}
                  aria-label="Schließen (als Entwurf speichern)"
                  className="text-text-secondary hover:text-text-primary text-2xl font-bold bg-bg-tertiary hover:bg-bg-hover rounded-full w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0"
                  disabled={loading}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Fixed Teams Display */}
                <div className="bg-bg-tertiary rounded-xl p-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <TeamLogo team="aek" size="md" />
                      <span className="text-xs font-semibold text-system-blue text-center">{getTeamDisplay('AEK')}</span>
                    </div>
                    <div className="text-text-tertiary font-bold">vs</div>
                    <div className="flex flex-col items-center gap-1.5">
                      <TeamLogo team="real" size="md" />
                      <span className="text-xs font-semibold text-system-red text-center">{getTeamDisplay('Real')}</span>
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
                <div className="border-t border-border-light pt-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-3 inline-flex items-center gap-2"><Icon name="football" size={16} strokeWidth={2.2} className="text-system-green" />Live Torwertung</h4>

                  {/* Compact score display */}
                  <div className="rounded-xl p-4 mb-4 text-center bg-bg-tertiary">
                    <div className="flex items-center justify-center gap-4 mb-1">
                      <TeamLogo team="aek" size="md" />
                      <div className="text-3xl font-bold tabular-nums">
                        <span className="text-system-blue">{formData.goalsa}</span>
                        <span className="mx-3 text-text-tertiary">:</span>
                        <span className="text-system-red">{formData.goalsb}</span>
                      </div>
                      <TeamLogo team="real" size="md" />
                    </div>
                    {(formData.goalsa > 0 || formData.goalsb > 0) && (
                      <div className="text-xs font-medium text-text-secondary mt-1">
                        {formData.goalsa > formData.goalsb ? `🏆 ${getTeamDisplay('AEK')} führt` :
                         formData.goalsb > formData.goalsa ? `🏆 ${getTeamDisplay('Real')} führt` : '⚖️ Unentschieden'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderTeamScoring('AEK')}
                    {renderTeamScoring('Real')}
                  </div>
                </div>

                {/* Cards */}
                <div className="border-t border-border-light pt-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-3 inline-flex items-center gap-2"><Icon name="ban" size={16} strokeWidth={2.2} className="text-system-red" />Karten</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-system-blue flex items-center gap-1.5"><TeamLogo team="aek" size="xs" />{getTeamDisplay('AEK')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {renderCardCounter('🟨 Gelb', 'yellowa')}
                        {renderCardCounter('🟥 Rot', 'reda')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-system-red flex items-center gap-1.5"><TeamLogo team="real" size="xs" />{getTeamDisplay('Real')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {renderCardCounter('🟨 Gelb', 'yellowb')}
                        {renderCardCounter('🟥 Rot', 'redb')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player of the Match */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-3 inline-flex items-center gap-2"><Icon name="star" size={16} strokeWidth={2.2} className="text-system-orange" />Spieler des Spiels</h4>
                  
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
                        {getTeamDisplay('AEK')}
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
                        {getTeamDisplay('Real')}
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
                  {(!players || players.length === 0) && (
                    <p className="text-xs text-text-muted mt-1">
                      Keine Spieler verfügbar. Bitte fügen Sie erst Spieler hinzu.
                    </p>
                  )}
                </div>

                {/* Prize Money */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-3 inline-flex items-center gap-2"><Icon name="euro" size={16} strokeWidth={2.2} className="text-system-green" />Preisgelder (automatisch berechnet)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Preisgeld {getTeamDisplay('AEK')} (€)
                      </label>
                      <input
                        type="number" inputMode="decimal"
                        value={formData.prizeaek}
                        className="form-input bg-gray-100"
                        placeholder="Automatisch berechnet"
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Preisgeld {getTeamDisplay('Real')} (€)
                      </label>
                      <input
                        type="number" inputMode="decimal"
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

                {/* Match Summary Preview */}
                {isFormValid() && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-800 mb-3 flex items-center">
                      <Icon name="check" size={16} strokeWidth={2.6} className="mr-2" />
                      Spiel-Zusammenfassung
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Datum:</span>
                        <span className="font-medium text-green-800">{new Date(formData.date).toLocaleDateString('de-DE')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Ergebnis:</span>
                        <span className="font-medium text-green-800">{getTeamDisplay('AEK')} {formData.goalsa} : {formData.goalsb} {getTeamDisplay('Real')}</span>
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
                          {getTeamDisplay('AEK')} {formData.prizeaek.toLocaleString()}€, {getTeamDisplay('Real')} {formData.prizereal.toLocaleString()}€
                        </span>
                      </div>
                      {echtgeldPreview && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <div className="flex justify-between">
                            <span className="text-green-700">💳 Echtgeld-Ausgleich:</span>
                            <span className="font-bold text-red-700">{getTeamDisplay(echtgeldPreview.loser)} schuldet {echtgeldPreview.loserBetrag}€</span>
                          </div>
                          <div className="mt-1 text-xs text-green-600 italic">
                            Kontostand: {getTeamDisplay('AEK')} {echtgeldPreview.aekBalance.toLocaleString()}€ / {getTeamDisplay('Real')} {echtgeldPreview.realBalance.toLocaleString()}€
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Echtgeld preview even before form is fully valid (when score is known) */}
                {!isFormValid() && echtgeldPreview && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="font-medium text-blue-800 mb-2 flex items-center text-sm">
                      💳 Echtgeld-Vorschau
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Verlierer schuldet:</span>
                        <span className="font-bold text-red-700">{getTeamDisplay(echtgeldPreview.loser)} {echtgeldPreview.loserBetrag}€</span>
                      </div>
                      <div className="text-xs text-blue-600 italic">
                        Kontostand: {getTeamDisplay('AEK')} {echtgeldPreview.aekBalance.toLocaleString()}€ / {getTeamDisplay('Real')} {echtgeldPreview.realBalance.toLocaleString()}€
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
                <div className="pt-4 pb-20 sm:pb-4 space-y-2">
                  {/* Save as draft — works even when the form is still incomplete */}
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-xl font-medium btn-soft btn-soft-orange inline-flex items-center justify-center gap-2"
                  >
                    <Icon name="save" size={16} strokeWidth={2} />
                    {editingDraftId ? 'Entwurf aktualisieren' : 'Als Entwurf speichern'}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2.5 border border-border-light rounded-xl text-text-secondary hover:bg-bg-tertiary transition-colors"
                      disabled={loading}
                    >
                      Schließen
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !isFormValid()}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                        isFormValid()
                          ? 'btn-brand'
                          : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="spinner w-4 h-4 mr-2"></div>
                          Speichern...
                        </div>
                      ) : (
                        isFormValid() ? 'Abschließen & speichern' : (getValidationStatus().issues[0] || 'Eingaben unvollständig')
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}