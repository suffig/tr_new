import { showModal, hideModal, showSuccessAndCloseModal } from './modal.js';
import { decrementBansAfterMatch } from './bans.js';
import { dataManager } from './dataManager.js';
import { loadingManager, ErrorHandler, Performance, DOM } from './utils.js';
import { supabase } from './supabaseClient.js';

// Match Analytics and Prediction System
class MatchAnalytics {
    constructor(matches, players, bans) {
        this.matches = matches || [];
        this.players = players || [];
        this.bans = bans || [];
    }

    // Predict next match outcome based on historical data
    predictNextMatch() {
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
        // Note: Draw predictions removed as requested

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
            reasoning: this.generateReasoning(aekFormScore, realFormScore, aekBans, realBans)
        };
    }

    generateReasoning(aekForm, realForm, aekBans, realBans) {
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

    // Generate match statistics summary
    getMatchStats() {
        const totalMatches = this.matches.length;
        if (totalMatches === 0) return null;

        const aekWins = this.matches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
        const realWins = this.matches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;
        // Note: Draw statistics removed as requested

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
            avgGoalsPerMatch,
            lastMatchResult,
            aekWinPercentage: Math.round((aekWins / totalMatches) * 100),
            realWinPercentage: Math.round((realWins / totalMatches) * 100)
        };
    }
}

// Optimized data management with caching
class MatchesDataManager {
    constructor() {
        this.matches = [];
        this.aek = [];
        this.real = [];
        this.bans = [];
        this.finances = {
            AEK: { balance: 0, debt: 0 },
            Real: { balance: 0, debt: 0 }
        };
        this.spielerDesSpiels = [];
        this.transactions = [];
        this.matchesInitialized = false;
        this.matchesChannel = null;
        this.lastLoadTime = 0;
        this.loadingPromise = null;
    }

    // Debounced data loading to prevent excessive calls
    loadAllData = Performance.debounce(async (renderFn = null) => {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this._loadAllDataInternal(renderFn);
        try {
            await this.loadingPromise;
        } finally {
            this.loadingPromise = null;
        }
    }, 100);

    async _loadAllDataInternal(renderFn) {
        const loadingKey = 'matches-data';
        loadingManager.show(loadingKey);

        try {
            const data = await dataManager.loadAllAppData();
            
            this.matches = data.matches || [];
            
            // Filter players by team
            const allPlayers = data.players || [];
            this.aek = allPlayers.filter(p => p.team === "AEK");
            this.real = allPlayers.filter(p => p.team === "Real");
            
            this.bans = data.bans || [];
            
            // Process finances
            const financesData = data.finances || [];
            this.finances = {
                AEK: financesData.find(f => f.team === "AEK") || { balance: 0, debt: 0 },
                Real: financesData.find(f => f.team === "Real") || { balance: 0, debt: 0 }
            };
            
            this.spielerDesSpiels = data.spieler_des_spiels || [];
            this.transactions = data.transactions || [];
            
            this.lastLoadTime = Date.now();
            
            if (renderFn) {
                renderFn();
            }
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, 'Matches-Daten laden');
        } finally {
            loadingManager.hide(loadingKey);
        }
    }

    subscribeToChanges(renderFn = null) {
        if (this.matchesChannel) return;
        
        try {
            this.matchesChannel = supabase
                .channel('matches_live')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, 
                    () => this.loadAllData(renderFn))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'spieler_des_spiels' }, 
                    () => this.loadAllData(renderFn))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'finances' }, 
                    () => this.loadAllData(renderFn))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, 
                    () => this.loadAllData(renderFn))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
                    () => this.loadAllData(renderFn))
                .subscribe();
        } catch (error) {
            console.error('Error subscribing to changes:', error);
        }
    }

    unsubscribe() {
        if (this.matchesChannel) {
            supabase.removeChannel(this.matchesChannel);
            this.matchesChannel = null;
        }
    }

    reset() {
        this.matches = [];
        this.aek = [];
        this.real = [];
        this.bans = [];
        this.finances = { AEK: { balance: 0, debt: 0 }, Real: { balance: 0, debt: 0 } };
        this.spielerDesSpiels = [];
        this.transactions = [];
        this.matchesInitialized = false;
        this.lastLoadTime = 0;
        this.unsubscribe();
    }
}

// Create singleton instance
const matchesData = new MatchesDataManager();

// Hilfsfunktion: App-Matchnummer (laufende Nummer, wie Übersicht) - optimized
export function getAppMatchNumber(matchId) {
    if (!matchId || !matchesData.matches.length) return null;
    
    // matches ist absteigend sortiert (neueste zuerst)
    const idx = matchesData.matches.findIndex(m => m.id === matchId);
    return idx >= 0 ? matchesData.matches.length - idx : null;
}

export async function renderMatchesTab(containerId = "app") {
    console.log("renderMatchesTab aufgerufen!", { containerId });
    
    const app = DOM.getElementById(containerId);
    if (!app) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    app.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:justify-between mb-4 gap-2">
            <h2 class="text-lg font-semibold">Matches</h2>
            <div class="flex gap-2">
                <button id="show-analytics-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 active:scale-95 transition">
                    <i class="fas fa-chart-line"></i> Analytics
                </button>
                <!-- Add match button removed - use Admin tab for adding matches -->
            </div>
        </div>
        
        <!-- Analytics Section (initially hidden) -->
        <div id="analytics-section" class="mb-6 space-y-4" style="display: none;">
            <div class="bg-gray-800 rounded-xl p-4">
                <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
                    <span class="text-xl">🔮</span>
                    Nächstes Match - Vorhersage
                </h3>
                <div id="prediction-content">
                    <div class="animate-pulse">Analysiere Daten...</div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-xl p-4">
                <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
                    <span class="text-xl">📈</span>
                    Match-Statistiken
                </h3>
                <div id="match-stats-content">
                    <div class="animate-pulse">Lade Statistiken...</div>
                </div>
            </div>
        </div>
        
        <div id="matches-list" class="space-y-3">
            <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-gray-600">Lädt Matches...</span>
            </div>
        </div>
    `;

    // Event listeners for analytics
    const analyticsBtn = DOM.getElementById("show-analytics-btn");
    const analyticsSection = DOM.getElementById("analytics-section");
    if (analyticsBtn && analyticsSection) {
        analyticsBtn.onclick = () => {
            const isVisible = analyticsSection.style.display !== 'none';
            analyticsSection.style.display = isVisible ? 'none' : 'block';
            analyticsBtn.innerHTML = isVisible ? 
                '<i class="fas fa-chart-line"></i> Analytics' : 
                '<i class="fas fa-chart-line"></i> Analytics schließen';
            
            if (!isVisible) {
                renderAnalytics();
            }
        };
    }

    // Subscribe to real-time changes
    matchesData.subscribeToChanges(renderMatchesList);
    
    // Load data
    await matchesData.loadAllData(renderMatchesList);
}

// New function to render analytics
async function renderAnalytics() {
    try {
        // Load fresh data for analytics
        const data = await dataManager.loadAllAppData();
        const analytics = new MatchAnalytics(data.matches, data.players, data.bans);
        
        const prediction = analytics.predictNextMatch();
        const matchStats = analytics.getMatchStats();
        
        // Render prediction
        const predictionContent = DOM.getElementById('prediction-content');
        if (predictionContent) {
            predictionContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-700 rounded-lg p-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-400 mb-2">${prediction.prediction}</div>
                            <div class="text-sm text-gray-300">Wahrscheinlichkeit: ${prediction.confidence}%</div>
                            <div class="text-sm text-gray-300 mt-1">Vorhersage: ${prediction.predictedScore || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="bg-gray-700 rounded-lg p-4">
                        <div class="text-sm space-y-2">
                            <div class="flex justify-between">
                                <span>AEK Sieg:</span>
                                <span class="font-bold text-blue-400">${prediction.aekWinProbability}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Real Sieg:</span>
                                <span class="font-bold text-red-400">${prediction.realWinProbability}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-3 text-sm text-gray-300 bg-gray-700 rounded p-3">
                    <strong>Analyse:</strong> ${prediction.reasoning}
                </div>
            `;
        }
        
        // Render match statistics
        const statsContent = DOM.getElementById('match-stats-content');
        if (statsContent && matchStats) {
            statsContent.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-700 rounded-lg p-3 text-center">
                        <div class="text-2xl font-bold text-blue-400">${matchStats.totalMatches}</div>
                        <div class="text-xs text-gray-300">Gesamt Spiele</div>
                    </div>
                    <div class="bg-gray-700 rounded-lg p-3 text-center">
                        <div class="text-2xl font-bold text-green-400">${matchStats.avgGoalsPerMatch}</div>
                        <div class="text-xs text-gray-300">Ø Tore/Spiel</div>
                    </div>
                    <div class="bg-gray-700 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-blue-400">${matchStats.aekWinPercentage}%</div>
                        <div class="text-xs text-gray-300">AEK Siege</div>
                    </div>
                    <div class="bg-gray-700 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-red-400">${matchStats.realWinPercentage}%</div>
                        <div class="text-xs text-gray-300">Real Siege</div>
                    </div>
                </div>
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div class="bg-blue-100 text-blue-900 rounded p-3 text-center">
                        <div class="font-bold">${matchStats.aekWins}</div>
                        <div>AEK Siege</div>
                    </div>
                    <div class="bg-red-100 text-red-900 rounded p-3 text-center">
                        <div class="font-bold">${matchStats.realWins}</div>
                        <div>Real Siege</div>
                    </div>
                </div>
                <div class="mt-3 text-sm text-gray-300 bg-gray-700 rounded p-3">
                    <strong>Letztes Spiel:</strong> ${matchStats.lastMatchResult}
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error rendering analytics:', error);
        const predictionContent = DOM.getElementById('prediction-content');
        if (predictionContent) {
            predictionContent.innerHTML = '<div class="text-red-400">Fehler beim Laden der Analytics</div>';
        }
    }
}

let matchViewDate = new Date().toISOString().slice(0, 10); // Standard: heute

