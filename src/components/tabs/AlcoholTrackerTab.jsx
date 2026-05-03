import { useState, useEffect, useCallback } from 'react';
import AlcoholProgressionGraph from '../AlcoholProgressionGraph.jsx';
import { dataManager } from '../../../dataManager.js';

export default function AlcoholTrackerTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  // Sub-navigation state
  const [activeSection, setActiveSection] = useState('alcohol');
  
  // Load manager data from localStorage (set via TeamSettingsTab)
  const [managers, setManagers] = useState({
    aek: { name: 'Alexander', age: 30, weight: 110 },
    real: { name: 'Philip', age: 30, weight: 105 }
  });
  
  const [beerConsumption, setBeerConsumption] = useState({
    alexander: 0,
    philip: 0
  });

  const [shotConsumption, setShotConsumption] = useState({
    alexander: { shots20: 0, shots40: 0 },
    philip: { shots20: 0, shots40: 0 }
  });

  const [drinkingStartTime, setDrinkingStartTime] = useState(null);

  // Load manager data from database
  const loadManagersFromDatabase = useCallback(async () => {
    try {
      console.log('🔄 Loading managers from database...');
      const result = await dataManager.getManagers();
      console.log('📊 Manager data result:', result);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length >= 2) {
        console.log('✅ Manager data loaded successfully:', result.data);
        // Convert database format to component format
        // Assuming id=1 is AEK manager, id=2 is Real manager
        const aekManager = result.data.find(m => m.id === 1) || { name: 'Alexander', gewicht: 110 };
        const realManager = result.data.find(m => m.id === 2) || { name: 'Philip', gewicht: 105 };
        
        console.log('👤 AEK Manager:', aekManager);
        console.log('👤 Real Manager:', realManager);
        
        setManagers({
          aek: { name: aekManager.name, age: aekManager.age || 30, weight: aekManager.gewicht },
          real: { name: realManager.name, age: realManager.age || 30, weight: realManager.gewicht }
        });
      } else {
        console.warn('⚠️ No manager data found, using defaults. Result:', result);
        // Use defaults if no data
        setManagers({
          aek: { name: 'Alexander', age: 30, weight: 110 },
          real: { name: 'Philip', age: 30, weight: 105 }
        });
      }
    } catch (error) {
      console.error('❌ Error loading manager settings from database:', error);
      // Fallback to defaults if database fails
      setManagers({
        aek: { name: 'Alexander', age: 30, weight: 110 },
        real: { name: 'Philip', age: 30, weight: 105 }
      });
    }
  }, []);

  // New BJ-Tracking system - complete redesign
  const [bjTracking, setBjTracking] = useState({
    // Player accounts (only positive amounts)
    alexander: {
      balance: 0,    // Total account balance
      totalEarnings: 0 // All-time earnings for statistics
    },
    philip: {
      balance: 0,    // Total account balance
      totalEarnings: 0 // All-time earnings for statistics
    },
    // Shared game counter
    gameCounter: 0,
    // Rounds system - each round contains multiple games
    rounds: [],
    currentRound: {
      active: false,
      roundNumber: 1,
      games: [],       // Games in current round
      startTime: null
    }
  });

  // Custom amount inputs for each player
  const [customAmounts, setCustomAmounts] = useState({
    alexander: '',
    philip: ''
  });

  // State for collapsible buttons (mobile optimization)
  const [showAdvancedButtons, setShowAdvancedButtons] = useState({
    alexander: false,
    philip: false
  });

  // Schnaps-Counter state
  const [schnapsShotsData, setSchnapsShotsData] = useState({
    target: 18,
    alex: 0,
    philip: 0,
    history: []
  });

  // Schnaps target editing
  const [editingSchnapsTarget, setEditingSchnapsTarget] = useState(false);
  const [schnapsTargetInput, setSchnapsTargetInput] = useState('');

  // Sterne-Counter state
  const [sterneData, setSterneData] = useState({
    philip: 0,
    alex: 0,
    history: []
  });

  // Sterne input state
  const [sterneInput, setSterneInput] = useState({ person: 'philip', stars: 3 });

  // Load saved values on component mount
  useEffect(() => {
    // Load manager settings from database
    loadManagersFromDatabase();

    // Load beer consumption from localStorage (keeping this in localStorage for now)
    const savedBeer = localStorage.getItem('beerConsumption');
    if (savedBeer) {
      try {
        setBeerConsumption(JSON.parse(savedBeer));
      } catch (e) {
        console.error('Error loading beer consumption:', e);
      }
    }

    // Load shot consumption from localStorage (keeping this in localStorage for now)
    const savedShots = localStorage.getItem('shotConsumption');
    if (savedShots) {
      try {
        setShotConsumption(JSON.parse(savedShots));
      } catch (e) {
        console.error('Error loading shot consumption:', e);
      }
    }

    // Load drinking start time from localStorage (keeping this in localStorage for now)
    const savedStartTime = localStorage.getItem('drinkingStartTime');
    if (savedStartTime) {
      setDrinkingStartTime(savedStartTime);
    }

    // Load Schnaps counter from localStorage
    const savedSchnaps = localStorage.getItem('schnapsShotsData');
    if (savedSchnaps) {
      try {
        setSchnapsShotsData(JSON.parse(savedSchnaps));
      } catch (e) {
        console.error('Error loading Schnaps data:', e);
      }
    }

    // Load Sterne counter from localStorage
    const savedSterne = localStorage.getItem('sterneData');
    if (savedSterne) {
      try {
        setSterneData(JSON.parse(savedSterne));
      } catch (e) {
        console.error('Error loading Sterne data:', e);
      }
    }

    // Load BJ tracking data from localStorage
    const savedBjTracking = localStorage.getItem('bjTracking');
    if (savedBjTracking) {
      try {
        const parsedData = JSON.parse(savedBjTracking);
        setBjTracking(parsedData);
      } catch (e) {
        console.error('Error loading BJ tracking data:', e);
        // Reset to default if parse fails
        const resetData = {
          alexander: { balance: 0, totalEarnings: 0 },
          philip: { balance: 0, totalEarnings: 0 },
          gameCounter: 0,
          rounds: [],
          currentRound: {
            active: false,
            roundNumber: 1,
            games: [],
            startTime: null
          }
        };
        setBjTracking(resetData);
      }
    }

    // Listen for manager settings changes
    const handleManagerChange = () => {
      // Reload from database when settings change
      loadManagersFromDatabase();
    };

    window.addEventListener('managerSettingsChanged', handleManagerChange);
    return () => window.removeEventListener('managerSettingsChanged', handleManagerChange);
  }, [loadManagersFromDatabase]);

  // Save data to localStorage
  const saveBeerConsumption = (newConsumption) => {
    setBeerConsumption(newConsumption);
    localStorage.setItem('beerConsumption', JSON.stringify(newConsumption));
  };

  const saveShotConsumption = (newConsumption) => {
    setShotConsumption(newConsumption);
    localStorage.setItem('shotConsumption', JSON.stringify(newConsumption));
  };

  const addBeer = (person) => {
    const newConsumption = {
      ...beerConsumption,
      [person]: beerConsumption[person] + 1
    };
    saveBeerConsumption(newConsumption);
    
    // Set drinking start time if not already set
    if (!drinkingStartTime) {
      const startTime = new Date().toISOString();
      setDrinkingStartTime(startTime);
      localStorage.setItem('drinkingStartTime', startTime);
    }
  };

  const addBeerToBoth = () => {
    const newConsumption = {
      alexander: beerConsumption.alexander + 1,
      philip: beerConsumption.philip + 1
    };
    saveBeerConsumption(newConsumption);
    
    // Set drinking start time if not already set
    if (!drinkingStartTime) {
      const startTime = new Date().toISOString();
      setDrinkingStartTime(startTime);
      localStorage.setItem('drinkingStartTime', startTime);
    }
  };

  const addShot = (person, alcoholPercent) => {
    const shotType = alcoholPercent === 40 ? 'shots40' : 'shots20';
    const newConsumption = {
      ...shotConsumption,
      [person]: {
        ...shotConsumption[person],
        [shotType]: shotConsumption[person][shotType] + 1
      }
    };
    saveShotConsumption(newConsumption);
    
    // Set drinking start time if not already set
    if (!drinkingStartTime) {
      const startTime = new Date().toISOString();
      setDrinkingStartTime(startTime);
      localStorage.setItem('drinkingStartTime', startTime);
    }
  };

  const resetConsumption = () => {
    saveBeerConsumption({ alexander: 0, philip: 0 });
    saveShotConsumption({
      alexander: { shots20: 0, shots40: 0 },
      philip: { shots20: 0, shots40: 0 }
    });
    setDrinkingStartTime(null);
    localStorage.removeItem('drinkingStartTime');
  };

  // Blood Alcohol Content calculation using Widmark formula with time decay
  const calculateBloodAlcohol = (beerCount, shots, playerData, drinkingTime = null) => {
    if (!playerData.weight || (beerCount === 0 && (!shots || (shots.shots20 === 0 && shots.shots40 === 0)))) return '0.00';
    
    // Beer alcohol calculation: 0.5L beer = 500ml * 0.05 (5%) = 25ml pure alcohol
    // Density of ethanol = 0.789g/ml, so 25ml = 19.725g pure alcohol per beer
    const beerAlcoholGrams = beerCount * 25 * 0.789;
    
    // Shot alcohol calculation: 2cl shot = 20ml
    // 20% shot: 20ml * 0.20 * 0.789g/ml = 3.156g pure alcohol
    // 40% shot: 20ml * 0.40 * 0.789g/ml = 6.312g pure alcohol
    let shotAlcoholGrams = 0;
    if (shots) {
      shotAlcoholGrams = (shots.shots20 * 20 * 0.20 * 0.789) + (shots.shots40 * 20 * 0.40 * 0.789);
    }
    
    const totalAlcoholGrams = beerAlcoholGrams + shotAlcoholGrams;
    
    // Widmark factors (standard clinical values)
    const r = playerData.gender === 'male' ? 0.70 : 0.60;
    
    // Widmark formula: BAC = A / (r × m) where A=alcohol in grams, r=distribution factor, m=weight in kg
    let bac = totalAlcoholGrams / (r * playerData.weight);
    
    // Time-based alcohol elimination (0.15 promille per hour)
    if (drinkingTime) {
      const now = new Date();
      const startTime = new Date(drinkingTime);
      const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
      const eliminatedBac = hoursElapsed * 0.15;
      bac = Math.max(0, bac - eliminatedBac);
    }
    
    return bac.toFixed(2);
  };

  // Calculate when person will be sober again (BAC = 0)
  const calculateSoberTime = (beerCount, shots, playerData, drinkingTime) => {
    if (!playerData.weight || (beerCount === 0 && (!shots || (shots.shots20 === 0 && shots.shots40 === 0)))) return null;
    if (!drinkingTime) return null;
    
    // Calculate total alcohol without time decay
    const beerAlcoholGrams = beerCount * 25 * 0.789;
    let shotAlcoholGrams = 0;
    if (shots) {
      shotAlcoholGrams = (shots.shots20 * 20 * 0.20 * 0.789) + (shots.shots40 * 20 * 0.40 * 0.789);
    }
    const totalAlcoholGrams = beerAlcoholGrams + shotAlcoholGrams;
    
    const r = playerData.gender === 'male' ? 0.70 : 0.60;
    const maxBac = totalAlcoholGrams / (r * playerData.weight);
    
    // Hours needed to eliminate all alcohol (0.15‰ per hour)
    const hoursToSober = maxBac / 0.15;
    
    // Calculate sober time
    const startTime = new Date(drinkingTime);
    const soberTime = new Date(startTime.getTime() + (hoursToSober * 60 * 60 * 1000));
    
    return soberTime;
  };

  // Simple BAC visualization component
  const BACChart = ({ bac, name }) => {
    const bacValue = parseFloat(bac);
    const maxDisplay = 2.0; // Maximum BAC to display on chart
    const percentage = Math.min((bacValue / maxDisplay) * 100, 100);
    
    const getColorClass = (bac) => {
      if (bac >= 1.0) return 'bg-red-500';
      if (bac >= 0.5) return 'bg-orange-500';
      if (bac >= 0.3) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    return (
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>0‰</span>
          <span>{name} BAC</span>
          <span>2‰</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 relative">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${getColorClass(bacValue)}`}
            style={{ width: `${percentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {bac}‰
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Nüchtern</span>
          <span>Betrunken</span>
        </div>
      </div>
    );
  };

  const getTimeSinceDrinking = () => {
    if (!drinkingStartTime) return null;
    
    const now = new Date();
    const startTime = new Date(drinkingStartTime);
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
    
    if (hoursElapsed < 1) {
      const minutes = Math.floor(hoursElapsed * 60);
      return `${minutes} Minuten`;
    } else {
      return `${hoursElapsed.toFixed(1)} Stunden`;
    }
  };

  // New BJ-Tracking functions
  const saveBjTrackingData = (newData) => {
    setBjTracking(newData);
    localStorage.setItem('bjTracking', JSON.stringify(newData));
  };

  // Add amount to player account and increment game counter
  const addToPlayerAccount = (player, amount) => {
    const newData = {
      ...bjTracking,
      [player]: {
        ...bjTracking[player],
        balance: bjTracking[player].balance + amount,
        totalEarnings: bjTracking[player].totalEarnings + amount
      },
      gameCounter: bjTracking.gameCounter + 1
    };

    // Auto-start round if none is active (requirement 3)
    if (!bjTracking.currentRound.active) {
      newData.currentRound = {
        active: true,
        roundNumber: bjTracking.rounds.length + 1,
        games: [],
        startTime: new Date().toISOString()
      };
    }

    // Add game to current round
    const game = {
      id: Date.now(),
      gameNumber: bjTracking.gameCounter + 1,
      player: player,
      amount: amount,
      timestamp: new Date().toISOString(),
      description: `${player === 'alexander' ? managers.aek.name : managers.real.name}: +${amount.toFixed(2)}€`
    };

    newData.currentRound.games = [...bjTracking.currentRound.games, game];

    // Auto-close round after 10 games (requirement 2)
    if (newData.currentRound.games.length >= 10) {
      const finishedRound = {
        id: Date.now(),
        roundNumber: newData.currentRound.roundNumber,
        games: [...newData.currentRound.games],
        startTime: newData.currentRound.startTime,
        endTime: new Date().toISOString(),
        gamesCount: newData.currentRound.games.length,
        alexanderTotal: newData.currentRound.games
          .filter(g => g.player === 'alexander')
          .reduce((sum, g) => sum + g.amount, 0),
        philipTotal: newData.currentRound.games
          .filter(g => g.player === 'philip')
          .reduce((sum, g) => sum + g.amount, 0)
      };

      newData.rounds = [...bjTracking.rounds, finishedRound];
      newData.currentRound = {
        active: false,
        roundNumber: bjTracking.rounds.length + 2,
        games: [],
        startTime: null
      };
    }

    saveBjTrackingData(newData);
  };

  // Add "0" game (tie) - increments counter but no money change
  const addTieGame = () => {
    const newData = {
      ...bjTracking,
      gameCounter: bjTracking.gameCounter + 1
    };

    // Auto-start round if none is active (requirement 3)
    if (!bjTracking.currentRound.active) {
      newData.currentRound = {
        active: true,
        roundNumber: bjTracking.rounds.length + 1,
        games: [],
        startTime: new Date().toISOString()
      };
    }

    // Add tie game to current round
    const game = {
      id: Date.now(),
      gameNumber: bjTracking.gameCounter + 1,
      player: null,
      amount: 0,
      timestamp: new Date().toISOString(),
      description: 'Unentschieden (0€)'
    };

    newData.currentRound.games = [...bjTracking.currentRound.games, game];

    // Auto-close round after 10 games (requirement 2)
    if (newData.currentRound.games.length >= 10) {
      const finishedRound = {
        id: Date.now(),
        roundNumber: newData.currentRound.roundNumber,
        games: [...newData.currentRound.games],
        startTime: newData.currentRound.startTime,
        endTime: new Date().toISOString(),
        gamesCount: newData.currentRound.games.length,
        alexanderTotal: newData.currentRound.games
          .filter(g => g.player === 'alexander')
          .reduce((sum, g) => sum + g.amount, 0),
        philipTotal: newData.currentRound.games
          .filter(g => g.player === 'philip')
          .reduce((sum, g) => sum + g.amount, 0)
      };

      newData.rounds = [...bjTracking.rounds, finishedRound];
      newData.currentRound = {
        active: false,
        roundNumber: bjTracking.rounds.length + 2,
        games: [],
        startTime: null
      };
    }

    saveBjTrackingData(newData);
  };

  // Start a new round
  const startNewRound = () => {
    const newData = {
      ...bjTracking,
      currentRound: {
        active: true,
        roundNumber: bjTracking.rounds.length + 1,
        games: [],
        startTime: new Date().toISOString()
      }
    };
    saveBjTrackingData(newData);
  };

  // Finish current round
  const finishCurrentRound = () => {
    if (!bjTracking.currentRound.active) return;

    const finishedRound = {
      id: Date.now(),
      roundNumber: bjTracking.currentRound.roundNumber,
      games: [...bjTracking.currentRound.games],
      startTime: bjTracking.currentRound.startTime,
      endTime: new Date().toISOString(),
      gamesCount: bjTracking.currentRound.games.length,
      alexanderTotal: bjTracking.currentRound.games
        .filter(g => g.player === 'alexander')
        .reduce((sum, g) => sum + g.amount, 0),
      philipTotal: bjTracking.currentRound.games
        .filter(g => g.player === 'philip')
        .reduce((sum, g) => sum + g.amount, 0)
    };

    const newData = {
      ...bjTracking,
      rounds: [...bjTracking.rounds, finishedRound],
      currentRound: {
        active: false,
        roundNumber: bjTracking.rounds.length + 2,
        games: [],
        startTime: null
      }
    };

    saveBjTrackingData(newData);
  };

  // Reset all BJ tracking data
  const resetBjTracking = () => {
    const resetData = {
      alexander: { balance: 0, totalEarnings: 0 },
      philip: { balance: 0, totalEarnings: 0 },
      gameCounter: 0,
      rounds: [],
      currentRound: {
        active: false,
        roundNumber: 1,
        games: [],
        startTime: null
      }
    };
    saveBjTrackingData(resetData);
  };

  // End BJ session with final accounting (requirement 3)
  const endBjSession = () => {
    // If there's an active round, finish it first
    if (bjTracking.currentRound.active && bjTracking.currentRound.games.length > 0) {
      finishCurrentRound();
    }

    // Show final accounting summary
    const alexanderTotal = bjTracking.alexander.balance;
    const philipTotal = bjTracking.philip.balance;
    const totalGames = bjTracking.gameCounter;
    const totalRounds = bjTracking.rounds.length + (bjTracking.currentRound.active ? 1 : 0);
    
    const winner = alexanderTotal > philipTotal ? managers.aek.name : 
                   philipTotal > alexanderTotal ? managers.real.name : 'Unentschieden';
    const difference = Math.abs(alexanderTotal - philipTotal);

    let summaryMessage = `🃏 BJ-Session Beendet!\n\n`;
    summaryMessage += `📊 Finale Abrechnung:\n`;
    summaryMessage += `🔵 ${managers.aek.name}: +${alexanderTotal.toFixed(2)}€\n`;
    summaryMessage += `🟢 ${managers.real.name}: +${philipTotal.toFixed(2)}€\n\n`;
    summaryMessage += `🏆 Gewinner: ${winner}\n`;
    if (difference > 0) {
      summaryMessage += `💰 Differenz: ${difference.toFixed(2)}€\n\n`;
    }
    summaryMessage += `🎮 Gespielt: ${totalGames} Spiele in ${totalRounds} Runden\n\n`;
    summaryMessage += `Möchten Sie die Session zurücksetzen?`;

    if (window.confirm(summaryMessage)) {
      resetBjTracking();
    }
  };

  // Handle custom amount input and submission
  const handleCustomAmountChange = (player, value) => {
    setCustomAmounts(prev => ({
      ...prev,
      [player]: value
    }));
  };

  const addCustomAmount = (player) => {
    const amount = parseFloat(customAmounts[player]);
    if (amount && amount > 0) {
      addToPlayerAccount(player, amount);
      // Clear the input after adding
      setCustomAmounts(prev => ({
        ...prev,
        [player]: ''
      }));
    }
  };

  // Progress bar component for games (requirement 1)
  const GameProgressBar = ({ currentGames, maxGames = 10 }) => {
    const progress = Math.min((currentGames / maxGames) * 100, 100);
    const isComplete = currentGames >= maxGames;
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-purple-700">Spiele-Fortschritt</span>
          <span className={`${isComplete ? 'text-green-600' : 'text-purple-600'}`}>
            {currentGames}/{maxGames} Spiele
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'
            }`}
            style={{ width: `${progress}%` }}
          />
          {isComplete && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓ Abgeschlossen</span>
            </div>
          )}
        </div>
        {isComplete && (
          <div className="text-center mt-2">
            <span className="text-xs text-green-600 font-medium">
              🎉 10 Spiele erreicht! Zeit für eine neue Runde?
            </span>
          </div>
        )}
      </div>
    );
  };

  // Toggle advanced buttons for mobile optimization (requirement 2)
  const toggleAdvancedButtons = (player) => {
    setShowAdvancedButtons(prev => ({
      ...prev,
      [player]: !prev[player]
    }));
  };

  // ─── Schnaps-Counter helpers ──────────────────────────────────────────────
  const saveSchnapsShotsData = (newData) => {
    setSchnapsShotsData(newData);
    localStorage.setItem('schnapsShotsData', JSON.stringify(newData));
  };

  const addSchnapShot = (person) => {
    const total = schnapsShotsData.alex + schnapsShotsData.philip;
    if (total >= schnapsShotsData.target) return;
    const newData = {
      ...schnapsShotsData,
      [person]: schnapsShotsData[person] + 1,
      history: [
        ...schnapsShotsData.history,
        { person, timestamp: new Date().toISOString() }
      ]
    };
    saveSchnapsShotsData(newData);
  };

  const undoLastShot = () => {
    if (schnapsShotsData.history.length === 0) return;
    const history = [...schnapsShotsData.history];
    const last = history.pop();
    const newData = {
      ...schnapsShotsData,
      [last.person]: Math.max(0, schnapsShotsData[last.person] - 1),
      history
    };
    saveSchnapsShotsData(newData);
  };

  const resetSchnapsShotsData = () => {
    saveSchnapsShotsData({ target: schnapsShotsData.target, alex: 0, philip: 0, history: [] });
  };

  const applySchnapsTarget = () => {
    const val = parseInt(schnapsTargetInput, 10);
    if (!isNaN(val) && val >= 1 && val <= 200) {
      saveSchnapsShotsData({ ...schnapsShotsData, target: val });
    }
    setEditingSchnapsTarget(false);
  };

  // ─── Sterne-Counter helpers ───────────────────────────────────────────────
  const saveSterneData = (newData) => {
    setSterneData(newData);
    localStorage.setItem('sterneData', JSON.stringify(newData));
  };

  const addSterne = () => {
    const { person, stars } = sterneInput;
    const gained = 6 - stars; // Differenz zu 6 Sternen
    const newData = {
      ...sterneData,
      [person]: sterneData[person] + gained,
      history: [
        ...sterneData.history,
        { person, stars, gained, timestamp: new Date().toISOString() }
      ]
    };
    saveSterneData(newData);
  };

  const undoLastSterne = () => {
    if (sterneData.history.length === 0) return;
    const history = [...sterneData.history];
    const last = history.pop();
    const toRemove = last.gained ?? (6 - last.stars); // backward compat
    const newData = {
      ...sterneData,
      [last.person]: Math.max(0, sterneData[last.person] - toRemove),
      history
    };
    saveSterneData(newData);
  };

  const resetSterneData = () => {
    saveSterneData({ philip: 0, alex: 0, history: [] });
  };

  // Render filled / half / empty stars
  const renderStars = (value, maxStars = 5) => {
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
      if (value >= i) {
        stars.push(<span key={i} className="text-yellow-400">★</span>);
      } else if (value >= i - 0.5) {
        stars.push(<span key={i} className="text-yellow-400 opacity-60">★</span>);
      } else {
        stars.push(<span key={i} className="text-gray-300">★</span>);
      }
    }
    return stars;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const addSchnapShotToBoth = () => {
    const total = schnapsShotsData.alex + schnapsShotsData.philip;
    const spotsLeft = schnapsShotsData.target - total;
    if (spotsLeft <= 0) return;
    const now = new Date().toISOString();
    const addAlex = spotsLeft >= 2 || spotsLeft === 1;
    const addPhilip = spotsLeft >= 2;
    const newHistory = [...schnapsShotsData.history];
    if (addAlex) newHistory.push({ person: 'alex', timestamp: now });
    if (addPhilip) newHistory.push({ person: 'philip', timestamp: now });
    saveSchnapsShotsData({
      ...schnapsShotsData,
      alex: schnapsShotsData.alex + (addAlex ? 1 : 0),
      philip: schnapsShotsData.philip + (addPhilip ? 1 : 0),
      history: newHistory
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      {/* Enhanced Header with iOS 26 Design - matching StatsTab */}
      <div className="mb-6 animate-mobile-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-info rounded-ios-lg flex items-center justify-center">
            <span className="text-white text-xl">🍺</span>
          </div>
          <div>
            <h2 className="text-title1 font-bold text-text-primary">Alkohol & Blackjack</h2>
            <p className="text-footnote text-text-secondary">Alexander vs Philip - Getränke und Kartenspiele verfolgen</p>
          </div>
        </div>
        <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveSection('alcohol')}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeSection === 'alcohol'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🍺 Alkohol
          </button>
          <button
            onClick={() => setActiveSection('schnaps')}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeSection === 'schnaps'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🥃 Schnaps
            {(() => {
              const done = schnapsShotsData.alex + schnapsShotsData.philip;
              const rem = schnapsShotsData.target - done;
              return rem > 0
                ? <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{rem}</span>
                : <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>;
            })()}
          </button>
          <button
            onClick={() => setActiveSection('sterne')}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeSection === 'sterne'
                ? 'bg-white text-yellow-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ⭐ Sterne
            {(() => {
              const net = Math.abs(sterneData.philip - sterneData.alex);
              return net > 0
                ? <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{net % 1 === 0 ? net : net.toFixed(1)}</span>
                : null;
            })()}
          </button>
          <button
            onClick={() => setActiveSection('blackjack')}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeSection === 'blackjack'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🃏 BJ
          </button>
        </div>
      </div>

      {/* Alcohol Section */}
      {activeSection === 'alcohol' && (
        <>
          {drinkingStartTime && (
            <div className="mb-4 text-sm text-text-muted">
              📅 Trinken gestartet vor: {getTimeSinceDrinking()}
            </div>
          )}

      {/* Quick Actions */}
      <div className="modern-card mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Schnell-Aktionen
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={addBeerToBoth}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-6 py-4 rounded-xl transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🍻</span>
            <span>Beiden ein Bier hinzufügen</span>
          </button>
          <button
            onClick={resetConsumption}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔄</span>
            <span>Zurücksetzen</span>
          </button>
        </div>
      </div>

      {/* Individual Beer Tracking */}
      <div className="space-y-6">
        {/* Alexander Section */}
        <div className="modern-card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-blue-700 flex items-center gap-2">
              <span className="text-2xl">🔵</span>
              <span>{managers.aek.name}</span>
            </h3>
            <div className="text-sm text-blue-600 bg-blue-200 px-3 py-1 rounded-full font-medium">
              {managers.aek.weight}kg
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => addBeer('alexander')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🍺 + Bier
            </button>
            <button
              onClick={() => addShot('alexander', 20)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🥃 Shot 20%
            </button>
            <button
              onClick={() => addShot('alexander', 40)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🥃 Shot 40%
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex items-center justify-center bg-white rounded-lg border border-blue-200 px-2 py-3">
              <span className="text-lg font-bold text-blue-700">
                {beerConsumption.alexander}
              </span>
              <span className="text-xs text-blue-600 ml-1">🍺</span>
            </div>
            <div className="flex items-center justify-center bg-white rounded-lg border border-blue-200 px-2 py-3">
              <span className="text-lg font-bold text-blue-700">
                {shotConsumption.alexander.shots20}
              </span>
              <span className="text-xs text-blue-600 ml-1">🥃20%</span>
            </div>
            <div className="flex items-center justify-center bg-white rounded-lg border border-blue-200 px-2 py-3">
              <span className="text-lg font-bold text-blue-700">
                {shotConsumption.alexander.shots40}
              </span>
              <span className="text-xs text-blue-600 ml-1">🥃40%</span>
            </div>
          </div>

          {/* Alexander's BAC */}
          <div className="p-4 bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-300 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700 mb-2">
                {calculateBloodAlcohol(
                  beerConsumption.alexander,
                  shotConsumption.alexander,
                  { weight: managers.aek.weight, gender: 'male' },
                  drinkingStartTime
                )}‰
              </div>
              <div className="text-sm text-blue-600 font-medium">
                Blutalkoholkonzentration (BAK)
              </div>
              {(beerConsumption.alexander > 0 || shotConsumption.alexander.shots20 > 0 || shotConsumption.alexander.shots40 > 0) && (
                <div className="text-xs text-blue-500 mt-1">
                  {beerConsumption.alexander > 0 && `${beerConsumption.alexander} × 0,5L Bier`}
                  {(beerConsumption.alexander > 0) && (shotConsumption.alexander.shots20 > 0 || shotConsumption.alexander.shots40 > 0) && ' + '}
                  {shotConsumption.alexander.shots20 > 0 && `${shotConsumption.alexander.shots20} × 2cl (20%)`}
                  {shotConsumption.alexander.shots20 > 0 && shotConsumption.alexander.shots40 > 0 && ' + '}
                  {shotConsumption.alexander.shots40 > 0 && `${shotConsumption.alexander.shots40} × 2cl (40%)`}
                </div>
              )}
            </div>
            
            {/* BAC Chart */}
            <BACChart 
              bac={calculateBloodAlcohol(
                beerConsumption.alexander,
                shotConsumption.alexander,
                { weight: managers.aek.weight, gender: 'male' },
                drinkingStartTime
              )}
              name="Alexander"
            />
            
            {/* Sober Time */}
            {drinkingStartTime && (beerConsumption.alexander > 0 || shotConsumption.alexander.shots20 > 0 || shotConsumption.alexander.shots40 > 0) && (
              <div className="mt-3 text-center text-sm text-blue-600">
                {(() => {
                  const soberTime = calculateSoberTime(
                    beerConsumption.alexander,
                    shotConsumption.alexander,
                    { weight: managers.aek.weight, gender: 'male' },
                    drinkingStartTime
                  );
                  if (soberTime && soberTime > new Date()) {
                    return `🕐 Wieder nüchtern: ${soberTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
                  } else if (parseFloat(calculateBloodAlcohol(
                    beerConsumption.alexander,
                    shotConsumption.alexander,
                    { weight: managers.aek.weight, gender: 'male' },
                    drinkingStartTime
                  )) === 0) {
                    return '✅ Bereits nüchtern';
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Philip Section */}
        <div className="modern-card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-green-700 flex items-center gap-2">
              <span className="text-2xl">🟢</span>
              <span>{managers.real.name}</span>
            </h3>
            <div className="text-sm text-green-600 bg-green-200 px-3 py-1 rounded-full font-medium">
              {managers.real.weight}kg
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => addBeer('philip')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🍺 + Bier
            </button>
            <button
              onClick={() => addShot('philip', 20)}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🥃 Shot 20%
            </button>
            <button
              onClick={() => addShot('philip', 40)}
              className="bg-green-700 hover:bg-green-800 text-white px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🥃 Shot 40%
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex items-center justify-center bg-white rounded-lg border border-green-200 px-2 py-3">
              <span className="text-lg font-bold text-green-700">
                {beerConsumption.philip}
              </span>
              <span className="text-xs text-green-600 ml-1">🍺</span>
            </div>
            <div className="flex items-center justify-center bg-white rounded-lg border border-green-200 px-2 py-3">
              <span className="text-lg font-bold text-green-700">
                {shotConsumption.philip.shots20}
              </span>
              <span className="text-xs text-green-600 ml-1">🥃20%</span>
            </div>
            <div className="flex items-center justify-center bg-white rounded-lg border border-green-200 px-2 py-3">
              <span className="text-lg font-bold text-green-700">
                {shotConsumption.philip.shots40}
              </span>
              <span className="text-xs text-green-600 ml-1">🥃40%</span>
            </div>
          </div>

          {/* Philip's BAC */}
          <div className="p-4 bg-gradient-to-r from-green-100 to-green-50 border border-green-300 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-700 mb-2">
                {calculateBloodAlcohol(
                  beerConsumption.philip,
                  shotConsumption.philip,
                  { weight: managers.real.weight, gender: 'male' },
                  drinkingStartTime
                )}‰
              </div>
              <div className="text-sm text-green-600 font-medium">
                Blutalkoholkonzentration (BAK)
              </div>
              {(beerConsumption.philip > 0 || shotConsumption.philip.shots20 > 0 || shotConsumption.philip.shots40 > 0) && (
                <div className="text-xs text-green-500 mt-1">
                  {beerConsumption.philip > 0 && `${beerConsumption.philip} × 0,5L Bier`}
                  {(beerConsumption.philip > 0) && (shotConsumption.philip.shots20 > 0 || shotConsumption.philip.shots40 > 0) && ' + '}
                  {shotConsumption.philip.shots20 > 0 && `${shotConsumption.philip.shots20} × 2cl (20%)`}
                  {shotConsumption.philip.shots20 > 0 && shotConsumption.philip.shots40 > 0 && ' + '}
                  {shotConsumption.philip.shots40 > 0 && `${shotConsumption.philip.shots40} × 2cl (40%)`}
                </div>
              )}
            </div>
            
            {/* BAC Chart */}
            <BACChart 
              bac={calculateBloodAlcohol(
                beerConsumption.philip,
                shotConsumption.philip,
                { weight: managers.real.weight, gender: 'male' },
                drinkingStartTime
              )}
              name="Philip"
            />
            
            {/* Sober Time */}
            {drinkingStartTime && (beerConsumption.philip > 0 || shotConsumption.philip.shots20 > 0 || shotConsumption.philip.shots40 > 0) && (
              <div className="mt-3 text-center text-sm text-green-600">
                {(() => {
                  const soberTime = calculateSoberTime(
                    beerConsumption.philip,
                    shotConsumption.philip,
                    { weight: managers.real.weight, gender: 'male' },
                    drinkingStartTime
                  );
                  if (soberTime && soberTime > new Date()) {
                    return `🕐 Wieder nüchtern: ${soberTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
                  } else if (parseFloat(calculateBloodAlcohol(
                    beerConsumption.philip,
                    shotConsumption.philip,
                    { weight: managers.real.weight, gender: 'male' },
                    drinkingStartTime
                  )) === 0) {
                    return '✅ Bereits nüchtern';
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Summary */}
      <div className="modern-card mt-6">
        <h3 className="font-bold text-lg mb-4">📊 Erweiterte Statistiken</h3>
        
        {/* Current Session Stats */}
        <div className="mb-6">
          <h4 className="font-semibold text-md mb-3 text-text-primary">🍻 Aktuelle Session</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-text-primary">
                {beerConsumption.alexander + beerConsumption.philip}
              </div>
              <div className="text-sm text-text-muted">Biere gesamt</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-text-primary">
                {((beerConsumption.alexander + beerConsumption.philip) * 0.5).toFixed(1)}L
              </div>
              <div className="text-sm text-text-muted">Biervolumen</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-text-primary">
                {shotConsumption.alexander.shots20 + shotConsumption.alexander.shots40 + 
                 shotConsumption.philip.shots20 + shotConsumption.philip.shots40}
              </div>
              <div className="text-sm text-text-muted">Shots gesamt</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-text-primary">
                {((shotConsumption.alexander.shots20 + shotConsumption.alexander.shots40 + 
                   shotConsumption.philip.shots20 + shotConsumption.philip.shots40) * 2)}cl
              </div>
              <div className="text-sm text-text-muted">Shot-Volumen</div>
            </div>
          </div>
        </div>

        {/* Individual Player Stats */}
        <div className="mb-6">
          <h4 className="font-semibold text-md mb-3 text-text-primary">👥 Spieler-Vergleich</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alexander Stats */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <span className="text-xl">🔵</span>
                {managers.aek.name}
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Biere:</span>
                  <span className="font-semibold">{beerConsumption.alexander}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shots (20%):</span>
                  <span className="font-semibold">{shotConsumption.alexander.shots20}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shots (40%):</span>
                  <span className="font-semibold">{shotConsumption.alexander.shots40}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Aktueller BAK:</span>
                  <span className="font-bold text-blue-700">
                    {calculateBloodAlcohol(beerConsumption.alexander, shotConsumption.alexander, managers.aek, drinkingStartTime)}‰
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Alkohol-Volumen:</span>
                  <span className="font-semibold">
                    {(beerConsumption.alexander * 0.5 * 0.05 + 
                      shotConsumption.alexander.shots20 * 0.02 * 0.20 +
                      shotConsumption.alexander.shots40 * 0.02 * 0.40).toFixed(2)}L
                  </span>
                </div>
              </div>
            </div>

            {/* Philip Stats */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="text-xl">🟢</span>
                {managers.real.name}
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Biere:</span>
                  <span className="font-semibold">{beerConsumption.philip}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shots (20%):</span>
                  <span className="font-semibold">{shotConsumption.philip.shots20}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shots (40%):</span>
                  <span className="font-semibold">{shotConsumption.philip.shots40}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Aktueller BAK:</span>
                  <span className="font-bold text-green-700">
                    {calculateBloodAlcohol(beerConsumption.philip, shotConsumption.philip, managers.real, drinkingStartTime)}‰
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Alkohol-Volumen:</span>
                  <span className="font-semibold">
                    {(beerConsumption.philip * 0.5 * 0.05 + 
                      shotConsumption.philip.shots20 * 0.02 * 0.20 +
                      shotConsumption.philip.shots40 * 0.02 * 0.40).toFixed(2)}L
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Information */}
        {drinkingStartTime && (
          <div className="mb-4">
            <h4 className="font-semibold text-md mb-3 text-text-primary">⏰ Session-Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="text-lg font-bold text-indigo-700">
                  {getTimeSinceDrinking()}
                </div>
                <div className="text-sm text-indigo-600">Trinkdauer</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-lg font-bold text-purple-700">
                  {Math.max(
                    parseFloat(calculateBloodAlcohol(beerConsumption.alexander, shotConsumption.alexander, managers.aek, drinkingStartTime)),
                    parseFloat(calculateBloodAlcohol(beerConsumption.philip, shotConsumption.philip, managers.real, drinkingStartTime))
                  ).toFixed(2)}‰
                </div>
                <div className="text-sm text-purple-600">Höchster BAK</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-lg font-bold text-orange-700">
                  {((beerConsumption.alexander + beerConsumption.philip) / 
                    Math.max(1, parseFloat(getTimeSinceDrinking()?.split(' ')[0] || '1'))).toFixed(1)}
                </div>
                <div className="text-sm text-orange-600">Biere/Stunde</div>
              </div>
            </div>
          </div>
        )}

        {/* Sober Time Predictions */}
        {drinkingStartTime && (beerConsumption.alexander > 0 || beerConsumption.philip > 0 || 
          shotConsumption.alexander.shots20 > 0 || shotConsumption.alexander.shots40 > 0 ||
          shotConsumption.philip.shots20 > 0 || shotConsumption.philip.shots40 > 0) && (
          <div className="mt-4">
            <h4 className="font-semibold text-md mb-3 text-text-primary">🕐 Nüchternzeit-Prognose</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const alexSoberTime = calculateSoberTime(beerConsumption.alexander, shotConsumption.alexander, managers.aek, drinkingStartTime);
                const philipSoberTime = calculateSoberTime(beerConsumption.philip, shotConsumption.philip, managers.real, drinkingStartTime);
                
                return (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                      <div className="text-sm font-medium text-blue-700 mb-1">{managers.aek.name}</div>
                      <div className="text-lg font-bold text-blue-800">
                        {alexSoberTime ? alexSoberTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Bereits nüchtern'}
                      </div>
                      <div className="text-xs text-blue-600">
                        {alexSoberTime ? `${Math.ceil((alexSoberTime - new Date()) / (1000 * 60 * 60))}h verbleibend` : '✅'}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                      <div className="text-sm font-medium text-green-700 mb-1">{managers.real.name}</div>
                      <div className="text-lg font-bold text-green-800">
                        {philipSoberTime ? philipSoberTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Bereits nüchtern'}
                      </div>
                      <div className="text-xs text-green-600">
                        {philipSoberTime ? `${Math.ceil((philipSoberTime - new Date()) / (1000 * 60 * 60))}h verbleibend` : '✅'}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Alcohol Progression Graph */}
      <AlcoholProgressionGraph 
        managers={managers}
        beerConsumption={beerConsumption}
        shotConsumption={shotConsumption}
        drinkingStartTime={drinkingStartTime}
      />

      {/* Info - Only show on admin page */}
      {showHints && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">ℹ️ Hinweise</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• BAK-Berechnung basiert auf der Widmark-Formel</li>
            <li>• Annahme: 0,5L Bier mit 5% Alkoholgehalt</li>
            <li>• Shots: 2cl mit 20% oder 40% Alkoholgehalt</li>
            <li>• Abbau: 0,15‰ pro Stunde</li>
            <li>• Farbkodierung: Grün (0-0,3‰), Gelb (0,3-0,5‰), Orange (0,5-1,0‰), Rot (&gt;1,0‰)</li>
            <li>• Manager-Daten können unter Admin → Team-Verwaltung angepasst werden</li>
          </ul>
        </div>
      )}
        </>
      )}

      {/* ─── Schnaps-Counter Section ─────────────────────────────────────── */}
      {activeSection === 'schnaps' && (
        <>
          {(() => {
            const total = schnapsShotsData.alex + schnapsShotsData.philip;
            const remaining = schnapsShotsData.target - total;
            const pct = Math.min(100, (total / schnapsShotsData.target) * 100);
            const isDone = remaining <= 0;

            return (
              <>
                {/* Hero card */}
                <div className={`modern-card mb-6 border-2 ${isDone ? 'border-green-400 bg-green-50' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'}`}>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-2">{isDone ? '🎉' : '🥃'}</div>
                    {isDone ? (
                      <>
                        <div className="text-3xl font-bold text-green-700 mb-1">Fertig!</div>
                        <div className="text-green-600 font-medium">Alle {schnapsShotsData.target} Shots getrunken</div>
                      </>
                    ) : (
                      <>
                        <div className="text-6xl font-black text-amber-700 leading-none">{remaining}</div>
                        <div className="text-lg text-amber-600 font-semibold mt-1">
                          {remaining === 1 ? 'Shot noch übrig' : 'Shots noch übrig'}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span className="text-amber-700">{total} getrunken</span>
                      <div className="flex items-center gap-2">
                        {editingSchnapsTarget ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              max="200"
                              value={schnapsTargetInput}
                              onChange={e => setSchnapsTargetInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') applySchnapsTarget(); if (e.key === 'Escape') setEditingSchnapsTarget(false); }}
                              className="w-16 text-center border border-amber-400 rounded-lg px-1 py-0.5 text-sm font-bold text-amber-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                              autoFocus
                            />
                            <button onClick={applySchnapsTarget} className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-md font-medium">✓</button>
                            <button onClick={() => setEditingSchnapsTarget(false)} className="text-xs text-gray-500">✕</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setSchnapsTargetInput(String(schnapsShotsData.target)); setEditingSchnapsTarget(true); }}
                            className="flex items-center gap-1 text-gray-500 hover:text-amber-700 active:scale-95 transition-all"
                            title="Ziel anpassen"
                          >
                            <span>Ziel: <span className="text-amber-700 font-bold">{schnapsShotsData.target}</span></span>
                            <span className="text-xs">✏️</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isDone ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                      {/* Shot markers */}
                      {Array.from({ length: schnapsShotsData.target - 1 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-white/40"
                          style={{ left: `${((i + 1) / schnapsShotsData.target) * 100}%` }}
                        />
                      ))}
                      <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow">
                        {total}/{schnapsShotsData.target}
                      </div>
                    </div>
                    {/* Individual shot bubbles */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Array.from({ length: schnapsShotsData.target }).map((_, i) => {
                        const isAlex = i < schnapsShotsData.alex;
                        const isPhilip = !isAlex && i < total;
                        return (
                          <div
                            key={i}
                            className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                              isAlex
                                ? 'bg-blue-500 border-blue-600 text-white'
                                : isPhilip
                                ? 'bg-green-500 border-green-600 text-white'
                                : 'bg-gray-100 border-gray-300 text-gray-400'
                            }`}
                            title={isAlex ? managers.aek.name : isPhilip ? managers.real.name : ''}
                          >
                            {isAlex || isPhilip ? '🥃' : i + 1}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>{managers.aek.name}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>{managers.real.name}</span>
                    </div>
                  </div>

                  {/* Per-person counts */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-100 border-2 border-blue-300 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">🔵</div>
                      <div className="font-bold text-blue-700 text-lg">{managers.aek.name}</div>
                      <div className="text-4xl font-black text-blue-800">{schnapsShotsData.alex}</div>
                      <div className="text-sm text-blue-600">Shots</div>
                    </div>
                    <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">🟢</div>
                      <div className="font-bold text-green-700 text-lg">{managers.real.name}</div>
                      <div className="text-4xl font-black text-green-800">{schnapsShotsData.philip}</div>
                      <div className="text-sm text-green-600">Shots</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isDone ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <button
                          onClick={() => addSchnapShot('alex')}
                          className="bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 active:scale-95 text-white py-5 rounded-2xl transition-all duration-150 font-bold text-lg shadow-lg border-b-4 border-blue-800"
                        >
                          🥃 +1<br />
                          <span className="text-sm font-normal">{managers.aek.name}</span>
                        </button>
                        <button
                          onClick={() => addSchnapShot('philip')}
                          className="bg-gradient-to-b from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 active:scale-95 text-white py-5 rounded-2xl transition-all duration-150 font-bold text-lg shadow-lg border-b-4 border-green-800"
                        >
                          🥃 +1<br />
                          <span className="text-sm font-normal">{managers.real.name}</span>
                        </button>
                      </div>
                      <button
                        onClick={addSchnapShotToBoth}
                        disabled={schnapsShotsData.alex + schnapsShotsData.philip >= schnapsShotsData.target}
                        className="w-full mb-4 bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 active:scale-95 text-white py-4 rounded-2xl transition-all duration-150 font-bold text-base shadow-lg border-b-4 border-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        🥃🥃 Beide +1 (je ein Shot)
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-4xl mb-4 animate-bounce">🎉🥂🎉</div>
                  )}

                  {/* Secondary actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={undoLastShot}
                      disabled={schnapsShotsData.history.length === 0}
                      className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition-all text-sm border border-gray-300"
                    >
                      ↩ Letzten rückgängig
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Schnaps-Counter zurücksetzen?')) resetSchnapsShotsData();
                      }}
                      className="flex-1 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm border border-red-200"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>

                {/* History */}
                {schnapsShotsData.history.length > 0 && (
                  <div className="modern-card">
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <span>📜</span> Verlauf
                    </h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {[...schnapsShotsData.history].reverse().map((entry, i) => {
                        const isAlex = entry.person === 'alex';
                        return (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isAlex ? 'bg-blue-50 border border-blue-100' : 'bg-green-50 border border-green-100'}`}>
                            <div className="flex items-center gap-2">
                              <span>{isAlex ? '🔵' : '🟢'}</span>
                              <span className={`font-medium text-sm ${isAlex ? 'text-blue-700' : 'text-green-700'}`}>
                                {isAlex ? managers.aek.name : managers.real.name}
                              </span>
                              <span className="text-sm">🥃</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* ─── Sterne-Counter Section ──────────────────────────────────────── */}
      {activeSection === 'sterne' && (() => {
        const net = sterneData.philip - sterneData.alex; // positive = Philip leads
        const absNet = Math.abs(net);
        const leader = net > 0 ? managers.real.name : net < 0 ? managers.aek.name : null;
        const leaderColor = net > 0 ? 'green' : 'blue';

        const starOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

        return (
          <>
            {/* Balance card */}
            <div className={`modern-card mb-6 border-2 ${leader ? `border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50` : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">⭐</div>
                {leader ? (
                  <>
                    <div className={`text-2xl font-black ${leaderColor === 'green' ? 'text-green-700' : 'text-blue-700'} mb-1`}>
                      {leader} führt
                    </div>
                    <div className="flex justify-center gap-1 text-3xl mb-1">
                      {renderStars(absNet, 5)}
                    </div>
                    <div className="text-yellow-600 font-semibold">
                      {absNet % 1 === 0 ? absNet : absNet.toFixed(1)} Stern{absNet !== 1 ? 'e' : ''} Vorsprung
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-gray-600 mb-1">Gleichstand</div>
                    <div className="text-gray-400 text-sm">Noch kein Vorsprung</div>
                  </>
                )}
              </div>

              {/* Per-person totals */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-center">
                  <div className="text-blue-700 font-bold text-sm mb-1">🔵 {managers.aek.name}</div>
                  <div className="flex justify-center gap-0.5 text-xl mb-1">{renderStars(sterneData.alex, 5)}</div>
                  <div className="text-2xl font-black text-blue-800">
                    {sterneData.alex % 1 === 0 ? sterneData.alex : sterneData.alex.toFixed(1)}
                  </div>
                  <div className="text-xs text-blue-500">Sterne gesamt</div>
                </div>
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 text-center">
                  <div className="text-green-700 font-bold text-sm mb-1">🟢 {managers.real.name}</div>
                  <div className="flex justify-center gap-0.5 text-xl mb-1">{renderStars(sterneData.philip, 5)}</div>
                  <div className="text-2xl font-black text-green-800">
                    {sterneData.philip % 1 === 0 ? sterneData.philip : sterneData.philip.toFixed(1)}
                  </div>
                  <div className="text-xs text-green-500">Sterne gesamt</div>
                </div>
              </div>

              {/* Star entry form */}
              <div className="bg-white border border-yellow-200 rounded-2xl p-4 mb-4">
                <div className="text-sm font-semibold text-gray-600 mb-3 text-center">⭐ Sterne eintragen</div>

                {/* Person selector */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSterneInput(p => ({ ...p, person: 'alex' }))}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${sterneInput.person === 'alex' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}
                  >
                    🔵 {managers.aek.name}
                  </button>
                  <button
                    onClick={() => setSterneInput(p => ({ ...p, person: 'philip' }))}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${sterneInput.person === 'philip' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600 border border-green-200'}`}
                  >
                    🟢 {managers.real.name}
                  </button>
                </div>

                {/* Star amount selector */}
                <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                  {starOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setSterneInput(p => ({ ...p, stars: s }))}
                      className={`w-12 h-10 rounded-lg text-sm font-bold transition-all active:scale-95 ${sterneInput.stars === s ? 'bg-yellow-400 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                    >
                      {s % 1 === 0 ? s : s.toFixed(1)}
                    </button>
                  ))}
                </div>

                {/* Preview: entered stars + computed gain */}
                <div className="flex flex-col items-center gap-1 mb-4">
                  <div className="flex justify-center gap-0.5 text-2xl">
                    {renderStars(sterneInput.stars, 5)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Team-Stärke: <strong className="text-gray-700">{sterneInput.stars}</strong>
                    {' → '}
                    Gutschrift: <strong className="text-yellow-600">+{(6 - sterneInput.stars) % 1 === 0 ? 6 - sterneInput.stars : (6 - sterneInput.stars).toFixed(1)} ⭐</strong>
                    {' '}(6 − {sterneInput.stars})
                  </div>
                </div>

                {/* Confirm button */}
                <button
                  onClick={addSterne}
                  className={`w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all border-b-4 ${
                    sterneInput.person === 'alex'
                      ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-800'
                      : 'bg-gradient-to-b from-green-500 to-green-700 border-green-800'
                  }`}
                >
                  ⭐ +{(6 - sterneInput.stars) % 1 === 0 ? 6 - sterneInput.stars : (6 - sterneInput.stars).toFixed(1)} für {sterneInput.person === 'alex' ? managers.aek.name : managers.real.name}
                </button>
              </div>

              {/* Secondary actions */}
              <div className="flex gap-3">
                <button
                  onClick={undoLastSterne}
                  disabled={sterneData.history.length === 0}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition-all text-sm border border-gray-300"
                >
                  ↩ Letzten rückgängig
                </button>
                <button
                  onClick={() => { if (window.confirm('Sterne-Counter zurücksetzen?')) resetSterneData(); }}
                  className="flex-1 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm border border-red-200"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* History */}
            {sterneData.history.length > 0 && (
              <div className="modern-card">
                <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span>📜</span> Verlauf
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {[...sterneData.history].reverse().map((entry, i) => {
                    const isAlex = entry.person === 'alex';
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg ${isAlex ? 'bg-blue-50 border border-blue-100' : 'bg-green-50 border border-green-100'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{isAlex ? '🔵' : '🟢'}</span>
                          <span className={`font-semibold text-sm ${isAlex ? 'text-blue-700' : 'text-green-700'}`}>
                            {isAlex ? managers.aek.name : managers.real.name}
                          </span>
                          <span className="text-xs text-gray-400">{entry.stars}★ Team</span>
                          <span className={`text-xs font-bold ${isAlex ? 'text-blue-600' : 'text-green-600'}`}>
                            {(() => { const g = entry.gained ?? (6 - entry.stars); return `+${g % 1 === 0 ? g : g.toFixed(1)}⭐`; })()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* New BJ-Tracking Section */}
      {activeSection === 'blackjack' && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              🃏 BJ-Tracking System
            </h3>
            <p className="text-text-muted text-sm">
              Neues Design: Separate Buttons für Alexander und Philip • Nur positive Beträge • Allgemeiner Spielcounter
            </p>
          </div>

          {/* Game Counter and Account Balances */}
          <div className="modern-card mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
            <h4 className="font-bold text-lg mb-4 text-purple-700 flex items-center gap-2">
              🎯 Übersicht
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Game Counter with Progress Bar */}
              <div className="p-4 bg-white rounded-lg border border-purple-200 text-center">
                <div className="text-3xl font-bold text-purple-700 mb-1">
                  {bjTracking.gameCounter}
                </div>
                <div className="text-sm text-purple-600 mb-3">Gespielte Spiele</div>
                
                {/* Progress Bar for Current Round Games */}
                {bjTracking.currentRound.active && (
                  <div className="mt-3">
                    <GameProgressBar 
                      currentGames={bjTracking.currentRound.games.length} 
                      maxGames={10} 
                    />
                  </div>
                )}
              </div>

              {/* Alexander Balance */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 text-center">
                <h5 className="font-bold text-blue-700 mb-2 flex items-center justify-center gap-2">
                  🔵 {managers.aek.name}
                </h5>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  +{bjTracking.alexander.balance.toFixed(2)}€
                </div>
                <div className="text-xs text-blue-600">Kontostand</div>
              </div>

              {/* Philip Balance */}
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300 text-center">
                <h5 className="font-bold text-green-700 mb-2 flex items-center justify-center gap-2">
                  🟢 {managers.real.name}
                </h5>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  +{bjTracking.philip.balance.toFixed(2)}€
                </div>
                <div className="text-xs text-green-600">Kontostand</div>
              </div>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="modern-card mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
            <h4 className="font-bold text-lg mb-4 text-orange-700 flex items-center gap-2">
              🎮 Hauptbuttons
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Alexander Main Buttons */}
              <div className="space-y-3">
                <h5 className="font-medium text-blue-700 text-center mb-3">🔵 {managers.aek.name}</h5>
                
                {/* Main action buttons - Always visible for mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToPlayerAccount('alexander', 5.00)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🏆 Win<br/>+5.00€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 7.50)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🃏 BJ<br/>+7.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 2.50)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🤝 BJ-Push<br/>+2.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 10.00)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🎲 Double<br/>+10.00€
                  </button>
                </div>

                {/* Collapsible Secondary Buttons - Mobile Optimized */}
                <div className="text-center">
                  <button
                    onClick={() => toggleAdvancedButtons('alexander')}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-blue-300 hover:border-blue-400 min-h-[44px]"
                  >
                    {showAdvancedButtons.alexander ? '🔼 Weniger Optionen' : '🔽 Mehr Beträge'}
                  </button>
                </div>

                {/* Collapsible Step buttons */}
                {showAdvancedButtons.alexander && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 animate-fade-in">
                    {[2.50, 5.00, 7.50, 10.00, 12.50, 15.00, 17.50, 20.00, 22.50, 25.00, 27.50, 30.00].map(amount => (
                      <button
                        key={amount}
                        onClick={() => addToPlayerAccount('alexander', amount)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-3 rounded-md text-sm font-medium transition-all border border-blue-300 hover:border-blue-400 min-h-[44px]"
                      >
                        +{amount.toFixed(2)}€
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Amount Input - Always visible */}
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <h6 className="text-xs font-medium text-blue-700 mb-1">💰 Eigener Betrag:</h6>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customAmounts.alexander}
                      onChange={(e) => handleCustomAmountChange('alexander', e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-2 border border-blue-300 rounded-md text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[36px] max-w-[80px]"
                    />
                    <button
                      onClick={() => addCustomAmount('alexander')}
                      disabled={!customAmounts.alexander || parseFloat(customAmounts.alexander) <= 0}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] min-w-[36px]"
                    >
                      +€
                    </button>
                  </div>
                </div>
              </div>

              {/* Philip Main Buttons */}
              <div className="space-y-3">
                <h5 className="font-medium text-green-700 text-center mb-3">🟢 {managers.real.name}</h5>
                
                {/* Main action buttons - Always visible for mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToPlayerAccount('philip', 5.00)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🏆 Win<br/>+5.00€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 7.50)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🃏 BJ<br/>+7.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 2.50)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🤝 BJ-Push<br/>+2.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 10.00)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-4 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    🎲 Double<br/>+10.00€
                  </button>
                </div>

                {/* Collapsible Secondary Buttons - Mobile Optimized */}
                <div className="text-center">
                  <button
                    onClick={() => toggleAdvancedButtons('philip')}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-green-300 hover:border-green-400 min-h-[44px]"
                  >
                    {showAdvancedButtons.philip ? '🔼 Weniger Optionen' : '🔽 Mehr Beträge'}
                  </button>
                </div>

                {/* Collapsible Step buttons */}
                {showAdvancedButtons.philip && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 animate-fade-in">
                    {[2.50, 5.00, 7.50, 10.00, 12.50, 15.00, 17.50, 20.00, 22.50, 25.00, 27.50, 30.00].map(amount => (
                      <button
                        key={amount}
                        onClick={() => addToPlayerAccount('philip', amount)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-3 rounded-md text-sm font-medium transition-all border border-green-300 hover:border-green-400 min-h-[44px]"
                      >
                        +{amount.toFixed(2)}€
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Amount Input - Always visible */}
                <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                  <h6 className="text-xs font-medium text-green-700 mb-1">💰 Eigener Betrag:</h6>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customAmounts.philip}
                      onChange={(e) => handleCustomAmountChange('philip', e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-2 border border-green-300 rounded-md text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 min-h-[36px] max-w-[80px]"
                    />
                    <button
                      onClick={() => addCustomAmount('philip')}
                      disabled={!customAmounts.philip || parseFloat(customAmounts.philip) <= 0}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] min-w-[36px]"
                    >
                      +€
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tie Button - Central */}
            <div className="mt-6 text-center">
              <button
                onClick={addTieGame}
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-8 py-4 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
              >
                🤝 Unentschieden (0€)
              </button>
            </div>
          </div>

          {/* Round Management */}
          <div className="modern-card mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-300">
            <h4 className="font-bold text-lg mb-4 text-indigo-700 flex items-center gap-2">
              📋 Runden-Verwaltung
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!bjTracking.currentRound.active ? (
                <div className="text-center">
                  <button
                    onClick={startNewRound}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-4 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                  >
                    ▶️ Neue Runde starten
                  </button>
                  <p className="text-xs text-indigo-600 mt-2">
                    💡 Oder klicke einfach einen Spiel-Button - die Runde startet automatisch!
                  </p>
                </div>
              ) : (
                <button
                  onClick={finishCurrentRound}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-4 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
                >
                  ✅ Runde abschließen
                </button>
              )}
              
              <button
                onClick={endBjSession}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-4 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
              >
                🏁 BJ-Beenden
              </button>
              
              <button
                onClick={resetBjTracking}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-4 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg min-h-[56px]"
              >
                🔄 Alles zurücksetzen
              </button>
            </div>

            {bjTracking.currentRound.active && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-indigo-700 mb-2">
                    📍 Aktuelle Runde {bjTracking.currentRound.roundNumber}
                  </div>
                  <div className="text-xs text-indigo-600 mb-3">
                    {bjTracking.currentRound.games.length} Spiele in dieser Runde
                  </div>
                  {/* Progress indicator in round info */}
                  {bjTracking.currentRound.games.length >= 10 && (
                    <div className="bg-green-100 border border-green-300 rounded-lg p-2">
                      <span className="text-green-700 text-xs font-medium">
                        🎉 10 Spiele erreicht! Klicke &quot;Runde abschließen&quot; für die nächste Runde.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rounds Display with Tabs */}
          {bjTracking.rounds.length > 0 && (
            <div className="modern-card mb-6">
              <h4 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                📊 Runden-Übersicht (&quot;Bankauszug&quot;)
              </h4>
              
              <div className="space-y-4">
                {bjTracking.rounds.slice().reverse().map((round) => (
                  <div key={round.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-gray-700">
                          📋 Runde {round.roundNumber}
                        </h5>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">
                          {round.gamesCount} Spiele
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(round.endTime).toLocaleString('de-DE')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-center">
                          <div className="font-bold text-blue-700">🔵 {managers.aek.name}</div>
                          <div className="text-xl font-bold text-green-600">
                            +{round.alexanderTotal.toFixed(2)}€
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-center">
                          <div className="font-bold text-green-700">🟢 {managers.real.name}</div>
                          <div className="text-xl font-bold text-green-600">
                            +{round.philipTotal.toFixed(2)}€
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Games in round */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                        🎮 Spiele anzeigen ({round.gamesCount})
                      </summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {round.games.map((game) => (
                          <div key={game.id} className="text-xs p-2 bg-white rounded border border-gray-200 flex justify-between items-center">
                            <span className="text-gray-600">Spiel {game.gameNumber}</span>
                            <span className="font-medium">{game.description}</span>
                            <span className="text-gray-500">
                              {new Date(game.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Round Games Display */}
          {bjTracking.currentRound.active && bjTracking.currentRound.games.length > 0 && (
            <div className="modern-card mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300">
              <h4 className="font-bold text-lg mb-4 text-amber-700 flex items-center gap-2">
                🎯 Aktuelle Runde {bjTracking.currentRound.roundNumber} - Spiele
              </h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bjTracking.currentRound.games.map((game) => (
                  <div key={game.id} className="p-3 bg-white rounded-lg border border-amber-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-amber-700">Spiel {game.gameNumber}</span>
                    <span className="text-sm">{game.description}</span>
                    <span className="text-xs text-amber-600">
                      {new Date(game.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alexander Stats */}
            <div className="modern-card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
              <h5 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                🔵 {managers.aek.name} - Statistiken
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700 text-sm">Aktueller Kontostand:</span>
                  <span className="font-bold text-green-600">+{bjTracking.alexander.balance.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 text-sm">Gesamt-Verdienst:</span>
                  <span className="font-bold text-green-600">+{bjTracking.alexander.totalEarnings.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            {/* Philip Stats */}
            <div className="modern-card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
              <h5 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                🟢 {managers.real.name} - Statistiken
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700 text-sm">Aktueller Kontostand:</span>
                  <span className="font-bold text-green-600">+{bjTracking.philip.balance.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 text-sm">Gesamt-Verdienst:</span>
                  <span className="font-bold text-green-600">+{bjTracking.philip.totalEarnings.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}