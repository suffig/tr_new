import { POSITIONEN, savePlayer as dataSavePlayer, deletePlayer as dataDeletePlayer } from './data.js';
import { showModal, hideModal, showSuccessAndCloseModal } from './modal.js';
import { dataManager } from './dataManager.js';
import { isDatabaseAvailable } from './connectionMonitor.js';
import { ErrorHandler } from './utils.js';
import PlayerDetailModal from './playerDetailModal.js';
import FIFADataService from './fifaDataService.js';

let aekAthen = [];
let realMadrid = [];
let ehemalige = [];
let finances = {
    AEK: { balance: 0 },
    Real: { balance: 0 }
};
let transactions = [];

const POSITION_ORDER = {
    "TH": 0, "IV": 1, "LV": 2, "RV": 3, "ZDM": 4, "ZM": 5,
    "ZOM": 6, "LM": 7, "RM": 8, "LF": 9, "RF": 10, "ST": 11
};

// --- ACCORDION Panel Zustand ---
let openPanel = null; // "aek", "real", "ehemalige" oder null

// --- Positions-Badge Klasse (für Redesign) ---
function getPositionBadgeClass(pos) {
    if (pos === "TH") return "position-badge badge-th";
    if (["IV", "LV", "RV", "ZDM"].includes(pos)) return "position-badge badge-def";
    if (["ZM", "ZOM", "LM", "RM"].includes(pos)) return "position-badge badge-mid";
    if (["LF", "RF", "ST"].includes(pos)) return "position-badge badge-att";
    return "position-badge bg-gray-700 text-gray-200 border-gray-600";
}

async function loadPlayersAndFinances(renderFn = renderPlayerLists) {
    try {
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Lade Daten...</div>';
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.appendChild(loadingDiv);

        // Use dataManager for consistent data loading
        const data = await dataManager.loadAllAppData();
        
        if (data.players) {
            aekAthen = data.players.filter(p => p.team === "AEK");
            realMadrid = data.players.filter(p => p.team === "Real");
            ehemalige = data.players.filter(p => p.team === "Ehemalige");
        }
        
        if (data.finances) {
            finances = {
                AEK: data.finances.find(f => f.team === "AEK") || { balance: 0 },
                Real: data.finances.find(f => f.team === "Real") || { balance: 0 }
            };
        }
        
        if (data.transactions) {
            transactions = data.transactions;
        }

        if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }

        renderFn();
        
    } catch (error) {
        console.error('Error loading data:', error);
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
                <strong>Fehler beim Laden der Daten.</strong> 
                ${isDatabaseAvailable() ? 'Bitte versuchen Sie es erneut.' : 'Keine Datenbankverbindung.'}
                <button onclick="this.parentElement.remove()" class="float-right font-bold text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100">×</button>
            </div>
        `;
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.insertBefore(errorDiv, appDiv.firstChild);
        renderFn();
    }
}

export function renderKaderTab(containerId = "app") {
    const app = document.getElementById(containerId);
    loadPlayersAndFinances(renderPlayerLists);

    app.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h1 class="page-title">Team Management</h1>
                <p class="page-subtitle">Verwalten Sie Ihre FIFA-Teams und Spieler</p>
            </div>
            
            <!-- Quick Player Analytics -->
            <div class="bg-gray-800 rounded-xl p-4 mb-6">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <span class="text-xl">⚡</span>
                        Schnell-Analyse
                    </h3>
                    <button id="refresh-analytics" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        <i class="fas fa-sync-alt"></i> Aktualisieren
                    </button>
                </div>
                <div id="player-analytics-content">
                    <div class="animate-pulse text-gray-400">Lade Spielerstatistiken...</div>
                </div>
            </div>
            
            <div class="space-y-6">
                ${accordionPanelHtml('AEK Athen', 'aek', 'from-blue-500 to-blue-600', 'AEK')}
                ${accordionPanelHtml('Real Madrid', 'real', 'from-red-500 to-red-600', 'Real')}
                ${accordionPanelHtml('Ehemalige Spieler', 'ehemalige', 'from-gray-500 to-gray-600', 'Ehemalige')}
            </div>
        </div>
    `;
    ['aek', 'real', 'ehemalige'].forEach(team => {
        document.getElementById(`panel-toggle-${team}`)?.addEventListener('click', () => {
            openPanel = openPanel === team ? null : team;
            renderKaderTab(containerId); // Neu rendern, damit Panel-Inhalt sichtbar wird
        });
    });

    // Add analytics refresh button functionality
    const refreshBtn = document.getElementById('refresh-analytics');
    if (refreshBtn) {
        refreshBtn.onclick = () => renderPlayerAnalytics();
    }
    
    // Load analytics
    setTimeout(() => renderPlayerAnalytics(), 500);
}