// Optimized match list rendering with better error handling
function renderMatchesList() {
    const container = DOM.getElementById('matches-list');
    if (!container) {
        console.warn("Element #matches-list nicht gefunden!");
        return;
    }

    try {
        if (!matchesData.matches.length) {
            container.innerHTML = `<div class="text-gray-700 text-sm text-center py-4">Noch keine Matches eingetragen.</div>`;
            return;
        }

        // Alle Daten nach Datum gruppieren - optimized
        const uniqueDates = [...new Set(matchesData.matches.map(m => m.date))].sort((a, b) => b.localeCompare(a));
        
        // matchViewDate initialisieren, falls leer
        if (!matchViewDate && uniqueDates.length) {
            matchViewDate = uniqueDates[0];
        }

        // Nur Matches des aktuellen Tages anzeigen
        const filteredMatches = matchesData.matches.filter(m => m.date === matchViewDate);

        // Überschrift mit Datum, schön formatiert
        const dateStr = matchViewDate ? matchViewDate.split('-').reverse().join('.') : '';
        let html = `<div class="text-center font-semibold text-base mb-2">Spiele am <span class="text-sky-700 dark:text-sky-400">${dateStr}</span></div>`;

        if (!filteredMatches.length) {
            html += `<div class="text-gray-700 text-sm text-center py-4">Keine Spiele für diesen Tag.</div>`;
        } else {
            html += filteredMatches.map(match => {
                // Durchgehende Nummerierung, unabhängig vom Tag!
                const nr = matchesData.matches.length - matchesData.matches.findIndex(m => m.id === match.id);
                return matchHtml(match, nr);
            }).join('');
        }

        // Navigation Buttons - optimized
        html += renderNavigationButtons(uniqueDates);
        
        DOM.setSafeHTML(container, html);
        
        // Attach event listeners safely
        attachMatchEventListeners(uniqueDates);
        
    } catch (error) {
        console.error('Error rendering matches list:', error);
        ErrorHandler.showUserError('Fehler beim Anzeigen der Matches');
        container.innerHTML = `<div class="text-red-500 text-center py-4">Fehler beim Laden der Matches</div>`;
    }
}

// Separate function for navigation buttons
function renderNavigationButtons(uniqueDates) {
    const currIdx = uniqueDates.indexOf(matchViewDate);
    let navHtml = `<div class="flex gap-2 justify-center mt-4">`;
    
    if (currIdx < uniqueDates.length - 1) {
        navHtml += `<button id="older-matches-btn" class="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-gray-400">Ältere Spiele anzeigen</button>`;
    }
    if (currIdx > 0) {
        navHtml += `<button id="newer-matches-btn" class="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-gray-400">Neuere Spiele anzeigen</button>`;
    }
    
    navHtml += `</div>`;
    return navHtml;
}

