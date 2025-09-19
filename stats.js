import { dataManager } from './dataManager.js';

// Enhanced statistics calculations
class StatsCalculator {
    constructor(matches, players, bans, spielerDesSpiels) {
        this.matches = matches || [];
        this.players = players || [];
        this.bans = bans || [];
        this.spielerDesSpiels = spielerDesSpiels || [];
        this.aekPlayers = players.filter(p => p.team === "AEK");
        this.realPlayers = players.filter(p => p.team === "Real");
    }

    // Calculate Win-Loss records (draws removed as requested)
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
            // Note: Draw games are excluded from statistics as requested
        });

        return { aek: aekRecord, real: realRecord };
    }

    // Calculate recent form (last 5 games)
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
                aekForm.push('D');
                realForm.push('D');
            }
        });

        return { aek: aekForm, real: realForm };
    }

    // Enhanced player statistics with correct database values
    calculatePlayerStats() {
        const playerStats = this.players.map(player => {
            const matchGoals = this.countPlayerGoalsFromMatches(player.name, player.team);
            const matchesPlayed = this.countPlayerMatches(player.name, player.team);
            const goals = matchGoals; // Use goals from matches, not from player table
            const playerBans = this.bans.filter(b => b.player_id === player.id);
            
            // Get SdS count from spieler_des_spiels table
            const sdsRecord = this.spielerDesSpiels.find(sds => 
                sds.name === player.name && sds.team === player.team
            );
            const sdsCount = sdsRecord ? (sdsRecord.count || 0) : 0;
            
            return {
                ...player,
                goals, // Updated goals from matches
                matchesPlayed,
                sdsCount,
                goalsPerGame: matchesPlayed > 0 ? (goals / matchesPlayed).toFixed(2) : '0.00',
                totalBans: playerBans.length,
                disciplinaryScore: this.calculateDisciplinaryScore(playerBans)
            };
        });

        return playerStats.sort((a, b) => (b.goals || 0) - (a.goals || 0));
    }

    countPlayerGoalsFromMatches(playerName, playerTeam) {
        let totalGoals = 0;
        
        this.matches.forEach(match => {
            // Count goals from goalslista (AEK goals)
            if (playerTeam === 'AEK' && match.goalslista) {
                const goals = Array.isArray(match.goalslista) ? match.goalslista : 
                             (typeof match.goalslista === 'string' ? JSON.parse(match.goalslista) : []);
                
                goals.forEach(goal => {
                    const goalPlayer = typeof goal === 'string' ? goal : goal.player;
                    const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
                    
                    if (goalPlayer === playerName) {
                        totalGoals += goalCount;
                    }
                });
            }
            
            // Count goals from goalslistb (Real goals)
            if (playerTeam === 'Real' && match.goalslistb) {
                const goals = Array.isArray(match.goalslistb) ? match.goalslistb : 
                             (typeof match.goalslistb === 'string' ? JSON.parse(match.goalslistb) : []);
                
                goals.forEach(goal => {
                    const goalPlayer = typeof goal === 'string' ? goal : goal.player;
                    const goalCount = typeof goal === 'string' ? 1 : (goal.count || 1);
                    
                    if (goalPlayer === playerName) {
                        totalGoals += goalCount;
                    }
                });
            }
        });
        
        return totalGoals;
    }

    countPlayerMatches(playerName, playerTeam) {
        // Count matches where the player's team played
        return this.matches.filter(match => 
            (playerTeam === 'AEK' && (match.teama === 'AEK' || match.teamb === 'AEK')) ||
            (playerTeam === 'Real' && (match.teama === 'Real' || match.teamb === 'Real'))
        ).length;
    }

    calculateDisciplinaryScore(bans) {
        return bans.reduce((score, ban) => {
            switch(ban.type) {
                case 'Gelb-Rote Karte': return score + 2;
                case 'Rote Karte': return score + 3;
                case 'Verletzung': return score + 1;
                default: return score + 1;
            }
        }, 0);
    }

    // Performance trends (draws removed)
    calculatePerformanceTrends() {
        const monthlyStats = {};
        
        this.matches.forEach(match => {
            const date = new Date(match.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    aekGoals: 0, realGoals: 0, matches: 0,
                    aekWins: 0, realWins: 0
                };
            }
            
            const aekGoals = match.goalsa || 0;
            const realGoals = match.goalsb || 0;
            
            monthlyStats[monthKey].aekGoals += aekGoals;
            monthlyStats[monthKey].realGoals += realGoals;
            monthlyStats[monthKey].matches++;
            
            if (aekGoals > realGoals) monthlyStats[monthKey].aekWins++;
            else if (realGoals > aekGoals) monthlyStats[monthKey].realWins++;
            // Note: Draw games are excluded from statistics as requested
        });

        return monthlyStats;
    }

    // Head-to-head statistics (draws removed)
    calculateHeadToHead() {
        const h2h = {
            totalMatches: this.matches.length,
            aekWins: 0,
            realWins: 0,
            aekGoals: 0,
            realGoals: 0,
            biggestAekWin: { diff: 0, score: '', date: '' },
            biggestRealWin: { diff: 0, score: '', date: '' }
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
                        date: match.date || ''
                    };
                }
            } else if (realGoals > aekGoals) {
                h2h.realWins++;
                if (diff > h2h.biggestRealWin.diff) {
                    h2h.biggestRealWin = {
                        diff,
                        score: `${realGoals}:${aekGoals}`,
                        date: match.date || ''
                    };
                }
            }
            // Note: Draw games are excluded from statistics as requested
        });

        return h2h;
    }

    // NEW: Additional meaningful statistics
    calculateAdvancedStats() {
        const stats = {
            // Goal scoring patterns
            highScoringGames: this.matches.filter(m => (m.goalsa || 0) + (m.goalsb || 0) >= 5).length,
            cleanSheets: {
                aek: this.matches.filter(m => (m.goalsb || 0) === 0 && (m.goalsa || 0) > 0).length,
                real: this.matches.filter(m => (m.goalsa || 0) === 0 && (m.goalsb || 0) > 0).length
            },
            
            // Card statistics
            cardHeavyGames: this.matches.filter(m => 
                (m.yellowa || 0) + (m.yellowb || 0) + (m.reda || 0) + (m.redb || 0) >= 6
            ).length,
            
            // Scoring streaks and patterns
            biggestWinMargin: Math.max(
                ...this.matches.map(m => Math.abs((m.goalsa || 0) - (m.goalsb || 0)))
            ),
            
            // Average cards per team
            avgCardsPerGame: {
                aek: this.matches.length > 0 ? 
                    (this.matches.reduce((sum, m) => sum + (m.yellowa || 0) + (m.reda || 0), 0) / this.matches.length).toFixed(1) : 0,
                real: this.matches.length > 0 ? 
                    (this.matches.reduce((sum, m) => sum + (m.yellowb || 0) + (m.redb || 0), 0) / this.matches.length).toFixed(1) : 0
            }
        };

        return stats;
    }

    // Enhanced statistics processing for goals (excluding own goals from player stats)
    calculateGoalStatistics() {
        const goalStats = {
            totalGoals: 0,
            playerGoals: 0,
            ownGoals: 0,
            topScorers: {
                AEK: null,
                Real: null
            }
        };

        this.matches.forEach(match => {
            // Process AEK goals
            if (match.goalslista && Array.isArray(match.goalslista)) {
                match.goalslista.forEach(scorer => {
                    if (typeof scorer === 'string') {
                        if (scorer.startsWith('Eigentore_')) {
                            goalStats.ownGoals++;
                        } else {
                            goalStats.playerGoals++;
                        }
                        goalStats.totalGoals++;
                    } else if (scorer && scorer.player) {
                        const count = scorer.count || 1;
                        if (scorer.player.startsWith('Eigentore_')) {
                            goalStats.ownGoals += count;
                        } else {
                            goalStats.playerGoals += count;
                        }
                        goalStats.totalGoals += count;
                    }
                });
            }

            // Process Real goals  
            if (match.goalslistb && Array.isArray(match.goalslistb)) {
                match.goalslistb.forEach(scorer => {
                    if (typeof scorer === 'string') {
                        if (scorer.startsWith('Eigentore_')) {
                            goalStats.ownGoals++;
                        } else {
                            goalStats.playerGoals++;
                        }
                        goalStats.totalGoals++;
                    } else if (scorer && scorer.player) {
                        const count = scorer.count || 1;
                        if (scorer.player.startsWith('Eigentore_')) {
                            goalStats.ownGoals += count;
                        } else {
                            goalStats.playerGoals += count;
                        }
                        goalStats.totalGoals += count;
                    }
                });
            }
        });

        // Find top scorers based on database values
        if (this.aekPlayers.length > 0) {
            goalStats.topScorers.AEK = this.aekPlayers.reduce((max, player) => 
                (player.goals || 0) > (max.goals || 0) ? player : max
            );
        }
        
        if (this.realPlayers.length > 0) {
            goalStats.topScorers.Real = this.realPlayers.reduce((max, player) => 
                (player.goals || 0) > (max.goals || 0) ? player : max
            );
        }

        return goalStats;
    }
}

