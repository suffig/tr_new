import { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import EnhancedDashboard from '../EnhancedDashboard';
import HorizontalNavigation from '../HorizontalNavigation';
import MatchDayOverview from '../MatchDayOverview';
import QuickStatsWidget from '../QuickStatsWidget';

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
      }
      // Note: FIFA games cannot end in draws, so no draw handling needed
    });

    return { aek: aekForm, real: realForm };
  }

  calculatePlayerStats() {
    // For SdS calculation, assume all players played all games
    const totalMatches = this.matches.length;
    
    return this.players.map(player => {
      // Count actual matches played for goal calculation
      const actualMatchesPlayed = this.countPlayerMatches(player.name, player.team);
      const playerBans = this.bans.filter(b => b.player_id === player.id);
      
      const sdsRecord = this.spielerDesSpiels.find(sds => 
        sds.name === player.name && sds.team === player.team
      );
      const sdsCount = sdsRecord ? (sdsRecord.count || 0) : 0;
      
      // Use database goals as primary source, but also calculate from matches for verification
      const matchGoals = this.countPlayerGoalsFromMatches(player.name, player.team);
      const dbGoals = player.goals || 0;
      
      // Use the higher value or database value if available
      const actualGoals = Math.max(dbGoals, matchGoals);
      
      return {
        ...player,
        goals: actualGoals,
        matchesPlayed: actualMatchesPlayed, // Actual matches for goal calculations
        totalMatches: totalMatches, // Total matches for SdS calculations
        sdsCount,
        goalsPerGame: actualMatchesPlayed > 0 ? (actualGoals / actualMatchesPlayed).toFixed(2) : '0.00',
        totalBans: playerBans.length,
        disciplinaryScore: this.calculateDisciplinaryScore(playerBans),
        // Add efficiency metrics - SdS percentage based on total matches
        goalsPerMatchWhenPlaying: actualMatchesPlayed > 0 ? (actualGoals / actualMatchesPlayed) : 0,
        sdsPercentage: totalMatches > 0 ? ((sdsCount / totalMatches) * 100).toFixed(1) : '0.0'
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

  countPlayerMatches(playerName, playerTeam) {
    if (!playerName || !playerTeam) return this.matches.length;
    
    let matchesWithGoals = 0;
    let matchesAsSds = 0;
    
    // Count matches where player scored
    this.matches.forEach(match => {
      if (playerTeam === 'AEK' && match.goalslista) {
        try {
          const goals = Array.isArray(match.goalslista) ? match.goalslista : 
                       (typeof match.goalslista === 'string' ? JSON.parse(match.goalslista) : []);
          
          const playerScored = goals.some(goal => {
            const goalPlayer = typeof goal === 'string' ? goal : goal.player;
            return goalPlayer === playerName;
          });
          
          if (playerScored) matchesWithGoals++;
        } catch (e) {
          // Handle parsing errors gracefully
        }
      }
      
      if (playerTeam === 'Real' && match.goalslistb) {
        try {
          const goals = Array.isArray(match.goalslistb) ? match.goalslistb : 
                       (typeof match.goalslistb === 'string' ? JSON.parse(match.goalslistb) : []);
          
          const playerScored = goals.some(goal => {
            const goalPlayer = typeof goal === 'string' ? goal : goal.player;
            return goalPlayer === playerName;
          });
          
          if (playerScored) matchesWithGoals++;
        } catch (e) {
          // Handle parsing errors gracefully
        }
      }
      
      // Count matches where player was man of the match
      if (match.manofthematch === playerName) {
        matchesAsSds++;
      }
    });
    
    // Estimate matches played: assume player played in all team matches unless we have better data
    // This is a simplified approach - in reality you'd track participation per match
    const teamMatches = this.matches.filter(match => 
      (playerTeam === 'AEK' && (match.teama === 'AEK' || match.teamb === 'AEK')) ||
      (playerTeam === 'Real' && (match.teama === 'Real' || match.teamb === 'Real'))
    ).length;
    
    // Return the maximum of: matches with goals, matches as SdS, or estimated team matches
    return Math.max(matchesWithGoals, matchesAsSds, teamMatches);
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
      prediction = "AEK Sieg";
      confidence = Math.round(aekWinProbability * 100);
    } else {
      prediction = "Real Sieg";
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
      reasons.push("AEK zeigt bessere Form in den letzten Spielen");
    } else if (realForm > aekForm) {
      reasons.push("Real zeigt bessere Form in den letzten Spielen");
    }

    if (aekBans > realBans) {
      reasons.push(`AEK hat mehr gesperrte Spieler (${aekBans} vs ${realBans})`);
    } else if (realBans > aekBans) {
      reasons.push(`Real hat mehr gesperrte Spieler (${realBans} vs ${aekBans})`);
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
    
    // Most productive player analysis
    const playerGoalCounts = {};
    this.matches.forEach(match => {
      if (match.goalscorers && typeof match.goalscorers === 'string') {
        const scorers = match.goalscorers.split(',').map(s => s.trim()).filter(s => s);
        scorers.forEach(scorer => {
          playerGoalCounts[scorer] = (playerGoalCounts[scorer] || 0) + 1;
        });
      }
    });
    
    const topScorer = Object.entries(playerGoalCounts).reduce((top, [player, goals]) => 
      goals > (top.goals || 0) ? { player, goals } : top, { player: 'N/A', goals: 0 });
    
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
      
      // Top scorer
      topScorer,
      
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
      biggestAekWin: { diff: 0, score: '', date: '', opponent: 'Real Madrid' },
      biggestRealWin: { diff: 0, score: '', date: '', opponent: 'AEK Athen' }
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
            opponent: 'Real Madrid'
          };
        }
      } else if (realGoals > aekGoals) {
        h2h.realWins++;
        if (diff > h2h.biggestRealWin.diff) {
          h2h.biggestRealWin = {
            diff,
            score: `${realGoals}:${aekGoals}`,
            date: match.date || '',
            opponent: 'AEK Athen'
          };
        }
      }
    });

    return h2h;
  }
}