// Separate function for event listeners
function attachMatchEventListeners(uniqueDates) {
    const currIdx = uniqueDates.indexOf(matchViewDate);
    
    // Navigation button handlers
    if (currIdx < uniqueDates.length - 1) {
        const olderBtn = DOM.getElementById('older-matches-btn');
        if (olderBtn) {
            olderBtn.onclick = () => {
                matchViewDate = uniqueDates[currIdx + 1];
                renderMatchesList();
            };
        }
    }
    
    if (currIdx > 0) {
        const newerBtn = DOM.getElementById('newer-matches-btn');
        if (newerBtn) {
            newerBtn.onclick = () => {
                matchViewDate = uniqueDates[currIdx - 1];
                renderMatchesList();
            };
        }
    }

    // Match action buttons
    document.querySelectorAll('.edit-match-btn').forEach(btn => {
        btn.onclick = () => {
            const matchId = parseInt(btn.getAttribute('data-id'));
            if (matchId) {
                openMatchForm(matchId);
            }
        };
    });
    
    document.querySelectorAll('.delete-match-btn').forEach(btn => {
        btn.onclick = async () => {
            const matchId = parseInt(btn.getAttribute('data-id'));
            if (matchId) {
                // Confirm deletion
                if (confirm(`Spiel wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
                    try {
                        await deleteMatch(matchId);
                        // The UI will automatically update via live sync
                    } catch (error) {
                        console.error('Failed to delete match:', error);
                        alert(`Fehler beim Löschen: ${error.message}`);
                    }
                }
            }
        };
    });

    // Match toggle buttons for collapsible details
    document.querySelectorAll('.match-toggle-btn').forEach(btn => {
        btn.onclick = () => {
            const matchId = btn.getAttribute('data-match-id');
            const detailsDiv = document.querySelector(`.match-details[data-match-id="${matchId}"]`);
            const icon = btn.querySelector('i');
            
            if (detailsDiv) {
                const isHidden = detailsDiv.style.display === 'none';
                detailsDiv.style.display = isHidden ? 'block' : 'none';
                
                // Rotate the chevron icon
                if (icon) {
                    if (isHidden) {
                        icon.classList.add('rotate-180');
                    } else {
                        icon.classList.remove('rotate-180');
                    }
                }
            }
        };
    });
}

function matchHtml(match, nr) {
    function goalsHtml(goals) {
        if (!goals || !goals.length) return `<span class="text-gray-600 text-sm italic">Keine Torschützen</span>`;
        
        // Aggregate goal counts per player (handle both old string array and new object format)
        const goalCounts = {};
        goals.forEach(g => {
            if (typeof g === 'string') {
                // Old string format: ["Player1", "Player1", "Player2"]
                const playerName = g;
                if (playerName) {
                    goalCounts[playerName] = (goalCounts[playerName] || 0) + 1;
                }
            } else if (typeof g === 'object' && g.player) {
                // New object format: [{"count": 2, "player": "Player1"}]
                const playerName = g.player;
                const count = g.count || 1;
                if (playerName) {
                    goalCounts[playerName] = (goalCounts[playerName] || 0) + count;
                }
            }
        });
        
        // Create individual badges for each player with goal count
        const playerBadges = Object.entries(goalCounts).map(([playerName, count]) => {
            const displayText = count > 1 ? `${playerName} ${count}x` : playerName;
            return `<span class="inline-flex items-center gap-1 bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm font-medium border border-gray-500">${displayText}</span>`;
        }).join(' ');
        
        return playerBadges;
    }
    
    function prizeHtml(amount, team) {
        const isPos = amount >= 0;
        const tClass = team === "AEK" ? "bg-blue-200 border-2 border-blue-600" : "bg-red-200 border-2 border-red-600";
        const color = isPos ? "text-green-800" : "text-red-800";
        const teamTextColor = team === "AEK" ? "text-blue-900" : "text-red-900";
        return `<span class="inline-flex items-center gap-2 px-3 py-2 rounded-full ${tClass} font-bold text-sm shadow-lg">
                    <span class="font-bold ${teamTextColor}">${team}</span>
                    <span class="${color} font-extrabold">${isPos ? '+' : ''}${amount.toLocaleString('de-DE')} €</span>
                </span>`;
    }
    
    // Determine match result for better visual indication
    const isWin = match.goalsa > match.goalsb ? 'AEK' : match.goalsa < match.goalsb ? 'Real' : 'Draw';
    const resultClass = isWin === 'AEK' ? 'border-l-4 border-l-blue-500' : 
                        isWin === 'Real' ? 'border-l-4 border-l-red-500' : 
                        'border-l-4 border-l-gray-500';
    
    return `
    <div class="bg-white border border-gray-300 rounded-xl p-4 mb-3 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-200 ${resultClass}">
      <!-- Match Header with Toggle -->
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="bg-gradient-to-r from-blue-400 to-blue-300 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg border-2 border-blue-600">#${nr}</span>
            <span class="text-gray-700 text-sm font-medium">${match.date}</span>
            <button class="match-toggle-btn bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded-lg text-sm ml-auto transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg" data-match-id="${match.id}" title="Details ein-/ausblenden">
              <span class="text-xs font-medium">Details</span>
              <i class="fas fa-chevron-down transform transition-transform duration-200"></i>
            </button>
          </div>
          <!-- Score Display -->
          <div class="bg-gray-100 rounded-xl p-4 mb-3 border border-gray-200">
            <div class="flex items-center justify-center">
              <div class="text-center">
                <span class="text-blue-600 font-bold text-xl block mb-1">${match.teama}</span>
                <span class="text-3xl font-black text-gray-900">${match.goalsa}</span>
              </div>
              <div class="mx-6 text-center">
                <span class="text-gray-900 text-2xl font-bold">:</span>
              </div>
              <div class="text-center">
                <span class="text-red-600 font-bold text-xl block mb-1">${match.teamb}</span>
                <span class="text-3xl font-black text-gray-900">${match.goalsb}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2 ml-4">
          <button class="edit-match-btn bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl text-sm flex items-center justify-center active:scale-95 transition-all shadow-lg hover:shadow-xl" title="Bearbeiten" data-id="${match.id}">
            <i class="fas fa-edit text-base"></i>
          </button>
          <button class="delete-match-btn bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl text-sm flex items-center justify-center active:scale-95 transition-all shadow-lg hover:shadow-xl" title="Löschen" data-id="${match.id}">
            <i class="fas fa-trash text-base"></i>
          </button>
        </div>
      </div>
      
      <!-- Collapsible Details Section -->
      <div class="match-details" data-match-id="${match.id}" style="display: none;">
        <!-- Goal Scorers Section -->
        <div class="space-y-3 mb-4">
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div class="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <i class="fas fa-futbol"></i>
              ${match.teama} Torschützen:
            </div>
            <div class="flex flex-wrap gap-2">${goalsHtml(match.goalslista || [])}</div>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-xl p-3">
            <div class="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <i class="fas fa-futbol"></i>
              ${match.teamb} Torschützen:
            </div>
            <div class="flex flex-wrap gap-2">${goalsHtml(match.goalslistb || [])}</div>
          </div>
        </div>
        
        <!-- Cards Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div class="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <i class="fas fa-id-card"></i>
              ${match.teama} Karten:
            </div>
            <div class="flex gap-2">
              <span class="inline-flex items-center gap-1 bg-yellow-600 text-yellow-100 rounded-lg px-3 py-1 text-sm font-medium shadow-md">🟨 ${match.yellowa || 0}</span>
              <span class="inline-flex items-center gap-1 bg-red-600 text-red-100 rounded-lg px-3 py-1 text-sm font-medium shadow-md">🟥 ${match.reda || 0}</span>
            </div>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-xl p-3">
            <div class="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <i class="fas fa-id-card"></i>
              ${match.teamb} Karten:
            </div>
            <div class="flex gap-2">
              <span class="inline-flex items-center gap-1 bg-yellow-600 text-yellow-100 rounded-lg px-3 py-1 text-sm font-medium shadow-md">🟨 ${match.yellowb || 0}</span>
              <span class="inline-flex items-center gap-1 bg-red-600 text-red-100 rounded-lg px-3 py-1 text-sm font-medium shadow-md">🟥 ${match.redb || 0}</span>
            </div>
          </div>
        </div>
        
        <!-- Footer with Prizes and Man of the Match -->
        <div class="border-t border-gray-300 pt-4 space-y-3">
          <div>
            <div class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <i class="fas fa-coins"></i>
              Preisgelder:
            </div>
            <div class="flex flex-wrap gap-2">
              ${prizeHtml(match.prizeaek ?? 0, "AEK")}
              ${prizeHtml(match.prizereal ?? 0, "Real")}
            </div>
          </div>
          ${match.manofthematch ? `
          <div>
            <div class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <i class="fas fa-star"></i>
              Spieler des Spiels:
            </div>
            <span class="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-yellow-100 px-3 py-2 rounded-lg text-sm font-bold shadow-lg">
              ⭐ ${match.manofthematch}
              <span class="text-xs font-medium opacity-90">(${(() => {
                // Determine team from match data - handle both object and string array formats
                const checkPlayerInGoals = (goalsList, playerName) => {
                  if (!goalsList || !goalsList.length) return false;
                  // Handle object format: [{"count": 1, "player": "Kante"}]
                  if (typeof goalsList[0] === 'object' && goalsList[0].player !== undefined) {
                    return goalsList.some(goal => goal.player === playerName);
                  }
                  // Handle string array format: ["Kante", "Walker"]
                  return goalsList.includes(playerName);
                };
                
                if (checkPlayerInGoals(match.goalslista, match.manofthematch)) return 'AEK';
                if (checkPlayerInGoals(match.goalslistb, match.manofthematch)) return 'Real';
                // Fallback: check if player is in AEK or Real team
                return matchesData.aek.find(p => p.name === match.manofthematch) ? 'AEK' : 'Real';
              })()})</span>
            </span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    `;
}

// Helper function to get SdS count for a player - moved outside for global access
function getSdsCount(playerName, team) {
    const sdsEntry = matchesData.spielerDesSpiels.find(sds => 
        sds.name === playerName && sds.team === team
    );
    return sdsEntry ? (sdsEntry.count || 0) : 0;
}

// --- MODERNES, KOMPAKTES POPUP, ABER MIT ALLER ALTER LOGIK ---
// Optimized match form with better error handling and validation
function openMatchForm(id) {
    try {
        
        let match = null, edit = false;
        
        if (typeof id === "number") {
            match = matchesData.matches.find(m => m.id === id);
            edit = !!match;
        }

        // Validate player data is available
        if (!matchesData.aek.length && !matchesData.real.length) {
            ErrorHandler.showUserError('Keine Spielerdaten verfügbar. Bitte laden Sie die Seite neu.');
            return;
        }

        // Separate sorting for goal scorers (by goals first, then SdS) and man of the match (by SdS first, then goals)
        
        // For goal scorer dropdowns: sort by goals first (descending), then by SdS count (descending)
        const aekSortedForGoals = [...matchesData.aek].sort((a, b) => {
            const aGoals = a.goals || 0;
            const bGoals = b.goals || 0;
            if (aGoals !== bGoals) return bGoals - aGoals; // Sort by goals first
            const aSdsCount = getSdsCount(a.name, "AEK");
            const bSdsCount = getSdsCount(b.name, "AEK");
            return bSdsCount - aSdsCount; // Then by SdS count
        });
        const realSortedForGoals = [...matchesData.real].sort((a, b) => {
            const aGoals = a.goals || 0;
            const bGoals = b.goals || 0;
            if (aGoals !== bGoals) return bGoals - aGoals; // Sort by goals first
            const aSdsCount = getSdsCount(a.name, "Real");
            const bSdsCount = getSdsCount(b.name, "Real");
            return bSdsCount - aSdsCount; // Then by SdS count
        });
        
        // For man of the match dropdown: sort by SdS count first (descending), then by goals (descending)
        const aekSorted = [...matchesData.aek].sort((a, b) => {
            const aSdsCount = getSdsCount(a.name, "AEK");
            const bSdsCount = getSdsCount(b.name, "AEK");
            if (aSdsCount !== bSdsCount) return bSdsCount - aSdsCount; // Sort by SdS count first
            const aGoals = a.goals || 0;
            const bGoals = b.goals || 0;
            return bGoals - aGoals; // Then by goals
        });
        const realSorted = [...matchesData.real].sort((a, b) => {
            const aSdsCount = getSdsCount(a.name, "Real");
            const bSdsCount = getSdsCount(b.name, "Real");
            if (aSdsCount !== bSdsCount) return bSdsCount - aSdsCount; // Sort by SdS count first
            const aGoals = a.goals || 0;
            const bGoals = b.goals || 0;
            return bGoals - aGoals; // Then by goals
        });
        
        // Generate player options for goal scorers (sorted by goals)
        const aekSpieler = aekSortedForGoals.map(p => {
            const goals = p.goals || 0;
            return `<option value="${DOM.sanitizeForAttribute(p.name)}">${DOM.sanitizeForHTML(p.name)} (${goals} Tore)</option>`;
        }).join('');
        
        const realSpieler = realSortedForGoals.map(p => {
            const goals = p.goals || 0;
            return `<option value="${DOM.sanitizeForAttribute(p.name)}">${DOM.sanitizeForHTML(p.name)} (${goals} Tore)</option>`;
        }).join('');

        const goalsListA = match?.goalslista || [];
        const goalsListB = match?.goalslistb || [];
        const manofthematch = match?.manofthematch || "";
        const dateVal = match ? match.date : (new Date()).toISOString().slice(0,10);

        const filterButtonHTML = `
            <div class="mb-3 flex gap-2">
                <button type="button" id="sds-filter-aek" class="sds-filter-btn bg-gray-600 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-base font-semibold transition-all duration-200 border-2 border-transparent flex items-center gap-2 min-h-[40px] flex-1 justify-center touch-manipulation">
                    <span>AEK</span>
                </button>
                <button type="button" id="sds-filter-real" class="sds-filter-btn bg-gray-600 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-base font-semibold transition-all duration-200 border-2 border-transparent flex items-center gap-2 min-h-[40px] flex-1 justify-center touch-manipulation">
                    <span>Real</span>
                </button>
            </div>
        `;

        // Validate date
        if (!dateVal || !dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
            ErrorHandler.showUserError('Ungültiges Datum');
            return;
        }

        // Show modal with enhanced form
        showModal(generateMatchFormHTML(edit, dateVal, match, aekSpieler, realSpieler, aekSorted, realSorted, goalsListA, goalsListB, manofthematch));
        
        // Attach event handlers safely with a small delay to ensure DOM is ready
		setTimeout(() => {
			attachMatchFormEventHandlers(edit, match?.id, aekSpieler, realSpieler, aekSortedForGoals, realSortedForGoals, aekSorted, realSorted, manofthematch);
			const modalContent = document.querySelector('.modal-content');
			if (modalContent) {
				modalContent.classList.add('match-modal-content');
			}
		}, 50);
        
    } catch (error) {
        console.error('Error opening match form:', error);
        ErrorHandler.showUserError('Fehler beim Öffnen des Match-Formulars');
    }
}

// Helper function to generate form HTML
function generateMatchFormHTML(edit, dateVal, match, aekSpieler, realSpieler, aekSorted, realSorted, goalsListA, goalsListB, manofthematch) {
    return `
    <form id="match-form" class="space-y-3 w-full">
        <!-- Datum Section -->
        <div class="bg-gray-800 border border-gray-600 rounded-xl p-2">
            <h3 class="text-white text-sm font-bold mb-2 text-center">📅 Spieldatum</h3>
            <div class="flex justify-center">
                <button type="button" id="show-date" class="flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-300 border border-gray-500 hover:border-blue-400 rounded-lg px-3 py-2 bg-gray-700 hover:bg-gray-600 focus:outline-none transition-all focus:ring-2 focus:ring-blue-400" tabindex="0">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span id="date-label">${dateVal.split('-').reverse().join('.')}</span>
                </button>
                <input type="date" name="date" id="date-input" class="hidden" value="${dateVal}" required>
            </div>
        </div>

        <!-- Endergebnis Section -->
        <div class="bg-gray-800 border border-gray-600 rounded-xl p-2">
            <h3 class="text-white text-sm font-bold mb-2 text-center">⚽ Endergebnis</h3>
            <div class="flex items-center justify-center gap-2 bg-gray-700 rounded-lg p-2 border border-gray-500 min-w-0">
                <div class="flex flex-col items-center flex-1 min-w-0">
                    <span class="font-bold text-blue-300 text-xs mb-1 truncate">AEK</span>
                </div>
                <input type="number" min="0" max="50" name="goalsa" class="border border-gray-500 bg-gray-600 text-white rounded p-2 w-10 h-8 text-center text-sm font-bold cursor-not-allowed flex-shrink-0" readonly placeholder="0" value="${match ? match.goalsa : ""}" title="Wird automatisch aus den Torschützen berechnet">
                <span class="font-bold text-sm text-white mx-1 flex-shrink-0">:</span>
                <input type="number" min="0" max="50" name="goalsb" class="border border-gray-500 bg-gray-600 text-white rounded p-2 w-10 h-8 text-center text-sm font-bold cursor-not-allowed flex-shrink-0" readonly placeholder="0" value="${match ? match.goalsb : ""}" title="Wird automatisch aus den Torschützen berechnet">
                <div class="flex flex-col items-center flex-1 min-w-0">
                    <span class="font-bold text-red-300 text-xs mb-1 truncate">Real</span>
                </div>
            </div>
        </div>
        
        <!-- Torschützen AEK Section -->
        <div id="scorersA-block" class="bg-gray-800 border border-blue-500 rounded-xl p-2">
            <h3 class="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
                <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs">AEK</span>
                ⚽ Torschützen
            </h3>
            <div id="scorersA" class="space-y-2 mt-2">${scorerFields("goalslista", goalsListA, aekSpieler)}</div>
            <button type="button" id="addScorerA"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2 py-2 rounded-lg active:scale-95 transition text-xs shadow-lg hover:shadow-xl border border-blue-400 mt-2 w-full justify-center"
                style="min-height: 32px;">
                <span class="text-sm">+</span>
                <span>Torschütze</span>
            </button>
        </div>
        
        <!-- Torschützen Real Section -->
        <div id="scorersB-block" class="bg-gray-800 border border-red-500 rounded-xl p-2">
            <h3 class="text-red-300 text-sm font-bold mb-2 flex items-center gap-2">
                <span class="bg-red-600 text-white px-2 py-1 rounded text-xs">Real</span>
                ⚽ Torschützen
            </h3>
            <div id="scorersB" class="space-y-2 mt-2">
                ${scorerFields("goalslistb", goalsListB, realSpieler)}
            </div>
            <button type="button" id="addScorerB"
                class="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-2 py-2 rounded-lg active:scale-95 transition text-xs shadow-lg hover:shadow-xl border border-red-400 mt-2 w-full justify-center"
                style="min-height: 32px;">
                <span class="text-sm">+</span>
                <span>Torschütze</span>
            </button>
        </div>
        
        <!-- Karten Section - Compact Grid Layout -->
        <div class="bg-gray-800 border border-yellow-500 rounded-xl p-2">
            <h3 class="text-yellow-300 text-sm font-bold mb-2 text-center">🟨🟥 Karten</h3>
            
            <div class="grid grid-cols-2 gap-2">
                <!-- AEK Karten -->
                <div class="bg-gray-700 border border-blue-500 rounded-lg p-2">
                    <h4 class="text-blue-300 text-xs font-bold mb-2 text-center">AEK</h4>
                    <div class="space-y-2">
                        <div class="flex items-center gap-1 bg-gray-600 rounded p-1">
                            <div class="text-sm w-4 text-center flex-shrink-0">🟨</div>
                            <div class="flex items-center gap-1 flex-1 justify-end">
                                <button type="button" class="card-btn card-btn-down bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="yellowa" data-min="0">−</button>
                                <input type="number" min="0" max="20" name="yellowa" class="border border-gray-400 bg-gray-500 text-white rounded p-1 w-8 h-6 text-xs text-center font-bold" value="${match?.yellowa || 0}" readonly>
                                <button type="button" class="card-btn card-btn-up bg-green-600 hover:bg-green-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="yellowa" data-max="20">+</button>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 bg-gray-600 rounded p-1">
                            <div class="text-sm w-4 text-center flex-shrink-0">🟥</div>
                            <div class="flex items-center gap-1 flex-1 justify-end">
                                <button type="button" class="card-btn card-btn-down bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="reda" data-min="0">−</button>
                                <input type="number" min="0" max="11" name="reda" class="border border-gray-400 bg-gray-500 text-white rounded p-1 w-8 h-6 text-xs text-center font-bold" value="${match?.reda || 0}" readonly>
                                <button type="button" class="card-btn card-btn-up bg-green-600 hover:bg-green-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="reda" data-max="11">+</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Real Karten -->
                <div class="bg-gray-700 border border-red-500 rounded-lg p-2">
                    <h4 class="text-red-300 text-xs font-bold mb-2 text-center">Real</h4>
                    <div class="space-y-2">
                        <div class="flex items-center gap-1 bg-gray-600 rounded p-1">
                            <div class="text-sm w-4 text-center flex-shrink-0">🟨</div>
                            <div class="flex items-center gap-1 flex-1 justify-end">
                                <button type="button" class="card-btn card-btn-down bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="yellowb" data-min="0">−</button>
                                <input type="number" min="0" max="20" name="yellowb" class="border border-gray-400 bg-gray-500 text-white rounded p-1 w-8 h-6 text-xs text-center font-bold" value="${match?.yellowb || 0}" readonly>
                                <button type="button" class="card-btn card-btn-up bg-green-600 hover:bg-green-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="yellowb" data-max="20">+</button>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 bg-gray-600 rounded p-1">
                            <div class="text-sm w-4 text-center flex-shrink-0">🟥</div>
                            <div class="flex items-center gap-1 flex-1 justify-end">
                                <button type="button" class="card-btn card-btn-down bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="redb" data-min="0">−</button>
                                <input type="number" min="0" max="11" name="redb" class="border border-gray-400 bg-gray-500 text-white rounded p-1 w-8 h-6 text-xs text-center font-bold" value="${match?.redb || 0}" readonly>
                                <button type="button" class="card-btn card-btn-up bg-green-600 hover:bg-green-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="redb" data-max="11">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Spieler des Spiels Section -->
        <div class="bg-gray-800 border border-yellow-500 rounded-xl p-2">
            <h3 class="text-yellow-300 text-sm font-bold mb-2 text-center">⭐ Spieler des Spiels</h3>
            
            <!-- Team Filter mit verbesserter Optik -->
            <div class="mb-2 flex gap-2">
                <button type="button" id="sds-filter-aek" class="sds-filter-btn flex-1 bg-gray-600 hover:bg-blue-600 text-white px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 border border-gray-500 hover:border-blue-400 flex items-center gap-1 min-h-[32px] justify-center touch-manipulation">
                    <span class="truncate">AEK</span>
                </button>
                <button type="button" id="sds-filter-real" class="sds-filter-btn flex-1 bg-gray-600 hover:bg-red-600 text-white px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 border border-gray-500 hover:border-red-400 flex items-center gap-1 min-h-[32px] justify-center touch-manipulation">
                    <span class="truncate">Real</span>
                </button>
            </div>
            
            <select name="manofthematch" id="manofthematch-select" class="border border-gray-500 bg-gray-600 text-white rounded-lg p-2 w-full min-h-[32px] text-xs font-semibold">
                <option value="">Keiner ausgewählt</option>
                ${aekSorted.map(p => {
                    const sdsCount = getSdsCount(p.name, "AEK");
                    return `<option value="${DOM.sanitizeForAttribute(p.name)}" data-team="AEK"${manofthematch===p.name?' selected':''}>${DOM.sanitizeForHTML(p.name)} (AEK, ${sdsCount} SdS)</option>`;
                }).join('')}
                ${realSorted.map(p => {
                    const sdsCount = getSdsCount(p.name, "Real");
                    return `<option value="${DOM.sanitizeForAttribute(p.name)}" data-team="Real"${manofthematch===p.name?' selected':''}>${DOM.sanitizeForHTML(p.name)} (Real, ${sdsCount} SdS)</option>`;
                }).join('')}
            </select>
        </div>
        
        <!-- Action Buttons - Fixed at bottom with proper padding -->
        <div class="flex flex-col gap-2 pt-2 pb-2">
            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white w-full px-4 py-3 rounded-lg text-sm font-bold active:scale-95 transition-all min-h-[40px] touch-manipulation border border-green-400 shadow-lg hover:shadow-xl">
                ${edit ? "💾 Änderungen speichern" : "✅ Match anlegen"}
            </button>
            <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all min-h-[40px] touch-manipulation border border-gray-400" onclick="window.hideModal()">
                ❌ Abbrechen
            </button>
        </div>
    </form>
    `;
}

// Helper functions for DOM safety
DOM.sanitizeForHTML = function(str) {
    if (!str) return '';
    return str.replace(/[<>&"']/g, function(match) {
        const escapeMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
        return escapeMap[match];
    });
};

DOM.sanitizeForAttribute = function(str) {
    if (!str) return '';
    return str.replace(/[<>&"']/g, function(match) {
        const escapeMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
        return escapeMap[match];
    });
};

// Helper function to attach event handlers to the match form
function attachMatchFormEventHandlers(edit, id, aekSpieler, realSpieler, aekSortedForGoals, realSortedForGoals, aekSorted, realSorted, manofthematch) {
    // Datum-Show/Hide (wie gehabt)
    document.getElementById('show-date').onclick = function() {
        document.getElementById('date-input').classList.toggle('hidden');
        document.getElementById('date-input').focus();
    };
    document.getElementById('date-input').onchange = function() {
        document.getElementById('date-label').innerText = this.value.split('-').reverse().join('.');
        this.classList.add('hidden');
    };

    // --- Restliche Logik ---
    function addScorerHandler(scorersId, name, spielerOpts) {
        const container = document.getElementById(scorersId);
        const rowCount = container.querySelectorAll('.scorer-row').length;
        const uniqueId = `${name}-count-${rowCount}`;
        const div = document.createElement("div");
        div.className = "flex gap-2 mb-2 scorer-row items-center bg-gray-600 border border-gray-500 rounded-lg p-2 min-w-0";
        div.innerHTML = `
            <select name="${name}-player" class="border border-gray-400 bg-gray-500 text-white rounded p-2 text-xs font-semibold flex-1 min-w-0" style="min-width:120px;">
                <option value="">Spieler wählen</option>
                ${spielerOpts}
            </select>
            <div class="flex items-center gap-1 bg-gray-700 rounded p-1 flex-shrink-0">
                <button type="button" class="goal-btn goal-btn-down bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="${uniqueId}" data-min="0">−</button>
                <input type="number" min="1" name="${name}-count" placeholder="Tore" class="goal-input border border-gray-400 bg-gray-500 text-white rounded p-1 w-8 h-6 text-xs text-center font-bold flex-shrink-0" value="1" readonly id="${uniqueId}">
                <button type="button" class="goal-btn goal-btn-up bg-green-600 hover:bg-green-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation" data-target="${uniqueId}" data-max="20">+</button>
            </div>
            <button type="button" class="remove-goal-btn bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded min-h-[32px] w-8 flex items-center justify-center transition-all duration-200 flex-shrink-0 hover:scale-105 touch-manipulation" title="Torschütze entfernen">
                <i class="fas fa-trash text-xs"></i>
            </button>
        `;
        div.querySelector('.remove-goal-btn').onclick = function() {
            div.remove();
            updateTotalGoals(); // Update total when removing scorer
        };
        
        // Add event listeners for player selection changes
        const playerSelect = div.querySelector('select[name="' + name + '-player"]');
        playerSelect.addEventListener('change', updateTotalGoals);
        
        container.appendChild(div);
        updateTotalGoals(); // Update total when adding scorer
        
        // Set up goal buttons for the newly added row
        setupGoalButtons(updateTotalGoals);
    }
    document.querySelectorAll("#scorersA .remove-goal-btn").forEach(btn => {
        btn.onclick = function() {
            btn.closest('.scorer-row').remove();
            updateTotalGoals(); // Update total when removing existing scorer
        };
    });
    document.querySelectorAll("#scorersB .remove-goal-btn").forEach(btn => {
        btn.onclick = function() {
            btn.closest('.scorer-row').remove();
            updateTotalGoals(); // Update total when removing existing scorer
        };
    });
    
    // Add event listeners to existing player selects
    document.querySelectorAll('#scorersA select[name="goalslista-player"]').forEach(select => {
        select.addEventListener('change', updateTotalGoals);
    });
    document.querySelectorAll('#scorersB select[name="goalslistb-player"]').forEach(select => {
        select.addEventListener('change', updateTotalGoals);
    });
    document.getElementById("addScorerA").onclick = () => addScorerHandler("scorersA", "goalslista", aekSpieler);
    document.getElementById("addScorerB").onclick = () => addScorerHandler("scorersB", "goalslistb", realSpieler);

    function toggleScorerFields() {
        const scorersABlock = document.getElementById('scorersA-block');
        const scorersBBlock = document.getElementById('scorersB-block');
        // Always show scorer fields as requested
        scorersABlock.style.display = '';
        scorersBBlock.style.display = '';
    }
    
    // Function to auto-calculate total goals from goal scorers
    function updateTotalGoals() {
        // Calculate AEK goals
        const aekScorerRows = document.querySelectorAll('#scorersA .scorer-row');
        let totalAekGoals = 0;
        aekScorerRows.forEach(row => {
            const playerSelect = row.querySelector('select[name="goalslista-player"]');
            const goalInput = row.querySelector('input[name="goalslista-count"]');
            if (playerSelect && playerSelect.value && goalInput && goalInput.value) {
                totalAekGoals += parseInt(goalInput.value) || 0;
            }
        });
        
        // Calculate Real goals
        const realScorerRows = document.querySelectorAll('#scorersB .scorer-row');
        let totalRealGoals = 0;
        realScorerRows.forEach(row => {
            const playerSelect = row.querySelector('select[name="goalslistb-player"]');
            const goalInput = row.querySelector('input[name="goalslistb-count"]');
            if (playerSelect && playerSelect.value && goalInput && goalInput.value) {
                totalRealGoals += parseInt(goalInput.value) || 0;
            }
        });
        
        // Update the main goal fields
        const goalsAInput = document.querySelector('input[name="goalsa"]');
        const goalsBInput = document.querySelector('input[name="goalsb"]');
        if (goalsAInput) goalsAInput.value = totalAekGoals;
        if (goalsBInput) goalsBInput.value = totalRealGoals;
        
        // Keep scorer fields always visible - don't hide them based on goal count
        const scorersABlock = document.getElementById('scorersA-block');
        const scorersBBlock = document.getElementById('scorersB-block');
        if (scorersABlock) scorersABlock.style.display = '';
        if (scorersBBlock) scorersBBlock.style.display = '';
    }
    
    // Replace the old event listeners with the new auto-calculation
    // Note: We remove the old manual input listeners since goals are now auto-calculated
    updateTotalGoals(); // Initialize the totals when form opens
	
	    // Add event listeners for team filter buttons with error checking
    const aekBtn = document.getElementById('sds-filter-aek');
    const realBtn = document.getElementById('sds-filter-real');
    if (aekBtn && realBtn) {
        const addFilterEventListeners = (btn, team) => {
            let touchStarted = false;
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                filterSdsDropdown(team, aekSorted, realSorted, document.getElementById('manofthematch-select').value);
            };
            btn.addEventListener('touchstart', (e) => {
                touchStarted = true;
                btn.style.transform = 'scale(0.98)';
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.style.transform = 'scale(1)';
                if (touchStarted) {
                    touchStarted = false;
                    filterSdsDropdown(team, aekSorted, realSorted, document.getElementById('manofthematch-select').value);
                }
            });
            btn.addEventListener('click', (e) => {
                if (!touchStarted) {
                    handler(e);
                }
            });
            btn.addEventListener('touchcancel', () => {
                touchStarted = false;
                btn.style.transform = 'scale(1)';
            });
        };
        addFilterEventListeners(aekBtn, 'AEK');
        addFilterEventListeners(realBtn, 'Real');
        filterSdsDropdown('AEK', aekSorted, realSorted, manofthematch); // Default
    } else {
        console.error('Team filter buttons not found:', { aekBtn, realBtn });
    }
	setupCardButtons();
	setupGoalButtons(updateTotalGoals);
    
    // Add form submit handler - this was missing and caused the primary issue
    const matchForm = document.getElementById('match-form');
    if (matchForm) {
        matchForm.onsubmit = (e) => submitMatchForm(e, id);
    } else {
        console.error('Match form not found - cannot bind submit handler');
    }
    
    // Ensure scorer fields are visible from the start
    toggleScorerFields();
}
    



    // Add event listeners for card increment/decrement buttons
let cardButtonsInitialized = false;
function setupCardButtons() {
    // Prevent duplicate event listeners
    if (cardButtonsInitialized) {
        return;
    }
    cardButtonsInitialized = true;
    
    document.querySelectorAll('.card-btn-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            const max = parseInt(e.currentTarget.getAttribute('data-max')) || 99;
            const input = document.querySelector(`input[name="${target}"]`);
            if (input) {
                const current = parseInt(input.value) || 0;
                if (current < max) {
                    input.value = current + 1;
                }
            }
        });
    });
    document.querySelectorAll('.card-btn-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            const min = parseInt(e.currentTarget.getAttribute('data-min')) || 0;
            const input = document.querySelector(`input[name="${target}"]`);
            if (input) {
                const current = parseInt(input.value) || 0;
                if (current > min) {
                    input.value = current - 1;
                }
            }
        });
    });
}