export async function renderStatsTab(containerId = "app") {
	console.log("renderStatsTab aufgerufen!", { containerId });
    
    // Load all data using dataManager for consistency
    try {
        const data = await dataManager.loadAllAppData();
        
        const {
            matches = [],
            players = [],
            bans = [],
            spieler_des_spiels = []
        } = data;

        if (!matches.length && !players.length) {
            document.getElementById(containerId).innerHTML =
                `<div class="text-gray-700 dark:text-gray-300 p-4 text-center">Keine Daten verfügbar. Bitte fügen Sie zunächst Spieler und Matches hinzu.</div>`;
            return;
        }

        // Initialize enhanced statistics calculator with all data
        const stats = new StatsCalculator(matches, players, bans, spieler_des_spiels);
        
        // Calculate enhanced statistics
        const teamRecords = stats.calculateTeamRecords();
        const recentForm = stats.calculateRecentForm(5);
        const playerStats = stats.calculatePlayerStats();
        const headToHead = stats.calculateHeadToHead();
        const performanceTrends = stats.calculatePerformanceTrends();
        const advancedStats = stats.calculateAdvancedStats();
        const goalStatistics = stats.calculateGoalStatistics();

    // Spielerlisten
    const aekPlayers = players.filter(p => p.team === "AEK");
    const realPlayers = players.filter(p => p.team === "Real");

    // Übersicht: Tore, Karten, etc.
    const totalMatches = matches.length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
    let gelbA = 0, rotA = 0, gelbB = 0, rotB = 0;
    matches.forEach(m => {
        gelbA += m.yellowa || 0;
        rotA += m.reda || 0;
        gelbB += m.yellowb || 0;
        rotB += m.redb || 0;
    });
    const totalGelb = gelbA + gelbB;
    const totalRot = rotA + rotB;
    const avgGoalsPerMatch = totalMatches ? (totalGoals / totalMatches).toFixed(2) : "0.00";
    const avgCardsPerMatch = totalMatches ? ((gelbA+rotA+gelbB+rotB)/totalMatches).toFixed(2) : "0.00";

    // Höchster Sieg pro Team
    function getHighestWin(team) {
        let maxDiff = -1;
        let result = null;
        matches.forEach(m => {
            let diff = 0, goalsFor = 0, goalsAgainst = 0, date = m.date || "";
            if (team === "AEK") {
                diff = (m.goalsa || 0) - (m.goalsb || 0);
                goalsFor = m.goalsa || 0;
                goalsAgainst = m.goalsb || 0;
            } else {
                diff = (m.goalsb || 0) - (m.goalsa || 0);
                goalsFor = m.goalsb || 0;
                goalsAgainst = m.goalsa || 0;
            }
            if (diff > maxDiff) {
                maxDiff = diff;
                result = { goalsFor, goalsAgainst, date, diff };
            }
        });
        return (result && result.diff > 0) ? result : null;
    }
    const aekBestWin = getHighestWin("AEK");
    const realBestWin = getHighestWin("Real");

    // Sperren Stats
    const bansAek = bans.filter(b => b.team === "AEK");
    const bansReal = bans.filter(b => b.team === "Real");
    const totalBansAek = bansAek.length;
    const totalBansReal = bansReal.length;
    const avgBanDurationAek = totalBansAek ? (bansAek.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansAek).toFixed(2) : "0.00";
    const avgBanDurationReal = totalBansReal ? (bansReal.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansReal).toFixed(2) : "0.00";
    function getTopBannedPlayer(bansArr, teamPlayers) {
        const counter = {};
        bansArr.forEach(b => {
            if (!b.player_id) return;
            counter[b.player_id] = (counter[b.player_id] || 0) + 1;
        });
        const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return "–";
        if (sorted.length === 1 || (sorted.length > 1 && sorted[0][1] > sorted[1][1])) {
            const p = teamPlayers.find(pl => pl.id === Number(sorted[0][0]));
            return p ? `${p.name} (${sorted[0][1]})` : "–";
        }
        return "mehrere";
    }
    const topBannedAek = getTopBannedPlayer(bansAek, aekPlayers);
    const topBannedReal = getTopBannedPlayer(bansReal, realPlayers);

    // Sperren-Tabelle
    const bansTableHtml = bans.length
        ? `
        <div class="mt-3" id="bans-table-wrap" style="display:none;">
            <b>Alle Sperren</b>
            <div style="overflow-x:auto;">
                <table class="w-full mt-2 text-xs border border-gray-600 rounded overflow-hidden bg-gray-800">
                    <thead>
                        <tr class="bg-gray-700">
                            <th class="p-1 text-left">Spieler</th>
                            <th class="p-1 text-left">Typ</th>
                            <th class="p-1 text-left">Spiele</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bans.map(b => {
                            const p = players.find(pl => pl.id === b.player_id);
                            return `<tr>
                                <td class="p-1">${p ? p.name : "?"}</td>
                                <td class="p-1">${b.type || ""}</td>
                                <td class="p-1">${b.totalgames || ""}</td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
        `
        : '';

    // Tore Stats
    const totalToreAek = aekPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalToreReal = realPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    function getTopScorer(playersArr) {
        if (!playersArr.length) return null;
        const top = playersArr.slice().sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
        return (top && top.goals > 0) ? { name: top.name, goals: top.goals } : null;
    }
    const topScorerAek = getTopScorer(aekPlayers);
    const topScorerReal = getTopScorer(realPlayers);

    // Karten pro Spiel
    const avgGelbA = totalMatches ? (gelbA / totalMatches).toFixed(2) : "0.00";
    const avgRotA = totalMatches ? (rotA / totalMatches).toFixed(2) : "0.00";
    const avgGelbB = totalMatches ? (gelbB / totalMatches).toFixed(2) : "0.00";
    const avgRotB = totalMatches ? (rotB / totalMatches).toFixed(2) : "0.00";

    // Meiste Tore eines Spielers
    let maxGoalsSingle = 0, maxGoalsPlayer = null;
    matches.forEach(m => {
        if (m.goalslista) {
            m.goalslista.forEach(g => {
                if (g.count > maxGoalsSingle) {
                    maxGoalsSingle = g.count;
                    maxGoalsPlayer = aekPlayers.find(p => p.id === g.player_id) || { name: g.player };
                }
            });
        }
        if (m.goalslistb) {
            m.goalslistb.forEach(g => {
                if (g.count > maxGoalsSingle) {
                    maxGoalsSingle = g.count;
                    maxGoalsPlayer = realPlayers.find(p => p.id === g.player_id) || { name: g.player };
                }
            });
        }
    });

    // Generate form display
    function formatForm(form) {
        return form.map(result => {
            const color = result === 'W' ? 'text-green-600 bg-green-100' : 
                         result === 'L' ? 'text-red-600 bg-red-100' : 
                         'text-yellow-600 bg-yellow-100';
            return `<span class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${color}">${result}</span>`;
        }).join(' ');
    }

    // Generate player leaderboard
    function generatePlayerLeaderboard() {
        const topPlayers = playerStats.slice(0, 10);
        return topPlayers.map((player, index) => `
            <tr class="${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}">
                <td class="p-2 text-center">${index + 1}</td>
                <td class="p-2">${player.name}</td>
                <td class="p-2 text-center">
                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        player.team === 'AEK' ? 'bg-blue-100 text-blue-900' : 'bg-red-100 text-red-900'
                    }">${player.team}</span>
                </td>
                <td class="p-2 text-center font-bold">${player.goals || 0}</td>
                <td class="p-2 text-center">${player.goalsPerGame}</td>
                <td class="p-2 text-center">${player.totalBans}</td>
                <td class="p-2 text-center">
                    <div class="flex items-center justify-center">
                        <div class="w-12 h-2 bg-gray-600 rounded-full overflow-hidden">
                            <div class="h-full ${player.disciplinaryScore <= 2 ? 'bg-green-500' : 
                                                player.disciplinaryScore <= 5 ? 'bg-yellow-500' : 'bg-red-500'}" 
                                 style="width: ${Math.min(100, player.disciplinaryScore * 10)}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Generate performance trends
    function generatePerformanceTrends() {
        const months = Object.keys(performanceTrends).sort().slice(-6); // Last 6 months
        return months.map(month => {
            const data = performanceTrends[month];
            const aekAvg = data.matches > 0 ? (data.aekGoals / data.matches).toFixed(1) : '0.0';
            const realAvg = data.matches > 0 ? (data.realGoals / data.matches).toFixed(1) : '0.0';
            return `
                <div class="bg-gray-700 p-3 rounded-lg">
                    <div class="font-bold text-sm mb-2">${month}</div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="text-blue-300">AEK: ${data.aekWins}W-${data.realWins}L</div>
                        <div class="text-red-300">Real: ${data.realWins}W-${data.aekWins}L</div>
                        <div class="text-blue-300">Ø Tore: ${aekAvg}</div>
                        <div class="text-red-300">Ø Tore: ${realAvg}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- HTML ---
    const app = document.getElementById(containerId);
    app.innerHTML = `
        <div class="mb-4 flex items-center gap-2">
            <span class="text-3xl">📊</span>
            <h2 class="text-2xl font-bold">Erweiterte Statistiken</h2>
        </div>
        <div class="flex flex-col gap-6">

            <!-- Head-to-Head Übersicht -->
            <div class="rounded-xl shadow border bg-gray-800 p-4">
                <div class="font-bold text-lg mb-3 flex items-center gap-2">
                    <span class="text-xl">⚡</span>
                    Head-to-Head Bilanz
                </div>
                <div class="grid grid-cols-2 gap-4 text-center mb-4">
                    <div class="bg-blue-100 text-blue-900 rounded-lg p-3">
                        <div class="text-2xl font-bold">${headToHead.aekWins}</div>
                        <div class="text-sm">AEK Siege</div>
                    </div>
                    <div class="bg-red-100 text-red-900 rounded-lg p-3">
                        <div class="text-2xl font-bold">${headToHead.realWins}</div>
                        <div class="text-sm">Real Siege</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="text-center">
                        <div class="text-blue-300 font-semibold">Größter AEK Sieg</div>
                        <div>${headToHead.biggestAekWin.diff > 0 ? `${headToHead.biggestAekWin.score} (${headToHead.biggestAekWin.date})` : '–'}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-red-300 font-semibold">Größter Real Sieg</div>
                        <div>${headToHead.biggestRealWin.diff > 0 ? `${headToHead.biggestRealWin.score} (${headToHead.biggestRealWin.date})` : '–'}</div>
                    </div>
                </div>
            </div>

            <!-- Team Records & Form -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- AEK Stats -->
                <div class="rounded-xl shadow border bg-blue-50 text-blue-900 p-4">
                    <div class="font-bold text-lg mb-3 flex items-center gap-2">
                        <span class="text-xl">🔵</span>
                        AEK Athen
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span>Bilanz:</span>
                            <span class="font-bold">${teamRecords.aek.wins}W-${teamRecords.aek.losses}L</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Siegquote:</span>
                            <span class="font-bold">${headToHead.totalMatches > 0 ? Math.round((teamRecords.aek.wins / headToHead.totalMatches) * 100) : 0}%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Form (letzten 5):</span>
                            <div class="flex gap-1">${formatForm(recentForm.aek)}</div>
                        </div>
                        <div class="flex justify-between">
                            <span>Tore geschossen:</span>
                            <span class="font-bold">${headToHead.aekGoals}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Ø Tore/Spiel:</span>
                            <span class="font-bold">${headToHead.totalMatches > 0 ? (headToHead.aekGoals / headToHead.totalMatches).toFixed(2) : '0.00'}</span>
                        </div>
                    </div>
                </div>

                <!-- Real Stats -->
                <div class="rounded-xl shadow border bg-red-50 text-red-900 p-4">
                    <div class="font-bold text-lg mb-3 flex items-center gap-2">
                        <span class="text-xl">🔴</span>
                        Real Madrid
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span>Bilanz:</span>
                            <span class="font-bold">${teamRecords.real.wins}W-${teamRecords.real.losses}L</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Siegquote:</span>
                            <span class="font-bold">${headToHead.totalMatches > 0 ? Math.round((teamRecords.real.wins / headToHead.totalMatches) * 100) : 0}%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Form (letzten 5):</span>
                            <div class="flex gap-1">${formatForm(recentForm.real)}</div>
                        </div>
                        <div class="flex justify-between">
                            <span>Tore geschossen:</span>
                            <span class="font-bold">${headToHead.realGoals}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Ø Tore/Spiel:</span>
                            <span class="font-bold">${headToHead.totalMatches > 0 ? (headToHead.realGoals / headToHead.totalMatches).toFixed(2) : '0.00'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Player Leaderboard -->
            <div class="rounded-xl shadow border bg-gray-800 p-4">
                <div class="font-bold text-lg mb-3 flex items-center gap-2">
                    <span class="text-xl">🏆</span>
                    Spieler-Rangliste
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-700 text-left">
                                <th class="p-2">#</th>
                                <th class="p-2">Spieler</th>
                                <th class="p-2">Team</th>
                                <th class="p-2">Tore</th>
                                <th class="p-2">Tore/Spiel</th>
                                <th class="p-2">Sperren</th>
                                <th class="p-2">Disziplin</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generatePlayerLeaderboard()}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Performance Trends -->
            ${Object.keys(performanceTrends).length > 0 ? `
            <div class="rounded-xl shadow border bg-gray-800 p-4">
                <div class="font-bold text-lg mb-3 flex items-center gap-2">
                    <span class="text-xl">📈</span>
                    Leistungstrends (letzte 6 Monate)
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    ${generatePerformanceTrends()}
                </div>
            </div>
            ` : ''}

            <!-- Legacy Statistics (Preserved) -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2">
                <div class="font-bold text-lg mb-1">Übersicht</div>
                <div class="flex flex-wrap gap-4 items-center text-base font-medium mb-2">
                    <span class="flex items-center gap-1 text-blue-700"><span class="text-xl">⚽</span> ${totalGoals} Tore</span>
                    <span class="flex items-center gap-1 text-yellow-600"><span class="text-xl">🟨</span> ${totalGelb} Gelbe Karten</span>
                    <span class="flex items-center gap-1 text-red-600"><span class="text-xl">🟥</span> ${totalRot} Rote Karten</span>
                </div>
                <div class="flex flex-wrap gap-4 text-base mt-1">
                    <span>Ø Tore/Spiel: <b>${avgGoalsPerMatch}</b></span>
                    <span>Ø Karten/Spiel: <b>${avgCardsPerMatch}</b></span>
                </div>
                <div class="flex flex-col gap-1 text-xs mt-2 text-gray-600">
                    ${maxGoalsSingle > 0 ? `Meiste Tore eines Spielers in einem Spiel: <b>${maxGoalsSingle}</b> (${maxGoalsPlayer?.name || "?"})` : ""}
                </div>
                <div class="flex flex-col gap-1 text-xs mt-2">
                    <div>
                        <span class="font-bold text-blue-800">Höchster AEK-Sieg:</span>
                        ${aekBestWin ? `${aekBestWin.goalsFor}:${aekBestWin.goalsAgainst} (${aekBestWin.date})` : "–"}
                    </div>
                    <div>
                        <span class="font-bold text-red-800">Höchster Real-Sieg:</span>
                        ${realBestWin ? `${realBestWin.goalsFor}:${realBestWin.goalsAgainst} (${realBestWin.date})` : "–"}
                    </div>
                </div>
            </div>

            <!-- Sperren -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2">
                <div class="flex items-center gap-2 font-bold text-lg mb-2">
                    <span class="text-xl">🚫</span>
                    <span>Sperren</span>
                </div>
                <div class="flex flex-col gap-3 text-base mb-1">
                    <div>
                        <div class="flex flex-wrap items-center gap-4">
                            <span class="inline-flex items-center bg-blue-100 text-blue-900 rounded px-3 py-1 font-bold text-base min-w-[80px]">AEK</span>
                            <span class="flex items-center gap-1"><span class="text-amber-600">🔒</span> <b>${totalBansAek}</b> Sperren</span>
                            <span class="flex items-center gap-1"><span>⏱️</span> Ø <b>${avgBanDurationAek}</b> Spiele</span>
                        </div>
                        <div class="pl-[90px] text-blue-900 text-sm italic mt-1">${topBannedAek !== "–" ? `Top: ${topBannedAek}` : ""}</div>
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center gap-4 mt-2">
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-200 rounded px-3 py-1 font-bold text-base min-w-[80px]">Real</span>
                            <span class="flex items-center gap-1"><span class="text-amber-600">🔒</span> <b>${totalBansReal}</b> Sperren</span>
                            <span class="flex items-center gap-1"><span>⏱️</span> Ø <b>${avgBanDurationReal}</b> Spiele</span>
                        </div>
                        <div class="pl-[90px] text-red-900 text-sm italic mt-1">${topBannedReal !== "–" ? `Top: ${topBannedReal}` : ""}</div>
                    </div>
                </div>
                ${bans.length ? `
                    <button id="show-bans-table" class="my-2 bg-gray-700 hover:bg-blue-200 transition text-blue-800 font-semibold py-2 px-4 rounded shadow-sm text-sm">
                        Alle Sperren anzeigen
                    </button>
                ` : ""}
                ${bansTableHtml}
            </div>

        // Enhanced goal statistics section
        <div class="rounded-xl shadow border bg-gray-800 p-4 mb-4">
            <h3 class="font-bold text-lg mb-4 text-white flex items-center gap-2">
                <span class="text-xl">⚽</span>
                Torstatistiken (Database Values)
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div class="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-green-400">${goalStatistics.totalGoals}</div>
                    <div class="text-sm text-gray-300">Gesamt Tore</div>
                </div>
                <div class="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-blue-400">${goalStatistics.playerGoals}</div>
                    <div class="text-sm text-gray-300">Spieler Tore</div>
                </div>
                <div class="bg-orange-900/20 border border-orange-700 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-orange-400">${goalStatistics.ownGoals}</div>
                    <div class="text-sm text-gray-300">Eigentore</div>
                </div>
                <div class="bg-purple-900/20 border border-purple-700 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-purple-400">${totalMatches}</div>
                    <div class="text-sm text-gray-300">Matches</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h4 class="font-bold text-blue-300 mb-2">AEK Top Scorer</h4>
                    ${goalStatistics.topScorers.AEK ? `
                        <div class="text-white font-semibold">${goalStatistics.topScorers.AEK.name}</div>
                        <div class="text-blue-300 text-2xl font-bold">${goalStatistics.topScorers.AEK.goals || 0} Tore</div>
                    ` : '<div class="text-gray-400">Keine Tore</div>'}
                </div>
                <div class="bg-red-900/20 border border-red-700 rounded-lg p-4">
                    <h4 class="font-bold text-red-300 mb-2">Real Top Scorer</h4>
                    ${goalStatistics.topScorers.Real ? `
                        <div class="text-white font-semibold">${goalStatistics.topScorers.Real.name}</div>
                        <div class="text-red-300 text-2xl font-bold">${goalStatistics.topScorers.Real.goals || 0} Tore</div>
                    ` : '<div class="text-gray-400">Keine Tore</div>'}
                </div>
            </div>
        </div>

        <!-- Enhanced SdS statistics section -->
        <div class="rounded-xl shadow border bg-gray-800 p-4 mb-4">
            <h3 class="font-bold text-lg mb-4 text-white flex items-center gap-2">
                <span class="text-xl">⭐</span>
                Spieler des Spiels (Database Values)
            </h3>
            
            ${spieler_des_spiels.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${spieler_des_spiels.slice(0, 10).map((sds, index) => {
                        const teamClass = sds.team === 'AEK' ? 'border-blue-700 bg-blue-900/20' : 'border-red-700 bg-red-900/20';
                        const textClass = sds.team === 'AEK' ? 'text-blue-300' : 'text-red-300';
                        
                        return `
                            <div class="flex items-center justify-between p-3 rounded-lg border ${teamClass}">
                                <div class="flex items-center gap-3">
                                    <span class="text-yellow-400 text-xl">⭐</span>
                                    <div>
                                        <div class="font-semibold text-white">${sds.name}</div>
                                        <div class="text-sm ${textClass}">${sds.team}</div>
                                    </div>
                                </div>
                                <div class="text-2xl font-bold text-yellow-400">${sds.count}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div class="text-center text-gray-400 py-8">
                    Noch keine Spieler des Spiels vergeben
                </div>
            `}
        </div>
            
            <!-- Karten (modern, mit schönen Badges & Durchschnitt) -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2 flex flex-col gap-4">
                <div class="font-bold text-lg mb-2">Karten</div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                        <div class="font-bold text-blue-900 text-base mb-1">AEK:</div>
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center bg-yellow-100 text-yellow-900 rounded-full px-3 py-1 font-semibold shadow-sm border border-yellow-200">
                                <span class="mr-1">🟨</span>Gelb: <span class="ml-1">${gelbA}</span>
                            </span>
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 font-semibold shadow-sm border border-red-200 dark:border-red-600">
                                <span class="mr-1">🟥</span>Rot: <span class="ml-1">${rotA}</span>
                            </span>
                        </div>
                        <div class="flex gap-3 mt-1">
                            <span class="inline-flex items-center bg-yellow-50 text-yellow-900 rounded-full px-3 py-1 text-xs font-medium border border-yellow-100 shadow-sm">
                                Ø GK/Spiel: <b class="ml-1">${avgGelbA}</b>
                            </span>
                            <span class="inline-flex items-center bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 text-xs font-medium border border-red-100 dark:border-red-600 shadow-sm">
                                Ø RK/Spiel: <b class="ml-1">${avgRotA}</b>
                            </span>
                        </div>
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-red-900 text-base mb-1">Real:</div>
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center bg-yellow-100 text-yellow-900 rounded-full px-3 py-1 font-semibold shadow-sm border border-yellow-200">
                                <span class="mr-1">🟨</span>Gelb: <span class="ml-1">${gelbB}</span>
                            </span>
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 font-semibold shadow-sm border border-red-200 dark:border-red-600">
                                <span class="mr-1">🟥</span>Rot: <span class="ml-1">${rotB}</span>
                            </span>
                        </div>
                        <div class="flex gap-3 mt-1">
                            <span class="inline-flex items-center bg-yellow-50 text-yellow-900 rounded-full px-3 py-1 text-xs font-medium border border-yellow-100 shadow-sm">
                                Ø GK/Spiel: <b class="ml-1">${avgGelbB}</b>
                            </span>
                            <span class="inline-flex items-center bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 text-xs font-medium border border-red-100 dark:border-red-600 shadow-sm">
                                Ø RK/Spiel: <b class="ml-1">${avgRotB}</b>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Additional Enhanced Statistics -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-4">
                <h3 class="font-bold text-lg mb-4 text-white flex items-center gap-2">
                    <span class="text-xl">📈</span>
                    Erweiterte Statistiken
                </h3>
                
                <!-- Match Frequency & Scoring Patterns -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-700 rounded-lg p-3">
                        <h4 class="font-semibold text-gray-200 mb-2">⚽ Torstatistiken</h4>
                        <div class="space-y-1 text-sm text-gray-300">
                            <div class="flex justify-between">
                                <span>Höchstes Einzelspiel-Ergebnis:</span>
                                <span class="text-white font-medium">${Math.max(...matches.map(m => (m.goalsa || 0) + (m.goalsb || 0)))} Tore</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Torreichstes Team pro Spiel:</span>
                                <span class="text-white font-medium">${totalToreAek > totalToreReal ? 'AEK' : totalToreReal > totalToreAek ? 'Real' : 'Ausgeglichen'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Spiele ohne Tore:</span>
                                <span class="text-white font-medium">${matches.filter(m => (m.goalsa || 0) === 0 && (m.goalsb || 0) === 0).length}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Spiele mit 5+ Toren:</span>
                                <span class="text-white font-medium">${matches.filter(m => (m.goalsa || 0) + (m.goalsb || 0) >= 5).length}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-700 rounded-lg p-3">
                        <h4 class="font-semibold text-gray-200 mb-2">🃏 Disziplin</h4>
                        <div class="space-y-1 text-sm text-gray-300">
                            <div class="flex justify-between">
                                <span>Fairstes Team (weniger Karten):</span>
                                <span class="text-white font-medium">${(gelbA + rotA) < (gelbB + rotB) ? 'AEK' : (gelbB + rotB) < (gelbA + rotA) ? 'Real' : 'Ausgeglichen'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Spiele ohne Karten:</span>
                                <span class="text-white font-medium">${matches.filter(m => (m.yellowa || 0) + (m.reda || 0) + (m.yellowb || 0) + (m.redb || 0) === 0).length}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Kartenreichste Spiele:</span>
                                <span class="text-white font-medium">${Math.max(...matches.map(m => (m.yellowa || 0) + (m.reda || 0) + (m.yellowb || 0) + (m.redb || 0)))} Karten</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Verhältnis Gelb/Rot:</span>
                                <span class="text-white font-medium">${totalRot > 0 ? (totalGelb / totalRot).toFixed(1) : totalGelb}:1</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Performance Trends -->
                <div class="bg-gray-700 rounded-lg p-3 mb-4">
                    <h4 class="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <span>🔥</span>
                        Performance Trends (Letzte ${Math.min(5, matches.length)} Spiele)
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div class="text-blue-300 font-medium mb-1">AEK Form</div>
                            <div class="flex gap-1 mb-2">
                                ${recentForm.aek.map(result => 
                                    `<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        result === 'W' ? 'bg-green-500 text-white' : 
                                        result === 'L' ? 'bg-red-500 text-white' : 
                                        'bg-gray-500 text-white'
                                    }">${result}</span>`
                                ).join('')}
                            </div>
                            <div class="text-xs text-gray-400">
                                ${recentForm.aek.filter(r => r === 'W').length}W ${recentForm.aek.filter(r => r === 'D').length}D ${recentForm.aek.filter(r => r === 'L').length}L
                            </div>
                        </div>
                        <div>
                            <div class="text-red-300 font-medium mb-1">Real Form</div>
                            <div class="flex gap-1 mb-2">
                                ${recentForm.real.map(result => 
                                    `<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        result === 'W' ? 'bg-green-500 text-white' : 
                                        result === 'L' ? 'bg-red-500 text-white' : 
                                        'bg-gray-500 text-white'
                                    }">${result}</span>`
                                ).join('')}
                            </div>
                            <div class="text-xs text-gray-400">
                                ${recentForm.real.filter(r => r === 'W').length}W ${recentForm.real.filter(r => r === 'D').length}D ${recentForm.real.filter(r => r === 'L').length}L
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Squad Analysis -->
                <div class="bg-gray-700 rounded-lg p-3">
                    <h4 class="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <span>👥</span>
                        Kader-Analyse
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <div class="text-blue-300 font-medium mb-1">AEK (${aekPlayers.length} Spieler)</div>
                            <div class="space-y-1 text-gray-300">
                                <div class="flex justify-between">
                                    <span>Ø Tore pro Spieler:</span>
                                    <span class="text-white">${aekPlayers.length ? (totalToreAek / aekPlayers.length).toFixed(1) : 0}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Torlose Spieler:</span>
                                    <span class="text-white">${aekPlayers.filter(p => (p.goals || 0) === 0).length}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Top-Scorer Rate:</span>
                                    <span class="text-white">${topScorerAek ? ((topScorerAek.goals / totalToreAek) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div class="text-red-300 font-medium mb-1">Real (${realPlayers.length} Spieler)</div>
                            <div class="space-y-1 text-gray-300">
                                <div class="flex justify-between">
                                    <span>Ø Tore pro Spieler:</span>
                                    <span class="text-white">${realPlayers.length ? (totalToreReal / realPlayers.length).toFixed(1) : 0}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Torlose Spieler:</span>
                                    <span class="text-white">${realPlayers.filter(p => (p.goals || 0) === 0).length}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Top-Scorer Rate:</span>
                                    <span class="text-white">${topScorerReal ? ((topScorerReal.goals / totalToreReal) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- NEW: Advanced Statistics -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-4">
                <h3 class="font-bold text-lg mb-4 text-white">📈 Erweiterte Statistiken</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                        <h4 class="font-bold text-purple-300 mb-2">⚽ Torstatistiken</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-300">Torreichste Spiele (5+ Tore):</span>
                                <span class="text-white font-semibold">${advancedStats.highScoringGames}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Größter Sieg-Abstand:</span>
                                <span class="text-white font-semibold">${advancedStats.biggestWinMargin} Tore</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">AEK Clean Sheets:</span>
                                <span class="text-blue-300 font-semibold">${advancedStats.cleanSheets.aek}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Real Clean Sheets:</span>
                                <span class="text-red-300 font-semibold">${advancedStats.cleanSheets.real}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                        <h4 class="font-bold text-yellow-300 mb-2">🟨 Kartenstatistiken</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-300">Kartenreiche Spiele (6+ Karten):</span>
                                <span class="text-white font-semibold">${advancedStats.cardHeavyGames}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Ø Karten AEK/Spiel:</span>
                                <span class="text-blue-300 font-semibold">${advancedStats.avgCardsPerGame.aek}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Ø Karten Real/Spiel:</span>
                                <span class="text-red-300 font-semibold">${advancedStats.avgCardsPerGame.real}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-green-900/20 border border-green-700 rounded-lg p-4">
                        <h4 class="font-bold text-green-300 mb-2">🏆 Rekorde</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-300">Meiste Tore in einem Spiel:</span>
                                <span class="text-white font-semibold">${playerStats.mostGoalsInSingleGame} Tore</span>
                            </div>
                            ${playerStats.topScorer ? `
                            <div class="flex justify-between">
                                <span class="text-gray-300">Torschütze des Rekords:</span>
                                <span class="text-white font-semibold">${playerStats.topScorer}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- NEW: Team Analysis & Transfer Recommendations -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-4">
                <h3 class="font-bold text-lg mb-4 text-white">🔍 Team-Analyse & Empfehlungen</h3>
                ${generateTeamAnalysis(stats, matches, players, bans)}
            </div>
        </div>
    `;

    // Button-Logik für die Sperren-Tabelle
    if (bans.length) {
        setTimeout(() => {
            const btn = document.getElementById("show-bans-table");
            const wrap = document.getElementById("bans-table-wrap");
            if (btn && wrap) {
                btn.onclick = () => {
                    wrap.style.display = wrap.style.display === "none" ? "" : "none";
                    btn.innerText = wrap.style.display === "none" ? "Alle Sperren anzeigen" : "Alle Sperren ausblenden";
                };
            }
        }, 0);
    }
    
    } catch (error) {
        console.error('Error loading stats data:', error);
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
                <strong>Fehler beim Laden der Statistiken.</strong> 
                Bitte versuchen Sie es erneut.
                <button onclick="this.parentElement.remove()" class="float-right font-bold text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100">×</button>
            </div>
        `;
        const appDiv = document.getElementById(containerId);
        if (appDiv) {
            appDiv.innerHTML = '';
            appDiv.appendChild(errorDiv);
        }
    }
}

// NEW: Generate team analysis and transfer recommendations
function generateTeamAnalysis(stats, matches, players, bans) {
    const aekPlayers = players.filter(p => p.team === 'AEK');
    const realPlayers = players.filter(p => p.team === 'Real');
    
    // Team balance analysis
    const aekBalance = analyzeTeamBalance(aekPlayers);
    const realBalance = analyzeTeamBalance(realPlayers);
    
    // Recent form analysis
    const recentForm = stats.calculateRecentForm(5);
    
    // Generate recommendations
    const aekRecommendations = generateTransferRecommendations(aekPlayers, aekBalance, recentForm.aek);
    const realRecommendations = generateTransferRecommendations(realPlayers, realBalance, recentForm.real);
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- AEK Analysis -->
            <div class="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h4 class="font-bold text-blue-300 mb-3 flex items-center">
                    <i class="fas fa-users mr-2"></i>
                    AEK Team-Analyse
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-300">Spieler gesamt:</span>
                        <span class="text-white font-semibold">${aekPlayers.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300">Durchschnittswert:</span>
                        <span class="text-white font-semibold">€${Math.round(aekPlayers.reduce((sum, p) => sum + (p.value || 0), 0) / aekPlayers.length || 0).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300">Aktuelle Form:</span>
                        <span class="text-white font-semibold">${recentForm.aek.join('-')}</span>
                    </div>
                </div>
                
                <div class="mt-3 pt-3 border-t border-blue-700">
                    <h5 class="font-semibold text-blue-200 mb-2">🎯 Empfehlungen:</h5>
                    <div class="space-y-1 text-xs">
                        ${aekRecommendations.map(rec => `
                            <div class="bg-blue-800/30 rounded px-2 py-1 text-blue-100">
                                ${rec}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Real Analysis -->
            <div class="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <h4 class="font-bold text-red-300 mb-3 flex items-center">
                    <i class="fas fa-users mr-2"></i>
                    Real Team-Analyse
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-300">Spieler gesamt:</span>
                        <span class="text-white font-semibold">${realPlayers.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300">Durchschnittswert:</span>
                        <span class="text-white font-semibold">€${Math.round(realPlayers.reduce((sum, p) => sum + (p.value || 0), 0) / realPlayers.length || 0).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300">Aktuelle Form:</span>
                        <span class="text-white font-semibold">${recentForm.real.join('-')}</span>
                    </div>
                </div>
                
                <div class="mt-3 pt-3 border-t border-red-700">
                    <h5 class="font-semibold text-red-200 mb-2">🎯 Empfehlungen:</h5>
                    <div class="space-y-1 text-xs">
                        ${realRecommendations.map(rec => `
                            <div class="bg-red-800/30 rounded px-2 py-1 text-red-100">
                                ${rec}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Analyze team balance by position
function analyzeTeamBalance(players) {
    const positions = {
        'TH': players.filter(p => p.position === 'TH').length,
        'IV': players.filter(p => p.position === 'IV').length,
        'LV': players.filter(p => p.position === 'LV').length,
        'RV': players.filter(p => p.position === 'RV').length,
        'ZM': players.filter(p => p.position === 'ZM').length,
        'LM': players.filter(p => p.position === 'LM').length,
        'RM': players.filter(p => p.position === 'RM').length,
        'ST': players.filter(p => p.position === 'ST').length,
        'ZOM': players.filter(p => p.position === 'ZOM').length
    };
    
    return {
        total: players.length,
        positions,
        avgGoals: players.reduce((sum, p) => sum + (p.goals || 0), 0) / players.length || 0,
        avgValue: players.reduce((sum, p) => sum + (p.value || 0), 0) / players.length || 0,
        topScorer: players.reduce((max, p) => (p.goals || 0) > (max.goals || 0) ? p : max, { goals: 0 })
    };
}

// Generate transfer recommendations based on team analysis
function generateTransferRecommendations(players, balance, recentForm) {
    const recommendations = [];
    
    // Check for position gaps
    if (balance.positions.TH === 0) {
        recommendations.push("🚨 Kritisch: Kein Torwart! Sofort einen TH verpflichten.");
    } else if (balance.positions.TH === 1) {
        recommendations.push("⚠️ Nur ein Torwart - Backup TH empfohlen.");
    }
    
    if (balance.positions.ST === 0) {
        recommendations.push("🚨 Kritisch: Kein Stürmer! ST dringend benötigt.");
    } else if (balance.positions.ST === 1) {
        recommendations.push("⚡ Nur ein Stürmer - zweiter ST würde helfen.");
    }
    
    if (balance.positions.IV < 2) {
        recommendations.push("🛡️ Zu wenig Innenverteidiger - mindestens 2 IV empfohlen.");
    }
    
    if (balance.positions.ZM === 0) {
        recommendations.push("⚠️ Kein zentraler Mittelfeldspieler - ZM verstärken.");
    }
    
    // Form-based recommendations
    const formScore = recentForm.filter(r => r === 'W').length - recentForm.filter(r => r === 'L').length;
    if (formScore <= -2) {
        recommendations.push("📉 Schlechte Form - Verstärkungen in Angriff oder Mittelfeld.");
    } else if (formScore >= 3) {
        recommendations.push("📈 Gute Form - Team ist gut aufgestellt!");
    }
    
    // Squad size recommendations
    if (balance.total < 11) {
        recommendations.push("👥 Squad zu klein - mehr Spieler für Rotationen.");
    } else if (balance.total > 18) {
        recommendations.push("👥 Squad sehr groß - eventuell Spieler abgeben.");
    }
    
    // Performance-based recommendations
    if (balance.avgGoals < 0.5) {
        recommendations.push("⚽ Wenig Tore - offensive Verstärkungen nötig.");
    }
    
    if (recommendations.length === 0) {
        recommendations.push("✅ Team ist ausgewogen aufgestellt!");
    }
    
    return recommendations;
}
export function resetStatsState() {}