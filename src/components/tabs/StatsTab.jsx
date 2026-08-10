import Icon from '../icons/Icon';
import { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { useAktuelleSaison } from '../../hooks/useAktuelleSaison';
import LoadingSpinner from '../LoadingSpinner';
import HorizontalNavigation from '../HorizontalNavigation';
import MatchDayOverview from '../MatchDayOverview';
import TeamLogo from '../TeamLogo';
import InsightsView from './InsightsView';
import HistorieView from './HistorieView';
import CountUp from '../CountUp';
import { getTeamDisplay } from '../../constants/teams';
import {
  TrendLineChart,
  PlayerBarChart,
  WinDistributionChart,
  GoalTrendAreaChart
} from '../charts';

/**
 * Karte fuer eine herausragende Einzelleistung.
 *
 * Ersetzt drei "mobile-overview-card": die trugen VERSALIEN-Ueberschriften,
 * hover:scale-105 und einen Buchstabenkreis ("A", "R") als Team-Kennung —
 * drei Dinge, die es sonst nirgends in der App gibt, waehrend ueberall sonst
 * das Wappen steht.
 */
function HighlightKarte({ logo, titel, akzent, wert, was, zeilen = [] }) {
  return (
    <div className="modern-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {logo}
        <span className={`text-caption1 font-semibold truncate ${akzent}`}>{titel}</span>
      </div>
      <div className="stat-display text-[26px] num-tabular text-text-primary leading-none">{wert}</div>
      <div className="text-caption1 text-text-secondary mt-1">{was}</div>
      {zeilen.filter(Boolean).map((t, i) => (
        <div key={i} className="text-caption2 text-text-tertiary mt-0.5 truncate">{t}</div>
      ))}
    </div>
  );
}

/**
 * Kennzahl-Kachel im Stil der uebrigen App.
 *
 * Vorher standen hier vier "mobile-metric-card" mit Farbverlauf-Icons — ein
 * Muster, das es NUR in dieser Datei gab, waehrend der Rest der App
 * durchgehend modern-card + stat-display benutzt. Zwei Designsprachen in
 * einer App faellt beim Blaettern sofort auf.
 */
function Kennzahl({ wert, label, zusatz, gross = false }) {
  return (
    <div className="panel-gray rounded-xl p-3 text-center">
      <div className={`stat-display num-tabular text-text-primary truncate ${gross ? 'text-[22px]' : 'text-[17px]'}`}>
        {wert}
      </div>
      <div className="text-caption2 text-text-tertiary mt-0.5">{label}</div>
      {zusatz && <div className="text-caption2 text-text-quaternary mt-0.5 num-tabular">{zusatz}</div>}
    </div>
  );
}

/** Dezimalzahl deutsch: 2,33 statt 2.33. */
const dez = (n, stellen = 2) =>
  Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/**
 * Alte Ansichts-Namen auf die fuenf verbliebenen abbilden.
 * Noetig, weil die zuletzt gewaehlte Ansicht gespeichert wird — ohne die
 * Tabelle staende nach dem Update bei vielen ein Name im Speicher, den es
 * nicht mehr gibt, und die Seite fiele stumm auf die Standardansicht zurueck.
 * Die bisherigen Ansichten sind dabei nicht verschwunden, sondern in die
 * thematisch passende gewandert (siehe renderCurrentView).
 */
const STATS_VIEW_MAP = {
  overview: 'overview',
  dashboard: 'overview',        // war eine zweite, aermere Uebersicht
  teams: 'teams',
  advanced: 'teams',            // Ergebnis-Deutlichkeit gehoert zum Teamvergleich
  players: 'players',
  trends: 'trends',
  visualizations: 'trends',     // Diagramme zum zeitlichen Verlauf
  matchdays: 'trends',          // Spieltage sind auch ein Verlauf
  insights: 'insights',
};

// Enhanced Statistics Calculator Class (ported from vanilla JS)
class StatsCalculator {
  constructor(matches, players, bans, spielerDesSpiels) {
    this.matches = matches || [];
    this.players = players || [];
    this.bans = bans || [];
    this.spielerDesSpiels = spielerDesSpiels || [];
    this.aekPlayers = (players || []).filter(p => p.team === "AEK");
    this.realPlayers = (players || []).filter(p => p.team === "Real");
  }

  calculateTeamRecords() {
    const aekRecord = { wins: 0, losses: 0 };
    const realRecord = { wins: 0, losses: 0 };

    this.matches.forEach(match => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;

      if (aekGoals > realGoals) {
        aekRecord.wins++;
        realRecord.losses++;
      } else if (realGoals > aekGoals) {
        realRecord.wins++;
        aekRecord.losses++;
      }
    });

    return { aek: aekRecord, real: realRecord };
  }

  calculateRecentForm(teamCount = 5) {
    const recentMatches = this.matches.slice(-teamCount);
    const aekForm = [];
    const realForm = [];

    recentMatches.forEach(match => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;

      if (aekGoals > realGoals) {
        aekForm.push('W');
        realForm.push('L');
      } else if (realGoals > aekGoals) {
        aekForm.push('L');
        realForm.push('W');
      } else {
        // Hier stand "FIFA games cannot end in draws" — stimmt fuer diese App
        // nicht, Remis werden sehr wohl erfasst (siehe Duell-Bilanz). Sie
        // fielen dadurch stillschweigend aus der Form heraus: "letzte 5" zeigte
        // die letzten fuenf ENTSCHIEDENEN Spiele, nicht die letzten fuenf.
        aekForm.push('D');
        realForm.push('D');
      }
    });

    return { aek: aekForm, real: realForm };
  }

  calculatePlayerStats() {
    // For SdS calculation, assume all players played all games
    const totalMatches = this.matches.length;
    
    return this.players.map(player => {
      // Count actual matches played for goal calculation
      // Spiele MIT Tor — anders als "Einsaetze" steht das wirklich in den
      // Daten: jedes Spiel fuehrt seine Torschuetzen.
      const trefferSpiele = this.countMatchesWithGoal(player.name, player.team);
      const bestesSpiel = this.bestesEinzelspiel(player.name, player.team);
      const playerBans = this.bans.filter(b => b.player_id === player.id);
      
      const sdsRecord = this.spielerDesSpiels.find(sds => 
        sds.name === player.name && sds.team === player.team
      );
      const sdsCount = sdsRecord ? (sdsRecord.count || 0) : 0;
      
      // Zwei unabhaengige Quellen: die Spalte players.goals und die Summe aus
      // den Torschuetzenlisten. Fuer die importierten Altsaisons gibt es nur
      // die erste (dort wurden nur Gesamtzahlen ueberliefert, keine Spiele),
      // fuer die laufende Saison die zweite. Deshalb das Maximum.
      //
      // Wenn beide auseinanderlaufen, ist das aber kein Rundungsproblem,
      // sondern eine Luecke in den Torschuetzenlisten — und die gehoert
      // sichtbar gemacht. Sonst steht in der Karte "7 Tore, trifft in 2
      // Spielen, bestes Spiel 2 Tore", und das kann nicht alles stimmen.
      const matchGoals = this.countPlayerGoalsFromMatches(player.name, player.team);
      const dbGoals = player.goals || 0;
      const actualGoals = Math.max(dbGoals, matchGoals);
      const ohneZuordnung = Math.max(0, actualGoals - matchGoals);
      
      return {
        ...player,
        goals: actualGoals,
        totalMatches, // Gesamtzahl der Spiele — fuer die SdS-Quote
        sdsCount,
        // In wie vielen Spielen er getroffen hat, und wie oft dann im Schnitt.
        // Beides ist aus den Torschuetzenlisten belegt und braucht keine
        // Annahme darueber, wer aufgestellt war.
        trefferSpiele,
        // Fuer die Rate nur die Tore, die auch einem Spiel zugeordnet sind —
        // sonst teilte man importierte Gesamtzahlen durch erfasste Spiele.
        toreJeTrefferSpiel: trefferSpiele > 0 ? matchGoals / trefferSpiele : null,
        bestesSpiel,
        matchGoals,
        ohneZuordnung,
        totalBans: playerBans.length,
        disciplinaryScore: this.calculateDisciplinaryScore(playerBans),
        // Anteil NUR, wenn er ueberhaupt berechenbar ist. Im Umfang "Alle
        // Saisons" zaehlen Auszeichnungen aus Saisons mit, die gar keine
        // einzelnen Spiele beitragen (die Altsaisons haben Auszeichnungen,
        // aber keine Spielzeilen) — dann steht mehr im Zaehler als im Nenner
        // und es kam "200,0 % der Spiele" heraus. Lieber keine Quote als eine
        // unmoegliche: null heisst "nicht berechenbar", die Anzeige laesst sie
        // dann weg und zeigt die reine Anzahl.
        sdsPercentage: totalMatches > 0 && sdsCount <= totalMatches
          ? ((sdsCount / totalMatches) * 100).toFixed(1)
          : null
      };
    }).sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }

  countPlayerGoalsFromMatches(playerName, playerTeam) {
    let totalGoals = 0;
    
    this.matches.forEach(match => {
      if (playerTeam === 'AEK' && match.goalslista) {
        try {
          const goals = Array.isArray(match.goalslista) ? match.goalslista : 
                       (typeof match.goalslista === 'string' ? JSON.parse(match.goalslista) : []);
          
          goals.forEach(goal => {
            const goalPlayer = typeof goal === 'string' ? goal : goal.player;
            const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
            if (goalPlayer === playerName) totalGoals += goalCount;
          });
        } catch (e) {
          console.warn('Error parsing AEK goals list:', e);
        }
      }
      
      if (playerTeam === 'Real' && match.goalslistb) {
        try {
          const goals = Array.isArray(match.goalslistb) ? match.goalslistb : 
                       (typeof match.goalslistb === 'string' ? JSON.parse(match.goalslistb) : []);
          
          goals.forEach(goal => {
            const goalPlayer = typeof goal === 'string' ? goal : goal.player;
            const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
            if (goalPlayer === playerName) totalGoals += goalCount;
          });
        } catch (e) {
          console.warn('Error parsing Real goals list:', e);
        }
      }
    });
    
    return totalGoals;
  }

  /**
   * Torschuetzenliste eines Spiels fuer ein Team, robust gelesen.
   *
   * Sie kommt je nach Herkunft als Array oder als JSON-Text, und die
   * Eintraege sind mal Objekte, mal blosse Namen.
   */
  torschuetzen(match, team) {
    const roh = team === 'AEK' ? match.goalslista : match.goalslistb;
    if (!roh) return [];
    let liste = roh;
    if (typeof roh === 'string') {
      try { liste = JSON.parse(roh); } catch { return []; }
    }
    if (!Array.isArray(liste)) return [];
    return liste.map((t) => (typeof t === 'string'
      ? { player: t, count: 1 }
      : { player: t.player, count: Number(t.count) || 1 }));
  }

  /**
   * In wie vielen Spielen hat der Spieler getroffen?
   *
   * Hier stand `countPlayerMatches`, das die EINSAETZE zaehlen sollte. Die
   * werden aber nirgends erfasst — ein Spiel speichert Torschuetzen, Karten
   * und den Spieler des Spiels, keine Aufstellung. Die Funktion fiel deshalb
   * auf `teamMatches` zurueck, also auf alle Spiele des Teams; und weil jedes
   * Spiel AEK gegen Real ist, war das fuer JEDEN Spieler dieselbe Zahl.
   *
   * Alles, was darauf aufbaute, war damit wertlos: "Tore je Spiel" teilte
   * jeden Spieler durch dieselbe Konstante, eine Rangfolge danach war also
   * identisch zur Rangfolge nach Toren — nur mit einer kleineren Zahl. Und
   * die Spalte "Spiele" behauptete eine Zahl, die niemand erhoben hat.
   *
   * Diese Zahl hier ist belegt: sie zaehlt nur, was in den Torschuetzenlisten
   * steht.
   */
  countMatchesWithGoal(playerName, playerTeam) {
    if (!playerName || !playerTeam) return 0;
    return this.matches.filter((match) =>
      this.torschuetzen(match, playerTeam).some((t) => t.player === playerName)
    ).length;
  }

  /** Die meisten Tore in einem einzelnen Spiel. */
  bestesEinzelspiel(playerName, playerTeam) {
    if (!playerName || !playerTeam) return 0;
    let best = 0;
    for (const match of this.matches) {
      const tore = this.torschuetzen(match, playerTeam)
        .filter((t) => t.player === playerName)
        .reduce((s, t) => s + t.count, 0);
      if (tore > best) best = tore;
    }
    return best;
  }

  calculateDisciplinaryScore(bans) {
    let score = 0;
    bans.forEach(ban => {
      switch (ban.type) {
        case 'Gelb-Rote Karte': score += 3; break;
        case 'Rote Karte': score += 5; break;
        case 'Verletzung': score += 1; break;
        default: score += 1;
      }
    });
    return score;
  }

  // Add analytics capability
  calculateMatchAnalytics() {
    if (this.matches.length < 3) {
      return {
        prediction: "Ungenügend Daten",
        confidence: 0,
        reasoning: "Mindestens 3 Spiele benötigt für Vorhersage"
      };
    }

    const recentMatches = this.matches.slice(-5); // Last 5 matches
    let aekFormScore = 0;
    let realFormScore = 0;

    recentMatches.forEach((match, index) => {
      const weight = (index + 1) / recentMatches.length; // More recent = higher weight
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;

      if (aekGoals > realGoals) {
        aekFormScore += 3 * weight;
      } else if (realGoals > aekGoals) {
        realFormScore += 3 * weight;
      } else {
        aekFormScore += 1 * weight;
        realFormScore += 1 * weight;
      }

      // Factor in goal difference
      aekFormScore += (aekGoals - realGoals) * 0.1 * weight;
      realFormScore += (realGoals - aekGoals) * 0.1 * weight;
    });

    // Calculate average goals
    const aekAvgGoals = this.matches.reduce((sum, m) => sum + (m.goalsa || 0), 0) / this.matches.length;
    const realAvgGoals = this.matches.reduce((sum, m) => sum + (m.goalsb || 0), 0) / this.matches.length;

    // Factor in current bans (negative impact)
    const activeBans = this.bans.filter(ban => ban.status === 'active' || !ban.status);
    const aekBans = activeBans.filter(ban => ban.team === 'AEK').length;
    const realBans = activeBans.filter(ban => ban.team === 'Real').length;

    aekFormScore -= aekBans * 0.5;
    realFormScore -= realBans * 0.5;

    const totalScore = aekFormScore + realFormScore;
    const aekWinProbability = Math.max(0.1, Math.min(0.9, aekFormScore / totalScore));
    const realWinProbability = Math.max(0.1, Math.min(0.9, realFormScore / totalScore));

    let prediction, confidence;
    if (aekWinProbability > realWinProbability) {
      prediction = `${getTeamDisplay('AEK')} Sieg`;
      confidence = Math.round(aekWinProbability * 100);
    } else {
      prediction = `${getTeamDisplay('Real')} Sieg`;
      confidence = Math.round(realWinProbability * 100);
    }

    const predictedScore = `${Math.round(aekAvgGoals)}:${Math.round(realAvgGoals)}`;

    return {
      prediction,
      confidence,
      predictedScore,
      aekWinProbability: Math.round(aekWinProbability * 100),
      realWinProbability: Math.round(realWinProbability * 100),
      reasoning: this.generateAnalyticsReasoning(aekFormScore, realFormScore, aekBans, realBans)
    };
  }

  generateAnalyticsReasoning(aekForm, realForm, aekBans, realBans) {
    const reasons = [];
    
    if (aekForm > realForm) {
      reasons.push(`${getTeamDisplay('AEK')} zeigt bessere Form in den letzten Spielen`);
    } else if (realForm > aekForm) {
      reasons.push(`${getTeamDisplay('Real')} zeigt bessere Form in den letzten Spielen`);
    }

    if (aekBans > realBans) {
      reasons.push(`${getTeamDisplay('AEK')} hat mehr gesperrte Spieler (${aekBans} vs ${realBans})`);
    } else if (realBans > aekBans) {
      reasons.push(`${getTeamDisplay('Real')} hat mehr gesperrte Spieler (${realBans} vs ${aekBans})`);
    }

    return reasons.join('. ') || "Ausgeglichene Teams";
  }

  getMatchStatsAnalytics() {
    const totalMatches = this.matches.length;
    if (totalMatches === 0) return null;

    const aekWins = this.matches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
    const realWins = this.matches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;
    const draws = this.matches.filter(m => (m.goalsa || 0) === (m.goalsb || 0)).length;

    const totalGoals = this.matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
    const avgGoalsPerMatch = (totalGoals / totalMatches).toFixed(2);

    const lastMatch = this.matches[this.matches.length - 1];
    const lastMatchResult = lastMatch ? 
        `${lastMatch.goalsa || 0}:${lastMatch.goalsb || 0} (${lastMatch.date})` : 
        'Keine Spiele';

    return {
      totalMatches,
      aekWins,
      realWins,
      draws,
      avgGoalsPerMatch,
      lastMatchResult,
      aekWinPercentage: Math.round((aekWins / totalMatches) * 100),
      realWinPercentage: Math.round((realWins / totalMatches) * 100),
      drawPercentage: Math.round((draws / totalMatches) * 100)
    };
  }

  calculateAdvancedStats() {
    const totalMatches = this.matches.length;
    const totalGoals = this.matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
    
    // Goal-related statistics
    const aekTotalGoals = this.matches.reduce((sum, m) => sum + (m.goalsa || 0), 0);
    const realTotalGoals = this.matches.reduce((sum, m) => sum + (m.goalsb || 0), 0);
    const highScoringGames = this.matches.filter(m => (m.goalsa || 0) + (m.goalsb || 0) >= 5).length;
    
    // Win margins and streaks
    const winMargins = this.matches.map(m => Math.abs((m.goalsa || 0) - (m.goalsb || 0))).filter(diff => diff > 0);
    const biggestWinMargin = winMargins.length > 0 ? Math.max(...winMargins) : 0;
    
    // Calculate current winning/losing streaks
    const recentMatches = [...this.matches].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    let currentStreak = { type: 'none', count: 0, team: '' };
    
    if (recentMatches.length > 0) {
      const lastMatch = recentMatches[0];
      const aekGoals = lastMatch.goalsa || 0;
      const realGoals = lastMatch.goalsb || 0;
      
      if (aekGoals > realGoals) {
        currentStreak.type = 'win';
        currentStreak.team = 'AEK';
      } else if (realGoals > aekGoals) {
        currentStreak.type = 'win';
        currentStreak.team = 'Real';
      }
      
      // Count streak length
      for (const match of recentMatches) {
        const aekG = match.goalsa || 0;
        const realG = match.goalsb || 0;
        
        if (currentStreak.type === 'win' && currentStreak.team === 'AEK' && aekG > realG) {
          currentStreak.count++;
        } else if (currentStreak.type === 'win' && currentStreak.team === 'Real' && realG > aekG) {
          currentStreak.count++;
        } else {
          break;
        }
      }
    }
    
    // Goal time analysis (if available in match data) - placeholder for future enhancement
    // const goalsByHalf = {
    //   firstHalf: 0,
    //   secondHalf: 0
    // };
    
    // Enhanced scoring patterns
    const scoringPatterns = {
      bothTeamsScore: this.matches.filter(m => (m.goalsa || 0) > 0 && (m.goalsb || 0) > 0).length,
      oneNilWins: this.matches.filter(m => 
        ((m.goalsa === 1 && m.goalsb === 0) || (m.goalsa === 0 && m.goalsb === 1))
      ).length,
      highScoringWins: this.matches.filter(m => 
        Math.max(m.goalsa || 0, m.goalsb || 0) >= 4
      ).length
    };
    
    // Home/Away analysis (if team data indicates home/away)
    const homeAwayStats = {
      aekHome: this.matches.filter(m => m.teama === 'AEK').length,
      aekAway: this.matches.filter(m => m.teamb === 'AEK').length,
      aekHomeWins: this.matches.filter(m => m.teama === 'AEK' && (m.goalsa || 0) > (m.goalsb || 0)).length,
      aekAwayWins: this.matches.filter(m => m.teamb === 'AEK' && (m.goalsb || 0) > (m.goalsa || 0)).length
    };
    
    // Torreichstes Spiel — wurde in der Anzeige zweimal abgefragt, aber nie
    // berechnet und stand deshalb als leere Stelle da.
    const highestScoringMatch = this.matches.reduce(
      (max, m) => Math.max(max, (m.goalsa || 0) + (m.goalsb || 0)), 0);

    // Der frühere "topScorer" las match.goalscorers — ein Feld, das es in
    // dieser Datenbank nicht gibt (Torschützen liegen als JSON in goalslista
    // und goalslistb). Er lieferte deshalb immer "N/A (0)", direkt neben der
    // funktionierenden Torschützenliste. Ersatzlos raus: getPlayerStats()
    // beantwortet dieselbe Frage korrekt.

    return {
      // Basic stats
      avgGoalsPerMatch: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0.00',
      totalMatches,
      totalGoals,
      aekTotalGoals,
      realTotalGoals,
      
      // Enhanced stats
      highScoringGames,
      biggestWinMargin,
      currentStreak,
      
      // Clean sheets and defensive stats
      cleanSheets: {
        aek: this.matches.filter(m => m.goalsb === 0).length,
        real: this.matches.filter(m => m.goalsa === 0).length
      },
      
      // Scoring patterns
      scoringPatterns,
      
      // Home/Away performance
      homeAwayStats,
      
      highestScoringMatch,

      // Goal efficiency
      goalEfficiency: {
        aekAvg: totalMatches > 0 ? (aekTotalGoals / totalMatches).toFixed(2) : '0.00',
        realAvg: totalMatches > 0 ? (realTotalGoals / totalMatches).toFixed(2) : '0.00'
      },
      
      // Match competitiveness
      competitiveness: {
        closeGames: this.matches.filter(m => Math.abs((m.goalsa || 0) - (m.goalsb || 0)) <= 1).length,
        blowouts: this.matches.filter(m => Math.abs((m.goalsa || 0) - (m.goalsb || 0)) >= 3).length
      }
    };
  }

  calculatePerformanceTrends() {
    const monthlyStats = {};
    
    this.matches.forEach(match => {
      const date = new Date(match.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          aekWins: 0,
          realWins: 0,
          totalGoals: 0,
          matchCount: 0
        };
      }
      
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;
      
      monthlyStats[monthKey].totalGoals += aekGoals + realGoals;
      monthlyStats[monthKey].matchCount++;
      
      if (aekGoals > realGoals) monthlyStats[monthKey].aekWins++;
      else if (realGoals > aekGoals) monthlyStats[monthKey].realWins++;
    });

    return monthlyStats;
  }

  // Head-to-head statistics with biggest wins for each team
  calculateHeadToHead() {
    const h2h = {
      totalMatches: this.matches.length,
      aekWins: 0,
      realWins: 0,
      aekGoals: 0,
      realGoals: 0,
      biggestAekWin: { diff: 0, score: '', date: '', opponent: getTeamDisplay('Real') },
      biggestRealWin: { diff: 0, score: '', date: '', opponent: getTeamDisplay('AEK') }
    };

    this.matches.forEach(match => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;
      const diff = Math.abs(aekGoals - realGoals);

      h2h.aekGoals += aekGoals;
      h2h.realGoals += realGoals;

      if (aekGoals > realGoals) {
        h2h.aekWins++;
        if (diff > h2h.biggestAekWin.diff) {
          h2h.biggestAekWin = {
            diff,
            score: `${aekGoals}:${realGoals}`,
            date: match.date || '',
            opponent: getTeamDisplay('Real')
          };
        }
      } else if (realGoals > aekGoals) {
        h2h.realWins++;
        if (diff > h2h.biggestRealWin.diff) {
          h2h.biggestRealWin = {
            diff,
            score: `${realGoals}:${aekGoals}`,
            date: match.date || '',
            opponent: getTeamDisplay('AEK')
          };
        }
      }
    });

    return h2h;
  }
}