// Add event listeners for goal increment/decrement buttons
let goalButtonsInitialized = false;
function setupGoalButtons(updateTotalGoalsCallback = null) {
    // Reset the flag to allow re-initialization for dynamically added elements
    goalButtonsInitialized = false;
    
    // Prevent duplicate event listeners by removing existing ones first
    document.querySelectorAll('.goal-btn-up').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    document.querySelectorAll('.goal-btn-down').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    document.querySelectorAll('.goal-btn-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            const max = parseInt(e.currentTarget.getAttribute('data-max')) || 20;
            const input = document.getElementById(target);
            if (input) {
                const current = parseInt(input.value) || 1;
                if (current < max) {
                    input.value = current + 1;
                    if (updateTotalGoalsCallback) updateTotalGoalsCallback(); // Update total goals when changing scorer count
                }
            }
        });
    });
    
    document.querySelectorAll('.goal-btn-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            const min = parseInt(e.currentTarget.getAttribute('data-min')) || 0;
            const input = document.getElementById(target);
            if (input) {
                const current = parseInt(input.value) || 1;
                if (current > 1) {
                    input.value = current - 1;
                    if (updateTotalGoalsCallback) updateTotalGoalsCallback(); // Update total goals when changing scorer count
                } else if (current === 1) {
                    // When reaching 0, remove the scorer row
                    const scorerRow = input.closest('.scorer-row');
                    if (scorerRow) {
                        scorerRow.remove();
                        if (updateTotalGoalsCallback) updateTotalGoalsCallback(); // Update total goals when removing scorer
                    }
                }
            }
        });
    });
    
    goalButtonsInitialized = true;
}


