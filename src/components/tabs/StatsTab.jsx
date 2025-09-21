import { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import EnhancedDashboard from '../EnhancedDashboard';
import HorizontalNavigation from '../HorizontalNavigation';

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
    return this.players.map(player => {
      const matchesPlayed = this.countPlayerMatches();
      const playerBans = this.bans.filter(b => b.player_id === player.id);
      
      const sdsRecord = this.spielerDesSpiels.find(sds => 
        sds.name === player.name && sds.team === player.team
      );
      const sdsCount = sdsRecord ? (sdsRecord.count || 0) : 0;
      
      return {
        ...player,
        // Use database goals instead of calculated match goals
        goals: player.goals || 0,
        matchesPlayed,
        sdsCount,
        goalsPerGame: matchesPlayed > 0 ? ((player.goals || 0) / matchesPlayed).toFixed(2) : '0.00',
        totalBans: playerBans.length,
        disciplinaryScore: this.calculateDisciplinaryScore(playerBans)
      };
    }).sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }

  countPlayerGoalsFromMatches(playerName, playerTeam) {
    let totalGoals = 0;
    
    this.matches.forEach(match => {
      if (playerTeam === 'AEK' && match.goalslista) {
        const goals = Array.isArray(match.goalslista) ? match.goalslista : 
                     (typeof match.goalslista === 'string' ? JSON.parse(match.goalslista) : []);
        
        goals.forEach(goal => {
          const goalPlayer = typeof goal === 'string' ? goal : goal.player;
          const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
          if (goalPlayer === playerName) totalGoals += goalCount;
        });
      }
      
      if (playerTeam === 'Real' && match.goalslistb) {
        const goals = Array.isArray(match.goalslistb) ? match.goalslistb : 
                     (typeof match.goalslistb === 'string' ? JSON.parse(match.goalslistb) : []);
        
        goals.forEach(goal => {
          const goalPlayer = typeof goal === 'string' ? goal : goal.player;
          const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
          if (goalPlayer === playerName) totalGoals += goalCount;
        });
      }
    });
    
    return totalGoals;
  }

  countPlayerMatches() {
    // For now, assume all players participated in all matches
    // In a real implementation, you'd track participation per match
    return this.matches.length;
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
  
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: sdsData, loading: sdsLoading } = useSupabaseQuery('spieler_des_spiels', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');
  
  const loading = matchesLoading || playersLoading || sdsLoading || bansLoading;

  // Initialize statistics calculator
  const stats = new StatsCalculator(matches, players, bans, sdsData);
  
  // Calculate all statistics
  const teamRecords = stats.calculateTeamRecords();
  const recentForm = stats.calculateRecentForm(5);
  const playerStats = stats.calculatePlayerStats();
  const advancedStats = stats.calculateAdvancedStats();
  const performanceTrends = stats.calculatePerformanceTrends();
  const headToHead = stats.calculateHeadToHead();

  // Basic data calculations
  const totalMatches = matches?.length || 0;
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
    { id: 'players', label: 'Spieler', icon: '👥' },
    { id: 'teams', label: 'Teams', icon: '🏆' },
    { id: 'trends', label: 'Trends', icon: '📈' },
  ];

  if (loading) {
    return <LoadingSpinner message="Lade Statistiken..." />;
  }

  const renderOverview = () => {
    // Calculate enhanced statistics for the selected time period
    const topScorer = playerStats.length > 0 ? playerStats[0] : null;
    const topSdSPlayer = playerStats
      .filter(p => p.sdsCount > 0)
      .sort((a, b) => b.sdsCount - a.sdsCount)[0];
    
    // Calculate player with most goals in a single match
    const mostGoalsInMatch = matches?.reduce((max, match) => {
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
                  const totalDays = bans?.reduce((sum, ban) => {
                    const start = new Date(ban.start_date);
                    const end = new Date(ban.end_date);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                    return sum + (days > 0 ? days : 0);
                  }, 0) || 0;
                  
                  const avgDays = bans?.length > 0 ? (totalDays / bans.length).toFixed(1) : '0.0';
                  return `${avgDays}`;
                })()}
              </div>
              <div className="mobile-metric-label">⌀ Sperrenlänge</div>
              <div className="mobile-metric-sublabel">Tage</div>
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

        {/* New Interesting Statistics */}
        <div className="modern-card">
          <h3 className="font-bold text-lg mb-4">💡 Besondere Statistiken</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="text-xl font-bold text-green-600">
                {(() => {
                  // Calculate longest winning streak
                  let maxStreak = 0;
                  let currentAekStreak = 0;
                  let currentRealStreak = 0;
                  
                  matches?.forEach(match => {
                    const aekGoals = match.goalsa || 0;
                    const realGoals = match.goalsb || 0;
                    
                    if (aekGoals > realGoals) {
                      currentAekStreak++;
                      currentRealStreak = 0;
                      if (currentAekStreak > maxStreak) {
                        maxStreak = currentAekStreak;
                      }
                    } else if (realGoals > aekGoals) {
                      currentRealStreak++;
                      currentAekStreak = 0;
                      if (currentRealStreak > maxStreak) {
                        maxStreak = currentRealStreak;
                      }
                    }
                    // Note: FIFA games cannot end in draws
                  });
                  
                  return maxStreak;
                })()}
              </div>
              <div className="text-sm text-green-700">🔥 Längste Siegesserie</div>
              <div className="text-xs text-green-600 mt-1">
                {(() => {
                  let maxStreak = 0;
                  let currentAekStreak = 0;
                  let currentRealStreak = 0;
                  let maxTeam = '';
                  
                  matches?.forEach(match => {
                    const aekGoals = match.goalsa || 0;
                    const realGoals = match.goalsb || 0;
                    
                    if (aekGoals > realGoals) {
                      currentAekStreak++;
                      currentRealStreak = 0;
                      if (currentAekStreak > maxStreak) {
                        maxStreak = currentAekStreak;
                        maxTeam = 'AEK';
                      }
                    } else if (realGoals > aekGoals) {
                      currentRealStreak++;
                      currentAekStreak = 0;
                      if (currentRealStreak > maxStreak) {
                        maxStreak = currentRealStreak;
                        maxTeam = 'Real';
                      }
                    }
                    // Note: FIFA games cannot end in draws
                  });
                  
                  return maxTeam || 'Keine';
                })()}
              </div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="text-xl font-bold text-yellow-600">
                {(() => {
                  // Calculate most productive player (goals per match played)
                  let bestRatio = 0;
                  
                  playerStats.forEach(player => {
                    if (player.matchesPlayed > 0) {
                      const ratio = player.goals / player.matchesPlayed;
                      if (ratio > bestRatio) {
                        bestRatio = ratio;
                      }
                    }
                  });
                  
                  return bestRatio.toFixed(2);
                })()}
              </div>
              <div className="text-sm text-yellow-700">⚡ Höchste Effizienz</div>
              <div className="text-xs text-yellow-600 mt-1">
                {(() => {
                  let bestRatio = 0;
                  let bestPlayer = null;
                  
                  playerStats.forEach(player => {
                    if (player.matchesPlayed > 0) {
                      const ratio = player.goals / player.matchesPlayed;
                      if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestPlayer = player.name;
                      }
                    }
                  });
                  
                  return bestPlayer || 'Keine Daten';
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left py-2">Spieler</th>
              <th className="text-left py-2">Team</th>
              <th className="text-center py-2">Tore</th>
              <th className="text-center py-2">⌀/Spiel</th>
              <th className="text-center py-2">SdS</th>
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
                <td className="py-2 text-center">{player.sdsCount}</td>
                <td className="py-2 text-center">{player.totalBans}</td>
                <td className="py-2 text-right">{formatPlayerValue(player.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  const renderCurrentView = () => {
    switch (selectedView) {
      case 'dashboard': return <EnhancedDashboard onNavigate={onNavigate} />;
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