export default function StatsTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [selectedView, setSelectedView] = useState(() => {
    try { return STATS_VIEW_MAP[localStorage.getItem('fusta_stats_view')] || 'overview'; }
    catch { return 'overview'; }
  });
  const [timePeriod, setTimePeriod] = useState(() => { try { return localStorage.getItem('fusta_stats_period') || 'all'; } catch { return 'all'; } });
  useEffect(() => { try { localStorage.setItem('fusta_stats_view', selectedView); } catch { /* ignore */ } }, [selectedView]);
  useEffect(() => { try { localStorage.setItem('fusta_stats_period', timePeriod); } catch { /* ignore */ } }, [timePeriod]);
  
  const aktuelleSaison = useAktuelleSaison();

  // Saison-Umfang: nur die gewaehlte Saison oder alle zusammen. Der Schalter
  // wirkt ueber skipFifaFilter direkt auf die Abfragen — useSupabaseQuery haengt
  // an JSON.stringify(options) und laedt deshalb von selbst neu.
  const [umfang, setUmfang] = useState(() => {
    try { return localStorage.getItem('fusta_stats_umfang') || 'saison'; } catch { return 'saison'; }
  });
  useEffect(() => { try { localStorage.setItem('fusta_stats_umfang', umfang); } catch { /* ignore */ } }, [umfang]);
  const abfrageOptionen = useMemo(
    () => (umfang === 'alle' ? { skipFifaFilter: true } : {}),
    [umfang]
  );

  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*', abfrageOptionen);
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*', abfrageOptionen);
  const { data: sdsData, loading: sdsLoading } = useSupabaseQuery('spieler_des_spiels', '*', abfrageOptionen);
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*', abfrageOptionen);

  // Welche Saisons stecken gerade in den Zahlen? Ohne das steht bei "Alle
  // Saisons" eine Summe ohne Herkunft.
  const enthalteneSaisons = useMemo(() => {
    const s = new Set();
    for (const m of matches || []) s.add(m.fifa_version || 'FC25');
    for (const p of players || []) s.add(p.fifa_version || 'FC25');
    return [...s].sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
  }, [matches, players]);
  
  const loading = matchesLoading || playersLoading || sdsLoading || bansLoading;

  // Filter matches based on time period
  const getFilteredMatches = () => {
    if (!matches || timePeriod === 'all') return matches || [];
    
    const now = new Date();
    let cutoffDate;
    
    switch (timePeriod) {
      case '1week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      default:
        return matches;
    }
    
    return matches.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate >= cutoffDate;
    });
  };

  const filteredMatches = getFilteredMatches();

  // Initialize statistics calculator with filtered matches
  const stats = new StatsCalculator(filteredMatches, players, bans, sdsData);
  
  // Calculate all statistics
  const teamRecords = stats.calculateTeamRecords();
  const recentForm = stats.calculateRecentForm(5);
  const playerStats = stats.calculatePlayerStats();
  const advancedStats = stats.calculateAdvancedStats();
  // const performanceTrends = stats.calculatePerformanceTrends(); // Currently unused
  const headToHead = stats.calculateHeadToHead();

  // Basic data calculations using filtered matches
  const totalMatches = filteredMatches?.length || 0;
  const aekPlayers = players?.filter(p => p.team === 'AEK') || [];
  const realPlayers = players?.filter(p => p.team === 'Real') || [];

  // Calculate wins per team 
  const aekWins = teamRecords.aek.wins;
  const realWins = teamRecords.real.wins;


  // Fuenf Ansichten statt neun. Die alten "Dashboard", "Erweitert",
  // "Visualisierungen" und "Spieltage" waren keine eigenen Themen, sondern
  // weitere Karten zu Themen, die es schon gab — sie stehen jetzt dort, wo sie
  // hingehoeren (siehe renderCurrentView und STATS_VIEW_MAP).
  const views = [
    { id: 'overview', label: 'Übersicht', iconName: 'chart' },
    { id: 'teams', label: 'Teams', iconName: 'trophy' },
    { id: 'players', label: 'Spieler', iconName: 'users' },
    { id: 'trends', label: 'Verlauf', iconName: 'trendingUp' },
    { id: 'insights', label: 'Einblicke', iconName: 'bulb' },
    // Alles, was ueber EINE Saison hinausgeht — ewige Bilanz, Sperren
    // ueber die Jahre, Steckbrief je Saison. Der Saisonfilter oben
    // gilt hier bewusst nicht.
    { id: 'historie', label: 'Historie', iconName: 'clock' },
  ];

  if (loading) {
    return <LoadingSpinner message="Lade Statistiken..." />;
  }

  // Calculate longest winning streaks for both teams
  const calculateWinningStreaks = () => {
    if (!filteredMatches || filteredMatches.length === 0) {
      return {
        aek: { streak: 0, startDate: null, endDate: null },
        real: { streak: 0, startDate: null, endDate: null }
      };
    }

    const streaks = {
      aek: { longest: 0, current: 0, start: null, end: null, currentStart: null },
      real: { longest: 0, current: 0, start: null, end: null, currentStart: null }
    };

    // Sort matches by date to analyze chronologically
    const sortedMatches = [...filteredMatches].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedMatches.forEach((match) => {
      const aekGoals = match.goalsa || 0;
      const realGoals = match.goalsb || 0;
      const matchDate = match.date;

      if (aekGoals > realGoals) {
        // AEK wins
        streaks.aek.current++;
        if (streaks.aek.current === 1) {
          streaks.aek.currentStart = matchDate;
        }
        
        if (streaks.aek.current > streaks.aek.longest) {
          streaks.aek.longest = streaks.aek.current;
          streaks.aek.start = streaks.aek.currentStart;
          streaks.aek.end = matchDate;
        }
        
        // Reset Real streak
        streaks.real.current = 0;
        streaks.real.currentStart = null;
      } else if (realGoals > aekGoals) {
        // Real wins
        streaks.real.current++;
        if (streaks.real.current === 1) {
          streaks.real.currentStart = matchDate;
        }
        
        if (streaks.real.current > streaks.real.longest) {
          streaks.real.longest = streaks.real.current;
          streaks.real.start = streaks.real.currentStart;
          streaks.real.end = matchDate;
        }
        
        // Reset AEK streak
        streaks.aek.current = 0;
        streaks.aek.currentStart = null;
      } else {
        // Draw (shouldn't happen in FIFA but just in case)
        streaks.aek.current = 0;
        streaks.real.current = 0;
        streaks.aek.currentStart = null;
        streaks.real.currentStart = null;
      }
    });

    return {
      aek: {
        streak: streaks.aek.longest,
        startDate: streaks.aek.start,
        endDate: streaks.aek.end
      },
      real: {
        streak: streaks.real.longest,
        startDate: streaks.real.start,
        endDate: streaks.real.end
      }
    };
  };

  const winningStreaks = calculateWinningStreaks();

  // Current streak: how many consecutive wins the most recent winner is on
  const getCurrentStreak = () => {
    if (!filteredMatches || filteredMatches.length === 0) return { team: null, count: 0 };
    const sorted = [...filteredMatches].sort((a, b) => new Date(a.date) - new Date(b.date));
    let team = null, count = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const a = sorted[i].goalsa || 0, b = sorted[i].goalsb || 0;
      const winner = a > b ? 'AEK' : (b > a ? 'Real' : null);
      if (winner === null) break;
      if (team === null) { team = winner; count = 1; }
      else if (winner === team) count++;
      else break;
    }
    return { team, count };
  };

  // Compact form pills (last N results, oldest → newest)
  const renderFormPills = (form) => (
    <div className="flex items-center gap-1">
      {form.length === 0 ? (
        <span className="text-xs text-text-tertiary">—</span>
      ) : form.map((r, i) => (
        // 10px waren auf dem Handy kaum zu lesen — jetzt 12px in einer
        // groesseren Plakette. Unentschieden fehlte bisher ganz und wurde
        // faelschlich als Niederlage eingefaerbt.
        <span
          key={i}
          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
            r === 'W' ? 'bg-system-green/20 text-system-green'
              : r === 'D' ? 'bg-bg-tertiary text-text-secondary'
              : 'bg-system-red/20 text-system-red'
          }`}
        >
          {r === 'W' ? 'S' : r === 'D' ? 'U' : 'N'}
        </span>
      ))}
    </div>
  );

  // Head-to-head season banner for the dashboard
  const renderH2HBanner = () => {
    const h2h = headToHead;
    const total = h2h.totalMatches || 0;
    const current = getCurrentStreak();
    const decided = h2h.aekWins + h2h.realWins;
    const aekPct = decided > 0 ? Math.round((h2h.aekWins / decided) * 100) : 50;
    const realPct = 100 - aekPct;

    if (total === 0) {
      return (
        <div className="modern-card mb-2 text-center py-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
            <Icon name="scale" size={28} strokeWidth={1.6} />
          </div>
          <h4 className="font-medium text-text-primary mb-1">Noch kein direkter Vergleich</h4>
          <p className="text-sm text-text-muted">Sobald Spiele erfasst sind, erscheint hier die Saison-Bilanz.</p>
        </div>
      );
    }

    return (
      <div className="modern-card mb-2 p-0 overflow-hidden">
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <h3 className="font-semibold text-text-primary inline-flex items-center gap-2">
            <Icon name="scale" size={18} strokeWidth={2.2} className="text-system-purple" />
            Direkter Vergleich
          </h3>
          <span className="text-xs text-text-tertiary">{total} {total === 1 ? 'Spiel' : 'Spiele'}</span>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-1.5 w-24 min-w-0">
              <TeamLogo team="aek" size="lg" />
              <span className="text-xs font-semibold text-system-blue text-center truncate w-full">{getTeamDisplay('AEK')}</span>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="stat-display text-[38px] flex items-baseline justify-center gap-2">
                <CountUp value={h2h.aekWins} className="text-system-blue" />
                <span className="text-[22px] font-semibold text-text-quaternary">:</span>
                <CountUp value={h2h.realWins} className="text-system-red" />
              </div>
              <div className="text-caption2 text-text-tertiary mt-1.5">Siege</div>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-24 min-w-0">
              <TeamLogo team="real" size="lg" />
              <span className="text-xs font-semibold text-system-red text-center truncate w-full">{getTeamDisplay('Real')}</span>
            </div>
          </div>

          {/* Win share bar */}
          <div className="mt-4 h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
            <div className="bg-system-blue h-full transition-all" style={{ width: `${aekPct}%` }} />
            <div className="bg-system-red h-full transition-all" style={{ width: `${realPct}%` }} />
          </div>
          <div className="flex justify-between items-center text-caption2 text-text-tertiary mt-1">
            <span className="text-system-blue font-semibold num-tabular">{aekPct}%</span>
            <span className="num-tabular">Tore {h2h.aekGoals} : {h2h.realGoals}</span>
            <span className="text-system-red font-semibold num-tabular">{realPct}%</span>
          </div>

          {/* Current streak highlight */}
          {current.count >= 2 && current.team && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-system-orange/10 text-system-orange py-2 text-footnote font-semibold">
              <Icon name="zap" size={15} strokeWidth={2.4} />
              <span className="text-text-secondary">{getTeamDisplay(current.team)} – {current.count} Siege in Folge</span>
            </div>
          )}

          {/* Recent form */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-bg-tertiary rounded-xl p-3">
              <div className="text-[11px] text-text-tertiary mb-1.5">Form {getTeamDisplay('AEK')}</div>
              {renderFormPills(recentForm.aek)}
            </div>
            <div className="bg-bg-tertiary rounded-xl p-3">
              <div className="text-[11px] text-text-tertiary mb-1.5">Form {getTeamDisplay('Real')}</div>
              {renderFormPills(recentForm.real)}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderOverview = () => {
    // Calculate enhanced statistics for the selected time period
    const topScorer = playerStats.length > 0 ? playerStats[0] : null;
    const topSdSPlayer = playerStats
      .filter(p => p.sdsCount > 0)
      .sort((a, b) => b.sdsCount - a.sdsCount)[0];
    
    // Calculate player with most goals in a single match
    const mostGoalsInMatch = filteredMatches?.reduce((max, match) => {
      const processGoalsList = (goalsList) => {
        if (!goalsList) return [];
        try {
          return typeof goalsList === 'string' ? JSON.parse(goalsList) : goalsList;
        } catch {
          return [];
        }
      };
      
      const aekGoals = processGoalsList(match.goalslista);
      const realGoals = processGoalsList(match.goalslistb);
      
      [...aekGoals, ...realGoals].forEach(goal => {
        const player = typeof goal === 'object' ? goal.player : goal;
        const count = typeof goal === 'object' ? goal.count : 1;
        if (count > max.count) {
          max = { player, count, match };
        }
      });
      
      return max;
    }, { player: null, count: 0, match: null });

    return (
      <div className="space-y-6 mobile-card-list">
        {/* Vier Kennzahlen in einem Raster — dieselbe Kachel wie in
            Bierboerse und Marktwerten. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kennzahl gross wert={totalMatches} label="Spiele gespielt" />
          <Kennzahl
            gross
            wert={advancedStats.totalGoals}
            label="Tore insgesamt"
            zusatz={`⌀ ${dez(totalMatches > 0 ? advancedStats.totalGoals / totalMatches : 0)} je Spiel`}
          />
          <Kennzahl
            wert={topScorer ? topScorer.name.split(' ').slice(-1)[0] : '–'}
            label={`Topscorer · ${topScorer ? topScorer.goals : 0} Tore`}
            zusatz={topScorer && topScorer.trefferSpiele > 0
              ? `in ${topScorer.trefferSpiele} ${topScorer.trefferSpiele === 1 ? 'Spiel' : 'Spielen'} getroffen` : null}
          />
          <Kennzahl
            wert={topSdSPlayer ? topSdSPlayer.name.split(' ').slice(-1)[0] : '–'}
            label={`Spieler des Spiels · ${topSdSPlayer ? topSdSPlayer.sdsCount : 0}×`}
            zusatz={topSdSPlayer && topSdSPlayer.sdsPercentage != null
              ? `${dez(topSdSPlayer.sdsPercentage, 1)} % der Spiele` : null}
          />
        </div>

        {/* Drei Einzelleistungen — dieselbe Karte, dreimal befuellt. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <HighlightKarte
            logo={<TeamLogo team="aek" size="xs" />}
            titel={getTeamDisplay('AEK')}
            akzent="text-system-blue"
            wert={headToHead.biggestAekWin.diff > 0 ? headToHead.biggestAekWin.score : '–'}
            was="Größter Sieg"
            zeilen={headToHead.biggestAekWin.diff > 0 ? [
              `gegen ${headToHead.biggestAekWin.opponent}`,
              new Date(headToHead.biggestAekWin.date).toLocaleDateString('de-DE'),
            ] : []}
          />
          <HighlightKarte
            logo={<TeamLogo team="real" size="xs" />}
            titel={getTeamDisplay('Real')}
            akzent="text-system-red"
            wert={headToHead.biggestRealWin.diff > 0 ? headToHead.biggestRealWin.score : '–'}
            was="Größter Sieg"
            zeilen={headToHead.biggestRealWin.diff > 0 ? [
              `gegen ${headToHead.biggestRealWin.opponent}`,
              new Date(headToHead.biggestRealWin.date).toLocaleDateString('de-DE'),
            ] : []}
          />
          <HighlightKarte
            logo={<Icon name="trophy" size={16} strokeWidth={2.2} className="text-system-purple" />}
            titel="Beste Einzelleistung"
            akzent="text-system-purple"
            wert={mostGoalsInMatch?.player ? mostGoalsInMatch.player.split(' ').slice(-1)[0] : '–'}
            was={`Meiste Tore in einem Spiel: ${mostGoalsInMatch?.count || 0}`}
            zeilen={[mostGoalsInMatch?.date
              ? new Date(mostGoalsInMatch.date).toLocaleDateString('de-DE') : null]}
          />
        </div>

        {/* Enhanced Additional Statistics Section */}
        {/* Hier stand ein Block "Erweiterte Statistiken" mit ⌀ Sperrenlänge,
            aktiven Torschützen und Gesamt-Sperren. Die letzten beiden zeigt die
            Spieler-Ansicht ohnehin, die ⌀ Sperrenlänge steht jetzt dort
            daneben — sie gehört inhaltlich zu den Sperren. Die Überschrift kam
            zudem in der Teams-Ansicht ein zweites Mal vor. */}

        {/* Longest Winning Streaks */}
        <div className="modern-card">
          <h3 className="text-title3 mb-4 inline-flex items-center gap-2">
            <Icon name="zap" size={18} strokeWidth={2.2} className="text-system-orange" />
            Längste Siegesserien
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'aek', team: 'AEK', accent: 'text-system-blue', data: winningStreaks.aek },
              { key: 'real', team: 'Real', accent: 'text-system-red', data: winningStreaks.real },
            ].map((side) => (
              <div key={side.key} className="bg-bg-tertiary rounded-xl p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <TeamLogo team={side.key} size="sm" />
                  <span className="text-footnote font-semibold text-text-secondary truncate">
                    {getTeamDisplay(side.team)}
                  </span>
                </div>
                <div className={`stat-display text-[26px] ${side.accent}`}>
                  {side.data.streak}
                  <span className="text-footnote font-semibold text-text-tertiary ml-1.5">
                    {side.data.streak === 1 ? 'Sieg' : 'Siege'}
                  </span>
                </div>
                {side.data.startDate && side.data.endDate ? (
                  <div className="text-caption2 text-text-tertiary num-tabular mt-1.5">
                    {new Date(side.data.startDate).toLocaleDateString('de-DE')}
                    {' – '}
                    {new Date(side.data.endDate).toLocaleDateString('de-DE')}
                  </div>
                ) : (
                  <div className="text-caption2 text-text-tertiary mt-1.5">
                    {side.data.streak === 0 ? 'Keine Serie im Zeitraum' : 'Kein Datumsbereich verfügbar'}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Other Interesting Statistics */}
        <div className="modern-card">
          <h3 className="text-title3 mb-4 inline-flex items-center gap-2"><Icon name="bulb" size={18} strokeWidth={2.2} className="text-system-yellow" />Besondere Statistiken</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(() => {
              // Wer am haeufigsten getroffen hat — gezaehlt in Spielen mit
              // Tor, nicht in Einsaetzen: die stehen nirgends.
              let bestRatio = 0;
              let bestPlayer = 'Keine Daten';
              playerStats.forEach((player) => {
                if (player.trefferSpiele > bestRatio) {
                  bestRatio = player.trefferSpiele; bestPlayer = player.name;
                }
              });

              // Team balance (how close the teams are in wins)
              const aekWins = teamRecords.aek.wins;
              const realWins = teamRecords.real.wins;
              const balance = (aekWins + realWins) === 0
                ? 100
                : (Math.min(aekWins, realWins) / Math.max(aekWins, realWins)) * 100;

              return (
                <>
                  <div className="bg-bg-tertiary rounded-xl p-4">
                    <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
                      <Icon name="star" size={15} strokeWidth={2.2} className="text-system-orange" />
                      Effizientester Spieler
                    </div>
                    <div className="text-title3 font-bold text-text-primary truncate">{bestPlayer}</div>
                    <div className="text-caption2 text-text-tertiary num-tabular mt-0.5">
                      {bestRatio > 0 ? `${dez(bestRatio)} Tore/Spiel` : 'Keine Daten'}
                    </div>
                  </div>

                  <div className="bg-bg-tertiary rounded-xl p-4">
                    <div className="flex items-center gap-2 text-footnote font-medium text-text-muted mb-1">
                      <Icon name="scale" size={15} strokeWidth={2.2} className="text-system-blue" />
                      Team-Balance
                    </div>
                    <div className="stat-display text-title3 text-system-blue">{balance.toFixed(0)}%</div>
                    <div className="text-caption2 text-text-tertiary num-tabular mt-0.5">
                      Ausgeglichenheit ({aekWins}:{realWins})
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

      {/* Team-Bilanz, Torschuetzenliste und SdS-Liste standen hier ein
          zweites Mal: Siege/Niederlagen/Zu Null wiederholen den
          Team-Vergleich, die Form steht schon im Banner ganz oben, und die
          beiden Ranglisten sind der Inhalt der Ansicht "Spieler". Eine
          Uebersicht, die alles noch einmal zeigt, ist keine Uebersicht. */}
    </div>
  );
};

  const renderPlayers = () => (
    <div className="modern-card">
      <h3 className="font-bold text-lg mb-4 inline-flex items-center gap-2"><Icon name="chart" size={18} strokeWidth={2.2} />Spielerstatistiken</h3>
      
      {/* Statistics Summary */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-system-green">
            {playerStats.filter(p => p.goals > 0).length}
          </div>
          <div className="text-sm text-text-secondary">Aktive Torschützen</div>
        </div>
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-system-blue">
            {playerStats.reduce((sum, p) => sum + p.goals, 0)}
          </div>
          {/* Bewusst anders benannt als "Tore insgesamt" in der Uebersicht:
              dort zaehlen die Spieltore, hier die Summe der Spielerkonten.
              Beides geht auseinander, sobald Eigentore im Spiel sind — die
              haengen an keinem Spieler. Gleicher Name fuer zwei Zahlen war
              die Vorlage fuer Missverstaendnisse. */}
          <div className="text-sm text-text-secondary">Tore der Spieler</div>
        </div>
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-system-orange">
            {playerStats.filter(p => p.sdsCount > 0).length}
          </div>
          <div className="text-sm text-text-secondary">SdS Träger</div>
        </div>
        {/* Anzahl und Laenge zusammen in EINER Kachel: als fuenfte Kachel
            blieb in der zweispaltigen Handy-Ansicht eine halbe Zeile uebrig,
            und beide Zahlen beschreiben ohnehin dieselbe Sache. */}
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-system-red num-tabular">
            {playerStats.reduce((sum, p) => sum + p.totalBans, 0)}
          </div>
          <div className="text-sm text-text-secondary">Sperren</div>
          <div className="text-caption2 text-text-tertiary num-tabular">
            ⌀ {(() => {
              const spiele = bans?.reduce((s, b) => s + (b.totalgames || 0), 0) || 0;
              return bans?.length ? (spiele / bans.length).toFixed(1).replace('.', ',') : '0,0';
            })()} Spiele
          </div>
        </div>
      </div>

      {/* Hier stand eine Tabelle mit neun Spalten. Auf dem Handy war sie
          565 px breit in einem 343 px schmalen Fenster — man musste fuer jede
          Zahl seitlich scrollen, und die Kopfzeile war dabei weg. Jetzt eine
          Karte je Spieler: die vier Kennzahlen, die man wirklich vergleicht, in
          einer Reihe; SdS und Sperren nur, wenn es sie gibt. Auf breiten
          Schirmen stehen zwei Karten nebeneinander. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {playerStats.map((player, i) => (
          <div key={player.id} className="bg-bg-secondary rounded-xl p-3">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-caption2 text-text-tertiary num-tabular w-5 flex-shrink-0">{i + 1}.</span>
              <span className="font-semibold text-text-primary truncate min-w-0 flex-1">{player.name}</span>
              <span className={`chip chip-sm flex-shrink-0 ${
                player.team === 'AEK' ? 'chip-blue'
                  : player.team === 'Ehemalige' ? 'chip-gray'
                  : 'chip-red'
              }`}>
                {getTeamDisplay(player.team)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                // "⌀/Spiel" und "Spiele" standen hier und waren beide
                // erfunden — siehe countMatchesWithGoal. Ersetzt durch zwei
                // Zahlen, die in den Spielen wirklich stehen.
                ['Tore', player.goals],
                ['Trifft in', player.trefferSpiele],
                ['Bestes Spiel', player.bestesSpiel],
                // Einheit ins Label: "18,3 Mio €" braucht 75px, die Kachel
                // hat auf 375px deren 67 — der Betrag war abgeschnitten.
                ['Wert (Mio €)', dez(player.value, 1)],
              ].map(([label, wert]) => (
                <div key={label} className="min-w-0">
                  <div className="stat-display text-[15px] text-text-primary truncate">{wert}</div>
                  <div className="text-caption2 text-text-tertiary truncate">{label}</div>
                </div>
              ))}
            </div>

            {(player.sdsCount > 0 || player.totalBans > 0 || player.ohneZuordnung > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border-light">
                {player.ohneZuordnung > 0 && (
                  <span className="chip chip-sm chip-gray"
                        title="Tore aus der Spielerspalte, die in keiner Torschützenliste stehen — meist aus importierten Altsaisons.">
                    {player.ohneZuordnung} ohne Spiel
                  </span>
                )}
                {player.sdsCount > 0 && (
                  <span className="chip chip-sm chip-yellow">
                    {player.sdsCount}× SdS{player.sdsPercentage != null ? ` · ${dez(player.sdsPercentage, 1)} %` : ''}
                  </span>
                )}
                {player.totalBans > 0 && (
                  <span className={`chip chip-sm ${player.totalBans <= 2 ? 'chip-orange' : 'chip-red'}`}>
                    {player.totalBans} {player.totalBans === 1 ? 'Sperre' : 'Sperren'}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Player Insights */}
      {/* Zwei Karten, nicht drei: hier stand zusaetzlich "Bestes
          Einzelspiel" — dieselbe Zahl, die die Uebersicht schon als "Beste
          Einzelleistung" zeigt. (Davor stand dort "Effizienz-Spitze", die
          durch einen erfundenen Nenner geteilt hat.) */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-system-yellow/10 rounded-lg border border-system-yellow/20">
          <h4 className="font-semibold text-system-orange mb-2 inline-flex items-center gap-2"><Icon name="star" size={16} strokeWidth={2.2} />SdS-König</h4>
          {(() => {
            // Nach ANZAHL sortieren, nicht nach Quote: die Quote ist nicht in
            // jedem Umfang berechenbar, und parseFloat(null) haette die
            // Sortierung still auf NaN laufen lassen.
            const mostSds = playerStats
              .filter(p => p.sdsCount > 0)
              .sort((a, b) => b.sdsCount - a.sdsCount)[0];
            
            return mostSds ? (
              <div>
                <div className="font-medium text-system-orange">{mostSds.name}</div>
                <div className="text-sm text-system-orange">
                  {mostSds.sdsCount}× Spieler des Spiels
                  {mostSds.sdsPercentage != null ? ` · ${dez(mostSds.sdsPercentage, 1)} % der Spiele` : ''}
                </div>
              </div>
            ) : (
              <div className="text-text-tertiary">Noch keine SdS vergeben</div>
            );
          })()}
        </div>

        <div className="p-4 bg-system-red/10 rounded-lg border border-system-red/20">
          <h4 className="font-semibold text-system-red mb-2 inline-flex items-center gap-2"><Icon name="ban" size={16} strokeWidth={2.2} />Disziplin-Problem</h4>
          {(() => {
            const mostBans = playerStats
              .filter(p => p.totalBans > 0)
              .sort((a, b) => b.totalBans - a.totalBans)[0];
            
            return mostBans ? (
              <div>
                <div className="font-medium text-system-red">{mostBans.name}</div>
                <div className="text-sm text-system-red">
                  {mostBans.totalBans} Sperren (Score: {mostBans.disciplinaryScore})
                </div>
              </div>
            ) : (
              <div className="text-text-tertiary">Keine Sperren verzeichnet</div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const renderTeams = () => (
    <div className="space-y-6">
      {/* Team Comparison */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4 inline-flex items-center gap-2"><Icon name="scale" size={18} strokeWidth={2.2} />Team-Vergleich</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-system-blue">{getTeamDisplay('AEK')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Aktive Spieler:</span>
                <span className="font-medium text-text-primary">{aekPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Siege:</span>
                <span className="font-medium text-text-primary">{aekWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Niederlagen:</span>
                <span className="font-medium text-text-primary">{teamRecords.aek.losses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Zu Null Spiele:</span>
                <span className="font-medium text-text-primary">{advancedStats.cleanSheets.aek}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-system-red">{getTeamDisplay('Real')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Aktive Spieler:</span>
                <span className="font-medium text-text-primary">{realPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Siege:</span>
                <span className="font-medium text-text-primary">{realWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Niederlagen:</span>
                <span className="font-medium text-text-primary">{teamRecords.real.losses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Zu Null Spiele:</span>
                <span className="font-medium text-text-primary">{advancedStats.cleanSheets.real}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Team Stats */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4 inline-flex items-center gap-2"><Icon name="trendingUp" size={18} strokeWidth={2.2} />Torausbeute &amp; Serien</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-primary-green">{advancedStats.highScoringGames}</div>
            <div className="text-sm text-text-muted">Torspektakel</div>
            <div className="text-xs text-text-muted mt-1">Spiele mit 5+ Toren</div>
          </div>
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-accent-orange">{advancedStats.biggestWinMargin}</div>
            <div className="text-sm text-text-muted">Höchste Tordifferenz</div>
            <div className="text-xs text-text-muted mt-1">über alle Spiele</div>
          </div>
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-accent-blue">
              {dez(advancedStats.avgGoalsPerMatch)}
            </div>
            <div className="text-sm text-text-muted">⌀ Tore pro Spiel</div>
            <div className="text-xs text-text-muted mt-1">Durchschnittswert</div>
          </div>
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-system-purple">
              {advancedStats.currentStreak.count > 0 ? 
                `${advancedStats.currentStreak.count}` : '0'}
            </div>
            <div className="text-sm text-text-muted">Siegesserie</div>
            <div className="text-xs text-text-muted mt-1">
              {advancedStats.currentStreak.count > 0 ? 
                getTeamDisplay(advancedStats.currentStreak.team) : 'Keine aktuelle Serie'}
            </div>
          </div>
        </div>

        {/* New Enhanced Statistics Section */}
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {/* "Heim und Auswaerts" entfernt: in dieser App steht AEK immer
              als teama, also waren "Heimspiele" schlicht ALLE Spiele und
              "Heimstaerke" nur die Siegquote unter falschem Namen. Eine
              Zahl, die etwas anderes behauptet als sie misst, ist schlechter
              als keine. */}

          <div className="space-y-3">
            <h4 className="font-semibold text-system-green inline-flex items-center gap-2"><Icon name="football" size={16} strokeWidth={2.2} />Wie die Spiele ausgehen</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Beide Teams treffen:</span>
                <span className="font-medium text-text-primary">{advancedStats.scoringPatterns.bothTeamsScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">1:0 Siege:</span>
                <span className="font-medium text-text-primary">{advancedStats.scoringPatterns.oneNilWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">4+ Tore Siege:</span>
                <span className="font-medium text-text-primary">{advancedStats.scoringPatterns.highScoringWins}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-system-purple inline-flex items-center gap-2"><Icon name="target" size={16} strokeWidth={2.2} />Wie eng es zugeht</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Enge Spiele (≤1 Tor):</span>
                <span className="font-medium text-text-primary">{advancedStats.competitiveness.closeGames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Deutliche Siege (≥3 Tore):</span>
                <span className="font-medium text-text-primary">{advancedStats.competitiveness.blowouts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{getTeamDisplay('AEK')} Tor-Schnitt:</span>
                <span className="font-medium text-text-primary">{dez(advancedStats.goalEfficiency.aekAvg)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{getTeamDisplay('Real')} Tor-Schnitt:</span>
                <span className="font-medium text-text-primary">{dez(advancedStats.goalEfficiency.realAvg)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* "Offensive Highlights" und "Team-Balance" entfernt: torreichstes
            Team und aktivster Torschuetze stehen schon im Banner bzw. in der
            Ansicht "Spieler", der Kader-Unterschied ergibt sich aus "Aktive
            Spieler" zwei Karten weiter oben, "Marktwert-Verhaeltnis: Real
            fuehrt" sagt weniger als die Marktwert-Ansicht, und "Dominanteres
            Team" wiederholt den Siegestand. */}
      </div>

      {/* Hier stand ein zweiter "Direkter Vergleich": Siege, Quoten und
          Tore je Spiel — dieselben vier Zahlen, die die Uebersicht schon
          ganz oben zeigt, nur anders angeordnet. Wer die Teams-Ansicht
          oeffnet, kommt an der Uebersicht ohnehin vorbei. */}
      
      {/* New Advanced Analytics */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4"><Icon name="search" size={17} strokeWidth={2.2} className="inline mr-2 -mt-0.5" />Detailanalyse</h3>
        <div className="mb-4 text-sm text-text-muted">
          Erweiterte Metriken für eine tiefgreifende Team-Analyse.
        </div>
        <div className="grid md:grid-cols-2 gap-6">          
          <div className="space-y-3">
            <h4 className="font-semibold text-system-red"><Icon name="dice" size={15} strokeWidth={2.2} className="inline mr-1.5 -mt-0.5" />Spielstatistiken</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Spiele gespielt:</span>
                <span className="font-medium text-text-primary">{totalMatches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Längste Serie:</span>
                <span className="font-medium text-text-primary">
                  {aekWins >= realWins ? 'AEK' : 'Real'} ({Math.max(aekWins, realWins)} Siege)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Torreichstes Spiel:</span>
                <span className="font-medium text-text-primary">{advancedStats.highestScoringMatch} Tore</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-system-purple"><Icon name="trophy" size={15} strokeWidth={2.2} className="inline mr-1.5 -mt-0.5" />Leistungswerte</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Aktive Spieler:</span>
                <span className="font-medium text-text-primary">{aekPlayers.length + realPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Torschützen:</span>
                <span className="font-medium text-text-primary">
                  {playerStats.filter(p => p.goals > 0).length} Spieler
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Erfolgsquote AEK:</span>
                <span className="font-medium text-text-primary">
                  {totalMatches > 0 ? `${((aekWins / totalMatches) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Erfolgsquote Real:</span>
                <span className="font-medium text-text-primary">
                  {totalMatches > 0 ? `${((realWins / totalMatches) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrends = () => {
    // Enhanced trends calculation with better organization
    const calculateEnhancedTrends = () => {
      if (!filteredMatches || filteredMatches.length === 0) return [];
      
      const monthlyStats = {};
      
      filteredMatches.forEach(match => {
        const date = new Date(match.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            month: monthName,
            key: monthKey,
            aekWins: 0,
            realWins: 0,
            aekGoals: 0,
            realGoals: 0,
            matchCount: 0,
            matches: []
          };
        }
        
        const aekGoals = match.goalsa || 0;
        const realGoals = match.goalsb || 0;
        
        monthlyStats[monthKey].aekGoals += aekGoals;
        monthlyStats[monthKey].realGoals += realGoals;
        monthlyStats[monthKey].matchCount++;
        monthlyStats[monthKey].matches.push(match);
        
        if (aekGoals > realGoals) {
          monthlyStats[monthKey].aekWins++;
        } else if (realGoals > aekGoals) {
          monthlyStats[monthKey].realWins++;
        }
      });
      
      return Object.values(monthlyStats).sort((a, b) => b.key.localeCompare(a.key));
    };

    const enhancedTrends = calculateEnhancedTrends();

    if (enhancedTrends.length === 0) {
      return (
        <div className="text-center py-8 text-text-muted">
          <div className="mb-2 text-system-blue"><Icon name="trendingUp" size={30} strokeWidth={1.8} /></div>
          <p>Keine Spiele für Trends-Analyse im gewählten Zeitraum</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Trends Overview Header */}
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="trendingUp" size={20} strokeWidth={2.2} />
            <div>
              <h3 className="text-lg font-bold text-text-primary">Performance-Trends</h3>
              <p className="text-sm text-text-muted">Monatliche Entwicklung der Teams</p>
            </div>
          </div>
          
          {/* Overall Trend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-system-blue/10 rounded-lg">
              <div className="text-xl font-bold text-system-blue">
                {enhancedTrends.reduce((sum, trend) => sum + trend.aekWins, 0)}
              </div>
              <div className="text-sm text-system-blue">{getTeamDisplay('AEK')} Siege gesamt</div>
            </div>
            <div className="text-center p-4 bg-system-red/10 rounded-lg">
              <div className="text-xl font-bold text-system-red">
                {enhancedTrends.reduce((sum, trend) => sum + trend.realWins, 0)}
              </div>
              <div className="text-sm text-system-red">{getTeamDisplay('Real')} Siege gesamt</div>
            </div>
            <div className="text-center p-4 bg-system-green/10 rounded-lg">
              <div className="text-xl font-bold text-system-green">
                {enhancedTrends.reduce((sum, trend) => sum + trend.matchCount, 0)}
              </div>
              <div className="text-sm text-system-green">Spiele gesamt</div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-4">
          {enhancedTrends.map((trend, index) => {
            const totalGoals = trend.aekGoals + trend.realGoals;
            const aekWinRate = trend.matchCount > 0 ? (trend.aekWins / trend.matchCount * 100).toFixed(0) : 0;
            const realWinRate = trend.matchCount > 0 ? (trend.realWins / trend.matchCount * 100).toFixed(0) : 0;
            const avgGoalsPerMatch = trend.matchCount > 0 ? totalGoals / trend.matchCount : 0;
            
            return (
              <div key={trend.key} className="modern-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-info rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary">{trend.month}</h4>
                      <p className="text-sm text-text-muted">{trend.matchCount} Spiele gespielt</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-text-primary">⌀ {dez(avgGoalsPerMatch)}</div>
                    <div className="text-xs text-text-muted">Tore/Spiel</div>
                  </div>
                </div>

                {/* Team Performance Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-system-blue/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-system-blue">{getTeamDisplay('AEK')}</span>
                      <span className="text-sm text-system-blue">{aekWinRate}% Siege</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Siege:</span>
                        <span className="font-medium text-text-primary">{trend.aekWins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Tore:</span>
                        <span className="font-medium text-text-primary">{trend.aekGoals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">⌀ Tore/Spiel:</span>
                        <span className="font-medium text-text-primary">
                          {dez(trend.matchCount > 0 ? trend.aekGoals / trend.matchCount : 0, 1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-system-red/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-system-red">{getTeamDisplay('Real')}</span>
                      <span className="text-sm text-system-red">{realWinRate}% Siege</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Siege:</span>
                        <span className="font-medium text-text-primary">{trend.realWins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Tore:</span>
                        <span className="font-medium text-text-primary">{trend.realGoals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">⌀ Tore/Spiel:</span>
                        <span className="font-medium text-text-primary">
                          {dez(trend.matchCount > 0 ? trend.realGoals / trend.matchCount : 0, 1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span className="text-text-secondary">{getTeamDisplay('AEK')} Dominanz</span>
                    <span className="text-text-secondary">{getTeamDisplay('Real')} Dominanz</span>
                  </div>
                  <div className="w-full bg-bg-tertiary rounded-full h-3 overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-system-blue" 
                        style={{ width: `${aekWinRate}%` }}
                      ></div>
                      <div 
                        className="bg-system-red" 
                        style={{ width: `${realWinRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Month Highlights */}
                {trend.matchCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-light">
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      {/* "Bestes Team" und "Intensitaet: Hoch/Mittel/Niedrig"
                          standen hier. Das erste wiederholte die Siegzahlen
                          zwei Zeilen darueber, das zweite war der
                          Tordurchschnitt mit fest verdrahteten Schwellen als
                          Etikett — bei drei Spielen im Monat sagt beides
                          nichts. */}
                      <span className="text-text-secondary">{totalGoals} Tore insgesamt</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    );
  };

  const renderAdvancedStats = () => {
    // Calculate advanced performance metrics
    const calculateAdvancedMetrics = () => {
      if (!filteredMatches || filteredMatches.length === 0) return null;

      // Goal timing analysis
      const goalTimingAnalysis = {
        firstHalfGoals: 0,
        secondHalfGoals: 0,
        overtimeGoals: 0
      };

      // Score margin analysis
      const scoreMargins = {
        oneGoal: 0,
        twoGoals: 0,
        threeOrMore: 0,
        blowouts: 0 // 5+ goal difference
      };

      // Wie durchschlagend ein Torschuetze ist, wenn er trifft: Tore geteilt
      // durch die Spiele MIT Tor. Vorher stand hier "Tore je Spiel" mit den
      // nicht erfassten Einsaetzen im Nenner.
      const playerEfficiency = playerStats
        .filter((p) => (p.trefferSpiele || 0) > 0)
        .map(player => ({
          name: player.name,
          team: player.team,
          goals: player.goals || 0,
          trefferSpiele: player.trefferSpiele || 0,
          jeTrefferSpiel: player.toreJeTrefferSpiel || 0,
          value: player.value || 0,
          valuePerGoal: player.goals > 0 ? (player.value || 0) / player.goals : null
        }))
        .sort((a, b) => b.jeTrefferSpiel - a.jeTrefferSpiel || b.goals - a.goals)
        .slice(0, 10);

      // Recent form analysis (last 10 matches)
      const recentMatches = filteredMatches.slice(-10);
      const recentForm = {
        aekWins: 0,
        realWins: 0,
        aekGoals: 0,
        realGoals: 0,
        totalMatches: recentMatches.length
      };

      filteredMatches.forEach(match => {
        const aekGoals = match.goalsa || 0;
        const realGoals = match.goalsb || 0;
        const difference = Math.abs(aekGoals - realGoals);

        // Score margin analysis
        if (difference === 1) scoreMargins.oneGoal++;
        else if (difference === 2) scoreMargins.twoGoals++;
        else if (difference >= 3 && difference < 5) scoreMargins.threeOrMore++;
        else if (difference >= 5) scoreMargins.blowouts++;
      });

      recentMatches.forEach(match => {
        const aekGoals = match.goalsa || 0;
        const realGoals = match.goalsb || 0;
        
        recentForm.aekGoals += aekGoals;
        recentForm.realGoals += realGoals;
        
        if (aekGoals > realGoals) recentForm.aekWins++;
        else if (realGoals > aekGoals) recentForm.realWins++;
      });

      return {
        goalTimingAnalysis,
        scoreMargins,
        playerEfficiency,
        recentForm
      };
    };

    const metrics = calculateAdvancedMetrics();

    if (!metrics) {
      return (
        <div className="text-center py-8 text-text-muted">
          <div className="mb-2 text-system-blue"><Icon name="chart" size={30} strokeWidth={1.8} /></div>
          <p>Keine Daten für den gewählten Zeitraum verfügbar</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Score Margin Analysis */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icon name="target" size={18} strokeWidth={2.2} />
            Spielintensität & Tordifferenzen
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-system-green/10 rounded-lg">
              <div className="text-xl font-bold text-system-green">{metrics.scoreMargins.oneGoal}</div>
              <div className="text-xs text-text-secondary">1-Tor-Spiele</div>
              <div className="text-xs text-text-muted">Spannend</div>
            </div>
            <div className="text-center p-3 bg-system-blue/10 rounded-lg">
              <div className="text-xl font-bold text-system-blue">{metrics.scoreMargins.twoGoals}</div>
              <div className="text-xs text-text-secondary">2-Tor-Spiele</div>
              <div className="text-xs text-text-muted">Umkämpft</div>
            </div>
            <div className="text-center p-3 bg-system-yellow/10 rounded-lg">
              <div className="text-xl font-bold text-system-orange">{metrics.scoreMargins.threeOrMore}</div>
              <div className="text-xs text-text-secondary">3-4 Tore Diff.</div>
              <div className="text-xs text-text-muted">Deutlich</div>
            </div>
            <div className="text-center p-3 bg-system-red/10 rounded-lg">
              <div className="text-xl font-bold text-system-red">{metrics.scoreMargins.blowouts}</div>
              <div className="text-xs text-text-secondary">5+ Tore Diff.</div>
              <div className="text-xs text-text-muted">Dominant</div>
            </div>
          </div>
        </div>

        {/* Wenn sie treffen, wie oft dann */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Icon name="zap" size={18} strokeWidth={2.2} />
            Wenn sie treffen, dann richtig
          </h3>
          <p className="text-caption2 text-text-tertiary mb-4">
            Tore geteilt durch die Spiele, in denen sie getroffen haben.
          </p>
          
          <div className="space-y-3">
            {metrics.playerEfficiency.slice(0, 8).map((player, index) => (
              <div key={player.name} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-system-orange text-white' :
                    index === 1 ? 'bg-text-tertiary text-white' :
                    index === 2 ? 'bg-system-orange text-white' :
                    'bg-bg-tertiary text-text-primary'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{player.name}</div>
                    <div className="text-xs text-text-muted">{getTeamDisplay(player.team)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-text-primary num-tabular">{dez(player.jeTrefferSpiel)}</div>
                  <div className="text-xs text-text-muted">
                    Tore je Trefferspiel · {player.goals} in {player.trefferSpiele}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Form Analysis */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icon name="zap" size={18} strokeWidth={2.2} />
            Aktuelle Form (Letzte {metrics.recentForm.totalMatches} Spiele)
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-system-blue/10 rounded-lg">
              <div className="text-2xl font-bold text-system-blue">{metrics.recentForm.aekWins}</div>
              <div className="text-sm text-text-secondary mb-2">{getTeamDisplay('AEK')} Siege</div>
              <div className="text-xs text-text-muted">{metrics.recentForm.aekGoals} Tore geschossen</div>
            </div>
            <div className="text-center p-4 bg-system-red/10 rounded-lg">
              <div className="text-2xl font-bold text-system-red">{metrics.recentForm.realWins}</div>
              <div className="text-sm text-text-secondary mb-2">{getTeamDisplay('Real')} Siege</div>
              <div className="text-xs text-text-muted">{metrics.recentForm.realGoals} Tore geschossen</div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Siegesquote AEK:</span>
              <span className="font-medium text-text-primary">
                {metrics.recentForm.totalMatches > 0 ? 
                  `${((metrics.recentForm.aekWins / metrics.recentForm.totalMatches) * 100).toFixed(0)}%` : 
                  '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Siegesquote Real:</span>
              <span className="font-medium text-text-primary">
                {metrics.recentForm.totalMatches > 0 ? 
                  `${((metrics.recentForm.realWins / metrics.recentForm.totalMatches) * 100).toFixed(0)}%` : 
                  '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Durchschnitt Tore/Spiel:</span>
              <span className="font-medium text-text-primary">
                {metrics.recentForm.totalMatches > 0 ? 
                  dez((metrics.recentForm.aekGoals + metrics.recentForm.realGoals) / metrics.recentForm.totalMatches, 1) : 
                  '0.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Value for Money Analysis */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icon name="euro" size={18} strokeWidth={2.2} />
            Preis-Leistungs-Verhältnis
          </h3>
          
          <div className="space-y-3">
            {metrics.playerEfficiency
              .filter(p => p.value > 0 && p.goals > 0)
              .filter(p => p.valuePerGoal != null)
              .sort((a, b) => a.valuePerGoal - b.valuePerGoal)
              .slice(0, 5)
              .map((player, index) => (
                <div key={player.name} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-system-green/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-system-green">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{player.name}</div>
                      <div className="text-xs text-text-muted">{getTeamDisplay(player.team)} • {player.goals} Tore</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-system-green num-tabular">{dez(player.valuePerGoal)} Mio €</div>
                    <div className="text-xs text-text-muted">pro Tor</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // D3.js Interactive Visualizations View
  const renderVisualizations = () => {
    // Prepare data for monthly trends line chart
    const monthlyTrendsData = (() => {
      if (!filteredMatches || filteredMatches.length === 0) return [];
      
      const monthlyStats = {};
      
      filteredMatches.forEach(match => {
        const date = new Date(match.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            label: monthName,
            key: monthKey,
            aek: 0,
            real: 0
          };
        }
        
        const aekGoals = match.goalsa || 0;
        const realGoals = match.goalsb || 0;
        
        monthlyStats[monthKey].aek += aekGoals;
        monthlyStats[monthKey].real += realGoals;
      });
      
      return Object.values(monthlyStats).sort((a, b) => a.key.localeCompare(b.key));
    })();

    // Prepare data for player bar chart (top 10 scorers)
    const topScorersData = playerStats
      .slice(0, 10)
      .map(player => ({
        name: player.name,
        value: player.goals || 0,
        team: player.team,
        trefferSpiele: player.trefferSpiele
      }));

    // Prepare data for win distribution donut chart
    const winDistributionData = [
      { label: `${getTeamDisplay('AEK')} Siege`, value: aekWins },
      { label: `${getTeamDisplay('Real')} Siege`, value: realWins }
    ];

    // Prepare data for goal trends area chart (last 12 periods)
    const goalTrendsData = monthlyTrendsData.slice(-12);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Icon name="trendingUp" size={24} strokeWidth={2} />
            <div>
              <h3 className="text-xl font-bold text-text-primary">Interaktive Visualisierungen</h3>
              <p className="text-sm text-text-secondary">
                Dynamische D3.js-Charts für detaillierte Datenanalyse
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-system-blue/10 rounded-lg">
            <p className="text-sm text-text-secondary">
              Alle Visualisierungen sind animiert und interaktiv.
            </p>
          </div>
        </div>

        {/* Win Distribution & Top Scorers Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WinDistributionChart 
            data={winDistributionData}
            title="Siegesverteilung"
            height={350}
          />
          <PlayerBarChart 
            data={topScorersData}
            title="Top 10 Torschützen"
            height={350}
          />
        </div>

        {/* Goal Trends Area Chart */}
        {goalTrendsData.length > 0 && (
          <GoalTrendAreaChart 
            data={goalTrendsData}
            title="Tor-Entwicklung (Letzte 12 Monate)"
            height={320}
          />
        )}

        {/* Monthly Performance Line Chart */}
        {monthlyTrendsData.length > 0 && (
          <TrendLineChart 
            data={monthlyTrendsData}
            title="Monatliche Leistungsentwicklung"
            height={320}
          />
        )}

        {/* Die drei Kennzahlen, die hier standen (⌀ Tore/Spiel, aktive
            Torschuetzen, gespielte Spiele), stehen in derselben Ansicht schon
            weiter oben in den Trends — sie waren nur noch eine zweite Anzeige
            derselben Werte. */}

        {/* Performance Info */}
        <div className="modern-card p-6">
          <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-text-secondary">ℹ️</span>
            Über die Visualisierungen
          </h4>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              • <strong>Liniendiagramm:</strong> Zeigt die monatliche Entwicklung der Toranzahl beider Teams
            </p>
            <p>
              • <strong>Balkendiagramm:</strong> Vergleicht die Top-Torschützen mit farblicher Team-Zuordnung
            </p>
            <p>
              • <strong>Donut-Diagramm:</strong> Visualisiert die Verteilung der Siege zwischen den Teams
            </p>
            <p>
              • <strong>Flächendiagramm:</strong> Stellt Tor-Trends über die Zeit mit Verlaufsdarstellung dar
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (selectedView) {
      case 'insights':
        return <InsightsView matches={filteredMatches} players={players} bans={bans} />;
      case 'historie':
        return <HistorieView />;
      case 'players':
        return renderPlayers();
      case 'teams':
        // Teamvergleich + wie deutlich die Ergebnisse ausfallen (frueher "Erweitert")
        return <div className="space-y-6">{renderTeams()}{renderAdvancedStats()}</div>;
      case 'trends':
        // Alles Zeitliche an einem Ort: Entwicklung, Diagramme, Spieltage
        return (
          <div className="space-y-6">
            {renderTrends()}
            {renderVisualizations()}
            <MatchDayOverview matches={matches} />
          </div>
        );
      default:
        return <div className="space-y-6">{renderH2HBanner()}{renderOverview()}</div>;
    }
  };

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">

      {/* Umfang + Zeitraum. Beide dezent, beide in einer Zeile — sie
          beantworten dieselbe Frage: "worueber rechnen wir hier eigentlich?" */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex bg-bg-tertiary rounded-xl p-0.5">
          {[
            { id: 'saison', label: aktuelleSaison },
            { id: 'alle', label: 'Alle Saisons' },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setUmfang(o.id)}
              className={`px-3 h-8 rounded-[0.6rem] text-footnote font-semibold transition-all
                ${umfang === o.id
                  ? 'bg-bg-elevated text-text-primary shadow-ios-sm'
                  : 'text-text-secondary hover:text-text-primary'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 bg-bg-tertiary rounded-xl pl-3 pr-2 h-9 text-text-secondary">
          <Icon name="calendar" size={16} strokeWidth={2.2} />
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="bg-transparent text-sm font-medium text-text-primary focus:outline-none pr-1"
          >
            <option value="all">Alle Spiele</option>
            <option value="1week">Letzte Woche</option>
            <option value="1month">Letzter Monat</option>
            <option value="3months">Letzte 3 Monate</option>
            <option value="6months">Letzte 6 Monate</option>
          </select>
        </div>
      </div>

      {umfang === 'alle' && enthalteneSaisons.length > 1 && (
        <p className="-mt-2 mb-4 text-caption2 text-text-tertiary">
          Enthält {enthalteneSaisons.join(' · ')}. Altsaisons haben keine
          einzelnen Spiele — dort zählen nur Tore, Sperren und Auszeichnungen mit.
        </p>
      )}

      {/* Enhanced View Navigation with iOS 26 Design - Horizontal Layout */}
      {/* Horizontal Navigation */}
      <HorizontalNavigation
        views={views}
        selectedView={selectedView}
        onViewChange={setSelectedView}
      />

      {/* Enhanced Content with Animation */}
      <div className="form-container animate-mobile-slide-in">
        {renderCurrentView()}
      </div>
    </div>
  );
}