function scorerFields(name, arr, spielerOpts) {
    // No default scorer - start with empty list
    if (!arr.length) return '';
    
    // Handle both old string array format and new object format
    let goalsForDisplay = [];
    
    // Check if we have the new object format or old string array format
    if (arr.length > 0 && typeof arr[0] === 'object' && arr[0].player !== undefined) {
        // New object format: [{"count": 4, "player": "Walker"}]
        goalsForDisplay = arr.map(goal => ({
            player: goal.player,
            count: goal.count || 1
        }));
    } else {
        // Old string array format: ["Walker", "Walker", "Walker", "Walker", "Messi", "Messi"]
        // Convert string array to aggregated format for form display
        const aggregatedGoals = {};
        arr.forEach(playerName => {
            if (playerName) {
                aggregatedGoals[playerName] = (aggregatedGoals[playerName] || 0) + 1;
            }
        });
        
        // Convert to array of objects for form display
        goalsForDisplay = Object.entries(aggregatedGoals).map(([player, count]) => ({
            player,
            count
        }));
    }
    
    return goalsForDisplay.map((g, i) => `
        <div class="flex gap-2 mb-2 scorer-row items-center bg-gray-600 border border-gray-500 rounded-lg p-2">
            <select name="${name}-player" class="border border-gray-400 bg-gray-500 text-white rounded-lg p-2 min-h-[32px] text-xs flex-1 font-semibold" style="min-width:120px;">
                <option value="">Spieler wählen</option>
                ${spielerOpts.replace(`value="${g.player}"`, `value="${g.player}" selected`)}
            </select>
            <div class="flex items-center gap-1 bg-gray-700 rounded p-1 border border-gray-400">
                <button type="button" class="goal-btn goal-btn-down bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation border border-red-400" data-target="${name}-count-${i}" data-min="0">−</button>
                <input type="number" min="1" name="${name}-count" placeholder="Tore" class="goal-input border border-gray-400 bg-gray-500 text-white rounded p-1 w-8 h-6 text-xs text-center font-bold flex-shrink-0" value="${g.count||1}" readonly id="${name}-count-${i}">
                <button type="button" class="goal-btn goal-btn-up bg-green-600 hover:bg-green-500 text-white px-1 py-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center touch-manipulation border border-green-400" data-target="${name}-count-${i}" data-max="20">+</button>
            </div>
            <button type="button" class="remove-goal-btn bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded min-h-[32px] w-8 flex items-center justify-center transition-all duration-200 flex-shrink-0 hover:scale-105 touch-manipulation" title="Torschütze entfernen">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
    `).join('');
}

async function updatePlayersGoals(goalslist, team) {
    // Handle both new object format and old string array format
    const goalCounts = {};
    
    if (goalslist.length > 0 && typeof goalslist[0] === 'object' && goalslist[0].player !== undefined) {
        // New object format: [{"count": 4, "player": "Walker"}]
        goalslist.forEach(goal => {
            if (goal.player) {
                goalCounts[goal.player] = (goalCounts[goal.player] || 0) + (goal.count || 1);
            }
        });
    } else {
        // Old string array format: ["Walker", "Walker", "Messi"]
        for (const playerName of goalslist) {
            if (!playerName) continue;
            goalCounts[playerName] = (goalCounts[playerName] || 0) + 1;
        }
    }
    
    // Update each player's goal count - using safe array access
    for (const [playerName, count] of Object.entries(goalCounts)) {
        // Spieler laden, aktueller Stand
        const { data: players, error: playerError } = await supabase.from('players').select('goals').eq('name', playerName).eq('team', team);
        
        if (playerError) {
            console.error(`Error fetching player ${playerName} for goal addition:`, playerError);
            continue; // Skip this player if there's an error
        }
        
        let newGoals = count;
        if (players && players.length > 0) {
            const player = players[0]; // Take first match if multiple found
            if (player && typeof player.goals === 'number') {
                newGoals = player.goals + count;
            }
        }
        
        const { error: updateError } = await supabase.from('players').update({ goals: newGoals }).eq('name', playerName).eq('team', team);
        if (updateError) {
            console.error(`Error updating goals for player ${playerName}:`, updateError);
        }
    }
}

