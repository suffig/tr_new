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
          aek: { name: aekManager.name, age: 30, weight: aekManager.gewicht },
          real: { name: realManager.name, age: 30, weight: realManager.gewicht }
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

  // Enhanced Blackjack game state - both players vs bank with match tracking
  const [blackjackGames, setBlackjackGames] = useState({
    alexander: { 
      wins: 0, 
      losses: 0, 
      totalEarnings: 0,
      blackjacks: 0,
      doubles: 0,
      splits: 0
    },
    philip: { 
      wins: 0, 
      losses: 0, 
      totalEarnings: 0,
      blackjacks: 0,
      doubles: 0,
      splits: 0
    },
    gameHistory: [],
    // Current match state
    currentMatch: {
      active: false,
      alexanderRoundEarnings: 0, // Current match earnings for Alexander
      philipRoundEarnings: 0,    // Current match earnings for Philip
      completedRounds: [],       // Visual representation of rounds in current match
      matchHistory: []           // History of completed matches
    },
    // Current round state
    currentRound: {
      active: false,
      alexanderHand: null, // 'win', 'lose', 'blackjack'
      philipHand: null,
      alexanderActions: [], // ['double', 'split'] etc.
      philipActions: [],
      bankWins: false
    }
  });

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

    // Load blackjack game data from localStorage (keeping this in localStorage for now)
    const savedBlackjack = localStorage.getItem('blackjackGames');
    if (savedBlackjack) {
      try {
        setBlackjackGames(JSON.parse(savedBlackjack));
      } catch (e) {
        console.error('Error loading blackjack data:', e);
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

  // New Blackjack game functions - both vs bank system
  const saveBlackjackData = (newData) => {
    setBlackjackGames(newData);
    localStorage.setItem('blackjackGames', JSON.stringify(newData));
  };

  // Start a new round
  const startNewRound = () => {
    const newData = {
      ...blackjackGames,
      currentRound: {
        active: true,
        alexanderHand: null,
        philipHand: null,
        alexanderActions: [],
        philipActions: [],
        bankWins: false
      }
    };
    saveBlackjackData(newData);
  };

  // Set player hand result
  const setPlayerHand = (player, handResult) => {
    const newData = {
      ...blackjackGames,
      currentRound: {
        ...blackjackGames.currentRound,
        [player + 'Hand']: handResult
      }
    };
    saveBlackjackData(newData);
  };

  // Add action to player (double, split)
  const addPlayerAction = (player, action) => {
    const currentActions = blackjackGames.currentRound[player + 'Actions'];
    if (!currentActions.includes(action)) {
      const newData = {
        ...blackjackGames,
        currentRound: {
          ...blackjackGames.currentRound,
          [player + 'Actions']: [...currentActions, action]
        }
      };
      saveBlackjackData(newData);
    }
  };

  // Set bank result
  const setBankResult = (bankWins) => {
    const newData = {
      ...blackjackGames,
      currentRound: {
        ...blackjackGames.currentRound,
        bankWins: bankWins
      }
    };
    saveBlackjackData(newData);
  };

  // Calculate round results with new scoring rules and finish
  const finishRound = () => {
    const round = blackjackGames.currentRound;
    const results = { alexander: 0, philip: 0 };
    let gameDescription = '';

    // New scoring rules: 5€ or 2.50€ increments
    if (round.bankWins && 
        !round.alexanderHand && 
        !round.philipHand && 
        round.alexanderActions.length === 0 && 
        round.philipActions.length === 0) {
      // Bank wins, no special actions = no one gains/loses
      gameDescription = 'Bank gewinnt - Keine Aktion';
    } else {
      // Calculate each player's result with new rules
      ['alexander', 'philip'].forEach(player => {
        const hand = round[player + 'Hand'];
        const actions = round[player + 'Actions'];
        const otherPlayer = player === 'alexander' ? 'philip' : 'alexander';
        const otherHand = round[otherPlayer + 'Hand'];
        
        let playerResult = 0;
        
        if (hand === 'blackjack') {
          if (otherHand === 'blackjack') {
            // Both have blackjack = nothing for anyone (0€)
            playerResult = 0;
          } else if (otherHand === 'win') {
            // Blackjack vs normal win = +2.50€ 
            playerResult = 2.5;
          } else {
            // Normal blackjack = 1.5x = 7.50€
            playerResult = 7.5;
          }
          
          // Special case: if player doubled and gets blackjack = -2.50€
          if (actions.includes('double') || actions.includes('split')) {
            playerResult = -2.5;
          }
        } else if (hand === 'win') {
          // Normal win = 5€ base
          playerResult = 5;
          // Add modifiers for double/split
          if (actions.includes('double')) playerResult *= 2;
          if (actions.includes('split')) playerResult *= 2;
        } else if (hand === 'lose') {
          // Basic loss = -5€ base
          playerResult = -5;
          // Add modifiers for double/split
          if (actions.includes('double')) playerResult *= 2;
          if (actions.includes('split')) playerResult *= 2;
        }
        
        results[player] = playerResult;
      });

      gameDescription = `Alex: ${results.alexander >= 0 ? '+' : ''}${results.alexander}€, Phil: ${results.philip >= 0 ? '+' : ''}${results.philip}€`;
    }

    // Create round summary for visual display
    const roundSummary = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      results: { ...results },
      round: { ...round },
      description: gameDescription,
      dateText: new Date().toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' })
    };

    // Update current match and stats
    const newData = {
      alexander: {
        ...blackjackGames.alexander,
        totalEarnings: blackjackGames.alexander.totalEarnings + results.alexander,
        wins: blackjackGames.alexander.wins + (results.alexander > 0 ? 1 : 0),
        losses: blackjackGames.alexander.losses + (results.alexander < 0 ? 1 : 0),
        blackjacks: blackjackGames.alexander.blackjacks + (round.alexanderHand === 'blackjack' ? 1 : 0),
        doubles: blackjackGames.alexander.doubles + (round.alexanderActions.includes('double') ? 1 : 0),
        splits: blackjackGames.alexander.splits + (round.alexanderActions.includes('split') ? 1 : 0)
      },
      philip: {
        ...blackjackGames.philip,
        totalEarnings: blackjackGames.philip.totalEarnings + results.philip,
        wins: blackjackGames.philip.wins + (results.philip > 0 ? 1 : 0),
        losses: blackjackGames.philip.losses + (results.philip < 0 ? 1 : 0),
        blackjacks: blackjackGames.philip.blackjacks + (round.philipHand === 'blackjack' ? 1 : 0),
        doubles: blackjackGames.philip.doubles + (round.philipActions.includes('double') ? 1 : 0),
        splits: blackjackGames.philip.splits + (round.philipActions.includes('split') ? 1 : 0)
      },
      gameHistory: [
        ...blackjackGames.gameHistory,
        roundSummary
      ].slice(-20), // Keep only last 20 games
      // Update current match state
      currentMatch: {
        ...blackjackGames.currentMatch,
        alexanderRoundEarnings: blackjackGames.currentMatch.alexanderRoundEarnings + results.alexander,
        philipRoundEarnings: blackjackGames.currentMatch.philipRoundEarnings + results.philip,
        completedRounds: [
          ...blackjackGames.currentMatch.completedRounds,
          roundSummary
        ]
      },
      currentRound: {
        active: false,
        alexanderHand: null,
        philipHand: null,
        alexanderActions: [],
        philipActions: [],
        bankWins: false
      }
    };

    saveBlackjackData(newData);
  };

  const resetBlackjackData = () => {
    const resetData = {
      alexander: { 
        wins: 0, 
        losses: 0, 
        totalEarnings: 0,
        blackjacks: 0,
        doubles: 0,
        splits: 0
      },
      philip: { 
        wins: 0, 
        losses: 0, 
        totalEarnings: 0,
        blackjacks: 0,
        doubles: 0,
        splits: 0
      },
      gameHistory: [],
      currentMatch: {
        active: false,
        alexanderRoundEarnings: 0,
        philipRoundEarnings: 0,
        completedRounds: [],
        matchHistory: []
      },
      currentRound: {
        active: false,
        alexanderHand: null,
        philipHand: null,
        alexanderActions: [],
        philipActions: [],
        bankWins: false
      }
    };
    saveBlackjackData(resetData);
  };

  // Start a new match
  const startNewMatch = () => {
    const newData = {
      ...blackjackGames,
      currentMatch: {
        ...blackjackGames.currentMatch,
        active: true,
        alexanderRoundEarnings: 0,
        philipRoundEarnings: 0,
        completedRounds: []
      }
    };
    saveBlackjackData(newData);
  };

  // Finish the current match and calculate final debt
  const finishMatch = () => {
    const alexTotal = blackjackGames.currentMatch.alexanderRoundEarnings;
    const philipTotal = blackjackGames.currentMatch.philipRoundEarnings;
    
    // Calculate who owes what
    let debtResult = '';
    const difference = alexTotal - philipTotal;
    
    if (difference > 0) {
      debtResult = `Philip schuldet Alexander ${difference.toFixed(2)}€`;
    } else if (difference < 0) {
      debtResult = `Alexander schuldet Philip ${Math.abs(difference).toFixed(2)}€`;
    } else {
      debtResult = 'Ausgeglichenes Spiel - Niemand schuldet etwas';
    }

    // Store match in history
    const matchSummary = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      alexanderTotal: alexTotal,
      philipTotal: philipTotal,
      debtResult: debtResult,
      roundCount: blackjackGames.currentMatch.completedRounds.length,
      rounds: [...blackjackGames.currentMatch.completedRounds],
      dateText: new Date().toLocaleString('de-DE')
    };

    const newData = {
      ...blackjackGames,
      currentMatch: {
        active: false,
        alexanderRoundEarnings: 0,
        philipRoundEarnings: 0,
        completedRounds: [],
        matchHistory: [
          ...blackjackGames.currentMatch.matchHistory,
          matchSummary
        ].slice(-10) // Keep last 10 matches
      }
    };

    saveBlackjackData(newData);

    // Show alert with result
    alert(`🃏 Match beendet!\n\n${debtResult}\n\nAlexander: ${alexTotal.toFixed(2)}€\nPhilip: ${philipTotal.toFixed(2)}€\nRunden gespielt: ${blackjackGames.currentMatch.completedRounds.length}`);
  };

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
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveSection('alcohol')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeSection === 'alcohol'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🍺 Alkohol-Tracker
          </button>
          <button
            onClick={() => setActiveSection('blackjack')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeSection === 'blackjack'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🃏 Blackjack-Tracker
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

      {/* Enhanced Blackjack Section - Both vs Bank */}
      {activeSection === 'blackjack' && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              🃏 Blackjack Arena: Beide vs Bank
            </h3>
            <p className="text-text-muted text-sm">
              Neue Regeln: Beide spielen gegen die Bank • Komplexe Gewinn-/Verlustberechnung mit Double/Split
            </p>
          </div>

          {/* Current Match Status - Separate Counters */}
          {blackjackGames.currentMatch.active && (
            <div className="modern-card mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400">
              <h4 className="font-bold text-lg mb-4 text-amber-700 flex items-center gap-2">
                🏆 Aktuelles Match - Live Counter
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alexander Current Match Counter */}
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <div className="text-center">
                    <h5 className="font-bold text-blue-700 mb-2 flex items-center justify-center gap-2">
                      🔵 {managers.aek.name}
                    </h5>
                    <div className="text-4xl font-bold mb-2">
                      <span className={`${blackjackGames.currentMatch.alexanderRoundEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {blackjackGames.currentMatch.alexanderRoundEarnings >= 0 ? '+' : ''}{blackjackGames.currentMatch.alexanderRoundEarnings.toFixed(2)}€
                      </span>
                    </div>
                    <div className="text-sm text-blue-600">Aktuelle Match-Bilanz</div>
                    <div className="text-xs text-blue-500 mt-1">
                      {blackjackGames.currentMatch.completedRounds.length} Runden gespielt
                    </div>
                  </div>
                </div>

                {/* Philip Current Match Counter */}
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                  <div className="text-center">
                    <h5 className="font-bold text-green-700 mb-2 flex items-center justify-center gap-2">
                      🟢 {managers.real.name}
                    </h5>
                    <div className="text-4xl font-bold mb-2">
                      <span className={`${blackjackGames.currentMatch.philipRoundEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {blackjackGames.currentMatch.philipRoundEarnings >= 0 ? '+' : ''}{blackjackGames.currentMatch.philipRoundEarnings.toFixed(2)}€
                      </span>
                    </div>
                    <div className="text-sm text-green-600">Aktuelle Match-Bilanz</div>
                    <div className="text-xs text-green-500 mt-1">
                      {blackjackGames.currentMatch.completedRounds.length} Runden gespielt
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Debt Preview */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-amber-700 mb-1">Aktueller Schuldenstand:</div>
                  <div className="text-lg font-bold text-amber-800">
                    {(() => {
                      const difference = blackjackGames.currentMatch.alexanderRoundEarnings - blackjackGames.currentMatch.philipRoundEarnings;
                      if (difference > 0) {
                        return `Philip schuldet Alexander ${difference.toFixed(2)}€`;
                      } else if (difference < 0) {
                        return `Alexander schuldet Philip ${Math.abs(difference).toFixed(2)}€`;
                      } else {
                        return 'Ausgeglichen - Niemand schuldet etwas';
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Game Statistics - Overall */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Alexander Overall Stats */}
            <div className="modern-card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-blue-700 flex items-center gap-2">
                  🔵 {managers.aek.name}
                </h4>
                <div className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                  Gesamt-Statistiken
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 text-sm">Gewinnrunden:</span>
                  <span className="font-bold text-green-600">{blackjackGames.alexander.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 text-sm">Verlustrunden:</span>
                  <span className="font-bold text-red-600">{blackjackGames.alexander.losses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 text-sm">Gesamt-Bilanz:</span>
                  <span className={`font-bold ${blackjackGames.alexander.totalEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {blackjackGames.alexander.totalEarnings >= 0 ? '+' : ''}{blackjackGames.alexander.totalEarnings.toFixed(2)}€
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-2 border-t border-blue-200">
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{blackjackGames.alexander.blackjacks}</div>
                    <div className="text-blue-600">🃏 BJ</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">{blackjackGames.alexander.doubles}</div>
                    <div className="text-blue-600">🎲 Double</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-pink-600">{blackjackGames.alexander.splits}</div>
                    <div className="text-blue-600">✂️ Split</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Philip Overall Stats */}
            <div className="modern-card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-green-700 flex items-center gap-2">
                  🟢 {managers.real.name}
                </h4>
                <div className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded-full">
                  Gesamt-Statistiken
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 text-sm">Gewinnrunden:</span>
                  <span className="font-bold text-green-600">{blackjackGames.philip.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 text-sm">Verlustrunden:</span>
                  <span className="font-bold text-red-600">{blackjackGames.philip.losses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 text-sm">Gesamt-Bilanz:</span>
                  <span className={`font-bold ${blackjackGames.philip.totalEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {blackjackGames.philip.totalEarnings >= 0 ? '+' : ''}{blackjackGames.philip.totalEarnings.toFixed(2)}€
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-2 border-t border-green-200">
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{blackjackGames.philip.blackjacks}</div>
                    <div className="text-green-600">🃏 BJ</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">{blackjackGames.philip.doubles}</div>
                    <div className="text-green-600">🎲 Double</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-pink-600">{blackjackGames.philip.splits}</div>
                    <div className="text-green-600">✂️ Split</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Two-Button Game Flow Interface */}
          {!blackjackGames.currentMatch.active ? (
            /* No active match - Show start match button */
            <div className="modern-card mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
              <h4 className="font-bold text-lg mb-4 text-indigo-700 flex items-center gap-2">
                🎰 Neues Blackjack-Match starten
              </h4>
              <div className="text-center">
                <div className="text-6xl mb-4">🃏</div>
                <p className="text-indigo-600 mb-4">Beide Manager vs Bank • Bis zur Match-Abschließung</p>
                <button
                  onClick={startNewMatch}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg transition-all duration-200 font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  🚀 Match starten
                </button>
              </div>
            </div>
          ) : !blackjackGames.currentRound.active ? (
            /* Active match but no active round - Show start round button */
            <div className="modern-card mb-6 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200">
              <h4 className="font-bold text-lg mb-4 text-green-700 flex items-center gap-2">
                🎯 Neue Runde im laufenden Match
              </h4>
              <div className="text-center">
                <div className="text-4xl mb-3">🃏</div>
                <p className="text-green-600 mb-4">Nächste Runde eingeben</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={startNewRound}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    ▶️ Runde starten
                  </button>
                  <button
                    onClick={finishMatch}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🏁 Match abschließen
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Active round - Show round input interface */
            <div className="modern-card mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
              <h4 className="font-bold text-lg mb-4 text-orange-700 flex items-center gap-2">
                🎯 Aktuelle Runde - Ergebnisse eingeben
              </h4>
              
              {/* Round State Display */}
              <div className="mb-6 p-3 bg-white rounded-lg border border-orange-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-700 mb-2">🔵 {managers.aek.name}:</div>
                    <div className="space-y-1">
                      <div>Hand: {blackjackGames.currentRound.alexanderHand || '❓ Unbekannt'}</div>
                      <div>Aktionen: {blackjackGames.currentRound.alexanderActions.length > 0 ? blackjackGames.currentRound.alexanderActions.join(', ') : 'Keine'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-green-700 mb-2">🟢 {managers.real.name}:</div>
                    <div className="space-y-1">
                      <div>Hand: {blackjackGames.currentRound.philipHand || '❓ Unbekannt'}</div>
                      <div>Aktionen: {blackjackGames.currentRound.philipActions.length > 0 ? blackjackGames.currentRound.philipActions.join(', ') : 'Keine'}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <div className="font-medium text-orange-700">🏦 Bank: {blackjackGames.currentRound.bankWins ? 'Gewinnt' : 'Status unbekannt'}</div>
                </div>
              </div>

              {/* Player Hand Results */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Alexander Hand */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-700 mb-3">🔵 {managers.aek.name} Hand-Ergebnis:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPlayerHand('alexander', 'win')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          blackjackGames.currentRound.alexanderHand === 'win' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        🏆 Gewinn
                      </button>
                      <button
                        onClick={() => setPlayerHand('alexander', 'lose')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          blackjackGames.currentRound.alexanderHand === 'lose' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        💔 Verlust
                      </button>
                      <button
                        onClick={() => setPlayerHand('alexander', 'blackjack')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all col-span-2 ${
                          blackjackGames.currentRound.alexanderHand === 'blackjack' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                      >
                        🃏 Blackjack
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <h6 className="text-xs font-medium text-blue-600 mb-2">Aktionen:</h6>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => addPlayerAction('alexander', 'double')}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            blackjackGames.currentRound.alexanderActions.includes('double')
                              ? 'bg-orange-600 text-white' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          🎲 Double
                        </button>
                        <button
                          onClick={() => addPlayerAction('alexander', 'split')}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            blackjackGames.currentRound.alexanderActions.includes('split')
                              ? 'bg-pink-600 text-white' 
                              : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                          }`}
                        >
                          ✂️ Split
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Philip Hand */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="font-medium text-green-700 mb-3">🟢 {managers.real.name} Hand-Ergebnis:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPlayerHand('philip', 'win')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          blackjackGames.currentRound.philipHand === 'win' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        🏆 Gewinn
                      </button>
                      <button
                        onClick={() => setPlayerHand('philip', 'lose')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          blackjackGames.currentRound.philipHand === 'lose' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        💔 Verlust
                      </button>
                      <button
                        onClick={() => setPlayerHand('philip', 'blackjack')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all col-span-2 ${
                          blackjackGames.currentRound.philipHand === 'blackjack' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                      >
                        🃏 Blackjack
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <h6 className="text-xs font-medium text-green-600 mb-2">Aktionen:</h6>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => addPlayerAction('philip', 'double')}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            blackjackGames.currentRound.philipActions.includes('double')
                              ? 'bg-orange-600 text-white' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          🎲 Double
                        </button>
                        <button
                          onClick={() => addPlayerAction('philip', 'split')}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            blackjackGames.currentRound.philipActions.includes('split')
                              ? 'bg-pink-600 text-white' 
                              : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                          }`}
                        >
                          ✂️ Split
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Result */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-700 mb-3">🏦 Bank Ergebnis:</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setBankResult(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        blackjackGames.currentRound.bankWins 
                          ? 'bg-red-600 text-white' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      🏦 Bank gewinnt
                    </button>
                    <button
                      onClick={() => setBankResult(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        blackjackGames.currentRound.bankWins === false 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      👥 Spieler haben Chancen
                    </button>
                  </div>
                </div>

                {/* Two-Button System: Finish Round & Finish Match */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-orange-200">
                  <button
                    onClick={finishRound}
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    ✅ Runde abschließen
                  </button>
                  <button
                    onClick={finishMatch}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🏁 Match abschließen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visual Representation of Completed Rounds in Current Match */}
          {blackjackGames.currentMatch.active && blackjackGames.currentMatch.completedRounds.length > 0 && (
            <div className="modern-card mb-6">
              <h4 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                🎯 Abgeschlossene Runden im aktuellen Match
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {blackjackGames.currentMatch.completedRounds.map((round, index) => (
                  <div key={round.id} className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-gray-700">Runde {index + 1}</div>
                      <div className="text-xs text-gray-500">{round.dateText}</div>
                    </div>
                    <div className="text-xs font-medium text-gray-600 mb-2">{round.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-600">🔵 Alex:</span>
                        <span className={`font-bold ${round.results.alexander >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {round.results.alexander >= 0 ? '+' : ''}{round.results.alexander.toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">🟢 Phil:</span>
                        <span className={`font-bold ${round.results.philip >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {round.results.philip >= 0 ? '+' : ''}{round.results.philip.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match History */}
          {blackjackGames.currentMatch.matchHistory.length > 0 && (
            <div className="modern-card mb-6">
              <h4 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                🏆 Abgeschlossene Matches
              </h4>
              
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {blackjackGames.currentMatch.matchHistory.slice().reverse().map((match) => (
                  <div key={match.id} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-purple-700">{match.dateText}</div>
                      <div className="text-sm text-purple-600">{match.roundCount} Runden</div>
                    </div>
                    <div className="text-lg font-bold text-purple-800 mb-2">{match.debtResult}</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">🔵 Alexander:</span>
                        <span className={`font-bold ${match.alexanderTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {match.alexanderTotal >= 0 ? '+' : ''}{match.alexanderTotal.toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">🟢 Philip:</span>
                        <span className={`font-bold ${match.philipTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {match.philipTotal >= 0 ? '+' : ''}{match.philipTotal.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Game History */}
          {blackjackGames.gameHistory.length > 0 && (
            <div className="modern-card">
              <h4 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                📜 Spielverlauf (letzte 20 Runden)
              </h4>
              
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {blackjackGames.gameHistory.slice().reverse().map((game) => (
                  <div key={game.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-600">{game.dateText}</div>
                      <div className="text-lg">🃏</div>
                    </div>
                    <div className="text-sm font-medium text-gray-800 mb-2">{game.description}</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-600">🔵 Alexander:</span>
                        <span className={`font-bold ${game.results.alexander >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {game.results.alexander >= 0 ? '+' : ''}{game.results.alexander.toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">🟢 Philip:</span>
                        <span className={`font-bold ${game.results.philip >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {game.results.philip >= 0 ? '+' : ''}{game.results.philip.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset and Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Reset Button */}
            <div className="modern-card bg-gray-50">
              <h5 className="font-medium text-gray-700 mb-3">🔄 Daten zurücksetzen</h5>
              <button
                onClick={resetBlackjackData}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
              >
                🗑️ Alle Statistiken löschen
              </button>
            </div>

            {/* Updated Rules Info */}
            <div className="modern-card bg-blue-50 border border-blue-200">
              <h5 className="font-medium text-blue-800 mb-2">🃏 Überarbeitete Blackjack Regeln</h5>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Beide Spieler vs Bank (nicht gegeneinander)</li>
                <li>• Alle Beträge in 5€ oder 2,50€ Schritten</li>
                <li>• Normaler Gewinn = 5€ für den Gewinner</li>
                <li>• Blackjack = 1,5x = 7,50€ (außer Sonderfall)</li>
                <li>• Beide gewinnen Blackjack = 0€ für beide (nichts)</li>
                <li>• Blackjack + anderer normal gewinnt = 2,50€</li>
                <li>• Double/Split bei Blackjack = -2,50€</li>
                <li>• Double/Split verdoppelt Gewinn/Verlust</li>
                <li>• Match-System: Runden abschließen → Match abschließen</li>
                <li>• Separate Counter für beide Spieler</li>
                <li>• Finale Schuldenberechnung wer wem was schuldet</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}