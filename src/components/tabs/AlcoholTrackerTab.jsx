import Icon from '../icons/Icon';
import {
  gutschriftFuer, loadSterne, addSterneEintrag, removeSterneEintrag,
  alleSterneLoeschen, altenSterneStandUebernehmen,
} from '../../utils/sterneCounter';
import SterneVerlauf from './alkohol/SterneVerlauf';
import {
  ladeLokal as ladeAbendLokal, erfasse as erfasseAbend, entferne as entferneAbend,
  bierStand, shotStand, schnapsStand, synchronisiere,
} from '../../utils/abende';
import { nurOffene } from '../../utils/abendAbschluss';
import { useAbendProtokoll } from '../../hooks/useAbendProtokoll';
import { useState, useEffect, useCallback } from 'react';
import ZahlFeld from '../ZahlFeld';
import { zahl, dez, dezKurz } from '../../utils/zahlen';

import TeamLogo from '../TeamLogo';

/** Betrag deutsch: "7,50 €" statt "7.50€". */
const euro = (n) => `${dez(n, 2)} €`;
/** Mit Vorzeichen, aber ohne „+0,00 €".*/
const plusEuro = (n) => `${n > 0 ? '+' : ''}${euro(n)}`;

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
import { ladeManager } from '../../utils/manager';
import Kraefteverhaeltnis from '../Kraefteverhaeltnis';
import HorizontalNavigation from '../HorizontalNavigation';

/** Kleine Zahl neben dem Reiter — bei null gar nichts. */
const zahlAbzeichen = (n, farbe) => (n > 0
  ? <span className={`text-caption2 num-tabular px-1.5 rounded-full ${farbe}`}>{dezKurz(n)}</span>
  : null);

/**
 * Die zwei Spalten von Schnaps und Sternen. Alexander blau, Philip rot — in
 * diesem Bereich war Philip an zwölf Stellen grün.
 */
const SEITEN = [
  { key: 'alex', team: 'aek', text: 'text-system-blue', voll: 'bg-system-blue', zart: 'bg-system-blue/10 border-system-blue/25', panel: 'panel-blue' },
  { key: 'philip', team: 'real', text: 'text-system-red', voll: 'bg-system-red', zart: 'bg-system-red/10 border-system-red/25', panel: 'panel-red' },
];

