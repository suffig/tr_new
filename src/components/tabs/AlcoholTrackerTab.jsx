import Icon from '../icons/Icon';
import {
  gutschriftFuer, loadSterne, addSterneEintrag, removeSterneEintrag,
  alleSterneLoeschen, sterneAbgleichen, altenSterneStandUebernehmen,
} from '../../utils/sterneCounter';
import SterneVerlauf from './alkohol/SterneVerlauf';
import {
  ladeLokal as ladeAbendLokal, erfasse as erfasseAbend, entferne as entferneAbend,
  bierStand, shotStand, schnapsStand,
} from '../../utils/abende';
import { useState, useEffect, useCallback } from 'react';
import ZahlFeld from '../ZahlFeld';
import { zahl, dez, dezKurz } from '../../utils/zahlen';

import TeamLogo from '../TeamLogo';

/** Betrag deutsch: "7,50 €" statt "7.50€". */
const euro = (n) => `${dez(n, 2)} €`;

/**
 * Die beiden Trinker.
 *
 * Die Schluessel sind historisch uneinheitlich: die Verbrauchszaehler laufen
 * unter `alexander`/`philip`, die Stammdaten unter `aek`/`real`. Statt das an
 * jeder Stelle einzeln aufzuloesen, steht die Zuordnung hier einmal.
 */
const TRINKER = [
  { key: 'alexander', team: 'aek', farbe: 'text-system-blue', knopf: 'bg-system-blue/15 text-system-blue' },
  { key: 'philip', team: 'real', farbe: 'text-system-red', knopf: 'bg-system-red/15 text-system-red' },
];
import AlcoholProgressionGraph from '../AlcoholProgressionGraph.jsx';
import { dataManager } from '../../../dataManager.js';
import Kraefteverhaeltnis from '../Kraefteverhaeltnis';