// New function to render player analytics
async function renderPlayerAnalytics() {
    try {
        const analyticsContent = document.getElementById('player-analytics-content');
        if (!analyticsContent) return;

        // Load fresh data
        const [
            { data: matches = [] },
            { data: players = [] },
            { data: bans = [] }
        ] = await Promise.all([
            supabaseDb.select('matches', '*'),
            supabaseDb.select('players', '*'),
            supabaseDb.select('bans', '*')
        ]);

        const aekPlayers = players.filter(p => p.team === "AEK");
        const realPlayers = players.filter(p => p.team === "Real");
        
        // Calculate team statistics
        const aekStats = calculateTeamStats(aekPlayers, matches, bans, 'AEK');
        const realStats = calculateTeamStats(realPlayers, matches, bans, 'Real');
        
        // Find top performers
        const topScorer = players.reduce((top, player) => 
            (player.goals || 0) > (top?.goals || 0) ? player : top, null);
        
        const mostDisciplined = players.reduce((best, player) => {
            const playerBans = bans.filter(b => b.player_id === player.id).length;
            const bestBans = bans.filter(b => b.player_id === best?.id).length || Infinity;
            return playerBans < bestBans ? player : best;
        }, null);

        analyticsContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Team Comparison -->
                <div class="bg-gray-700 rounded-lg p-3">
                    <h4 class="font-bold text-white mb-2 text-sm">Team-Vergleich</h4>
                    <div class="space-y-2 text-xs">
                        <div class="flex justify-between">
                            <span class="text-blue-300">AEK Spieler:</span>
                            <span class="text-white font-bold">${aekStats.playerCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-red-300">Real Spieler:</span>
                            <span class="text-white font-bold">${realStats.playerCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-blue-300">AEK Ø Tore:</span>
                            <span class="text-white font-bold">${aekStats.avgGoals}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-red-300">Real Ø Tore:</span>
                            <span class="text-white font-bold">${realStats.avgGoals}</span>
                        </div>
                    </div>
                </div>

                <!-- Top Performer -->
                <div class="bg-gray-700 rounded-lg p-3">
                    <h4 class="font-bold text-white mb-2 text-sm">Top-Performer</h4>
                    <div class="space-y-2 text-xs">
                        <div>
                            <span class="text-yellow-300">👑 Torschützenkönig:</span>
                            <div class="text-white font-bold">${topScorer ? `${topScorer.name} (${topScorer.goals || 0})` : 'Keine Daten'}</div>
                        </div>
                        <div>
                            <span class="text-green-300">😇 Diszipliniert:</span>
                            <div class="text-white font-bold">${mostDisciplined ? mostDisciplined.name : 'Keine Daten'}</div>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Quick Actions -->
                <div class="bg-gray-700 rounded-lg p-3">
                    <h4 class="font-bold text-white mb-2 text-sm">Team-Tools & Analyse</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="generatePlayerReport()" class="bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700 flex items-center justify-center">
                            <i class="fas fa-chart-line mr-1"></i>
                            Report
                        </button>
                        <button onclick="balanceTeams()" class="bg-green-600 text-white py-1 px-2 rounded text-xs hover:bg-green-700 flex items-center justify-center">
                            <i class="fas fa-balance-scale mr-1"></i>
                            Balance
                        </button>
                        <button onclick="suggestTransfers()" class="bg-purple-600 text-white py-1 px-2 rounded text-xs hover:bg-purple-700 flex items-center justify-center">
                            <i class="fas fa-exchange-alt mr-1"></i>
                            Transfers
                        </button>
                        <button onclick="toggleFormationView()" class="bg-indigo-600 text-white py-1 px-2 rounded text-xs hover:bg-indigo-700 flex items-center justify-center">
                            <i class="fas fa-chess-board mr-1"></i>
                            Formation
                        </button>
                        <button onclick="exportSquadData()" class="bg-orange-600 text-white py-1 px-2 rounded text-xs hover:bg-orange-700 flex items-center justify-center">
                            <i class="fas fa-download mr-1"></i>
                            Export
                        </button>

                    </div>
                    
                    <!-- Formation View Container -->
                    <div id="formation-view" class="hidden mt-3">
                        <div class="bg-slate-800 rounded-lg p-2 border border-slate-600">
                            <div id="formation-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add functionality to quick action buttons
        window.generatePlayerReport = () => {
            const report = players.map(p => `${p.name} (${p.team}): ${p.goals || 0} Tore, ${p.position || 'Unbekannt'}`).join('\n');
            alert(`Spieler-Report:\n\n${report}`);
        };

        window.balanceTeams = () => {
            const aekCount = aekPlayers.length;
            const realCount = realPlayers.length;
            const difference = Math.abs(aekCount - realCount);
            
            if (difference <= 1) {
                alert('✅ Teams sind bereits ausgeglichen!');
            } else {
                const needMore = aekCount > realCount ? 'Real Madrid' : 'AEK Athen';
                alert(`⚖️ Team-Balance:\n${needMore} benötigt ${difference} weitere Spieler für ausgeglichene Teams.`);
            }
        };

        window.suggestTransfers = () => {
            if (players.length < 4) {
                alert('🔄 Nicht genügend Spieler für Transfer-Analyse');
                return;
            }
            
            const suggestions = [];
            const aekGoals = aekPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
            const realGoals = realPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
            
            if (aekGoals > realGoals * 1.5) {
                suggestions.push('Real Madrid könnte einen stärkeren Stürmer gebrauchen');
            } else if (realGoals > aekGoals * 1.5) {
                suggestions.push('AEK Athen könnte einen stärkeren Stürmer gebrauchen');
            }
            
            const aekBans = bans.filter(b => b.team === 'AEK').length;
            const realBans = bans.filter(b => b.team === 'Real').length;
            
            if (aekBans > realBans * 2) {
                suggestions.push('AEK Athen sollte diszipliniertere Spieler verpflichten');
            } else if (realBans > aekBans * 2) {
                suggestions.push('Real Madrid sollte diszipliniertere Spieler verpflichten');
            }
            
            if (suggestions.length === 0) {
                suggestions.push('Teams sind gut ausgeglichen! 👍');
            }
            
            alert(`🔄 Transfer-Empfehlungen:\n\n${suggestions.join('\n')}`);
        };

    } catch (error) {
        console.error('Error rendering player analytics:', error);
        const analyticsContent = document.getElementById('player-analytics-content');
        if (analyticsContent) {
            analyticsContent.innerHTML = '<div class="text-red-400 text-sm">Fehler beim Laden der Analyse</div>';
        }
    }
}

// Helper function to calculate team statistics
function calculateTeamStats(teamPlayers, matches, bans, teamName) {
    const playerCount = teamPlayers.length;
    const totalGoals = teamPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    const avgGoals = playerCount > 0 ? (totalGoals / playerCount).toFixed(1) : '0.0';
    const teamBans = bans.filter(b => b.team === teamName).length;
    
    return {
        playerCount,
        totalGoals,
        avgGoals,
        teamBans
    };
}

function accordionPanelHtml(team, key, gradientClass, teamKey) {
    const isOpen = openPanel === key;
    return `
        <div class="modern-card">
            <button id="panel-toggle-${key}" class="flex justify-between items-center w-full p-0 transition-all">
                <div class="flex items-center gap-4 p-4 flex-1">
                    <div class="w-12 h-12 bg-gradient-to-r ${gradientClass} rounded-lg flex items-center justify-center">
                        <i class="fas fa-users text-white text-lg"></i>
                    </div>
                    <div class="text-left">
                        <h3 class="font-semibold text-lg">${team}</h3>
                        <p class="text-sm text-gray-500">
                            ${teamKey !== 'Ehemalige' ? `Marktwert: <span id="${key}-marktwert">0M €</span>` : 'Ehemalige Spieler'}
                        </p>
                    </div>
                </div>
                <div class="p-4">
                    <i class="fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400"></i>
                </div>
            </button>
            
            ${isOpen ? `
                <div id="panel-content-${key}" class="border-t border-gray-100 p-4 slide-up">
                    <div id="team-${key}-players" class="grid gap-4 ${key === 'ehemalige' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}"></div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderPlayerLists() {
    // Always update market values in accordion headers, regardless of panel state
    const aekMwSpan = document.getElementById('aek-marktwert');
    if (aekMwSpan) aekMwSpan.innerText = getKaderMarktwert(aekAthen).toLocaleString('de-DE') + "M €";
    
    const realMwSpan = document.getElementById('real-marktwert');
    if (realMwSpan) realMwSpan.innerText = getKaderMarktwert(realMadrid).toLocaleString('de-DE') + "M €";

    // Only render player lists if panels are open
    if (openPanel === 'aek' && document.getElementById('team-aek-players')) {
        renderPlayerList('team-aek-players', aekAthen, "AEK");
    }
    if (openPanel === 'real' && document.getElementById('team-real-players')) {
        renderPlayerList('team-real-players', realMadrid, "Real");
    }
    if (openPanel === 'ehemalige' && document.getElementById('team-ehemalige-players')) {
        renderEhemaligeList('team-ehemalige-players');
    }
}

function renderPlayerList(containerId, arr, team) {
    const c = document.getElementById(containerId);
    if (!c) return;
    arr = arr.slice().sort((a, b) => {
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        return posA - posB;
    });
    c.innerHTML = "";
    arr.forEach(player => {
        const marktwert = typeof player.value === 'number'
            ? player.value
            : (player.value ? parseFloat(player.value) : 0);

        const d = document.createElement("div");
        d.className = "modern-card fifa-enhanced";
        d.innerHTML = `
            <div class="card-header">
                <div class="flex items-center gap-3">
                    <span class="${getPositionBadgeClass(player.position)}">${player.position || 'N/A'}</span>
                    <h3 class="card-title">${player.name}</h3>
                    <span class="fifa-indicator" title="Click for FIFA stats">🎮</span>
                </div>
                <div class="text-xl font-bold text-green-600">${marktwert}M €</div>
            </div>
            <div class="card-content">
                <p class="text-sm text-gray-500">Team: ${team === 'AEK' ? 'AEK Athen' : team === 'Real' ? 'Real Madrid' : 'Ehemalige'}</p>
                <p class="text-sm text-gray-500">Marktwert: ${marktwert}M €</p>
                <p class="text-xs text-blue-400 fifa-hint">
                    <i class="fas fa-info-circle"></i>
                    Click to view FIFA statistics
                </p>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary btn-sm fifa-btn">
                    <i class="fas fa-chart-bar"></i>
                    <span>FIFA Stats</span>
                </button>
                <button class="btn btn-secondary btn-sm edit-btn">
                    <i class="fas fa-edit"></i>
                    <span>Bearbeiten</span>
                </button>
                <button class="btn btn-secondary btn-sm move-btn">
                    <i class="fas fa-arrow-right"></i>
                    <span>Zu Ehemalige</span>
                </button>
            </div>
        `;
        
        // Add click handler for FIFA stats (both card and button)
        const showFIFAStats = () => window.playerDetailModal.show(player);
        d.querySelector('.fifa-btn').onclick = (e) => {
            e.stopPropagation();
            showFIFAStats();
        };
        d.querySelector('.card-header').onclick = showFIFAStats;
        d.querySelector('.card-content').onclick = showFIFAStats;
        
        d.querySelector('.edit-btn').onclick = (e) => {
            e.stopPropagation();
            openPlayerForm(team, player.id);
        };
        d.querySelector('.move-btn').onclick = (e) => {
            e.stopPropagation();
            movePlayerWithTransaction(player.id, "Ehemalige");
        };
        c.appendChild(d);
    });
}


function renderEhemaligeList(containerId = "ehemalige-players") {
    const c = document.getElementById(containerId);
    if (!c) return;
    const sorted = ehemalige.slice().sort((a, b) => {
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        return posA - posB;
    });
    c.innerHTML = "";
    sorted.forEach((player) => {
        const marktwert = typeof player.value === 'number'
            ? player.value
            : (player.value ? parseFloat(player.value) : 0);

        const d = document.createElement("div");
        d.className = "modern-card fifa-enhanced";
        d.innerHTML = `
            <div class="card-header">
                <div class="flex items-center gap-3">
                    <span class="${getPositionBadgeClass(player.position)}">${player.position || 'N/A'}</span>
                    <h3 class="card-title">${player.name}</h3>
                    <span class="fifa-indicator" title="Click for FIFA stats">🎮</span>
                </div>
                <div class="text-xl font-bold text-gray-600">${marktwert !== null && marktwert !== undefined ? marktwert + 'M €' : 'N/A'}</div>
            </div>
            <div class="card-content">
                <p class="text-sm text-gray-500">Status: Ehemaliger Spieler</p>
                <p class="text-sm text-gray-500">Marktwert: ${marktwert !== null && marktwert !== undefined ? marktwert + 'M €' : 'Nicht bewertet'}</p>
                <p class="text-xs text-blue-400 fifa-hint">
                    <i class="fas fa-info-circle"></i>
                    Click to view FIFA statistics
                </p>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary btn-sm fifa-btn">
                    <i class="fas fa-chart-bar"></i>
                    <span>FIFA Stats</span>
                </button>
                <button class="btn btn-secondary btn-sm edit-btn">
                    <i class="fas fa-edit"></i>
                    <span>Bearbeiten</span>
                </button>
                <button class="btn btn-danger btn-sm delete-btn">
                    <i class="fas fa-trash"></i>
                    <span>Löschen</span>
                </button>
                <button class="btn btn-primary btn-sm move-aek-btn" style="background: linear-gradient(135deg, var(--accent-blue), #60A5FA);">
                    <i class="fas fa-arrow-left"></i>
                    <span>Zu AEK</span>
                </button>
                <button class="btn btn-primary btn-sm move-real-btn" style="background: linear-gradient(135deg, var(--accent-red), #F87171);">
                    <i class="fas fa-arrow-right"></i>
                    <span>Zu Real</span>
                </button>
            </div>
        `;
        
        // Add click handler for FIFA stats (both card and button)
        const showFIFAStats = () => window.playerDetailModal.show(player);
        d.querySelector('.fifa-btn').onclick = (e) => {
            e.stopPropagation();
            showFIFAStats();
        };
        d.querySelector('.card-header').onclick = showFIFAStats;
        d.querySelector('.card-content').onclick = showFIFAStats;
        
        d.querySelector('.edit-btn').onclick = (e) => {
            e.stopPropagation();
            openPlayerForm('Ehemalige', player.id);
        };
        d.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            deletePlayerDb(player.id);
        };
        d.querySelector('.move-aek-btn').onclick = (e) => {
            e.stopPropagation();
            movePlayerWithTransaction(player.id, 'AEK');
        };
        d.querySelector('.move-real-btn').onclick = (e) => {
            e.stopPropagation();
            movePlayerWithTransaction(player.id, 'Real');
        };
        c.appendChild(d);
    });
}

function getKaderMarktwert(arr) {
    return arr.reduce((sum, p) => {
        let v = (typeof p.value === "number" ? p.value : (p.value ? parseFloat(p.value) : 0));
        return sum + v;
    }, 0);
}

async function savePlayer(player) {
    try {
        await dataSavePlayer(player);
    } catch (error) {
        ErrorHandler.showUserError(error.message, "error");
        throw error;
    }
}

async function deletePlayerDb(id) {
    try {
        await dataDeletePlayer(id);
    } catch (error) {
        ErrorHandler.showUserError(error.message, "error");
        throw error;
    }
}

async function movePlayerWithTransaction(id, newTeam) {
    let all = [...aekAthen, ...realMadrid, ...ehemalige];
    const player = all.find(p => p.id === id);
    if (!player) return;

    const oldTeam = player.team;
    const value = typeof player.value === "number" ? player.value : parseFloat(player.value) || 0;
    const abloese = value * 1000000;
    const now = new Date().toISOString().slice(0, 10);

    // Von TEAM zu Ehemalige: VERKAUF
    if ((oldTeam === "AEK" || oldTeam === "Real") && newTeam === "Ehemalige") {
        await supabase.from('transactions').insert([{
            date: now,
            type: "Spielerverkauf",
            team: oldTeam,
            amount: abloese,
            info: `Verkauf von ${player.name} (${player.position})`
        }]);
        let finKey = oldTeam;
        await supabase.from('finances').update({
            balance: (finances[finKey].balance || 0) + abloese
        }).eq('team', oldTeam);
        await movePlayerToTeam(id, newTeam);
        return;
    }

    // Von Ehemalige zu TEAM: KAUF
    if (oldTeam === "Ehemalige" && (newTeam === "AEK" || newTeam === "Real")) {
        let finKey = newTeam;
        const konto = finances[finKey].balance || 0;
        if (konto < abloese) {
            ErrorHandler.showUserError("Kontostand zu gering für diesen Transfer!", "warning");
            return;
        }
        await supabase.from('transactions').insert([{
            date: now,
            type: "Spielerkauf",
            team: newTeam,
            amount: -abloese,
            info: `Kauf von ${player.name} (${player.position})`
        }]);
        await supabase.from('finances').update({
            balance: konto - abloese
        }).eq('team', newTeam);
        await movePlayerToTeam(id, newTeam);
        return;
    }

    // Innerhalb Teams oder Ehemalige zu Ehemalige: Nur Move
    await movePlayerToTeam(id, newTeam);
}

async function movePlayerToTeam(id, newTeam) {
    const { error } = await supabase.from('players').update({ team: newTeam }).eq('id', id);
    if (error) ErrorHandler.showUserError(`Fehler beim Verschieben: ${error.message}`, "error");
}

async function saveTransactionAndFinance(team, type, amount, info = "") {
    const now = new Date().toISOString().slice(0, 10);
    await supabase.from('transactions').insert([{ date: now, type, team, amount, info }]);
    const finKey = team;
    let updateObj = {};
    updateObj.balance = (finances[finKey].balance || 0) + amount;
    await supabase.from('finances').update(updateObj).eq('team', team);
}

function openPlayerForm(team, id) {
    let player = null;
    let edit = false;
    if (id) {
        let all = [...aekAthen, ...realMadrid, ...ehemalige];
        player = all.find(p => p.id === id);
        if (player) edit = true;
    }
    showModal(`
        <form id="player-form" class="space-y-4 w-full">
            <div class="space-y-4">
                <input type="text" name="name" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Name" value="${player ? player.name : ""}" required>
                <select name="position" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base focus:ring-2 focus:ring-sky-500 focus:border-transparent" required>
                    <option value="">Position wählen</option>
                    ${POSITIONEN.map(pos => `<option${player && player.position === pos ? " selected" : ""}>${pos}</option>`).join("")}
                </select>
                <input type="number" min="0" step="0.1" name="value" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Marktwert (M)" value="${player && player.value !== undefined ? player.value : ""}" required>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="submit" class="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white w-full px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 flex gap-2 items-center justify-center shadow-lg hover:shadow-xl active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  ${edit ? "Speichern" : "Anlegen"}
                </button>
                <button type="button" class="bg-slate-600 hover:bg-slate-700 text-slate-100 w-full px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 active:scale-95" onclick="window.hideModal()">Abbrechen</button>
            </div>
        </form>
    `);
    document.getElementById("player-form").onsubmit = (e) => submitPlayerForm(e, team, player ? player.id : null);
}

async function submitPlayerForm(event, team, id) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const position = form.position.value;
    const value = parseFloat(form.value.value);

    try {
        if (!id && (team === "AEK" || team === "Real")) {
            let fin = finances[team];
            if (fin.balance < value * 1000000) {
                ErrorHandler.showUserError("Kontostand zu gering für diesen Spielerkauf!", "warning");
                return;
            }
            try {
                await saveTransactionAndFinance(team, "Spielerkauf", -value * 1000000, `Kauf von ${name} (${position})`);
            } catch (error) {
                console.warn("Transaction save failed (demo mode):", error);
                // Continue with player save even if transaction fails in demo mode
            }
        }
        if (id) {
            await savePlayer({ id, name, position, value, team });
            showSuccessAndCloseModal(`Spieler ${name} erfolgreich aktualisiert`);
        } else {
            await savePlayer({ name, position, value, team });
            showSuccessAndCloseModal(`Spieler ${name} erfolgreich hinzugefügt`);
        }
    } catch (error) {
        console.error("Error submitting player form:", error);
        ErrorHandler.showUserError(`Fehler beim Speichern des Spielers: ${error.message}`, "error");
    }
}

export { deletePlayerDb };

export function resetKaderState() {
    aekAthen = [];
    realMadrid = [];
    ehemalige = [];
    finances = { AEK: { balance: 0 }, Real: { balance: 0 } };
    transactions = [];
    openPanel = null;
}

// --- Enhanced functionality for new features ---

// Formation visualization
window.toggleFormationView = function() {
    const formationView = document.getElementById('formation-view');
    const button = event.target;
    
    if (formationView && formationView.classList.contains('hidden')) {
        formationView.classList.remove('hidden');
        button.innerHTML = '<i class="fas fa-chess-board mr-1"></i>Hide';
        
        // Initialize formation visualizer
        import('./formationVisualizer.js').then(module => {
            const { FormationVisualizer } = module;
            const visualizer = new FormationVisualizer();
            visualizer.renderFormationView('formation-container', 'AEK');
        }).catch(error => {
            console.error('Formation visualizer not available:', error);
            alert('❌ Formation-Visualizer nicht verfügbar');
        });
    } else if (formationView) {
        formationView.classList.add('hidden');
        button.innerHTML = '<i class="fas fa-chess-board mr-1"></i>Formation';
    }
};

// Export squad data
window.exportSquadData = async function() {
    try {
        const { DataExportImport } = await import('./exportImport.js');
        const result = await DataExportImport.exportAllData();
        if (result.success) {
            alert('✅ ' + result.message);
        } else {
            alert('❌ Export fehlgeschlagen: ' + result.error);
        }
    } catch (error) {
        alert('❌ Export-Funktion nicht verfügbar: ' + error.message);
    }
};



// Enhanced player report with more stats
window.generatePlayerReport = async function() {
    try {
        const data = await dataManager.loadAllAppData();
        const players = data.players || [];
        const matches = data.matches || [];
        
        if (players.length === 0) {
            alert('📊 Keine Spieler vorhanden für Report');
            return;
        }
        
        const playerStats = players.map(player => {
            const playerMatches = matches.filter(m => 
                m.aek_players?.includes(player.id) || 
                m.real_players?.includes(player.id)
            );
            
            const goals = playerMatches.reduce((sum, match) => {
                const teamGoals = player.team === 'AEK' ? (match.aek_goals || []) : (match.real_goals || []);
                return sum + teamGoals.filter(g => g.player_id === player.id).length;
            }, 0);
            
            const wins = playerMatches.filter(match => {
                if (player.team === 'AEK') {
                    return (match.aek_score || 0) > (match.real_score || 0);
                } else {
                    return (match.real_score || 0) > (match.aek_score || 0);
                }
            }).length;
            
            const winRate = playerMatches.length > 0 ? (wins / playerMatches.length * 100).toFixed(1) : '0';
            const goalsPerGame = playerMatches.length > 0 ? (goals / playerMatches.length).toFixed(2) : '0.00';
            
            return {
                name: player.name,
                team: player.team,
                matches: playerMatches.length,
                goals,
                wins,
                winRate,
                goalsPerGame
            };
        });
        
        // Sort by goals descending
        playerStats.sort((a, b) => b.goals - a.goals);
        
        const report = playerStats.map(p => 
            `${p.name} (${p.team}): ${p.goals} Tore in ${p.matches} Spielen (${p.goalsPerGame}/Spiel), ${p.wins} Siege (${p.winRate}%)`
        ).join('\n');
        
        alert(`📊 Detaillierter Spieler-Report:\n\n${report}`);
        
    } catch (error) {
        alert('❌ Fehler beim Erstellen des Reports: ' + error.message);
    }
};