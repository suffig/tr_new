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

    // Add game to current round if active
    if (bjTracking.currentRound.active) {
      const game = {
        id: Date.now(),
        gameNumber: bjTracking.gameCounter + 1,
        player: player,
        amount: amount,
        timestamp: new Date().toISOString(),
        description: `${player === 'alexander' ? managers.aek.name : managers.real.name}: +${amount.toFixed(2)}€`
      };

      newData.currentRound.games = [...bjTracking.currentRound.games, game];
    }

    saveBjTrackingData(newData);
  };

  // Add "0" game (tie) - increments counter but no money change
  const addTieGame = () => {
    const newData = {
      ...bjTracking,
      gameCounter: bjTracking.gameCounter + 1
    };

    // Add tie game to current round if active
    if (bjTracking.currentRound.active) {
      const game = {
        id: Date.now(),
        gameNumber: bjTracking.gameCounter + 1,
        player: null,
        amount: 0,
        timestamp: new Date().toISOString(),
        description: 'Unentschieden (0€)'
      };

      newData.currentRound.games = [...bjTracking.currentRound.games, game];
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
              {/* Game Counter */}
              <div className="p-4 bg-white rounded-lg border border-purple-200 text-center">
                <div className="text-3xl font-bold text-purple-700 mb-1">
                  {bjTracking.gameCounter}
                </div>
                <div className="text-sm text-purple-600">Gespielte Spiele</div>
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
                
                {/* Main action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToPlayerAccount('alexander', 5.00)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🏆 Win<br/>+5.00€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 7.50)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🃏 BJ<br/>+7.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 2.50)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🤝 BJ-Push<br/>+2.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 10.00)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🎲 Double<br/>+10.00€
                  </button>
                </div>

                {/* Step buttons */}
                <div className="grid grid-cols-3 gap-1 mt-3">
                  {[2.50, 5.00, 7.50, 10.00, 12.50, 15.00, 17.50, 20.00, 22.50, 25.00, 27.50, 30.00].map(amount => (
                    <button
                      key={amount}
                      onClick={() => addToPlayerAccount('alexander', amount)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-2 rounded-md text-xs font-medium transition-all border border-blue-300 hover:border-blue-400"
                    >
                      +{amount.toFixed(2)}€
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h6 className="text-xs font-medium text-blue-700 mb-2">💰 Eigener Betrag:</h6>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customAmounts.alexander}
                      onChange={(e) => handleCustomAmountChange('alexander', e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-2 border border-blue-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => addCustomAmount('alexander')}
                      disabled={!customAmounts.alexander || parseFloat(customAmounts.alexander) <= 0}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-xs font-medium transition-all"
                    >
                      +€
                    </button>
                  </div>
                </div>
              </div>

              {/* Philip Main Buttons */}
              <div className="space-y-3">
                <h5 className="font-medium text-green-700 text-center mb-3">🟢 {managers.real.name}</h5>
                
                {/* Main action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToPlayerAccount('philip', 5.00)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🏆 Win<br/>+5.00€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 7.50)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🃏 BJ<br/>+7.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 2.50)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🤝 BJ-Push<br/>+2.50€
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 10.00)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🎲 Double<br/>+10.00€
                  </button>
                </div>

                {/* Step buttons */}
                <div className="grid grid-cols-3 gap-1 mt-3">
                  {[2.50, 5.00, 7.50, 10.00, 12.50, 15.00, 17.50, 20.00, 22.50, 25.00, 27.50, 30.00].map(amount => (
                    <button
                      key={amount}
                      onClick={() => addToPlayerAccount('philip', amount)}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-2 rounded-md text-xs font-medium transition-all border border-green-300 hover:border-green-400"
                    >
                      +{amount.toFixed(2)}€
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <h6 className="text-xs font-medium text-green-700 mb-2">💰 Eigener Betrag:</h6>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customAmounts.philip}
                      onChange={(e) => handleCustomAmountChange('philip', e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-2 border border-green-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => addCustomAmount('philip')}
                      disabled={!customAmounts.philip || parseFloat(customAmounts.philip) <= 0}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-xs font-medium transition-all"
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
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-8 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
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
                <button
                  onClick={startNewRound}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  ▶️ Neue Runde starten
                </button>
              ) : (
                <button
                  onClick={finishCurrentRound}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  ✅ Runde abschließen
                </button>
              )}
              
              <button
                onClick={resetBjTracking}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg"
              >
                🔄 Alles zurücksetzen
              </button>
            </div>

            {bjTracking.currentRound.active && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-indigo-700 mb-1">
                    📍 Aktuelle Runde {bjTracking.currentRound.roundNumber}
                  </div>
                  <div className="text-xs text-indigo-600">
                    {bjTracking.currentRound.games.length} Spiele in dieser Runde
                  </div>
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