export default function AlcoholTrackerTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  // Sub-navigation state
  const [activeSection, setActiveSection] = useState('schnaps');
  
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
      // Expected in demo/offline mode (no DB) — fall back to defaults quietly
      console.warn('Manager-Einstellungen nicht geladen, nutze Defaults:', error?.message || error);
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

    // Bier, Shots und Schnaps kommen aus dem Ereignis-Log (db/09) und werden
    // daraus abgeleitet — vorher lagen sie als eigene localStorage-Objekte vor,
    // also pro Geraet und ohne Abgleich.
    uebernimmAlteZaehler();
    aktualisiereAusLog();

    // Load drinking start time from localStorage (keeping this in localStorage for now)
    const savedStartTime = localStorage.getItem('drinkingStartTime');
    if (savedStartTime) {
      setDrinkingStartTime(savedStartTime);
    }

    // Das Schnaps-ZIEL ist eine Einstellung, kein Ereignis — es bleibt lokal.
    try {
      const ziel = JSON.parse(localStorage.getItem('schnapsZiel') || 'null');
      if (Number.isFinite(ziel)) setSchnapsShotsData((d) => ({ ...d, target: ziel }));
    } catch { /* ignore */ }

    // Sterne-Zaehler laden (gemeinsame Quelle: utils/sterneCounter)
    // Reihenfolge zaehlt: erst den alten localStorage-Bestand als Ereignisse
    // uebernehmen, DANN mit der Datenbank abgleichen — sonst wuerde der
    // Abgleich den Altbestand ueberschreiben, bevor er hochgeladen ist.
    altenSterneStandUebernehmen();
    setSterneData(loadSterne());
    sterneAbgleichen().then((r) => {
      if (r.ok) setSterneData(loadSterne());
      else if (r.lokalMehr) {
        console.warn(`[Sterne] Lokal ${r.lokal} Ereignisse, Datenbank ${r.db} — nicht ueberschrieben.`);
      }
    });

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

  // Stand IMMER aus dem Ereignis-Log ableiten. Der Tab fuehrt keine eigenen
  // Summen mehr fort; das lag vorher doppelt vor und konnte auseinanderlaufen.
  const aktualisiereAusLog = () => {
    const log = ladeAbendLokal();
    setBeerConsumption(bierStand(log));
    setShotConsumption(shotStand(log));
    setSchnapsShotsData((d) => ({ ...d, ...schnapsStand(log) }));
  };

  /** Ein Ereignis erfassen und die Anzeige nachziehen. */
  const erfasseUndZeige = (person, art) => {
    erfasseAbend({ person, art });
    aktualisiereAusLog();
  };

  /**
   * Einmalige Uebernahme der alten Zaehler aus dem localStorage.
   * Laeuft nur, solange die alten Schluessel existieren, und raeumt sie weg.
   */
  const uebernimmAlteZaehler = () => {
    const lies = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const bier = lies('beerConsumption');
    const shots = lies('shotConsumption');
    const schnaps = lies('schnapsShotsData');

    for (const p of ['alexander', 'philip']) {
      for (let i = 0; i < (bier?.[p] || 0); i++) erfasseAbend({ person: p, art: 'bier' });
      for (let i = 0; i < (shots?.[p]?.shots20 || 0); i++) erfasseAbend({ person: p, art: 'shot20' });
      for (let i = 0; i < (shots?.[p]?.shots40 || 0); i++) erfasseAbend({ person: p, art: 'shot40' });
    }
    for (const h of (schnaps?.history || [])) {
      erfasseAbend({
        person: h.person === 'alex' ? 'alexander' : 'philip',
        art: 'schnaps',
        datum: (h.timestamp || '').slice(0, 10) || undefined,
      });
    }
    // Das Ziel als Einstellung retten, dann die alten Schluessel entfernen.
    if (Number.isFinite(schnaps?.target)) {
      try { localStorage.setItem('schnapsZiel', String(schnaps.target)); } catch { /* ignore */ }
    }
    for (const k of ['beerConsumption', 'shotConsumption', 'schnapsShotsData']) {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    }
  };

  /** Startzeit beim ersten Getraenk setzen (fuer die Promille-Rechnung). */
  const merkeStartzeit = () => {
    if (drinkingStartTime) return;
    const startTime = new Date().toISOString();
    setDrinkingStartTime(startTime);
    localStorage.setItem('drinkingStartTime', startTime);
  };

  const addBeer = (person) => {
    erfasseUndZeige(person, 'bier');
    merkeStartzeit();
  };

  const addBeerToBoth = () => {
    erfasseAbend({ person: 'alexander', art: 'bier' });
    erfasseAbend({ person: 'philip', art: 'bier' });
    aktualisiereAusLog();
    merkeStartzeit();
  };

  const addShot = (person, alcoholPercent) => {
    erfasseUndZeige(person, alcoholPercent === 40 ? 'shot40' : 'shot20');
    merkeStartzeit();
  };

  const resetConsumption = () => {
    // Zuruecksetzen heisst jetzt: die Ereignisse zuruecknehmen. Frueher wurde
    // nur der Zaehler auf 0 geschrieben — der Verlauf blieb als Geisterwert
    // liegen und tauchte nach einem Neuladen wieder auf.
    for (const e of ladeAbendLokal()) {
      if (['bier', 'shot20', 'shot40'].includes(e.art)) entferneAbend(e);
    }
    aktualisiereAusLog();
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
  const BACChart = ({ bac }) => {
    const bacValue = parseFloat(bac);
    const maxDisplay = 2.0; // Maximum BAC to display on chart
    const percentage = Math.min((bacValue / maxDisplay) * 100, 100);
    
    const getColorClass = (bac) => {
      if (bac >= 1.0) return 'bg-system-red';
      if (bac >= 0.5) return 'bg-system-orange';
      if (bac >= 0.3) return 'bg-system-yellow';
      return 'bg-system-green';
    };

    return (
      <div className="mt-3">
        <div className="flex justify-between text-caption2 text-text-tertiary mb-1">
          <span>0 ‰</span>
          <span>2 ‰</span>
        </div>
        {/* Kein Wert im Balken: er steht darueber schon gross, und bei
            niedrigem Pegel stand weisse Schrift auf dem leeren, hellen
            Balken — gemessener Kontrastabstand 49. */}
        <div className="w-full bg-bg-tertiary rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getColorClass(bacValue)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-caption2 text-text-tertiary mt-1">
          <span>nüchtern</span>
          <span>betrunken</span>
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
      return `${dez(hoursElapsed, 1)} Stunden`;
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
      description: `${player === 'alexander' ? managers.aek.name : managers.real.name}: +${euro(amount)}`
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
      description: 'Unentschieden (0 €)'
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

    let summaryMessage = `Blackjack-Session Beendet!\n\n`;
    summaryMessage += `Finale Abrechnung:\n`;
    summaryMessage += `${managers.aek.name}: +${euro(alexanderTotal)}\n`;
    summaryMessage += `${managers.real.name}: +${euro(philipTotal)}\n\n`;
    summaryMessage += `Gewinner: ${winner}\n`;
    if (difference > 0) {
      summaryMessage += `Differenz: ${euro(difference)}\n\n`;
    }
    summaryMessage += `Gespielt: ${totalGames} Spiele in ${totalRounds} Runden\n\n`;
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
    const amount = zahl(customAmounts[player]);
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
          <span className="text-system-purple">Spiele-Fortschritt</span>
          <span className={`${isComplete ? 'text-system-green' : 'text-system-purple'}`}>
            {currentGames}/{maxGames} Spiele
          </span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-3 relative overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete ? 'bg-system-green' : 'bg-system-purple'
            }`}
            style={{ width: `${progress}%` }}
          />
          {isComplete && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Abgeschlossen</span>
            </div>
          )}
        </div>
        {isComplete && (
          <div className="text-center mt-2">
            <span className="text-xs text-system-green font-medium">
              10 Spiele erreicht — Zeit für eine neue Runde?
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

  // ─── Schnaps-Counter ──────────────────────────────────────────────────────
  // Wer trinkt, ist ein Ereignis und liegt in der Datenbank. Das ZIEL ist eine
  // Einstellung und bleibt geraetelokal — es beschreibt den Abend, nicht was
  // passiert ist.
  const addSchnapShot = (person) => {
    if (schnapsShotsData.alex + schnapsShotsData.philip >= schnapsShotsData.target) return;
    erfasseUndZeige(person === 'alex' ? 'alexander' : 'philip', 'schnaps');
  };

  const undoLastShot = () => {
    const verlauf = schnapsShotsData.history || [];
    const letzter = verlauf[verlauf.length - 1];
    if (!letzter?._ereignis) return;
    entferneAbend(letzter._ereignis);
    aktualisiereAusLog();
  };

  const resetSchnapsShotsData = () => {
    for (const v of (schnapsShotsData.history || [])) {
      if (v._ereignis) entferneAbend(v._ereignis);
    }
    aktualisiereAusLog();
  };

  const applySchnapsTarget = () => {
    const val = zahl(schnapsTargetInput);
    if (Number.isFinite(val) && val >= 1 && val <= 200) {
      setSchnapsShotsData((d) => ({ ...d, target: val }));
      try { localStorage.setItem('schnapsZiel', String(val)); } catch { /* ignore */ }
    }
    setEditingSchnapsTarget(false);
  };

  // ─── Sterne-Counter ───────────────────────────────────────────────────────
  // Der Tab rechnet hier nichts mehr selbst. Stand und Verlauf leitet
  // utils/sterneCounter aus dem Ereignis-Log ab (Datenbank, db/09) — vorher
  // wurde die Summe hier von Hand fortgeschrieben und lag nur lokal, weshalb
  // Alexander und Philip verschiedene Zahlen sahen.
  const addSterne = () => {
    const { person, stars } = sterneInput;
    setSterneData(addSterneEintrag({ person, stars }).data);
  };

  const undoLastSterne = () => {
    if (sterneData.history.length === 0) return;
    setSterneData(removeSterneEintrag(sterneData.history.length - 1));
  };

  // Einzelnen Verlaufseintrag loeschen (Gutschrift faellt damit weg).
  const deleteSterneEintrag = (index) => {
    setSterneData(removeSterneEintrag(index));
  };

  const resetSterneData = () => {
    setSterneData(alleSterneLoeschen());
  };

  // Render filled / half / empty stars
  const renderStars = (value, maxStars = 5) => {
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
      if (value >= i) {
        stars.push(<span key={i} className="text-system-yellow">★</span>);
      } else if (value >= i - 0.5) {
        stars.push(<span key={i} className="text-system-yellow opacity-60">★</span>);
      } else {
        stars.push(<span key={i} className="text-text-tertiary">★</span>);
      }
    }
    return stars;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const addSchnapShotToBoth = () => {
    // Bleibt nur noch EIN Platz bis zum Ziel, bekommt ihn Alexander — so war es
    // vorher auch, nur ueber eine unnoetig verschachtelte Bedingung.
    const frei = schnapsShotsData.target - (schnapsShotsData.alex + schnapsShotsData.philip);
    if (frei <= 0) return;
    erfasseAbend({ person: 'alexander', art: 'schnaps' });
    if (frei >= 2) erfasseAbend({ person: 'philip', art: 'schnaps' });
    aktualisiereAusLog();
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Kennzahlen des Abends. Standen vorher als vier fest verdrahtete Ausdruecke
  // im JSX, jeder mit derselben Summe aus vier Feldern.
  const gesamtBiere = beerConsumption.alexander + beerConsumption.philip;
  const gesamtShots =
    shotConsumption.alexander.shots20 + shotConsumption.alexander.shots40 +
    shotConsumption.philip.shots20 + shotConsumption.philip.shots40;
  const hoechsterBak = TRINKER
    .map((t) => parseFloat(calculateBloodAlcohol(
      beerConsumption[t.key], shotConsumption[t.key],
      { weight: managers[t.team].weight, gender: 'male' }, drinkingStartTime)))
    .reduce((a, b) => Math.max(a, b), 0)
    .toFixed(2);

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">

      {/* Sub-Navigation */}
      <div className="mb-6">
        <div className="flex bg-bg-tertiary rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveSection('alcohol')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              activeSection === 'alcohol'
                ? 'bg-bg-secondary text-system-blue shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Icon name="beer" size={17} strokeWidth={2.1} />
            <span className="text-text-secondary">Alkohol</span>
          </button>
          <button
            onClick={() => setActiveSection('schnaps')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              activeSection === 'schnaps'
                ? 'bg-bg-secondary text-system-orange shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Icon name="glass" size={17} strokeWidth={2.1} />
            <span className="text-text-secondary">Schnaps</span>
            {(() => {
              const done = schnapsShotsData.alex + schnapsShotsData.philip;
              const rem = schnapsShotsData.target - done;
              return rem > 0
                ? <span className="text-xs bg-system-orange/15 text-system-orange px-1.5 py-0.5 rounded-full">{rem}</span>
                : <span className="text-xs bg-system-green/15 text-system-green px-1.5 py-0.5 rounded-full">✓</span>;
            })()}
          </button>
          <button
            onClick={() => setActiveSection('sterne')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              activeSection === 'sterne'
                ? 'bg-bg-secondary text-system-yellow shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Icon name="star" size={17} strokeWidth={2.1} />
            <span className="text-text-secondary">Sterne</span>
            {(() => {
              const net = Math.abs(sterneData.philip - sterneData.alex);
              return net > 0
                ? <span className="text-xs bg-system-yellow/15 text-system-yellow px-1.5 py-0.5 rounded-full">{dezKurz(net)}</span>
                : null;
            })()}
          </button>
          <button
            onClick={() => setActiveSection('blackjack')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              activeSection === 'blackjack'
                ? 'bg-bg-secondary text-system-red shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Icon name="spade" size={17} strokeWidth={2.1} />
            <span className="text-text-secondary">BJ</span>
          </button>
        </div>
      </div>

      {/* Alcohol Section */}
      {activeSection === 'alcohol' && (
        <>
          {/* Kopfzeile: Trinkzeit und die zwei Aktionen, die den ganzen Abend
              betreffen. Vorher war das eine eigene Karte "Schnell-Aktionen"
              mit zwei grossen Knoepfen — viel Flaeche fuer wenig Inhalt. */}
          <div className="modern-card mb-4 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-system-orange/12 text-system-orange flex items-center justify-center flex-shrink-0">
              <Icon name="clock" size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-footnote font-semibold text-text-primary">
                {drinkingStartTime ? 'Seit ' + getTimeSinceDrinking() : 'Noch nichts getrunken'}
              </div>
              <div className="text-caption2 text-text-tertiary">
                {gesamtBiere + gesamtShots > 0
                  ? gesamtBiere + (gesamtBiere === 1 ? ' Bier' : ' Biere') + ' · ' + gesamtShots + ' Shots'
                  : 'Der erste Eintrag startet die Uhr'}
              </div>
            </div>
            <button onClick={addBeerToBoth} className="btn-secondary px-3 flex-shrink-0"
                    title="Beiden ein Bier">
              <Icon name="beer" size={16} strokeWidth={2.2} className="mr-1" />+2
            </button>
            <button
              onClick={() => { if (window.confirm('Alle Getränke (Bier & Shots) und die Trinkzeit zurücksetzen?')) resetConsumption(); }}
              className="w-10 h-10 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
              aria-label="Zurücksetzen" title="Zurücksetzen">
              <Icon name="undo" size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Je Person eine Karte. Vorher standen dieselben Zahlen dreimal auf
              der Seite: in der Personenkarte, noch einmal unter
              "Spieler-Vergleich" und die Nuechternzeit ein drittes Mal unter
              "Nuechternzeit-Prognose". Im Vergleich war Philip ausserdem
              gruen statt rot eingefaerbt. */}
          <div className="space-y-3">
            {TRINKER.map((t) => {
              const bak = calculateBloodAlcohol(
                beerConsumption[t.key], shotConsumption[t.key],
                { weight: managers[t.team].weight, gender: 'male' }, drinkingStartTime
              );
              const nuechtern = drinkingStartTime
                ? calculateSoberTime(beerConsumption[t.key], shotConsumption[t.key],
                    { weight: managers[t.team].weight, gender: 'male' }, drinkingStartTime)
                : null;
              return (
                <div key={t.key} className="modern-card">
                  <div className="flex items-center gap-2 mb-3">
                    <TeamLogo team={t.team} size="sm" />
                    <span className={`font-semibold truncate ${t.farbe}`}>{managers[t.team].name}</span>
                    <span className="ml-auto text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                      {managers[t.team].weight} kg
                    </span>
                  </div>

                  {/* Eintragen */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Bier', unter: '0,5 l', tun: () => addBeer(t.key) },
                      { label: 'Shot', unter: '20 %', tun: () => addShot(t.key, 20) },
                      { label: 'Shot', unter: '40 %', tun: () => addShot(t.key, 40) },
                    ].map((k, i) => (
                      <button key={i} onClick={k.tun}
                              className={`py-2.5 rounded-xl font-semibold text-sm transition-transform active:scale-95 ${t.knopf}`}>
                        <span className="block leading-tight">+ {k.label}</span>
                        <span className="block text-caption2 font-normal opacity-80">{k.unter}</span>
                      </button>
                    ))}
                  </div>

                  {/* Stand */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      ['Biere', beerConsumption[t.key]],
                      ['Shots 20 %', shotConsumption[t.key].shots20],
                      ['Shots 40 %', shotConsumption[t.key].shots40],
                    ].map(([label, wert]) => (
                      <div key={label} className="panel-gray rounded-xl py-2 text-center">
                        <div className="stat-display text-[17px] num-tabular text-text-primary leading-none">{wert}</div>
                        <div className="text-caption2 text-text-tertiary mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Promille. Vorher lag der Wert auf `bg-system-blue` — der
                      vollen Farbe statt einer Tint-Stufe — und der Text
                      darauf war ebenfalls text-system-blue: blau auf blau,
                      also unlesbar. */}
                  <div className="mt-3 pt-3 border-t border-border-light">
                    <div className="flex items-baseline gap-2">
                      {/* dez(): toFixed liefert "0.00" mit Punkt — die einzige
                          Stelle der App, an der eine Zahl englisch stand. */}
                      <span className="stat-display text-2xl num-tabular text-text-primary">{dez(parseFloat(bak), 2)} ‰</span>
                      <span className="text-caption2 text-text-tertiary">Blutalkohol (Widmark)</span>
                    </div>
                    <BACChart bac={bak} />
                    {nuechtern && nuechtern > new Date() && (
                      <div className="mt-2 text-caption1 text-text-secondary">
                        Wieder nüchtern gegen{' '}
                        <span className="num-tabular text-text-primary font-semibold">
                          {nuechtern.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {' '}({Math.ceil((nuechtern - new Date()) / 3600000)} h)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zusammen — die vier Zahlen, die nur fuer den Abend als Ganzes
              gelten. Alles Personenbezogene steht oben. */}
          <div className="modern-card mt-3 p-4">
            <div className="text-footnote font-semibold text-text-muted mb-2.5">Zusammen</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                ['Biere', gesamtBiere],
                ['Liter', dez(gesamtBiere * 0.5, 1)],
                ['Shots', gesamtShots],
                ['Höchster', dez(parseFloat(hoechsterBak), 2) + ' ‰'],
              ].map(([label, wert]) => (
                <div key={label} className="text-center">
                  <div className="stat-display text-[15px] num-tabular text-text-primary truncate">{wert}</div>
                  <div className="text-caption2 text-text-tertiary">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <AlcoholProgressionGraph
            managers={managers}
            beerConsumption={beerConsumption}
            shotConsumption={shotConsumption}
            drinkingStartTime={drinkingStartTime}
          />

          {showHints && (
            <div className="modern-card mt-3 p-4">
              <div className="text-footnote font-semibold text-text-muted mb-2">Wie gerechnet wird</div>
              <ul className="text-caption1 text-text-secondary space-y-1">
                <li>BAK nach der Widmark-Formel, Abbau 0,15 ‰ je Stunde</li>
                <li>Bier: 0,5 l mit 5 %, Shot: 2 cl mit 20 % oder 40 %</li>
                <li>Balkenfarbe: grün bis 0,3 ‰, gelb bis 0,5 ‰, orange bis 1,0 ‰, darüber rot</li>
                <li>Gewichte unter Admin → Teams</li>
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
                {/* bg-system-orange OHNE Tint-Stufe war die volle Farbe, und
                    saemtlicher Text darauf ist text-system-orange: orange auf
                    orange, gemessener Kontrastabstand 0 — "18", "Shots noch
                    uebrig" und "0 getrunken" waren schlicht unsichtbar. Der
                    gruene Zweig daneben stand immer richtig auf /10. */}
                <div className={`modern-card mb-6 border-2 ${isDone ? 'border-system-green/45 bg-system-green/10' : 'border-system-orange/45 bg-system-orange/10'}`}>
                  <div className="text-center mb-6">
                    {isDone ? (
                      <>
                        <div className="text-3xl font-bold text-system-green mb-1">Fertig!</div>
                        <div className="text-system-green font-medium">Alle {schnapsShotsData.target} Shots getrunken</div>
                      </>
                    ) : (
                      <>
                        <div className="text-6xl font-black text-system-orange leading-none">{remaining}</div>
                        <div className="text-lg text-system-orange font-semibold mt-1">
                          {remaining === 1 ? 'Shot noch übrig' : 'Shots noch übrig'}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span className="text-system-orange">{total} getrunken</span>
                      <div className="flex items-center gap-2">
                        {editingSchnapsTarget ? (
                          <>
                            <ZahlFeld
                              ganzzahl
                              wert={schnapsTargetInput}
                              onChange={setSchnapsTargetInput}
                              onKeyDown={e => { if (e.key === 'Enter') applySchnapsTarget(); if (e.key === 'Escape') setEditingSchnapsTarget(false); }}
                              className="w-16 text-center border border-system-orange/45 rounded-lg px-1 py-0.5 text-sm font-bold text-system-orange bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-system-orange"
                              autoFocus
                            />
                            <button onClick={applySchnapsTarget} className="text-xs bg-system-orange text-white px-2 py-0.5 rounded-md font-medium">✓</button>
                            <button onClick={() => setEditingSchnapsTarget(false)} className="text-xs text-text-tertiary" aria-label="Abbrechen"><Icon name="x" size={12} strokeWidth={2.4} /></button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setSchnapsTargetInput(String(schnapsShotsData.target)); setEditingSchnapsTarget(true); }}
                            className="flex items-center gap-1 text-text-tertiary hover:text-system-orange active:scale-95 transition-all"
                            title="Ziel anpassen"
                          >
                            <span className="text-text-secondary">Ziel: <span className="text-system-orange font-bold">{schnapsShotsData.target}</span></span>
                            <Icon name="edit" size={12} strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-6 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isDone ? 'bg-system-green' : 'bg-system-orange'}`}
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
                      {/* Bei 0 Shots ist der Balken leer und weisser Text
                          stand auf hellgrauem Grund. */}
                      <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold num-tabular ${
                        pct > 25 ? 'text-white drop-shadow' : 'text-text-primary'}`}>
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
                                ? 'bg-system-blue border-system-blue text-white'
                                : isPhilip
                                ? 'bg-system-red border-system-red text-white'
                                : 'panel-gray text-text-tertiary'
                            }`}
                            title={isAlex ? managers.aek.name : isPhilip ? managers.real.name : ''}
                          >
                            {isAlex || isPhilip ? <Icon name="glass" size={12} strokeWidth={2.4} /> : i + 1}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-system-blue inline-block"></span>{managers.aek.name}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-system-red inline-block"></span>{managers.real.name}</span>
                    </div>
                  </div>

                  {/* Per-person counts */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-system-blue/15 border-2 border-system-blue/45 rounded-xl p-4 text-center">
                      <TeamLogo team="aek" size="sm" />
                      <div className="font-bold text-system-blue text-lg">{managers.aek.name}</div>
                      <div className="text-4xl font-black text-system-blue">{schnapsShotsData.alex}</div>
                      <div className="text-sm text-system-blue">Shots</div>
                    </div>
                    <div className="bg-system-red/15 border-2 border-system-red/45 rounded-xl p-4 text-center">
                      <TeamLogo team="real" size="sm" />
                      <div className="font-bold text-system-red text-lg">{managers.real.name}</div>
                      <div className="text-4xl font-black text-system-red">{schnapsShotsData.philip}</div>
                      <div className="text-sm text-system-red">Shots</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isDone ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <button
                          onClick={() => addSchnapShot('alex')}
                          className="bg-system-blue hover:opacity-90 active:scale-95 text-white py-5 rounded-2xl transition-all duration-150 font-bold text-lg shadow-lg border-b-4 border-system-blue"
                        >
                          +1 Shot<br />
                          <span className="text-sm font-normal">{managers.aek.name}</span>
                        </button>
                        <button
                          onClick={() => addSchnapShot('philip')}
                          className="bg-system-green hover:opacity-90 active:scale-95 text-white py-5 rounded-2xl transition-all duration-150 font-bold text-lg shadow-lg border-b-4 border-system-green"
                        >
                          +1 Shot<br />
                          <span className="text-sm font-normal">{managers.real.name}</span>
                        </button>
                      </div>
                      <button
                        onClick={addSchnapShotToBoth}
                        disabled={schnapsShotsData.alex + schnapsShotsData.philip >= schnapsShotsData.target}
                        className="w-full mb-4 bg-system-orange hover:opacity-90 active:scale-95 text-white py-4 rounded-2xl transition-all duration-150 font-bold text-base shadow-lg border-b-4 border-system-orange disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Beide +1 (je ein Shot)
                      </button>
                    </>
                  ) : (
                    <div className="flex justify-center mb-4 text-system-green"><Icon name="trophy" size={34} strokeWidth={1.8} /></div>
                  )}

                  {/* Secondary actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={undoLastShot}
                      disabled={schnapsShotsData.history.length === 0}
                      className="flex-1 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed text-text-secondary font-medium transition-all text-sm border border-border-medium"
                    >
                      Letzten rückgängig
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Schnaps-Counter zurücksetzen?')) resetSchnapsShotsData();
                      }}
                      className="flex-1 py-3 rounded-xl bg-system-red/10 hover:bg-system-red/15 text-system-red font-medium transition-all text-sm border border-system-red/25"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* History */}
                {schnapsShotsData.history.length > 0 && (
                  <div className="modern-card">
                    <h4 className="karten-titel mb-3 flex items-center gap-2">
                      Verlauf
                    </h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {[...schnapsShotsData.history].reverse().map((entry, i) => {
                        const isAlex = entry.person === 'alex';
                        return (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isAlex ? 'panel-blue' : 'panel-red'}`}>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={isAlex ? 'aek' : 'real'} size="xs" />
                              <span className={`font-medium text-sm ${isAlex ? 'text-system-blue' : 'text-system-red'}`}>
                                {isAlex ? managers.aek.name : managers.real.name}
                              </span>
                              <Icon name="glass" size={14} strokeWidth={2.2} className="text-text-tertiary" />
                            </div>
                            <span className="text-xs text-text-tertiary">
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
        // Philip ist rot, nicht gruen. Hier stand `net > 0 ? 'green' : 'blue'`,
        // Philip fuehrte also in einer Farbe, die ihm in der ganzen uebrigen
        // App nicht gehoert — damit sagte die Farbe des Fuehrenden nichts mehr.
        const leaderKlasse = net > 0 ? 'text-system-red' : 'text-system-blue';

        const starOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

        return (
          <>
            {/* Balance card */}
            {/* Vorher: vollflaechig gelber Kartenhintergrund mit zweifarbigem
                Rand, darauf farbiger Text — beides gab es nur an dieser Stelle
                der App. Jetzt eine ruhige Karte, der gelbe Stern ist der
                Akzent. */}
            <div className="modern-card mb-6">
              <div className="text-center mb-5">
                <div className="flex justify-center mb-2 text-system-yellow"><Icon name="starFilled" size={38} strokeWidth={0} /></div>
                {leader ? (
                  <>
                    <div className={`text-title3 font-bold ${leaderKlasse} mb-1`}>
                      {leader} führt
                    </div>
                    <div className="flex justify-center gap-1 text-3xl mb-1">
                      {renderStars(absNet, 5)}
                    </div>
                    <div className="text-system-yellow font-semibold">
                      {dezKurz(absNet)} Stern{absNet !== 1 ? 'e' : ''} Vorsprung
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-text-secondary mb-1">Gleichstand</div>
                    <div className="text-text-tertiary text-sm">Noch kein Vorsprung</div>
                  </>
                )}
              </div>

              {/* Die Gesamtstaende standen als zwei Kacheln nebeneinander,
                  jede mit Namen, Sternreihe und Zahl. Wer mehr hat, musste man
                  quer ueber die Luecke vergleichen — genau das zeigt die
                  geteilte Flaeche unmittelbar, wie ueberall sonst in der App.
                  Die Sternreihe steht oben beim Vorsprung, wo sie etwas
                  aussagt; zweimal fuenf Sterne nebeneinander waren vor allem
                  Dekoration. */}
              <div className="mb-6 pt-3 border-t border-border-light">
                <Kraefteverhaeltnis
                  label="Sterne gesamt"
                  aek={sterneData.alex} real={sterneData.philip}
                  anzeige={(n) => dezKurz(n)}
                  aekName={managers.aek.name} realName={managers.real.name} />
              </div>

              {/* Star entry form */}
              <div className="bg-bg-elevated border border-system-yellow/25 rounded-2xl p-4 mb-4">
                <div className="text-sm font-semibold text-text-secondary mb-3 text-center inline-flex items-center justify-center gap-2 w-full"><Icon name="starFilled" size={14} strokeWidth={0} className="text-system-yellow" />Sterne eintragen</div>

                {/* Person selector */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSterneInput(p => ({ ...p, person: 'alex' }))}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${sterneInput.person === 'alex' ? 'bg-system-blue text-white shadow-md' : 'bg-system-blue/10 text-system-blue border border-system-blue/25'}`}
                  >
                    {managers.aek.name}
                  </button>
                  <button
                    onClick={() => setSterneInput(p => ({ ...p, person: 'philip' }))}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${sterneInput.person === 'philip' ? 'bg-system-red text-white shadow-md' : 'bg-system-red/10 text-system-red border border-system-red/25'}`}
                  >
                    {managers.real.name}
                  </button>
                </div>

                {/* Star amount selector */}
                <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                  {starOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setSterneInput(p => ({ ...p, stars: s }))}
                      className={`w-12 h-10 rounded-lg text-sm font-bold transition-all active:scale-95 ${sterneInput.stars === s ? 'bg-system-yellow text-white shadow-md scale-105' : 'bg-bg-tertiary text-text-secondary border border-border-light'}`}
                    >
                      {dezKurz(s)}
                    </button>
                  ))}
                </div>

                {/* Preview: entered stars + computed gain */}
                <div className="flex flex-col items-center gap-1 mb-4">
                  <div className="flex justify-center gap-0.5 text-2xl">
                    {renderStars(sterneInput.stars, 5)}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Team-Stärke: <strong className="text-text-secondary">{sterneInput.stars}</strong>
                    {' → '}
                    Gutschrift: <strong className="text-system-yellow">+{dezKurz(gutschriftFuer(sterneInput.stars))} ★</strong>
                    {' '}(6 − {sterneInput.stars})
                  </div>
                </div>

                {/* Confirm button */}
                <button
                  onClick={addSterne}
                  className={`w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all border-b-4 ${
                    sterneInput.person === 'alex'
                      ? 'bg-system-blue border-system-blue'
                      : 'bg-system-green border-system-green'
                  }`}
                >
                  +{dezKurz(6 - sterneInput.stars)} für {sterneInput.person === 'alex' ? managers.aek.name : managers.real.name}
                </button>
              </div>

              {/* Secondary actions */}
              <div className="flex gap-3">
                <button
                  onClick={undoLastSterne}
                  disabled={sterneData.history.length === 0}
                  className="flex-1 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed text-text-secondary font-medium transition-all text-sm border border-border-medium"
                >
                  Letzten rückgängig
                </button>
                <button
                  onClick={() => { if (window.confirm('Sterne-Counter zurücksetzen?')) resetSterneData(); }}
                  className="flex-1 py-3 rounded-xl bg-system-red/10 hover:bg-system-red/15 text-system-red font-medium transition-all text-sm border border-system-red/25"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Kurve vor der Liste: erst der Verlauf, dann die Einzeleinträge */}
            <SterneVerlauf
              history={sterneData.history}
              namen={{ alex: managers.aek.name, philip: managers.real.name }}
            />

            {/* History */}
            {sterneData.history.length > 0 && (
              <div className="modern-card">
                <h4 className="karten-titel mb-3 flex items-center gap-2">
                  Verlauf
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {[...sterneData.history].reverse().map((entry, i) => {
                    const isAlex = entry.person === 'alex';
                    // Die Liste ist umgedreht — echter Index im gespeicherten Verlauf:
                    const echterIndex = sterneData.history.length - 1 - i;
                    const wer = isAlex ? managers.aek.name : managers.real.name;
                    return (
                      <div
                        key={`${entry.timestamp}-${echterIndex}`}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${isAlex ? 'panel-blue' : 'panel-red'}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <TeamLogo team={isAlex ? 'aek' : 'real'} size="xs" />
                          <span className={`font-semibold text-sm ${isAlex ? 'text-system-blue' : 'text-system-red'}`}>
                            {wer}
                          </span>
                          <span className="text-xs text-text-tertiary">{entry.stars}★ Team</span>
                          <span className={`text-xs font-bold ${isAlex ? 'text-system-blue' : 'text-system-green'}`}>
                            {(() => { const g = entry.gained ?? gutschriftFuer(entry.stars); return `+${g % 1 === 0 ? g : g.toFixed(1)}★`; })()}
                          </span>
                          {entry.info && (
                            <span className="text-[11px] text-text-tertiary truncate max-w-full">{entry.info}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-text-tertiary">
                            {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => {
                              const g = entry.gained ?? gutschriftFuer(entry.stars);
                              if (window.confirm(`Eintrag löschen? ${wer} verliert ${g % 1 === 0 ? g : g.toFixed(1)} ★.`)) {
                                deleteSterneEintrag(echterIndex);
                              }
                            }}
                            aria-label={`Eintrag von ${wer} löschen`}
                            className="btn-compact w-7 h-7 rounded-full bg-white/70 text-system-red hover:bg-system-red/15 flex items-center justify-center"
                          >
                            <Icon name="trash" size={13} strokeWidth={2.2} />
                          </button>
                        </div>
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
          {/* Ueberschrift und Erklaertext entfernt: "BJ-Tracking System" sagt
              nichts, was die Reiterbeschriftung nicht schon sagt, und darunter
              stand ein Changelog ("Neues Design: Separate Buttons …") — eine
              Notiz darueber, was sich in einer frueheren Fassung geaendert
              hat, bei jedem Aufruf sichtbar. */}

          {/* Game Counter and Account Balances */}
          <div className="modern-card mb-6 bg-system-purple border-2 border-system-purple/45">
            <h4 className="karten-titel mb-4 text-system-purple inline-flex items-center gap-2">
              <Icon name="chart" size={17} strokeWidth={2.2} />Übersicht
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Game Counter with Progress Bar */}
              <div className="p-4 bg-bg-elevated rounded-lg border border-system-purple/25 text-center">
                <div className="text-3xl font-bold text-system-purple mb-1">
                  {bjTracking.gameCounter}
                </div>
                <div className="text-sm text-system-purple mb-3">Gespielte Spiele</div>
                
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
              <div className="p-4 bg-system-blue/10 rounded-lg border-2 border-system-blue/45 text-center">
                <h5 className="font-bold text-system-blue mb-2 flex items-center justify-center gap-2">
                  {managers.aek.name}
                </h5>
                <div className="text-2xl font-bold text-system-green mb-1">
                  +{euro(bjTracking.alexander.balance)}
                </div>
                <div className="text-xs text-system-blue">Kontostand</div>
              </div>

              {/* Philip Balance */}
              <div className="p-4 bg-system-green/10 rounded-lg border-2 border-system-green/45 text-center">
                <h5 className="font-bold text-system-green mb-2 flex items-center justify-center gap-2">
                  {managers.real.name}
                </h5>
                <div className="text-2xl font-bold text-system-green mb-1">
                  +{euro(bjTracking.philip.balance)}
                </div>
                <div className="text-xs text-system-green">Kontostand</div>
              </div>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="modern-card mb-6 bg-system-yellow border-2 border-system-yellow/45">
            <h4 className="karten-titel mb-4 text-system-orange flex items-center gap-2">
              <Icon name="play" size={17} strokeWidth={2.2} className="inline mr-1.5 -mt-0.5" />Gewinn eintragen
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Alexander Main Buttons */}
              <div className="space-y-3">
                <h5 className="font-medium text-system-blue text-center mb-3 inline-flex items-center justify-center gap-2 w-full"><span className="w-2 h-2 rounded-full bg-system-blue" />{managers.aek.name}</h5>
                
                {/* Main action buttons - Always visible for mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToPlayerAccount('alexander', 5.00)}
                    className="btn-soft btn-soft-green px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    Win<br/>+5,00 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 7.50)}
                    className="btn-soft btn-soft-purple px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    Blackjack<br/>+7,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 2.50)}
                    className="btn-soft btn-soft-orange px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    BJ-Push<br/>+2,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 10.00)}
                    className="btn-soft btn-soft-red px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    Double<br/>+10,00 €
                  </button>
                </div>

                {/* Collapsible Secondary Buttons - Mobile Optimized */}
                <div className="text-center">
                  <button
                    onClick={() => toggleAdvancedButtons('alexander')}
                    className="bg-system-blue/15 hover:bg-system-blue/25 text-system-blue px-4 py-2 rounded-lg text-sm font-medium transition-all border border-system-blue/45 hover:border-system-blue/45 min-h-[44px]"
                  >
                    {showAdvancedButtons.alexander ? 'Weniger Beträge' : 'Mehr Beträge'}
                  </button>
                </div>

                {/* Collapsible Step buttons */}
                {showAdvancedButtons.alexander && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 animate-fade-in">
                    {[2.50, 5.00, 7.50, 10.00, 12.50, 15.00, 17.50, 20.00, 22.50, 25.00, 27.50, 30.00].map(amount => (
                      <button
                        key={amount}
                        onClick={() => addToPlayerAccount('alexander', amount)}
                        className="bg-system-blue/15 hover:bg-system-blue/25 text-system-blue px-3 py-3 rounded-md text-sm font-medium transition-all border border-system-blue/45 hover:border-system-blue/45 min-h-[44px]"
                      >
                        +{euro(amount)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Amount Input - Always visible */}
                <div className="mt-3 p-2 bg-system-blue/10 rounded-lg border border-system-blue/25">
                  <h6 className="text-xs font-medium text-system-blue mb-1 inline-flex items-center gap-1"><Icon name="euro" size={12} strokeWidth={2.4} />Eigener Betrag:</h6>
                  <div className="flex gap-1">
                    <ZahlFeld
                      wert={customAmounts.alexander}
                      onChange={(w) => handleCustomAmountChange('alexander', w)}
                      placeholder="0,00"
                      className="flex-1 px-2 py-2 border border-system-blue/45 rounded-md text-xs text-center focus:outline-none focus:ring-1 focus:ring-system-blue min-h-[36px] max-w-[80px]"
                    />
                    <button
                      onClick={() => addCustomAmount('alexander')}
                      disabled={!(zahl(customAmounts.alexander) > 0)}
                      className="bg-system-blue hover:bg-system-blue disabled:bg-border-strong text-white px-2 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] min-w-[36px]"
                    >
                      +€
                    </button>
                  </div>
                </div>
              </div>

              {/* Philip Main Buttons */}
              <div className="space-y-3">
                <h5 className="font-medium text-system-red text-center mb-3 inline-flex items-center justify-center gap-2 w-full"><span className="w-2 h-2 rounded-full bg-system-red" />{managers.real.name}</h5>
                
                {/* Main action buttons - Always visible for mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToPlayerAccount('philip', 5.00)}
                    className="btn-soft btn-soft-green px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    Win<br/>+5,00 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 7.50)}
                    className="btn-soft btn-soft-purple px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    Blackjack<br/>+7,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 2.50)}
                    className="btn-soft btn-soft-orange px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    BJ-Push<br/>+2,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 10.00)}
                    className="btn-soft btn-soft-red px-3 py-4 rounded-xl font-bold text-sm min-h-[56px]"
                  >
                    Double<br/>+10,00 €
                  </button>
                </div>

                {/* Collapsible Secondary Buttons - Mobile Optimized */}
                <div className="text-center">
                  <button
                    onClick={() => toggleAdvancedButtons('philip')}
                    className="bg-system-green/15 hover:bg-system-green/25 text-system-green px-4 py-2 rounded-lg text-sm font-medium transition-all border border-system-green/45 hover:border-system-green/45 min-h-[44px]"
                  >
                    {showAdvancedButtons.philip ? 'Weniger Beträge' : 'Mehr Beträge'}
                  </button>
                </div>

                {/* Collapsible Step buttons */}
                {showAdvancedButtons.philip && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 animate-fade-in">
                    {[2.50, 5.00, 7.50, 10.00, 12.50, 15.00, 17.50, 20.00, 22.50, 25.00, 27.50, 30.00].map(amount => (
                      <button
                        key={amount}
                        onClick={() => addToPlayerAccount('philip', amount)}
                        className="bg-system-green/15 hover:bg-system-green/25 text-system-green px-3 py-3 rounded-md text-sm font-medium transition-all border border-system-green/45 hover:border-system-green/45 min-h-[44px]"
                      >
                        +{euro(amount)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Amount Input - Always visible */}
                <div className="mt-3 p-2 bg-system-green/10 rounded-lg border border-system-green/25">
                  <h6 className="text-xs font-medium text-system-green mb-1 inline-flex items-center gap-1"><Icon name="euro" size={12} strokeWidth={2.4} />Eigener Betrag:</h6>
                  <div className="flex gap-1">
                    <ZahlFeld
                      wert={customAmounts.philip}
                      onChange={(w) => handleCustomAmountChange('philip', w)}
                      placeholder="0,00"
                      className="flex-1 px-2 py-2 border border-system-green/45 rounded-md text-xs text-center focus:outline-none focus:ring-1 focus:ring-system-green min-h-[36px] max-w-[80px]"
                    />
                    <button
                      onClick={() => addCustomAmount('philip')}
                      disabled={!(zahl(customAmounts.philip) > 0)}
                      className="bg-system-green hover:bg-system-green disabled:bg-border-strong text-white px-2 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] min-w-[36px]"
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
                className="bg-system-green hover:opacity-90 text-white px-8 py-4 rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 min-h-[56px]"
              >
                Unentschieden (0 €)
              </button>
            </div>
          </div>

          {/* Round Management */}
          <div className="modern-card mb-6 panel-blue">
            <h4 className="karten-titel mb-4 text-system-indigo flex items-center gap-2">
              Runden-Verwaltung
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!bjTracking.currentRound.active ? (
                <div className="text-center">
                  <button
                    onClick={startNewRound}
                    className="btn-brand px-6 py-4 rounded-xl font-bold min-h-[56px]"
                  >
                    Neue Runde starten
                  </button>
                  <p className="text-caption2 text-text-tertiary mt-2">
                    Ein Gewinn-Knopf startet die Runde ebenfalls.
                  </p>
                </div>
              ) : (
                <button
                  onClick={finishCurrentRound}
                  className="btn-brand px-6 py-4 rounded-xl font-bold min-h-[56px]"
                >
                  Runde abschließen
                </button>
              )}
              
              <button
                onClick={endBjSession}
                className="btn-soft btn-soft-purple px-6 py-4 rounded-xl font-bold min-h-[56px]"
              >
                Runde beenden
              </button>
              
              <button
                onClick={() => { if (window.confirm('Gesamtes Blackjack-Tracking (Einsätze, Ergebnisse, Verlauf) zurücksetzen?')) resetBjTracking(); }}
                className="btn-soft btn-soft-gray px-6 py-4 rounded-xl font-bold min-h-[56px]"
              >
                Alles zurücksetzen
              </button>
            </div>

            {bjTracking.currentRound.active && (
              <div className="mt-4 p-4 bg-bg-elevated rounded-lg border border-system-indigo/25">
                <div className="text-center">
                  <div className="text-sm font-medium text-system-indigo mb-2">
                    Aktuelle Runde {bjTracking.currentRound.roundNumber}
                  </div>
                  <div className="text-xs text-system-indigo mb-3">
                    {bjTracking.currentRound.games.length} Spiele in dieser Runde
                  </div>
                  {/* Progress indicator in round info */}
                  {bjTracking.currentRound.games.length >= 10 && (
                    <div className="panel-green rounded-lg p-2">
                      <span className="text-system-green text-xs font-medium">
                        10 Spiele erreicht — mit „Runde abschließen“ geht es weiter.
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
              <h4 className="karten-titel mb-4 flex items-center gap-2">
                Rundenübersicht
              </h4>
              
              <div className="space-y-4">
                {bjTracking.rounds.slice().reverse().map((round) => (
                  <div key={round.id} className="p-4 bg-system-green rounded-lg border border-border-light">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-text-secondary">
                          Runde {round.roundNumber}
                        </h5>
                        <span className="text-xs bg-bg-tertiary px-2 py-1 rounded-full text-text-secondary">
                          {round.gamesCount} Spiele
                        </span>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {new Date(round.endTime).toLocaleString('de-DE')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="p-3 bg-system-blue/10 rounded-lg border border-system-blue/25">
                        <div className="text-center">
                          <div className="font-bold text-system-blue">{managers.aek.name}</div>
                          <div className="text-xl font-bold text-system-green">
                            +{euro(round.alexanderTotal)}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-system-red/10 rounded-lg border border-system-red/25">
                        <div className="text-center">
                          <div className="font-bold text-system-red">{managers.real.name}</div>
                          <div className="text-xl font-bold text-system-red">
                            +{euro(round.philipTotal)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Games in round */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
                        Spiele anzeigen ({round.gamesCount})
                      </summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {round.games.map((game) => (
                          <div key={game.id} className="text-xs p-2 bg-bg-elevated rounded border border-border-light flex justify-between items-center">
                            <span className="text-text-secondary">Spiel {game.gameNumber}</span>
                            <span className="font-medium text-text-primary">{game.description}</span>
                            <span className="text-text-tertiary">
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
            <div className="modern-card mb-6 bg-system-yellow border-2 border-system-yellow/45">
              <h4 className="karten-titel mb-4 text-system-orange flex items-center gap-2">
                Aktuelle Runde {bjTracking.currentRound.roundNumber} — Spiele
              </h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bjTracking.currentRound.games.map((game) => (
                  <div key={game.id} className="p-3 bg-bg-elevated rounded-lg border border-system-orange/25 flex justify-between items-center">
                    <span className="text-sm font-medium text-system-orange">Spiel {game.gameNumber}</span>
                    <span className="text-sm">{game.description}</span>
                    <span className="text-xs text-system-orange">
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
            <div className="modern-card panel-blue">
              <h5 className="font-bold text-system-blue mb-3 flex items-center gap-2">
                {managers.aek.name} - Statistiken
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-system-blue text-sm">Aktueller Kontostand:</span>
                  <span className="font-bold text-system-green">+{euro(bjTracking.alexander.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-system-blue text-sm">Gesamt-Verdienst:</span>
                  <span className="font-bold text-system-green">+{euro(bjTracking.alexander.totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Philip Stats */}
            <div className="modern-card panel-green">
              <h5 className="font-bold text-system-green mb-3 flex items-center gap-2">
                {managers.real.name} - Statistiken
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-system-green text-sm">Aktueller Kontostand:</span>
                  <span className="font-bold text-system-green">+{euro(bjTracking.philip.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-system-green text-sm">Gesamt-Verdienst:</span>
                  <span className="font-bold text-system-green">+{euro(bjTracking.philip.totalEarnings)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}