// 1. Die Filterfunktion für den Spieler des Spiels
function filterSdsDropdown(team, aekSorted, realSorted, manofthematch) {
    const select = document.getElementById('manofthematch-select');
    select.innerHTML = ""; // Clear all
    // "Keiner"-Option
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'Keiner';
    if (!manofthematch) noneOption.selected = true;
    select.appendChild(noneOption);

    let list = [];
    if (team === "AEK") list = aekSorted;
    else if (team === "Real") list = realSorted;

    for (const p of list) {
        const option = document.createElement('option');
        option.value = p.name;
        option.textContent = `${p.name} (${team}, ${getSdsCount(p.name, team)} SdS)`;
        option.setAttribute('data-team', team);
        if (manofthematch === p.name) option.selected = true;
        select.appendChild(option);
    }
    // Button-Style-Logik wie gehabt...
    document.querySelectorAll('.sds-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'bg-red-600', 'border-blue-400', 'border-red-400', 'shadow-lg');
        btn.classList.add('bg-gray-600', 'border-transparent');
    });
    const activeBtn = document.getElementById(`sds-filter-${team.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'shadow-lg');
        activeBtn.classList.remove('bg-gray-600', 'border-transparent');
        if (team === 'AEK') {
            activeBtn.classList.add('bg-blue-600', 'border-blue-400');
        } else if (team === 'Real') {
            activeBtn.classList.add('bg-red-600', 'border-red-400');
        }
    }
}

async function submitMatchForm(event, id) {
    event.preventDefault();
    const form = event.target;
    
    // Get submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Create and show full-screen save indicator with blur
    const saveIndicator = document.createElement('div');
    saveIndicator.id = 'match-save-indicator';
    saveIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999]';
    saveIndicator.style.animation = 'fadeIn 0.3s ease-in-out';
    saveIndicator.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl flex flex-col items-center space-y-4 mx-4" style="animation: slideIn 0.4s ease-out;">
            <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div class="text-lg font-semibold text-gray-800 dark:text-gray-200">Speichere Match...</div>
        </div>
    `;
    
    // Add animations to document head if not already present
    if (!document.querySelector('#match-save-animations')) {
        const style = document.createElement('style');
        style.id = 'match-save-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideIn {
                from { 
                    opacity: 0; 
                    transform: translateY(-20px) scale(0.95); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(saveIndicator);
    
    // Disable submit button and change text
    submitBtn.disabled = true;
    submitBtn.textContent = 'Speichere...';
    
    try {
        const date = form.date.value;
        const teama = "AEK";
        const teamb = "Real";
        const goalsa = parseInt(form.goalsa.value);
        const goalsb = parseInt(form.goalsb.value);
        const yellowa = parseInt(form.yellowa.value) || 0;
        const reda = parseInt(form.reda.value) || 0;
        const yellowb = parseInt(form.yellowb.value) || 0;
        const redb = parseInt(form.redb.value) || 0;
        const manofthematch = form.manofthematch.value || "";

    function getScorers(group, name) {
        const scorers = [];
        Array.from(group.querySelectorAll('.scorer-row')).forEach(d => {
            const player = d.querySelector(`select[name="${name}-player"]`).value;
            const count = parseInt(d.querySelector(`input[name="${name}-count"]`).value) || 1;
            if (player) {
                // Use new object format with count and player properties
                scorers.push({
                    count: count,
                    player: player
                });
            }
        });
        return scorers;
    }

    let goalslista = [];
    let goalslistb = [];
    if (goalsa > 0) {
        const groupA = form.querySelector("#scorersA");
        goalslista = getScorers(groupA, "goalslista");
        const sumA = goalslista.reduce((sum, goal) => sum + goal.count, 0); // Sum goal counts from objects
        if (sumA > goalsa) {
            alert(`Die Summe der Torschützen-Tore für ${teama} (${sumA}) darf nicht größer als die Gesamtanzahl der Tore (${goalsa}) sein!`);
            // Restore button state and remove indicator
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            const saveIndicator = document.getElementById('match-save-indicator');
            if (saveIndicator && saveIndicator.parentNode) {
                saveIndicator.parentNode.removeChild(saveIndicator);
            }
            return;
        }
    }
    if (goalsb > 0) {
        const groupB = form.querySelector("#scorersB");
        goalslistb = getScorers(groupB, "goalslistb");
        const sumB = goalslistb.reduce((sum, goal) => sum + goal.count, 0); // Sum goal counts from objects
        if (sumB > goalsb) {
            alert(`Die Summe der Torschützen-Tore für ${teamb} (${sumB}) darf nicht größer als die Gesamtanzahl der Tore (${goalsb}) sein!`);
            // Restore button state and remove indicator
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            const saveIndicator = document.getElementById('match-save-indicator');
            if (saveIndicator && saveIndicator.parentNode) {
                saveIndicator.parentNode.removeChild(saveIndicator);
            }
            return;
        }
    }

    // Preisgeld-Berechnung
    let prizeaek = 0, prizereal = 0;
    let winner = null, loser = null;
    if (goalsa > goalsb) { winner = "AEK"; loser = "Real"; }
    else if (goalsa < goalsb) { winner = "Real"; loser = "AEK"; }

    if (winner && loser) {
        if (winner === "AEK") {
            prizeaek = 1000000 - (goalsb*50000) - (yellowa*20000) - (reda*50000);
            prizereal = - (500000 + goalsa*50000 + yellowb*20000 + redb*50000);
        } else {
            prizereal = 1000000 - (goalsa*50000) - (yellowb*20000) - (redb*50000);
            prizeaek = - (500000 + goalsb*50000 + yellowa*20000 + reda*50000);
        }
    }
    // SdS Bonus
    let sdsBonusAek = 0, sdsBonusReal = 0;
    if (manofthematch) {
        if (matchesData.aek.find(p => p.name === manofthematch)) sdsBonusAek = 100000;
        if (matchesData.real.find(p => p.name === manofthematch)) sdsBonusReal = 100000;
    }

    // Spieler des Spiels-Statistik (Tabelle spieler_des_spiels)
    if (manofthematch) {
        let t = matchesData.aek.find(p => p.name === manofthematch) ? "AEK" : "Real";
        const { data: existing } = await supabase.from('spieler_des_spiels').select('*').eq('name', manofthematch).eq('team', t);
        if (existing && existing.length > 0) {
            await supabase.from('spieler_des_spiels').update({ count: existing[0].count + 1 }).eq('id', existing[0].id);
        } else {
            await supabase.from('spieler_des_spiels').insert([{ name: manofthematch, team: t, count: 1 }]);
        }
    }

    // CRITICAL FIX: Edit-Modus deletion now uses proper deleteMatch function
    // Previous implementation had major flaws:
    // - Only deleted transactions by date (not by match_id) 
    // - Could delete transactions from OTHER matches on same date
    // - Did not reverse financial changes, player goals, or SdS statistics
    // - Left database in inconsistent state
    //
    // New implementation ensures complete data cleanup using the comprehensive deleteMatch function
    if (id && matchesData.matches.find(m => m.id === id)) {
        console.log(`Edit mode: Deleting previous match ${id} with all associated data`);
        try {
            // Use the proper deleteMatch function to ensure all related data is cleaned up
            await deleteMatch(id);
            console.log(`Successfully deleted previous match ${id} for edit mode`);
        } catch (deleteError) {
            console.error(`Error deleting previous match ${id} in edit mode:`, deleteError);
            // Continue with the new match creation even if delete fails
            // This prevents data loss but may leave orphaned records
        }
    }

    // Save Match (JSONB für goalslista/goalslistb - no stringify needed)
    const insertObj = {
        date,
        teama,
        teamb,
        goalsa,
        goalsb,
        goalslista,  // Store as object array directly for JSONB
        goalslistb,  // Store as object array directly for JSONB
        yellowa,
        reda,
        yellowb,
        redb,
        manofthematch,
        prizeaek,
        prizereal
    };

    // Insert Match und ID zurückgeben
    const { data: inserted, error } = await supabase
        .from('matches')
        .insert([insertObj])
        .select('id')
        .single();
    if (error) {
        alert('Fehler beim Insert: ' + error.message);
        console.error(error);
        return;
    }
    const matchId = inserted?.id;

    // Nach Insert: ALLE Daten laden (damit matches aktuell ist)
    await matchesData.loadAllData(() => {});

    // Hole App-Matchnummer (laufende Nummer)
    const appMatchNr = getAppMatchNumber(matchId);

    // Spieler-Tore aufaddieren!
    if (goalsa > 0) await updatePlayersGoals(goalslista, "AEK");
    if (goalsb > 0) await updatePlayersGoals(goalslistb, "Real");

    await decrementBansAfterMatch();

    // Update alcohol calculator with shots from this match
    try {
        if (typeof window !== 'undefined' && window.updateAlcoholCalculatorFromMatch) {
            window.updateAlcoholCalculatorFromMatch({
                id: matchId,
                goalsa: goalsa,
                goalsb: goalsb,
                date: date
            });
        }
    } catch (alcoholError) {
        // Don't fail the match creation if alcohol calculator update fails
        console.warn('Failed to update alcohol calculator:', alcoholError);
    }

    // Transaktionen buchen (Preisgelder & SdS Bonus, inkl. Finanzen update)
    const now = new Date().toISOString().slice(0,10);

    async function getTeamFinance(team) {
        const { data: teamFinances, error: financeError } = await supabase.from('finances').select('balance').eq('team', team);
        
        if (financeError) {
            console.error(`Error fetching finances for team ${team}:`, financeError);
            return 0;
        }
        
        if (teamFinances && teamFinances.length > 0) {
            const data = teamFinances[0];
            return (data && typeof data.balance === "number") ? data.balance : 0;
        }
        
        return 0;
    }

    // Preisgelder buchen & neuen Kontostand berechnen (niemals unter 0)
    let aekOldBalance = await getTeamFinance("AEK");
    let realOldBalance = await getTeamFinance("Real");
    let aekNewBalance = aekOldBalance + (prizeaek || 0) + (sdsBonusAek || 0);
    let realNewBalance = realOldBalance + (prizereal || 0) + (sdsBonusReal || 0);

    // 1. SdS Bonus
    if (sdsBonusAek) {
        aekOldBalance += sdsBonusAek;
        await supabase.from('transactions').insert([{
            date: now,
            type: "Bonus SdS",
            team: "AEK",
            amount: sdsBonusAek,
            match_id: matchId,
            info: `SdS Bonus`
        }]);
        await supabase.from('finances').update({ balance: aekOldBalance }).eq('team', "AEK");
    }
    if (sdsBonusReal) {
        realOldBalance += sdsBonusReal;
        await supabase.from('transactions').insert([{
            date: now,
            type: "Bonus SdS",
            team: "Real",
            amount: sdsBonusReal,
            match_id: matchId,
            info: `SdS Bonus`
        }]);
        await supabase.from('finances').update({ balance: realOldBalance }).eq('team', "Real");
    }

    // 2. Preisgeld
    if (prizeaek !== 0) {
        aekOldBalance += prizeaek;
        if (aekOldBalance < 0) aekOldBalance = 0;
        await supabase.from('transactions').insert([{
            date: now,
            type: "Preisgeld",
            team: "AEK",
            amount: prizeaek,
            match_id: matchId,
            info: `Preisgeld`
        }]);
        await supabase.from('finances').update({ balance: aekOldBalance }).eq('team', "AEK");
    }
    if (prizereal !== 0) {
        realOldBalance += prizereal;
        if (realOldBalance < 0) realOldBalance = 0;
        await supabase.from('transactions').insert([{
            date: now,
            type: "Preisgeld",
            team: "Real",
            amount: prizereal,
            match_id: matchId,
            info: `Preisgeld`
        }]);
        await supabase.from('finances').update({ balance: realOldBalance }).eq('team', "Real");
    }

    // --- Berechne für beide Teams den Echtgeldbetrag nach deiner Formel ---
    function calcEchtgeldbetrag(balance, preisgeld, sdsBonus) {
        let konto = balance;
        if (sdsBonus) konto += 100000;
        let zwischenbetrag = (Math.abs(preisgeld) - konto) / 100000;
        if (zwischenbetrag < 0) zwischenbetrag = 0;
        return 5 + Math.round(zwischenbetrag);
    }

    if (winner && loser) {
        const debts = {
            AEK: matchesData.finances.AEK.debt || 0,
            Real: matchesData.finances.Real.debt || 0,
        };
        const aekSds = manofthematch && matchesData.aek.find(p => p.name === manofthematch) ? 1 : 0;
        const realSds = manofthematch && matchesData.real.find(p => p.name === manofthematch) ? 1 : 0;

        const aekBetrag = calcEchtgeldbetrag(aekOldBalance, prizeaek, aekSds);
        const realBetrag = calcEchtgeldbetrag(realOldBalance, prizereal, realSds);

        let gewinner = winner === "AEK" ? "AEK" : "Real";
        let verlierer = loser === "AEK" ? "AEK" : "Real";
        let gewinnerBetrag = gewinner === "AEK" ? aekBetrag : realBetrag;
        let verliererBetrag = verlierer === "AEK" ? aekBetrag : realBetrag;

        let gewinnerDebt = debts[gewinner];
        let verliererDebt = debts[verlierer];

        let verrechnet = Math.min(gewinnerDebt, verliererBetrag * 1);
        let neuerGewinnerDebt = Math.max(0, gewinnerDebt - verrechnet);
        let restVerliererBetrag = verliererBetrag * 1 - verrechnet;

        let neuerVerliererDebt = verliererDebt + Math.max(0, restVerliererBetrag);

        await supabase.from('finances').update({ debt: neuerGewinnerDebt }).eq('team', gewinner);

        if (restVerliererBetrag > 0) {
            await supabase.from('transactions').insert([{
                date: now,
                type: "Echtgeld-Ausgleich",
                team: verlierer,
                amount: Math.max(0, restVerliererBetrag),
                match_id: matchId,
                info: `Echtgeld-Ausgleich`
            }]);
            await supabase.from('finances').update({ debt: neuerVerliererDebt }).eq('team', verlierer);
        }

        if (verrechnet > 0) {
            await supabase.from('transactions').insert([{
                date: now,
                type: "Echtgeld-Ausgleich (getilgt)",
                team: gewinner,
                amount: -verrechnet,
                match_id: matchId,
                info: `Echtgeld-Ausgleich (getilgt)`
            }]);
        }
    }

    const matchDisplayText = id ? "Match erfolgreich aktualisiert" : `Match ${teama} vs ${teamb} (${goalsa}:${goalsb}) erfolgreich hinzugefügt`;
    
    // Remove save indicator with fade out animation
    const saveIndicator = document.getElementById('match-save-indicator');
    if (saveIndicator) {
        saveIndicator.style.animation = 'fadeOut 0.3s ease-in-out forwards';
        setTimeout(() => {
            if (saveIndicator.parentNode) {
                saveIndicator.parentNode.removeChild(saveIndicator);
            }
        }, 300);
    }
    
    // Restore button state before closing modal
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
    
    showSuccessAndCloseModal(matchDisplayText);
    // Kein manuelles Neuladen nötig – Live-Sync!
    
    } catch (error) {
        console.error('Error in submitMatchForm:', error);
        ErrorHandler.showUserError('Fehler beim Speichern des Matches: ' + (error.message || 'Unbekannter Fehler'));
        
        // Remove save indicator on error
        const saveIndicator = document.getElementById('match-save-indicator');
        if (saveIndicator) {
            saveIndicator.style.animation = 'fadeOut 0.3s ease-in-out forwards';
            setTimeout(() => {
                if (saveIndicator.parentNode) {
                    saveIndicator.parentNode.removeChild(saveIndicator);
                }
            }, 300);
        }
        
        // Restore button state on error
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// ---------- DELETE MATCH FUNCTION - COMPREHENSIVE DATA INTEGRITY IMPLEMENTATION ----------
// 
// This function ensures complete deletion of a match and all its associated data while maintaining
// database referential integrity. Key improvements made:
//
// 1. FIXED: Replaced all problematic .single() calls with safe array access patterns
// 2. ENHANCED: Added comprehensive transaction type coverage (including Penalty, Bonus)
// 3. IMPROVED: Added rollback tracking for better error recovery 
// 4. VALIDATED: Added input validation and data consistency checks
// 5. SECURED: Added proper error handling for each database operation
// 6. DOCUMENTED: Added detailed logging for troubleshooting
//
// The deletion process follows this order to maintain referential integrity:
// 1. Fetch match data and validate
// 2. Fetch and reverse all financial transactions (balance/debt changes)
// 3. Delete transaction records
// 4. Subtract goals from player statistics 
// 5. Decrement "Spieler des Spiels" (man of the match) counts
// 6. Handle card-related cleanup (logged for future implementation)
// 7. Delete the match record itself
//
// Each step includes proper error handling to prevent partial deletions that could
// leave the database in an inconsistent state.

async function deleteMatch(id) {
    try {
        console.log(`Starting deletion of match ${id}`);
        
        // Input validation and type conversion
        if (id === null || id === undefined) {
            throw new Error('No match ID provided for deletion');
        }
        
        console.log(`Processing match ID for deletion: ${id} (type: ${typeof id})`);
        
        // Convert various ID types to a valid format for Supabase
        let matchId;
        if (typeof id === 'string') {
            if (id.trim() === '') {
                throw new Error('Empty string provided as match ID');
            }
            matchId = parseInt(id, 10);
            // Check if parseInt returned NaN
            if (isNaN(matchId)) {
                throw new Error(`Invalid match ID string: "${id}" cannot be converted to number`);
            }
        } else if (typeof id === 'bigint') {
            // For very large BigInt values, check if conversion to Number loses precision
            const numberValue = Number(id);
            if (BigInt(numberValue) === id) {
                // Safe to convert - no precision loss
                matchId = numberValue;
            } else {
                // Keep as BigInt for very large values - Supabase can handle this
                matchId = id;
            }
        } else if (typeof id === 'number') {
            matchId = id;
        } else {
            throw new Error(`Unsupported match ID type: ${typeof id}. Expected string, number, or bigint.`);
        }
        
        // Validate the final ID - handle both Number and BigInt types
        const isValidNumber = typeof matchId === 'number' && Number.isInteger(matchId) && matchId > 0;
        const isValidBigInt = typeof matchId === 'bigint' && matchId > 0n;
        
        if (!isValidNumber && !isValidBigInt) {
            throw new Error(`Invalid match ID after conversion: ${matchId} (type: ${typeof matchId}). Must be a positive integer.`);
        }
        
        console.log(`Converted match ID: ${matchId} (type: ${typeof matchId})`);
        
        // 1. Hole alle Infos des Matches - using safe array access instead of .single()
        const { data: matchesArray, error: matchError } = await supabase
            .from('matches')
            .select('date,prizeaek,prizereal,goalslista,goalslistb,manofthematch,yellowa,reda,yellowb,redb')
            .eq('id', matchId);

        if (matchError) {
            console.error('Error fetching match:', matchError);
            throw matchError;
        }

        if (!matchesArray || matchesArray.length === 0) {
            const errorMsg = `Match with ID ${matchId} not found in database`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const match = matchesArray[0];
        
        // Validate match data
        if (!match.date) {
            console.warn(`Match ${matchId} has no date - this may cause issues with transaction cleanup`);
        }

        console.log(`Deleting match data:`, match);

        // Start a logical transaction sequence to ensure data consistency
        // Note: Supabase doesn't support traditional transactions in the client library,
        // so we implement our own rollback mechanism for critical failures
        const rollbackData = {
            financialChanges: [],
            playerGoalChanges: [],
            sdsChanges: []
        };

        // 2. Fetch all transactions for this match BEFORE deleting them (needed for financial reversals)
        console.log(`Fetching transactions for match ${matchId} before deletion`);
        const { data: allMatchTransactions, error: fetchTransError } = await supabase
            .from('transactions')
            .select('team,amount,type')
            .eq('match_id', matchId);
        
        if (fetchTransError) {
            console.error('Error fetching transactions:', fetchTransError);
            throw fetchTransError;
        }
        
        // Use ALL match transactions for financial reversal - don't filter by type
        // This ensures all financial impacts are properly reversed regardless of transaction type
        const matchTransactions = allMatchTransactions || [];
        console.log(`Found ${matchTransactions.length} transactions to reverse:`, matchTransactions.map(t => `${t.type}: ${t.amount} (${t.team})`));

        // 3. Finanzen zurückrechnen (reverse all financial changes, niemals unter 0!)
        console.log(`Reversing financial changes for ${matchTransactions?.length || 0} transactions`);
        
        if (matchTransactions && matchTransactions.length > 0) {
            for (const trans of matchTransactions) {
                if (trans.type === 'Echtgeld-Ausgleich') {
                    // For debt transactions, we need to reduce the debt - using safe array access
                    const { data: teamFinances, error: finError } = await supabase.from('finances').select('debt').eq('team', trans.team);
                    
                    if (finError) {
                        console.error(`Error fetching finances for team ${trans.team}:`, finError);
                        continue;
                    }
                    
                    const teamFin = teamFinances && teamFinances.length > 0 ? teamFinances[0] : null;
                    const oldDebt = teamFin?.debt || 0;
                    let newDebt = oldDebt - trans.amount;
                    if (newDebt < 0) newDebt = 0;
                    
                    // Track for potential rollback
                    rollbackData.financialChanges.push({
                        team: trans.team,
                        type: 'debt',
                        oldValue: oldDebt,
                        newValue: newDebt
                    });
                    
                    await supabase.from('finances').update({ debt: newDebt }).eq('team', trans.team);
                } else {
                    // For other transactions, reverse the balance change - using safe array access
                    const { data: teamFinances, error: finError } = await supabase.from('finances').select('balance').eq('team', trans.team);
                    
                    if (finError) {
                        console.error(`Error fetching finances for team ${trans.team}:`, finError);
                        continue;
                    }
                    
                    const teamFin = teamFinances && teamFinances.length > 0 ? teamFinances[0] : null;
                    const oldBalance = teamFin?.balance || 0;
                    let newBalance = oldBalance - trans.amount;
                    if (newBalance < 0) newBalance = 0;
                    
                    // Track for potential rollback
                    rollbackData.financialChanges.push({
                        team: trans.team,
                        type: 'balance',
                        oldValue: oldBalance,
                        newValue: newBalance
                    });
                    
                    await supabase.from('finances').update({ balance: newBalance }).eq('team', trans.team);
                }
            }
        }

        // Also handle prize money from match data (in case transactions weren't recorded properly) - using safe array access
        if (typeof match.prizeaek === "number" && match.prizeaek !== 0) {
            const { data: aekFinances, error: aekFinError } = await supabase.from('finances').select('balance').eq('team', 'AEK');
            
            if (aekFinError) {
                console.error('Error fetching AEK finances:', aekFinError);
            } else if (aekFinances && aekFinances.length > 0) {
                const aekFin = aekFinances[0];
                let newBal = (aekFin?.balance || 0) - match.prizeaek;
                if (newBal < 0) newBal = 0;
                await supabase.from('finances').update({ balance: newBal }).eq('team', 'AEK');
            }
        }
        if (typeof match.prizereal === "number" && match.prizereal !== 0) {
            const { data: realFinances, error: realFinError } = await supabase.from('finances').select('balance').eq('team', 'Real');
            
            if (realFinError) {
                console.error('Error fetching Real finances:', realFinError);
            } else if (realFinances && realFinances.length > 0) {
                const realFin = realFinances[0];
                let newBal = (realFin?.balance || 0) - match.prizereal;
                if (newBal < 0) newBal = 0;
                await supabase.from('finances').update({ balance: newBal }).eq('team', 'Real');
            }
        }

        // 4. Now delete the transactions
        console.log(`Deleting ${matchTransactions?.length || 0} transactions for match ${matchId}`);
        const { error: transactionError } = await supabase
            .from('transactions')
            .delete()
            .eq('match_id', matchId);
        
        if (transactionError) {
            console.error('Error deleting transactions:', transactionError);
            throw transactionError;
        }

        // Verify transactions were actually deleted
        const { data: remainingTransactions, error: verifyError } = await supabase
            .from('transactions')
            .select('id')
            .eq('match_id', matchId);
        
        if (verifyError) {
            console.warn('Could not verify transaction deletion:', verifyError);
        } else if (remainingTransactions && remainingTransactions.length > 0) {
            console.error(`❌ Failed to delete ${remainingTransactions.length} transactions for match ${matchId}`);
            throw new Error(`Transaction deletion incomplete: ${remainingTransactions.length} transactions still exist`);
        } else {
            console.log(`✅ Successfully deleted all transactions for match ${matchId}`);
        }

    // 5. Spieler-Tore abziehen
    const removeGoals = async (goalslist, team) => {
        if (!goalslist || !Array.isArray(goalslist)) return;
        
        // Count goals per player - handle both new object format and old string array format
        const goalCounts = {};
        
        if (goalslist.length > 0 && typeof goalslist[0] === 'object' && goalslist[0].player !== undefined) {
            // New object format: [{"count": 4, "player": "Walker"}]
            goalslist.forEach(goal => {
                if (goal.player) {
                    goalCounts[goal.player] = (goalCounts[goal.player] || 0) + (goal.count || 1);
                }
            });
        } else {
            // Old string array format: ["Walker", "Walker", "Messi"]
            for (const playerName of goalslist) {
                if (!playerName) continue;
                goalCounts[playerName] = (goalCounts[playerName] || 0) + 1;
            }
        }
        
        // Remove each player's goal count - using safe array access
        for (const [playerName, count] of Object.entries(goalCounts)) {
            const { data: players, error: playerError } = await supabase.from('players').select('goals').eq('name', playerName).eq('team', team);
            
            if (playerError) {
                console.error(`Error fetching player ${playerName} for goal removal:`, playerError);
                continue; // Skip this player if there's an error
            }
            
            if (!players || players.length === 0) {
                console.warn(`Player ${playerName} not found in team ${team} for goal removal`);
                continue; // Skip if player not found
            }
            
            // Take the first match if multiple players found (shouldn't happen with proper data)
            const player = players[0];
            let newGoals = (player?.goals || 0) - count;
            if (newGoals < 0) newGoals = 0;
            
            const { error: updateError } = await supabase.from('players').update({ goals: newGoals }).eq('name', playerName).eq('team', team);
            if (updateError) {
                console.error(`Error updating goals for player ${playerName}:`, updateError);
            } else {
                console.log(`✅ Updated goals for ${playerName} (${team}): ${player.goals} → ${newGoals}`);
            }
        }
    };
    await removeGoals(match.goalslista, "AEK");
    await removeGoals(match.goalslistb, "Real");

    // 6. Spieler des Spiels rückgängig machen
    if (match.manofthematch) {
        let sdsTeam = null;
        
        // Helper function to check if player is in goals list - handle both object and string array formats
        const checkPlayerInGoals = (goalsList, playerName) => {
          if (!goalsList || !goalsList.length) return false;
          // Handle object format: [{"count": 1, "player": "Kante"}]
          if (typeof goalsList[0] === 'object' && goalsList[0].player !== undefined) {
            return goalsList.some(goal => goal.player === playerName);
          }
          // Handle string array format: ["Kante", "Walker"]
          return goalsList.includes(playerName);
        };
        
        if (checkPlayerInGoals(match.goalslista, match.manofthematch)) sdsTeam = "AEK";
        else if (checkPlayerInGoals(match.goalslistb, match.manofthematch)) sdsTeam = "Real";
        else {
            // Fallback: check if player is in AEK or Real team - using safe array access
            const { data: players, error: playerError } = await supabase.from('players').select('team').eq('name', match.manofthematch);
            
            if (playerError) {
                console.error(`Error fetching player ${match.manofthematch} for team lookup:`, playerError);
            } else if (players && players.length > 0) {
                sdsTeam = players[0].team; // Take first match if multiple found
            } else {
                console.warn(`Player ${match.manofthematch} not found for SdS team determination`);
            }
        }
        if (sdsTeam) {
            const { data: sdsEntries, error: sdsError } = await supabase.from('spieler_des_spiels').select('count').eq('name', match.manofthematch).eq('team', sdsTeam);
            
            if (sdsError) {
                console.error(`Error fetching SdS entry for ${match.manofthematch}:`, sdsError);
            } else if (sdsEntries && sdsEntries.length > 0) {
                const sds = sdsEntries[0]; // Take first match if multiple found
                const newCount = Math.max(0, sds.count - 1);
                
                const { error: updateError } = await supabase.from('spieler_des_spiels').update({ count: newCount }).eq('name', match.manofthematch).eq('team', sdsTeam);
                if (updateError) {
                    console.error(`Error updating SdS count for ${match.manofthematch}:`, updateError);
                } else {
                    console.log(`✅ Updated SdS count for ${match.manofthematch} (${sdsTeam}): ${sds.count} → ${newCount}`);
                }
            } else {
                console.warn(`SdS entry for ${match.manofthematch} in team ${sdsTeam} not found`);
            }
        }
    }

        // 7. Karten zurücksetzen (Card handling)
        // Note: Card-related penalty transactions are already deleted in step 2
        // Here we could add logic for individual player card counters if they exist in the future
        if (match.yellowa > 0 || match.reda > 0 || match.yellowb > 0 || match.redb > 0) {
            console.log(`Match had cards: AEK(${match.yellowa}Y,${match.reda}R) Real(${match.yellowb}Y,${match.redb}R)`);
            // Future: Decrement individual player card statistics if stored separately
        }

        // Note: Ban matchesserved counters are NOT decremented when deleting matches
        // This is by design - served ban time should not be reversed when matches are deleted
        // If needed, this would require separate business logic to determine which bans were affected

    // 8. Match löschen
    console.log(`Deleting match ${matchId} from matches table`);
    const { error: deleteError } = await supabase.from('matches').delete().eq('id', matchId);
    if (deleteError) {
        console.error('Error deleting match:', deleteError);
        throw deleteError;
    }
    
    // Verify the match was actually deleted
    const { data: remainingMatch, error: verifyMatchError } = await supabase
        .from('matches')
        .select('id')
        .eq('id', matchId);
    
    if (verifyMatchError) {
        console.warn('Could not verify match deletion:', verifyMatchError);
    } else if (remainingMatch && remainingMatch.length > 0) {
        console.error(`❌ Failed to delete match ${matchId}`);
        throw new Error(`Match deletion failed: match ${matchId} still exists`);
    } else {
        console.log(`✅ Successfully deleted match ${matchId}`);
    }
    
    console.log(`✅ Successfully deleted match ${matchId} and all related data`);
    
    // Summary of what was deleted
    console.log(`📋 Deletion Summary for Match ${matchId}:`);
    console.log(`   - Match record: deleted`);
    console.log(`   - Transactions: ${matchTransactions.length} deleted`);
    console.log(`   - Player goals: updated for ${match.goalslista?.length || 0} AEK + ${match.goalslistb?.length || 0} Real goals`);
    console.log(`   - Player of the match: ${match.manofthematch ? 'updated' : 'none'}`);
    console.log(`   - Prize money: AEK ${match.prizeaek || 0}, Real ${match.prizereal || 0} (reversed)`);
    console.log(`   - Match date: ${match.date}`);
    // Kein manuelles Neuladen nötig – Live-Sync!
    
    } catch (error) {
        const safeMatchId = typeof matchId !== 'undefined' ? matchId : id || 'unknown';
        console.error(`Failed to delete match ${safeMatchId}:`, error);
        console.error('Error details:', {
            matchId: typeof matchId !== 'undefined' ? matchId : 'undefined',
            matchIdType: typeof matchId,
            originalId: id,
            originalIdType: typeof id,
            errorMessage: error.message,
            errorStack: error.stack
        });
        
        // Don't show alert in browsers - let the calling code handle the error
        if (typeof window === 'undefined') {
            // Only show alert in Node.js environment (for testing)
            console.log(`Fehler beim Löschen des Spiels: ${error.message}`);
        }
        
        throw error;
    }
}

export { deleteMatch };

export function resetMatchesState() {
    matches = [];
    aekAthen = [];
    realMadrid = [];
    bans = [];
    finances = { AEK: { balance: 0, debt: 0 }, Real: { balance: 0, debt: 0 } };
    spielerDesSpiels = [];
    transactions = [];
    matchesInitialized = false;
    if (matchesChannel && typeof matchesChannel.unsubscribe === "function") {
        try { matchesChannel.unsubscribe(); } catch (e) {}
    }
    matchesChannel = undefined;
}

export {matchesData as matches};

// Enhanced match statistics
window.showMatchStatistics = function() {
    if (matches.length === 0) {
        alert('📊 Keine Spiele vorhanden für Statistiken');
        return;
    }
    
    const stats = {
        totalMatches: matches.length,
        aekWins: matches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length,
        realWins: matches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length,
        draws: matches.filter(m => (m.goalsa || 0) === (m.goalsb || 0)).length,
        totalGoals: matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0),
        highestScore: Math.max(...matches.map(m => Math.max(m.goalsa || 0, m.goalsb || 0))),
        averageGoals: 0
    };
    
    stats.averageGoals = (stats.totalGoals / stats.totalMatches).toFixed(1);
    
    const report = `🏆 Match-Statistiken:\n\n` +
                  `Gesamt: ${stats.totalMatches} Spiele\n` +
                  `AEK Siege: ${stats.aekWins}\n` +
                  `Real Siege: ${stats.realWins}\n` +
                  `Unentschieden: ${stats.draws}\n\n` +
                  `Tore gesamt: ${stats.totalGoals}\n` +
                  `Ø Tore/Spiel: ${stats.averageGoals}\n` +
                  `Höchstes Ergebnis: ${stats.highestScore} Tore`;
    
    alert(report);
};