export default function StatsTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [selectedView, setSelectedView] = useState('dashboard');
  const [timePeriod, setTimePeriod] = useState('all'); // New time period filter
  
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: sdsData, loading: sdsLoading } = useSupabaseQuery('spieler_des_spiels', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');
  
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
  const performanceTrends = stats.calculatePerformanceTrends();
  const headToHead = stats.calculateHeadToHead();

  // Basic data calculations using filtered matches
  const totalMatches = filteredMatches?.length || 0;
  const aekPlayers = players?.filter(p => p.team === 'AEK') || [];
  const realPlayers = players?.filter(p => p.team === 'Real') || [];

  // Calculate wins per team 
  const aekWins = teamRecords.aek.wins;
  const realWins = teamRecords.real.wins;

  const formatForm = (form) => {
    return form.map((result, index) => (
      <span
        key={index}
        className={`inline-block w-6 h-6 text-xs font-bold rounded-full text-center leading-6 mx-0.5 ${
          result === 'W' ? 'bg-green-500 text-white' :
          'bg-red-500 text-white'
        }`}
      >
        {result}
      </span>
    ));
  };

  const formatPlayerValue = (value) => {
    // Helper function for consistent player value formatting
    // Values are stored as millions in database  
    return `${(value || 0).toFixed(1)}M €`;
  };

  const views = [
    { id: 'dashboard', label: 'Dashboard', icon: '🎯' },
    { id: 'overview', label: 'Übersicht', icon: '📊' },
    { id: 'advanced', label: 'Erweitert', icon: '⚡' },
    { id: 'matchdays', label: 'Spieltage', icon: '📅' },
    { id: 'players', label: 'Spieler', icon: '👥' },
    { id: 'teams', label: 'Teams', icon: '🏆' },
    { id: 'trends', label: 'Trends', icon: '📈' },
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

    sortedMatches.forEach((match, index) => {
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
        {/* Enhanced Quick Stats Grid with iOS 26 Design */}
        <div className="mobile-grid mobile-grid-2 md:grid-cols-4">
          <div className="mobile-metric-card animate-mobile-slide-in">
            <div className="mobile-metric-icon bg-gradient-success">
              <span className="text-white">⚽</span>
            </div>
            <div className="mobile-metric-value">{totalMatches}</div>
            <div className="mobile-metric-label">Spiele gespielt</div>
          </div>
          <div className="mobile-metric-card animate-mobile-slide-in">
            <div className="mobile-metric-icon bg-gradient-warning">
              <span className="text-white">🎯</span>
            </div>
            <div className="mobile-metric-value">{advancedStats.totalGoals}</div>
            <div className="mobile-metric-label">Tore insgesamt</div>
            <div className="mobile-metric-sublabel">
              ⌀ {totalMatches > 0 ? (advancedStats.totalGoals / totalMatches).toFixed(1) : '0.0'}/Spiel
            </div>
          </div>
          <div className="mobile-metric-card animate-mobile-slide-in">
            <div className="mobile-metric-icon bg-gradient-info">
              <span className="text-white">🥇</span>
            </div>
            <div className="mobile-metric-value text-subhead font-semibold">
              {topScorer ? topScorer.name.split(' ').slice(-1)[0] : '–'}
            </div>
            <div className="mobile-metric-label">
              Topscorer ({topScorer ? topScorer.goals : 0} Tore)
            </div>
            <div className="mobile-metric-sublabel">
              {topScorer && topScorer.matchesPlayed > 0 ? 
                `⌀ ${(topScorer.goals / topScorer.matchesPlayed).toFixed(2)}/Spiel` : 
                '⌀ 0.00/Spiel'
              }
            </div>
          </div>
          <div className="mobile-metric-card animate-mobile-slide-in">
            <div className="mobile-metric-icon bg-gradient-warning">
              <span className="text-white">⭐</span>
            </div>
            <div className="mobile-metric-value text-subhead font-semibold">
              {topSdSPlayer ? topSdSPlayer.name.split(' ').slice(-1)[0] : '–'}
            </div>
            <div className="mobile-metric-label">
              Top SdS ({topSdSPlayer ? topSdSPlayer.sdsCount : 0}x)
            </div>
            <div className="mobile-metric-sublabel">
              {topSdSPlayer && topSdSPlayer.matchesPlayed > 0 ? 
                `${((topSdSPlayer.sdsCount / topSdSPlayer.matchesPlayed) * 100).toFixed(1)}% Quote` : 
                '0.0% Quote'
              }
            </div>
          </div>
        </div>

        {/* Enhanced Team Victory Cards with iOS 26 Design */}
        <div className="mobile-grid mobile-grid-1 md:grid-cols-3 gap-4">
          <div className="mobile-overview-card team-aek animate-mobile-slide-in hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-caption1 font-semibold text-system-blue uppercase tracking-wide">🔵 AEK Athen</div>
              <div className="w-8 h-8 bg-system-blue/10 rounded-full flex items-center justify-center">
                <span className="text-system-blue text-sm font-bold">A</span>
              </div>
            </div>
            <div className="text-title1 font-bold text-text-primary mb-2">
              {headToHead.biggestAekWin.diff > 0 ? headToHead.biggestAekWin.score : '–'}
            </div>
            <div className="text-callout text-text-secondary mb-3">Größter Sieg</div>
            {headToHead.biggestAekWin.diff > 0 && (
              <div className="text-footnote text-text-tertiary space-y-1">
                <div>vs {headToHead.biggestAekWin.opponent}</div>
                <div className="text-caption1">
                  {new Date(headToHead.biggestAekWin.date).toLocaleDateString('de-DE')}
                </div>
              </div>
            )}
          </div>
          
          <div className="mobile-overview-card team-real animate-mobile-slide-in hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-caption1 font-semibold text-system-red uppercase tracking-wide">🔴 Real Madrid</div>
              <div className="w-8 h-8 bg-system-red/10 rounded-full flex items-center justify-center">
                <span className="text-system-red text-sm font-bold">R</span>
              </div>
            </div>
            <div className="text-title1 font-bold text-text-primary mb-2">
              {headToHead.biggestRealWin.diff > 0 ? headToHead.biggestRealWin.score : '–'}
            </div>
            <div className="text-callout text-text-secondary mb-3">Größter Sieg</div>
            {headToHead.biggestRealWin.diff > 0 && (
              <div className="text-footnote text-text-tertiary space-y-1">
                <div>vs {headToHead.biggestRealWin.opponent}</div>
                <div className="text-caption1">
                  {new Date(headToHead.biggestRealWin.date).toLocaleDateString('de-DE')}
                </div>
              </div>
            )}
          </div>
          
          <div className="mobile-overview-card animate-mobile-slide-in hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-caption1 font-semibold text-system-purple uppercase tracking-wide">⚽ Top Performance</div>
              <div className="w-8 h-8 bg-system-purple/10 rounded-full flex items-center justify-center">
                <span className="text-system-purple text-sm font-bold">🏆</span>
              </div>
            </div>
            <div className="text-title1 font-bold text-text-primary mb-2">
              {mostGoalsInMatch?.player ? mostGoalsInMatch.player.split(' ').slice(-1)[0] : '–'}
            </div>
            <div className="text-callout text-text-secondary mb-3">
              Meiste Tore ({mostGoalsInMatch?.count || 0} in einem Spiel)
            </div>
            {mostGoalsInMatch?.match && (
              <div className="text-footnote text-text-tertiary">
                <div className="text-caption1">
                  {new Date(mostGoalsInMatch.match.date).toLocaleDateString('de-DE')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Additional Statistics Section */}
        <div className="mobile-overview-card animate-mobile-slide-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-info rounded-full flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h3 className="text-title3 font-bold text-text-primary">Erweiterte Statistiken</h3>
              <p className="text-caption1 text-text-secondary">Detaillierte Analyse der Liga</p>
            </div>
          </div>
          
          <div className="mobile-grid mobile-grid-auto gap-4">
            <div className="mobile-metric-card">
              <div className="mobile-metric-icon bg-gradient-warning">
                <span className="text-white">⏱️</span>
              </div>
              <div className="mobile-metric-value text-title2">
                {(() => {
                  // Calculate average ban length using totalgames instead of dates
                  const totalBanGames = bans?.reduce((sum, ban) => {
                    const banLength = ban.totalgames || 0;
                    return sum + banLength;
                  }, 0) || 0;
                  
                  const avgBanLength = bans?.length > 0 ? (totalBanGames / bans.length).toFixed(1) : '0.0';
                  return `${avgBanLength}`;
                })()}
              </div>
              <div className="mobile-metric-label">⌀ Sperrenlänge</div>
              <div className="mobile-metric-sublabel">Spiele</div>
            </div>

            <div className="mobile-metric-card">
              <div className="mobile-metric-icon bg-gradient-success">
                <span className="text-white">🎯</span>
              </div>
              <div className="mobile-metric-value text-title2">
                {playerStats.filter(p => p.goals > 0).length}
              </div>
              <div className="mobile-metric-label">Aktive Torschützen</div>
              <div className="mobile-metric-sublabel">von {playerStats.length}</div>
            </div>
            
            <div className="mobile-metric-card">
              <div className="mobile-metric-icon bg-gradient-danger">
                <span className="text-white">🟥</span>
              </div>
              <div className="mobile-metric-value text-title2">
                {bans?.length || 0}
              </div>
              <div className="mobile-metric-label">Gesamt Sperren</div>
              <div className="mobile-metric-sublabel">aller Zeiten</div>
            </div>
          </div>
        </div>

        {/* Longest Winning Streaks */}
        <div className="modern-card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-xl">🔥</span>
            Längste Siegesserien
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AEK Winning Streak */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AEK</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {winningStreaks.aek.streak} Siege
                </div>
              </div>
              {winningStreaks.aek.startDate && winningStreaks.aek.endDate ? (
                <div className="space-y-1 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">📅</span>
                    <span>Von: {new Date(winningStreaks.aek.startDate).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">🏁</span>
                    <span>Bis: {new Date(winningStreaks.aek.endDate).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-blue-600">
                  {winningStreaks.aek.streak === 0 ? 'Keine Siegesserie im Zeitraum' : 'Kein Datumsbereich verfügbar'}
                </div>
              )}
            </div>

            {/* Real Winning Streak */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RM</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {winningStreaks.real.streak} Siege
                </div>
              </div>
              {winningStreaks.real.startDate && winningStreaks.real.endDate ? (
                <div className="space-y-1 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">📅</span>
                    <span>Von: {new Date(winningStreaks.real.startDate).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">🏁</span>
                    <span>Bis: {new Date(winningStreaks.real.endDate).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  {winningStreaks.real.streak === 0 ? 'Keine Siegesserie im Zeitraum' : 'Kein Datumsbereich verfügbar'}
                </div>
              )}
            </div>
          </div>
          
          {/* Overall best streak indicator */}
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">🏆</span>
              <div className="text-center">
                <div className="text-sm font-medium text-orange-800">Beste Siegesserie im Zeitraum</div>
                <div className="text-lg font-bold text-orange-600">
                  {winningStreaks.aek.streak > winningStreaks.real.streak ? 
                    `AEK: ${winningStreaks.aek.streak} Siege` : 
                    winningStreaks.real.streak > winningStreaks.aek.streak ?
                    `Real: ${winningStreaks.real.streak} Siege` :
                    `Unentschieden: ${winningStreaks.aek.streak} Siege`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Interesting Statistics */}
        <div className="modern-card">
          <h3 className="font-bold text-lg mb-4">💡 Besondere Statistiken</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="text-xl font-bold text-yellow-600">
                {(() => {
                  // Calculate most productive player (goals per match played)
                  let bestRatio = 0;
                  let bestPlayer = 'Keine Daten';
                  
                  playerStats.forEach(player => {
                    if (player.matchesPlayed > 0) {
                      const ratio = player.goals / player.matchesPlayed;
                      if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestPlayer = player.name;
                      }
                    }
                  });
                  
                  return bestPlayer;
                })()}
              </div>
              <div className="text-sm text-yellow-700">🎯 Effizientester Spieler</div>
              <div className="text-xs text-yellow-600 mt-1">
                {(() => {
                  let bestRatio = 0;
                  
                  playerStats.forEach(player => {
                    if (player.matchesPlayed > 0) {
                      const ratio = player.goals / player.matchesPlayed;
                      if (ratio > bestRatio) {
                        bestRatio = ratio;
                      }
                    }
                  });
                  
                  return bestRatio > 0 ? `${bestRatio.toFixed(2)} Tore/Spiel` : 'Keine Daten';
                })()}
              </div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <div className="text-xl font-bold text-blue-600">
                {(() => {
                  // Calculate team balance (how close teams are in wins)
                  const aekWins = teamRecords.aek.wins;
                  const realWins = teamRecords.real.wins;
                  const totalDecisiveMatches = aekWins + realWins;
                  
                  if (totalDecisiveMatches === 0) return '100%';
                  
                  const balanceRatio = Math.min(aekWins, realWins) / Math.max(aekWins, realWins);
                  return `${(balanceRatio * 100).toFixed(0)}%`;
                })()}
              </div>
              <div className="text-sm text-blue-700">⚖️ Team-Balance</div>
              <div className="text-xs text-blue-600 mt-1">
                Ausgeglichenheit ({teamRecords.aek.wins}:{teamRecords.real.wins})
              </div>
            </div>
          </div>
        </div>

      {/* Team Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-ios">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-fifa-blue/10 rounded-full flex items-center justify-center">
              <span className="text-lg">🔵</span>
            </div>
            <h3 className="text-title3 font-bold text-fifa-blue">AEK Athen</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Siege:</span>
              <span className="text-body font-semibold text-system-green">{aekWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Niederlagen:</span>
              <span className="text-body font-semibold text-system-red">{teamRecords.aek.losses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Zu Null:</span>
              <span className="text-body font-semibold text-text-primary">{advancedStats.cleanSheets.aek}</span>
            </div>
            <div className="mt-4">
              <div className="text-caption1 text-text-secondary mb-2">Form (letzte 5):</div>
              <div className="flex">{formatForm(recentForm.aek)}</div>
            </div>
          </div>
        </div>

        <div className="card-ios">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-fifa-red/10 rounded-full flex items-center justify-center">
              <span className="text-lg">🔴</span>
            </div>
            <h3 className="text-title3 font-bold text-fifa-red">Real Madrid</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Siege:</span>
              <span className="text-body font-semibold text-system-green">{realWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Niederlagen:</span>
              <span className="text-body font-semibold text-system-red">{teamRecords.real.losses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Zu Null:</span>
              <span className="text-body font-semibold text-text-primary">{advancedStats.cleanSheets.real}</span>
            </div>
            <div className="mt-4">
              <div className="text-caption1 text-text-secondary mb-2">Form (letzte 5):</div>
              <div className="flex">{formatForm(recentForm.real)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="card-ios">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-system-yellow/10 rounded-full flex items-center justify-center">
            <span className="text-lg">🏆</span>
          </div>
          <h3 className="text-title3 font-bold text-text-primary">Top-Torschützen</h3>
        </div>
        <div className="space-y-3">
          {playerStats.slice(0, 5).map((player, index) => (
            <div key={player.id} className="list-item-ios">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-caption2 font-bold ${
                    index === 0 ? 'bg-system-yellow text-white' :
                    index === 1 ? 'bg-text-quaternary text-white' :
                    index === 2 ? 'bg-system-orange text-white' :
                    'bg-bg-tertiary text-text-secondary'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-callout font-medium text-text-primary">{player.name}</div>
                    <div className="text-caption1 text-text-secondary">{player.team}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-callout font-bold text-text-primary">{player.goals} Tore</div>
                  <div className="text-caption1 text-text-secondary">{player.goalsPerGame} ⌀</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Spieler des Spiels */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4">⭐ Top-Spieler des Spiels</h3>
        <div className="space-y-2">
          {playerStats
            .filter(player => player.sdsCount > 0)
            .sort((a, b) => b.sdsCount - a.sdsCount)
            .slice(0, 5)
            .map((player, index) => (
            <div key={player.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0">
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </span>
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-text-muted">{player.team}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{player.sdsCount}x SdS</div>
                <div className="text-sm text-text-muted">
                  {player.matchesPlayed > 0 ? ((player.sdsCount / player.matchesPlayed) * 100).toFixed(1) : '0.0'}% Quote
                </div>
              </div>
            </div>
          ))}
        </div>
        {playerStats.filter(player => player.sdsCount > 0).length === 0 && (
          <div className="text-center text-text-muted py-4">
            Noch keine Spieler des Spiels Auszeichnungen vergeben
          </div>
        )}
      </div>
    </div>
  );
};

  const renderPlayers = () => (
    <div className="modern-card">
      <h3 className="font-bold text-lg mb-4">📊 Spielerstatistiken</h3>
      
      {/* Statistics Summary */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-primary-green">
            {playerStats.filter(p => p.goals > 0).length}
          </div>
          <div className="text-sm text-text-secondary">Aktive Torschützen</div>
        </div>
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-primary-blue">
            {playerStats.reduce((sum, p) => sum + p.goals, 0)}
          </div>
          <div className="text-sm text-text-secondary">Tore insgesamt</div>
        </div>
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-primary-orange">
            {playerStats.filter(p => p.sdsCount > 0).length}
          </div>
          <div className="text-sm text-text-secondary">SdS Träger</div>
        </div>
        <div className="text-center p-3 bg-bg-secondary rounded-lg">
          <div className="text-xl font-bold text-primary-red">
            {playerStats.reduce((sum, p) => sum + p.totalBans, 0)}
          </div>
          <div className="text-sm text-text-secondary">Gesamt Sperren</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left py-2">Spieler</th>
              <th className="text-left py-2">Team</th>
              <th className="text-center py-2">Tore</th>
              <th className="text-center py-2">⌀/Spiel</th>
              <th className="text-center py-2">Spiele</th>
              <th className="text-center py-2">SdS</th>
              <th className="text-center py-2">SdS %</th>
              <th className="text-center py-2">Sperren</th>
              <th className="text-right py-2">Marktwert</th>
            </tr>
          </thead>
          <tbody>
            {playerStats.map((player) => (
              <tr key={player.id} className="border-b border-border-light hover:bg-bg-secondary">
                <td className="py-2 font-medium">{player.name}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    player.team === 'AEK' ? 'bg-blue-100 text-blue-800' : 
                    player.team === 'Ehemalige' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {player.team}
                  </span>
                </td>
                <td className="py-2 text-center font-bold">{player.goals}</td>
                <td className="py-2 text-center">{player.goalsPerGame}</td>
                <td className="py-2 text-center">{player.matchesPlayed}</td>
                <td className="py-2 text-center">{player.sdsCount}</td>
                <td className="py-2 text-center">
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    parseFloat(player.sdsPercentage) >= 50 ? 'bg-green-100 text-green-800' :
                    parseFloat(player.sdsPercentage) >= 25 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {player.sdsPercentage}% ({player.sdsCount}/{player.totalMatches})
                  </span>
                </td>
                <td className="py-2 text-center">
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    player.totalBans === 0 ? 'bg-green-100 text-green-800' :
                    player.totalBans <= 2 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {player.totalBans}
                  </span>
                </td>
                <td className="py-2 text-right">{formatPlayerValue(player.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Player Insights */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">🏆 Effizienz-Spitze</h4>
          {(() => {
            const mostEfficient = playerStats
              .filter(p => p.matchesPlayed >= 3) // Minimum 3 games
              .sort((a, b) => b.goalsPerMatchWhenPlaying - a.goalsPerMatchWhenPlaying)[0];
            
            return mostEfficient ? (
              <div>
                <div className="font-medium text-green-700">{mostEfficient.name}</div>
                <div className="text-sm text-green-600">
                  {mostEfficient.goalsPerGame} Tore/Spiel ({mostEfficient.goals} Tore in {mostEfficient.matchesPlayed} Spielen)
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Nicht genügend Daten</div>
            );
          })()}
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">⭐ SdS-König</h4>
          {(() => {
            const mostSds = playerStats
              .filter(p => p.sdsCount > 0)
              .sort((a, b) => parseFloat(b.sdsPercentage) - parseFloat(a.sdsPercentage))[0];
            
            return mostSds ? (
              <div>
                <div className="font-medium text-yellow-700">{mostSds.name}</div>
                <div className="text-sm text-yellow-600">
                  {mostSds.sdsPercentage}% Quote ({mostSds.sdsCount}x SdS)
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Noch keine SdS vergeben</div>
            );
          })()}
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">🚫 Disziplin-Problem</h4>
          {(() => {
            const mostBans = playerStats
              .filter(p => p.totalBans > 0)
              .sort((a, b) => b.totalBans - a.totalBans)[0];
            
            return mostBans ? (
              <div>
                <div className="font-medium text-red-700">{mostBans.name}</div>
                <div className="text-sm text-red-600">
                  {mostBans.totalBans} Sperren (Score: {mostBans.disciplinaryScore})
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Keine Sperren verzeichnet</div>
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
        <h3 className="font-bold text-lg mb-4">⚖️ Team-Vergleich</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-600">AEK Athen</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Aktive Spieler:</span>
                <span className="font-medium">{aekPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Siege:</span>
                <span className="font-medium">{aekWins}</span>
              </div>
              <div className="flex justify-between">
                <span>Niederlagen:</span>
                <span className="font-medium">{teamRecords.aek.losses}</span>
              </div>
              <div className="flex justify-between">
                <span>Zu Null Spiele:</span>
                <span className="font-medium">{advancedStats.cleanSheets.aek}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-red-600">Real Madrid</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Aktive Spieler:</span>
                <span className="font-medium">{realPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Siege:</span>
                <span className="font-medium">{realWins}</span>
              </div>
              <div className="flex justify-between">
                <span>Niederlagen:</span>
                <span className="font-medium">{teamRecords.real.losses}</span>
              </div>
              <div className="flex justify-between">
                <span>Zu Null Spiele:</span>
                <span className="font-medium">{advancedStats.cleanSheets.real}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Team Stats */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4">📈 Erweiterte Statistiken</h3>
        <div className="mb-4 text-sm text-text-muted">
          Diese Statistiken bieten tiefere Einblicke in die Team-Performance und wichtige Kennzahlen.
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-primary-green">{advancedStats.highScoringGames}</div>
            <div className="text-sm text-text-muted">Torspektakel</div>
            <div className="text-xs text-text-muted mt-1">Spiele mit 5+ Toren</div>
          </div>
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-accent-orange">{advancedStats.biggestWinMargin}</div>
            <div className="text-sm text-text-muted">Größter Sieg</div>
            <div className="text-xs text-text-muted mt-1">Höchste Tordifferenz</div>
          </div>
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-accent-blue">
              {advancedStats.avgGoalsPerMatch}
            </div>
            <div className="text-sm text-text-muted">⌀ Tore pro Spiel</div>
            <div className="text-xs text-text-muted mt-1">Durchschnittswert</div>
          </div>
          <div className="text-center p-4 bg-bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {advancedStats.currentStreak.count > 0 ? 
                `${advancedStats.currentStreak.count}` : '0'}
            </div>
            <div className="text-sm text-text-muted">Siegesserie</div>
            <div className="text-xs text-text-muted mt-1">
              {advancedStats.currentStreak.count > 0 ? 
                advancedStats.currentStreak.team : 'Keine aktuelle Serie'}
            </div>
          </div>
        </div>

        {/* New Enhanced Statistics Section */}
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-600">🏠 Home/Away Analyse</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>AEK Heimspiele:</span>
                <span className="font-medium">{advancedStats.homeAwayStats.aekHome}</span>
              </div>
              <div className="flex justify-between">
                <span>AEK Heimsiege:</span>
                <span className="font-medium">{advancedStats.homeAwayStats.aekHomeWins}</span>
              </div>
              <div className="flex justify-between">
                <span>AEK Auswärtssiege:</span>
                <span className="font-medium">{advancedStats.homeAwayStats.aekAwayWins}</span>
              </div>
              <div className="flex justify-between">
                <span>Heimstärke AEK:</span>
                <span className="font-medium">
                  {advancedStats.homeAwayStats.aekHome > 0 ? 
                    `${((advancedStats.homeAwayStats.aekHomeWins / advancedStats.homeAwayStats.aekHome) * 100).toFixed(0)}%` : 
                    '0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-green-600">⚽ Torstatistiken</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Beide Teams treffen:</span>
                <span className="font-medium">{advancedStats.scoringPatterns.bothTeamsScore}</span>
              </div>
              <div className="flex justify-between">
                <span>1:0 Siege:</span>
                <span className="font-medium">{advancedStats.scoringPatterns.oneNilWins}</span>
              </div>
              <div className="flex justify-between">
                <span>4+ Tore Siege:</span>
                <span className="font-medium">{advancedStats.scoringPatterns.highScoringWins}</span>
              </div>
              <div className="flex justify-between">
                <span>Top-Torschütze:</span>
                <span className="font-medium">
                  {advancedStats.topScorer.player} ({advancedStats.topScorer.goals})
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-purple-600">🎯 Spielqualität</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Enge Spiele (≤1 Tor):</span>
                <span className="font-medium">{advancedStats.competitiveness.closeGames}</span>
              </div>
              <div className="flex justify-between">
                <span>Deutliche Siege (≥3 Tore):</span>
                <span className="font-medium">{advancedStats.competitiveness.blowouts}</span>
              </div>
              <div className="flex justify-between">
                <span>AEK Tor-Schnitt:</span>
                <span className="font-medium">{advancedStats.goalEfficiency.aekAvg}</span>
              </div>
              <div className="flex justify-between">
                <span>Real Tor-Schnitt:</span>
                <span className="font-medium">{advancedStats.goalEfficiency.realAvg}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Performance Analysis */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-text-primary">🎯 Offensive Highlights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Torreichstes Team:</span>
                <span className="font-medium">
                  {advancedStats.aekTotalGoals >= advancedStats.realTotalGoals ? 'AEK Athen' : 'Real Madrid'}
                  ({Math.max(advancedStats.aekTotalGoals, advancedStats.realTotalGoals)} Tore)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Höchste Einzelspiel-Toranzahl:</span>
                <span className="font-medium">{advancedStats.highestScoringMatch} Tore</span>
              </div>
              <div className="flex justify-between">
                <span>Aktivster Torschütze:</span>
                <span className="font-medium">
                  {playerStats.length > 0 ? `${playerStats[0].name} (${playerStats[0].goals} Tore)` : 'Keine Daten'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-text-primary">⚖️ Team-Balance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Kader-Unterschied:</span>
                <span className="font-medium">
                  {Math.abs(aekPlayers.length - realPlayers.length)} Spieler
                </span>
              </div>
              <div className="flex justify-between">
                <span>Marktwert-Verhältnis:</span>
                <span className="font-medium">
                  {aekPlayers.reduce((sum, p) => sum + (p.value || 0), 0) > realPlayers.reduce((sum, p) => sum + (p.value || 0), 0) ? 'AEK führt' : 'Real führt'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dominanteres Team:</span>
                <span className="font-medium">
                  {aekWins > realWins ? 'AEK Athen' : realWins > aekWins ? 'Real Madrid' : 'Ausgeglichen'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-Head Statistics */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4">⚔️ Head-to-Head Bilanz</h3>
        <div className="mb-4 text-sm text-text-muted">
          Direkter Vergleich zwischen AEK Athen und Real Madrid über alle Spiele.
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{headToHead.aekWins}</div>
            <div className="text-sm text-blue-700">AEK Siege</div>
            <div className="text-xs text-text-muted mt-1">
              {headToHead.totalMatches > 0 ? `${((headToHead.aekWins / headToHead.totalMatches) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{headToHead.realWins}</div>
            <div className="text-sm text-red-700">Real Siege</div>
            <div className="text-xs text-text-muted mt-1">
              {headToHead.totalMatches > 0 ? `${((headToHead.realWins / headToHead.totalMatches) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{headToHead.aekGoals + headToHead.realGoals}</div>
            <div className="text-sm text-green-700">Tore gesamt</div>
            <div className="text-xs text-text-muted mt-1">
              {headToHead.totalMatches > 0 ? `⌀ ${((headToHead.aekGoals + headToHead.realGoals) / headToHead.totalMatches).toFixed(1)} pro Spiel` : '⌀ 0 pro Spiel'}
            </div>
          </div>
        </div>

        {/* Biggest Wins Details */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🔵 Größter AEK Sieg</h4>
            {headToHead.biggestAekWin.diff > 0 ? (
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{headToHead.biggestAekWin.score}</div>
                <div className="text-sm text-blue-700">
                  Unterschied: {headToHead.biggestAekWin.diff} Tore
                </div>
                <div className="text-xs text-text-muted">
                  {new Date(headToHead.biggestAekWin.date).toLocaleDateString('de-DE')}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Noch kein Sieg verzeichnet</div>
            )}
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">🔴 Größter Real Sieg</h4>
            {headToHead.biggestRealWin.diff > 0 ? (
              <div>
                <div className="text-2xl font-bold text-red-600 mb-1">{headToHead.biggestRealWin.score}</div>
                <div className="text-sm text-red-700">
                  Unterschied: {headToHead.biggestRealWin.diff} Tore
                </div>
                <div className="text-xs text-text-muted">
                  {new Date(headToHead.biggestRealWin.date).toLocaleDateString('de-DE')}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Noch kein Sieg verzeichnet</div>
            )}
          </div>
        </div>
      </div>
      
      {/* New Advanced Analytics */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4">🔬 Detailanalyse</h3>
        <div className="mb-4 text-sm text-text-muted">
          Erweiterte Metriken für eine tiefgreifende Team-Analyse.
        </div>
        <div className="grid md:grid-cols-2 gap-6">          
          <div className="space-y-3">
            <h4 className="font-semibold text-red-600">🎲 Spielstatistiken</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Spiele gespielt:</span>
                <span className="font-medium">{totalMatches}</span>
              </div>
              <div className="flex justify-between">
                <span>Längste Serie:</span>
                <span className="font-medium">
                  {aekWins >= realWins ? 'AEK' : 'Real'} ({Math.max(aekWins, realWins)} Siege)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Torreichstes Spiel:</span>
                <span className="font-medium">{advancedStats.highestScoringMatch} Tore</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-purple-600">🏆 Leistungs-Metriken</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Aktive Spieler:</span>
                <span className="font-medium">{aekPlayers.length + realPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Torschützen:</span>
                <span className="font-medium">
                  {playerStats.filter(p => p.goals > 0).length} Spieler
                </span>
              </div>
              <div className="flex justify-between">
                <span>Erfolgsquote AEK:</span>
                <span className="font-medium">
                  {totalMatches > 0 ? `${((aekWins / totalMatches) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Erfolgsquote Real:</span>
                <span className="font-medium">
                  {totalMatches > 0 ? `${((realWins / totalMatches) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="modern-card">
      <h3 className="font-bold text-lg mb-4">📈 Performance-Trends</h3>
      <div className="space-y-4">
        {Object.values(performanceTrends).reverse().map((trend) => (
          <div key={trend.month} className="flex items-center justify-between py-3 border-b border-border-light last:border-b-0">
            <div className="font-medium">{trend.month}</div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-blue-600 font-medium">AEK: {trend.aekWins}</span>
                <span className="mx-2">vs</span>
                <span className="text-red-600 font-medium">Real: {trend.realWins}</span>
              </div>
              <div className="text-sm text-text-muted">
                {trend.matchCount} Spiele, {trend.totalGoals} Tore
              </div>
              <div className="text-sm font-medium">
                ⌀ {(trend.totalGoals / trend.matchCount).toFixed(1)} Tore/Spiel
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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

      // Player efficiency metrics
      const playerEfficiency = playerStats.slice(0, 10).map(player => ({
        name: player.name,
        team: player.team,
        goals: player.goals || 0,
        matches: player.matchesPlayed || 0,
        efficiency: player.matchesPlayed > 0 ? (player.goals / player.matchesPlayed * 100).toFixed(1) : 0,
        value: player.value || 0,
        valuePerGoal: player.goals > 0 ? ((player.value || 0) / player.goals).toFixed(2) : 'N/A'
      }));

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
          <div className="text-4xl mb-2">📊</div>
          <p>Keine Daten für den gewählten Zeitraum verfügbar</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Score Margin Analysis */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">🎯</span>
            Spielintensität & Tordifferenzen
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{metrics.scoreMargins.oneGoal}</div>
              <div className="text-xs text-text-secondary">1-Tor-Spiele</div>
              <div className="text-xs text-text-muted">Spannend</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{metrics.scoreMargins.twoGoals}</div>
              <div className="text-xs text-text-secondary">2-Tor-Spiele</div>
              <div className="text-xs text-text-muted">Umkämpft</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">{metrics.scoreMargins.threeOrMore}</div>
              <div className="text-xs text-text-secondary">3-4 Tore Diff.</div>
              <div className="text-xs text-text-muted">Deutlich</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{metrics.scoreMargins.blowouts}</div>
              <div className="text-xs text-text-secondary">5+ Tore Diff.</div>
              <div className="text-xs text-text-muted">Dominant</div>
            </div>
          </div>
        </div>

        {/* Player Efficiency Rankings */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">⚡</span>
            Spieler-Effizienz Rankings
          </h3>
          
          <div className="space-y-3">
            {metrics.playerEfficiency.slice(0, 8).map((player, index) => (
              <div key={player.name} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-400 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-400 text-white' :
                    'bg-bg-tertiary text-text-primary'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{player.name}</div>
                    <div className="text-xs text-text-muted">{player.team}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-text-primary">{player.efficiency}%</div>
                  <div className="text-xs text-text-muted">{player.goals}G / {player.matches}S</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Form Analysis */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">🔥</span>
            Aktuelle Form (Letzte {metrics.recentForm.totalMatches} Spiele)
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.recentForm.aekWins}</div>
              <div className="text-sm text-text-secondary mb-2">AEK Siege</div>
              <div className="text-xs text-text-muted">{metrics.recentForm.aekGoals} Tore geschossen</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{metrics.recentForm.realWins}</div>
              <div className="text-sm text-text-secondary mb-2">Real Siege</div>
              <div className="text-xs text-text-muted">{metrics.recentForm.realGoals} Tore geschossen</div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Siegesquote AEK:</span>
              <span className="font-medium">
                {metrics.recentForm.totalMatches > 0 ? 
                  `${((metrics.recentForm.aekWins / metrics.recentForm.totalMatches) * 100).toFixed(0)}%` : 
                  '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Siegesquote Real:</span>
              <span className="font-medium">
                {metrics.recentForm.totalMatches > 0 ? 
                  `${((metrics.recentForm.realWins / metrics.recentForm.totalMatches) * 100).toFixed(0)}%` : 
                  '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Durchschnitt Tore/Spiel:</span>
              <span className="font-medium">
                {metrics.recentForm.totalMatches > 0 ? 
                  ((metrics.recentForm.aekGoals + metrics.recentForm.realGoals) / metrics.recentForm.totalMatches).toFixed(1) : 
                  '0.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Value for Money Analysis */}
        <div className="modern-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">💰</span>
            Preis-Leistungs-Verhältnis
          </h3>
          
          <div className="space-y-3">
            {metrics.playerEfficiency
              .filter(p => p.value > 0 && p.goals > 0)
              .sort((a, b) => parseFloat(a.valuePerGoal) - parseFloat(b.valuePerGoal))
              .slice(0, 5)
              .map((player, index) => (
                <div key={player.name} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-green-600">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{player.name}</div>
                      <div className="text-xs text-text-muted">{player.team} • {player.goals} Tore</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{player.valuePerGoal}M €</div>
                    <div className="text-xs text-text-muted">pro Tor</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (selectedView) {
      case 'dashboard': return (
        <div className="space-y-6">
          <QuickStatsWidget />
          <EnhancedDashboard onNavigate={onNavigate} />
        </div>
      );
      case 'advanced': return renderAdvancedStats();
      case 'matchdays': return <MatchDayOverview matches={matches} />;
      case 'players': return renderPlayers();
      case 'teams': return renderTeams();
      case 'trends': return renderTrends();
      default: return renderOverview();
    }
  };

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      {/* Enhanced Header with iOS 26 Design */}
      <div className="mb-6 animate-mobile-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-info rounded-ios-lg flex items-center justify-center">
            <span className="text-white text-xl">📊</span>
          </div>
          <div>
            <h2 className="text-title1 font-bold text-text-primary">Statistiken</h2>
            <p className="text-footnote text-text-secondary">Umfassende Liga-Analyse</p>
          </div>
        </div>
        <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="mb-4 bg-bg-secondary rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg">📅</span>
          <h3 className="font-semibold text-text-primary">Zeitraum</h3>
        </div>
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors"
        >
          <option value="all">Alle Spiele</option>
          <option value="1week">Letzte Woche</option>
          <option value="1month">Letzter Monat</option>
          <option value="3months">Letzte 3 Monate</option>
          <option value="6months">Letzte 6 Monate</option>
        </select>
        <p className="text-xs text-text-muted mt-2">
          Statistiken werden für den gewählten Zeitraum berechnet
        </p>
      </div>

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