const uhrzeit = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

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
      const result = await ladeManager();
      
      if (result && result.data && Array.isArray(result.data) && result.data.length >= 2) {
        // Convert database format to component format
        // Assuming id=1 is AEK manager, id=2 is Real manager
        const aekManager = result.data.find(m => m.id === 1) || { name: 'Alexander', gewicht: 110 };
        const realManager = result.data.find(m => m.id === 2) || { name: 'Philip', gewicht: 105 };
        
        
        setManagers({
          aek: { name: aekManager.name, age: aekManager.age || 30, weight: aekManager.gewicht },
          real: { name: realManager.name, age: realManager.age || 30, weight: realManager.gewicht }
        });
      } else {
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
    // uebernehmen, DANN mit der Datenbank abgleichen. Die Anzeige selbst zieht
    // ueber useAbendProtokoll nach.
    altenSterneStandUebernehmen();
    synchronisiere();

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
    return () => {
      window.removeEventListener('managerSettingsChanged', handleManagerChange);
    };
  }, [loadManagersFromDatabase]);

  // Stand IMMER aus dem Ereignis-Log ableiten. Der Tab fuehrt keine eigenen
  // Summen fort; das lag vorher doppelt vor und konnte auseinanderlaufen.
  // Haengt am Protokoll selbst: ein Duell oder die Schnellerfassung bucht,
  // waehrend dieser Bereich offen ist.
  const protokollStand = useAbendProtokoll();
  useEffect(() => {
    // Abgeschlossenes zaehlt nicht mit, steht aber weiter im Rueckblick.
    const log = nurOffene(ladeAbendLokal());
    setBeerConsumption(bierStand(log));
    setShotConsumption(shotStand(log));
    setSchnapsShotsData((d) => ({ ...d, ...schnapsStand(log) }));
    setSterneData(loadSterne({ ohneAbgeschlossene: true }));
  }, [protokollStand]);

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
    erfasseAbend({ person, art: 'bier' });
    merkeStartzeit();
  };

  const addBeerToBoth = () => {
    erfasseAbend({ person: 'alexander', art: 'bier' });
    erfasseAbend({ person: 'philip', art: 'bier' });
    merkeStartzeit();
  };

  const addShot = (person, alcoholPercent) => {
    erfasseAbend({ person, art: alcoholPercent === 40 ? 'shot40' : 'shot20' });
    merkeStartzeit();
  };

  const resetConsumption = () => {
    // Zuruecksetzen heisst jetzt: die Ereignisse zuruecknehmen. Frueher wurde
    // nur der Zaehler auf 0 geschrieben — der Verlauf blieb als Geisterwert
    // liegen und tauchte nach einem Neuladen wieder auf.
    for (const e of nurOffene(ladeAbendLokal())) {
      if (['bier', 'shot20', 'shot40'].includes(e.art)) entferneAbend(e);
    }
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
    // Das Ziel begrenzt nichts: wer darueber hinaus trinkt, traegt es auch ein.
    erfasseAbend({ person: person === 'alex' ? 'alexander' : 'philip', art: 'schnaps' });
  };

  /** Den letzten Shot dieser Person zuruecknehmen. */
  const undoShot = (person) => {
    const letzter = [...schnapsShotsData.history].reverse().find((v) => v.person === person);
    if (letzter?._ereignis) entferneAbend(letzter._ereignis);
  };

  const resetSchnapsShotsData = () => {
    for (const v of (schnapsShotsData.history || [])) {
      if (v._ereignis) entferneAbend(v._ereignis);
    }
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
    addSterneEintrag({ person, stars });
  };

  const undoLastSterne = () => removeSterneEintrag(sterneData.history[sterneData.history.length - 1]);

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
    erfasseAbend({ person: 'alexander', art: 'schnaps' });
    erfasseAbend({ person: 'philip', art: 'schnaps' });
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

      <HorizontalNavigation
        kompakt
        selectedView={activeSection}
        onViewChange={setActiveSection}
        views={[
          { id: 'alcohol', label: 'Alkohol' },
          { id: 'schnaps', label: 'Schnaps', abzeichen: zahlAbzeichen(schnapsShotsData.alex + schnapsShotsData.philip, 'bg-system-orange/15 text-system-orange') },
          { id: 'sterne', label: 'Sterne', abzeichen: zahlAbzeichen(Math.abs(sterneData.philip - sterneData.alex), 'bg-system-yellow/15 text-system-yellow') },
          { id: 'blackjack', label: 'Blackjack' },
        ]}
      />

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

      {/* ─── Schnaps ─────────────────────────────────────────────────────── */}
      {activeSection === 'schnaps' && (() => {
        const { target } = schnapsShotsData;
        const total = schnapsShotsData.alex + schnapsShotsData.philip;
        const rest = target - total;
        const skala = Math.max(target, total, 1);

        // EIN BILDSCHIRM. Vorher lagen die Eintrag-Knoepfe unter der grossen
        // Restzahl, zwei Balken und zwei Personenkarten — auf dem iPhone
        // ausserhalb des Bildes, fuer jeden Shot musste man scrollen. Jetzt
        // ist die Personenkarte selbst der Knopf.
        return (
          <>
            <div className="modern-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="stat-display num-tabular text-[40px] leading-none text-text-primary">
                    <span key={total} className="zahl-sprung">{total}</span>
                    <span className="text-title3 text-text-tertiary"> / {target}</span>
                  </div>
                  <div className={`text-caption1 mt-1 font-medium ${rest > 0 ? 'text-text-secondary' : 'text-system-green'}`}>
                    {rest > 0 ? `noch ${rest} bis zum Ziel` : rest === 0 ? 'Ziel erreicht' : `Ziel erreicht, ${-rest} darüber`}
                  </div>
                </div>
                {editingSchnapsTarget ? (
                  <div className="flex items-center gap-1.5">
                    <ZahlFeld
                      ganzzahl
                      wert={schnapsTargetInput}
                      onChange={setSchnapsTargetInput}
                      onKeyDown={e => { if (e.key === 'Enter') applySchnapsTarget(); if (e.key === 'Escape') setEditingSchnapsTarget(false); }}
                      className="w-16 text-center border border-system-orange/45 rounded-lg px-1 py-0.5 text-sm font-bold text-system-orange bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-system-orange"
                      autoFocus
                    />
                    <button onClick={applySchnapsTarget} aria-label="Ziel übernehmen"
                            className="btn-compact w-9 h-9 rounded-lg bg-system-orange text-white inline-flex items-center justify-center">
                      <Icon name="check" size={14} strokeWidth={3} />
                    </button>
                    <button onClick={() => setEditingSchnapsTarget(false)} aria-label="Abbrechen"
                            className="btn-compact w-9 h-9 rounded-lg bg-bg-tertiary text-text-secondary inline-flex items-center justify-center">
                      <Icon name="x" size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSchnapsTargetInput(String(target)); setEditingSchnapsTarget(true); }}
                    className="btn-compact inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-tertiary text-caption1 font-medium text-text-secondary">
                    Ziel {target}
                    <Icon name="edit" size={12} strokeWidth={2.2} />
                  </button>
                )}
              </div>

              {/* Wer wie viel, und wie weit noch — in einem Balken. */}
              <div className="flex h-2.5 rounded-full overflow-hidden bg-bg-tertiary mb-4" aria-hidden="true">
                {SEITEN.map((s) => (
                  <div key={s.key} className={`${s.voll} transition-[width] duration-500`}
                       style={{ width: `${(schnapsShotsData[s.key] / skala) * 100}%` }} />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {SEITEN.map((s) => {
                  const name = managers[s.team].name;
                  const zahl = schnapsShotsData[s.key];
                  return (
                    <div key={s.key} className={`${s.panel} rounded-2xl p-3`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo team={s.team} size="xs" />
                        <span className={`text-footnote font-semibold truncate ${s.text}`}>{name}</span>
                      </div>
                      <div className="flex items-center justify-between my-2">
                        <span key={zahl} className={`zahl-sprung stat-display num-tabular text-[44px] leading-none ${s.text}`}>{zahl}</span>
                        <button onClick={() => undoShot(s.key)} disabled={zahl === 0}
                                aria-label={`Letzten Shot von ${name} zurücknehmen`}
                                className="btn-compact w-10 h-10 rounded-xl bg-bg-elevated text-text-secondary text-xl font-semibold
                                           flex items-center justify-center disabled:opacity-30">
                          −
                        </button>
                      </div>
                      <button onClick={() => addSchnapShot(s.key)} aria-label={`Shot für ${name}`}
                              className={`w-full h-14 rounded-xl text-white text-title3 font-bold active:scale-95 transition-transform ${s.voll}`}>
                        +1
                      </button>
                    </div>
                  );
                })}
              </div>

              <button onClick={addSchnapShotToBoth} className="btn-secondary w-full mt-2.5">Beide +1</button>
            </div>

            {total > 0 && (
              <details className="modern-card group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="karten-titel">Verlauf</span>
                  <span className="inline-flex items-center gap-1.5 text-caption1 text-text-tertiary">
                    {total} {total === 1 ? 'Eintrag' : 'Einträge'}
                    <Icon name="chevronDown" size={15} strokeWidth={2.4} className="transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="space-y-1 max-h-64 overflow-y-auto mt-3">
                  {[...schnapsShotsData.history].reverse().map((entry) => {
                    const s = SEITEN.find((x) => x.key === entry.person);
                    return (
                      <div key={entry._ereignis?.id || entry.timestamp}
                           className={`flex items-center justify-between px-3 py-2 rounded-lg ${s.panel}`}>
                        <span className="flex items-center gap-2 min-w-0">
                          <TeamLogo team={s.team} size="xs" />
                          <span className={`font-medium text-footnote truncate ${s.text}`}>{managers[s.team].name}</span>
                        </span>
                        <span className="text-caption1 text-text-tertiary num-tabular">{uhrzeit(entry.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Alle ${total} Schnäpse im Zähler löschen? Das lässt sich nicht zurücknehmen.`)) resetSchnapsShotsData();
                  }}
                  className="btn-compact mt-3 px-3 py-2 rounded-lg text-footnote font-medium text-system-red bg-system-red/10"
                >
                  Zähler löschen
                </button>
              </details>
            )}
          </>
        );
      })()}

      {/* ─── Sterne ──────────────────────────────────────────────────────── */}
      {activeSection === 'sterne' && (() => {
        const abstand = Math.round((sterneData.philip - sterneData.alex) * 10) / 10;
        const fuehrt = abstand > 0 ? SEITEN[1] : abstand < 0 ? SEITEN[0] : null;
        const gewaehlt = SEITEN.find((s) => s.key === sterneInput.person);
        const starOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

        return (
          <>
            <div className="modern-card">
              <div className="flex items-center gap-2">
                <Icon name="starFilled" size={18} strokeWidth={0} className="text-system-yellow" />
                <span className={`text-callout font-bold ${fuehrt ? fuehrt.text : 'text-text-secondary'}`}>
                  {fuehrt
                    ? `${managers[fuehrt.team].name} führt mit ${dezKurz(Math.abs(abstand))}`
                    : 'Gleichstand'}
                </span>
              </div>
              <Kraefteverhaeltnis
                label="Sterne gesamt"
                aek={sterneData.alex} real={sterneData.philip}
                anzeige={(n) => dezKurz(n)}
                aekName={managers.aek.name} realName={managers.real.name} />

              {/* Eintragen: Wer, wie stark, fertig — ohne zu scrollen. */}
              <div className="mt-2 pt-4 border-t border-border-light">
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  {SEITEN.map((s) => (
                    <button key={s.key}
                      onClick={() => setSterneInput((p) => ({ ...p, person: s.key }))}
                      aria-pressed={sterneInput.person === s.key}
                      className={`py-2.5 rounded-xl font-semibold text-footnote transition-all active:scale-95 border ${
                        sterneInput.person === s.key ? `${s.voll} text-white border-transparent` : `${s.zart} ${s.text}`}`}>
                      {managers[s.team].name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-1.5">
                  <span className="section-label">Stärke des Teams</span>
                  <span className="flex gap-0.5 text-base leading-none" aria-hidden="true">{renderStars(sterneInput.stars, 5)}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {starOptions.map((s) => (
                    <button key={s}
                      onClick={() => setSterneInput((p) => ({ ...p, stars: s }))}
                      aria-pressed={sterneInput.stars === s}
                      className={`btn-compact h-11 rounded-lg text-footnote font-bold num-tabular transition-all active:scale-95 ${
                        sterneInput.stars === s ? 'bg-system-yellow text-black' : 'bg-bg-tertiary text-text-secondary'}`}>
                      {dezKurz(s)}
                    </button>
                  ))}
                </div>

                <button onClick={addSterne}
                  className={`w-full py-3.5 rounded-xl font-bold text-callout text-white active:scale-[0.98] transition-transform ${gewaehlt.voll}`}>
                  +{dezKurz(gutschriftFuer(sterneInput.stars))} für {managers[gewaehlt.team].name}
                </button>
                <p className="text-caption2 text-text-tertiary text-center mt-2">
                  Gutschrift = 6 − Stärke: schwächere Teams bringen mehr.
                </p>
              </div>
            </div>

            {/* Kurve vor der Liste: erst der Verlauf, dann die Einzeleinträge */}
            <SterneVerlauf
              history={sterneData.history}
              namen={{ alex: managers.aek.name, philip: managers.real.name }}
            />

            {sterneData.history.length > 0 && (
              <div className="modern-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="karten-titel">Verlauf</h4>
                  <button onClick={undoLastSterne}
                          className="btn-compact px-2.5 py-1.5 rounded-lg bg-bg-tertiary text-caption1 font-medium text-text-secondary">
                    Letzten zurücknehmen
                  </button>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {[...sterneData.history].reverse().map((entry) => {
                    const s = SEITEN.find((x) => x.key === entry.person);
                    const wer = managers[s.team].name;
                    const g = dezKurz(entry.gained ?? gutschriftFuer(entry.stars));
                    return (
                      <div key={entry._ereignis?.id || entry.timestamp}
                           className={`flex items-center gap-2 px-3 py-2 rounded-lg ${s.panel}`}>
                        <TeamLogo team={s.team} size="xs" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`font-semibold text-footnote truncate ${s.text}`}>{wer}</span>
                            <span className={`text-footnote font-bold num-tabular ${s.text}`}>+{g} ★</span>
                            {entry.stars != null && (
                              <span className="text-caption2 text-text-tertiary whitespace-nowrap">{dezKurz(entry.stars)}★ Team</span>
                            )}
                          </div>
                          {entry.info && <div className="text-caption2 text-text-tertiary truncate">{entry.info}</div>}
                        </div>
                        <span className="text-caption1 text-text-tertiary num-tabular">{uhrzeit(entry.timestamp)}</span>
                        <button
                          onClick={() => { if (window.confirm(`Eintrag löschen? ${wer} verliert ${g} ★.`)) removeSterneEintrag(entry); }}
                          aria-label={`Eintrag von ${wer} löschen`}
                          className="btn-compact w-8 h-8 rounded-full bg-bg-elevated text-system-red flex items-center justify-center flex-shrink-0"
                        >
                          <Icon name="trash" size={14} strokeWidth={2.2} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => { if (window.confirm('Alle Sterne im Zähler löschen? Das lässt sich nicht zurücknehmen.')) alleSterneLoeschen(); }}
                  className="btn-compact mt-3 px-3 py-2 rounded-lg text-footnote font-medium text-system-red bg-system-red/10"
                >
                  Zähler löschen
                </button>
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
                    {/* Ruhige Karte statt vollflaechiger Farbe.
              Hier lag der Text in derselben Farbe wie die Flaeche darunter —
              gemessener Kontrastabstand 0, die Ueberschrift war unsichtbar.
              Bei Gelb unter Orange waren es 55, ebenfalls zu wenig. Jetzt
              traegt das farbige Icon den Akzent, wie ueberall sonst. */}
          <div className="modern-card mb-6">
            <h4 className="karten-titel mb-4 text-system-purple inline-flex items-center gap-2">
              <Icon name="chart" size={17} strokeWidth={2.2} />Übersicht
            </h4>
            
            {/* Drei Zahlen nebeneinander statt drei Kaesten untereinander. */}
            <div className="grid grid-cols-3 gap-2">
              <div className="panel-blue rounded-xl p-3 text-center min-w-0">
                <div className="text-caption1 font-semibold text-system-blue truncate">{managers.aek.name}</div>
                <div className="stat-display num-tabular text-[17px] text-text-primary mt-1">{plusEuro(bjTracking.alexander.balance)}</div>
              </div>
              <div className="panel-gray rounded-xl p-3 text-center min-w-0">
                <div className="text-caption1 font-semibold text-text-secondary truncate">Spiele</div>
                <div className="stat-display num-tabular text-[17px] text-text-primary mt-1">{bjTracking.gameCounter}</div>
              </div>
              <div className="panel-red rounded-xl p-3 text-center min-w-0">
                <div className="text-caption1 font-semibold text-system-red truncate">{managers.real.name}</div>
                <div className="stat-display num-tabular text-[17px] text-text-primary mt-1">{plusEuro(bjTracking.philip.balance)}</div>
              </div>
            </div>
            {bjTracking.currentRound.active && (
              <div className="mt-3">
                <GameProgressBar currentGames={bjTracking.currentRound.games.length} maxGames={10} />
              </div>
            )}
          </div>

          {/* Main Action Buttons */}
          <div className="modern-card mb-6">
            <h4 className="karten-titel mb-4 text-system-orange flex items-center gap-2">
              <Icon name="play" size={17} strokeWidth={2.2} className="inline mr-1.5 -mt-0.5" />Gewinn eintragen
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Alexander Main Buttons */}
              <div className="space-y-3">
                <h5 className="font-medium text-system-blue text-center mb-3 inline-flex items-center justify-center gap-2 w-full"><span className="w-2 h-2 rounded-full bg-system-blue" />{managers.aek.name}</h5>
                
                {/* Main action buttons - Always visible for mobile */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => addToPlayerAccount('alexander', 5.00)}
                    className="btn-soft btn-soft-green px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    Win<br/>+5,00 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 7.50)}
                    className="btn-soft btn-soft-purple px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    Blackjack<br/>+7,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 2.50)}
                    className="btn-soft btn-soft-orange px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    BJ-Push<br/>+2,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('alexander', 10.00)}
                    className="btn-soft btn-soft-red px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
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
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => addToPlayerAccount('philip', 5.00)}
                    className="btn-soft btn-soft-green px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    Win<br/>+5,00 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 7.50)}
                    className="btn-soft btn-soft-purple px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    Blackjack<br/>+7,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 2.50)}
                    className="btn-soft btn-soft-orange px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    BJ-Push<br/>+2,50 €
                  </button>
                  <button
                    onClick={() => addToPlayerAccount('philip', 10.00)}
                    className="btn-soft btn-soft-red px-1 py-3 rounded-xl font-bold text-caption1 whitespace-nowrap min-h-[56px]"
                  >
                    Double<br/>+10,00 €
                  </button>
                </div>

                {/* Collapsible Secondary Buttons - Mobile Optimized */}
                <div className="text-center">
                  <button
                    onClick={() => toggleAdvancedButtons('philip')}
                    className="bg-system-red/15 hover:bg-system-red/25 text-system-red px-4 py-2 rounded-lg text-sm font-medium transition-all border border-system-red/45 min-h-[44px]"
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
                        className="bg-system-red/15 hover:bg-system-red/25 text-system-red px-3 py-3 rounded-md text-sm font-medium transition-all border border-system-red/45 min-h-[44px]"
                      >
                        +{euro(amount)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Amount Input - Always visible */}
                <div className="mt-3 p-2 bg-system-red/10 rounded-lg border border-system-red/25">
                  <h6 className="text-xs font-medium text-system-red mb-1 inline-flex items-center gap-1"><Icon name="euro" size={12} strokeWidth={2.4} />Eigener Betrag:</h6>
                  <div className="flex gap-1">
                    <ZahlFeld
                      wert={customAmounts.philip}
                      onChange={(w) => handleCustomAmountChange('philip', w)}
                      placeholder="0,00"
                      className="flex-1 px-2 py-2 border border-system-red/45 rounded-md text-xs text-center focus:outline-none focus:ring-1 focus:ring-system-red min-h-[36px] max-w-[80px]"
                    />
                    <button
                      onClick={() => addCustomAmount('philip')}
                      disabled={!(zahl(customAmounts.philip) > 0)}
                      className="bg-system-red hover:bg-system-red disabled:bg-border-strong text-white px-2 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] min-w-[36px]"
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
                className="btn-secondary w-full"
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
                  <div key={round.id} className="panel-gray rounded-xl p-4">
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
                          <div className="text-xl font-bold text-system-blue">
                            {plusEuro(round.alexanderTotal)}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-system-red/10 rounded-lg border border-system-red/25">
                        <div className="text-center">
                          <div className="font-bold text-system-red">{managers.real.name}</div>
                          <div className="text-xl font-bold text-system-red">
                            {plusEuro(round.philipTotal)}
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
            <div className="modern-card mb-6">
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

          <div className="modern-card">
            <h4 className="karten-titel mb-1">Insgesamt verdient</h4>
            <Kraefteverhaeltnis
              label="Gesamt-Verdienst"
              aek={bjTracking.alexander.totalEarnings} real={bjTracking.philip.totalEarnings}
              anzeige={euro}
              aekName={managers.aek.name} realName={managers.real.name} />
          </div>
        </>
      )}
    </div>
  );
}