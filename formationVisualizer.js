/**
 * Team Formation Visualizer for FIFA Tracker
 * Visual representation of team formations and player positions
 */

import { dataManager } from './dataManager.js';
import { loadingManager, ErrorHandler } from './utils.js';

export class FormationVisualizer {
    constructor() {
        this.formations = {
            '4-4-2': {
                name: '4-4-2',
                positions: {
                    GK: [{ x: 50, y: 90 }],
                    CB: [{ x: 25, y: 75 }, { x: 75, y: 75 }],
                    LB: [{ x: 10, y: 70 }],
                    RB: [{ x: 90, y: 70 }],
                    CM: [{ x: 30, y: 50 }, { x: 70, y: 50 }],
                    LM: [{ x: 15, y: 45 }],
                    RM: [{ x: 85, y: 45 }],
                    ST: [{ x: 35, y: 20 }, { x: 65, y: 20 }]
                }
            },
            '4-3-3': {
                name: '4-3-3',
                positions: {
                    GK: [{ x: 50, y: 90 }],
                    CB: [{ x: 25, y: 75 }, { x: 75, y: 75 }],
                    LB: [{ x: 10, y: 70 }],
                    RB: [{ x: 90, y: 70 }],
                    CDM: [{ x: 50, y: 60 }],
                    CM: [{ x: 25, y: 45 }, { x: 75, y: 45 }],
                    LW: [{ x: 15, y: 25 }],
                    RW: [{ x: 85, y: 25 }],
                    ST: [{ x: 50, y: 15 }]
                }
            },
            '3-5-2': {
                name: '3-5-2',
                positions: {
                    GK: [{ x: 50, y: 90 }],
                    CB: [{ x: 20, y: 75 }, { x: 50, y: 75 }, { x: 80, y: 75 }],
                    LWB: [{ x: 10, y: 50 }],
                    RWB: [{ x: 90, y: 50 }],
                    CDM: [{ x: 50, y: 55 }],
                    CM: [{ x: 30, y: 45 }, { x: 70, y: 45 }],
                    ST: [{ x: 35, y: 20 }, { x: 65, y: 20 }]
                }
            }
        };
        
        this.currentFormation = '4-4-2';
        this.teamPlayers = { AEK: [], Real: [] };
    }
    
    async renderFormationView(containerId, teamName = 'AEK') {
        try {
            loadingManager.show('Lade Formation...');
            
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} nicht gefunden`);
            }
            
            // Load team players
            await this.loadTeamPlayers(teamName);
            
            // Create formation HTML
            container.innerHTML = this.generateFormationHTML(teamName);
            
            // Add event listeners
            this.attachEventListeners(containerId, teamName);
            
            loadingManager.hide();
            
        } catch (error) {
            loadingManager.hide();
            ErrorHandler.handle(error, 'Fehler beim Laden der Formation');
        }
    }
    
    async loadTeamPlayers(teamName) {
        const data = await dataManager.loadAllAppData();
        this.teamPlayers[teamName] = data.players?.filter(p => p.team === teamName) || [];
    }
    
    generateFormationHTML(teamName) {
        const formation = this.formations[this.currentFormation];
        const players = this.teamPlayers[teamName];
        
        return `
            <div class="formation-visualizer bg-slate-800 rounded-lg p-4 border border-slate-600">
                <!-- Header -->
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-white font-semibold flex items-center">
                        <i class="fas fa-chess mr-2"></i>
                        Formation: ${teamName}
                    </h3>
                    <select id="formation-selector" class="bg-slate-700 text-white border border-slate-600 rounded px-3 py-1 text-sm">
                        ${Object.keys(this.formations).map(f => 
                            `<option value="${f}" ${f === this.currentFormation ? 'selected' : ''}>${f}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <!-- Field -->
                <div class="formation-field relative bg-green-600 rounded-lg overflow-hidden" style="height: 500px; background-image: linear-gradient(to bottom, #16a34a 0%, #15803d 100%);">
                    <!-- Field lines -->
                    <div class="absolute inset-0 pointer-events-none">
                        ${this.generateFieldLines()}
                    </div>
                    
                    <!-- Players -->
                    <div class="absolute inset-0">
                        ${this.generatePlayerPositions(teamName, players)}
                    </div>
                </div>
                
                <!-- Player Pool -->
                <div class="mt-4">
                    <h4 class="text-gray-300 font-medium mb-2">Verfügbare Spieler</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        ${this.generatePlayerPool(players)}
                    </div>
                </div>
                
                <!-- Formation Stats -->
                <div class="mt-4 grid grid-cols-2 gap-4">
                    ${this.generateFormationStats(teamName, players)}
                </div>
            </div>
        `;
    }
    
    generateFieldLines() {
        return `
            <!-- Center line -->
            <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-60 transform -translate-y-0.5"></div>
            
            <!-- Center circle -->
            <div class="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white opacity-60 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            
            <!-- Penalty areas -->
            <div class="absolute bottom-0 left-1/2 w-20 h-16 border-2 border-white opacity-60 transform -translate-x-1/2 border-b-0"></div>
            <div class="absolute top-0 left-1/2 w-20 h-16 border-2 border-white opacity-60 transform -translate-x-1/2 border-t-0"></div>
            
            <!-- Goal areas -->
            <div class="absolute bottom-0 left-1/2 w-12 h-8 border-2 border-white opacity-60 transform -translate-x-1/2 border-b-0"></div>
            <div class="absolute top-0 left-1/2 w-12 h-8 border-2 border-white opacity-60 transform -translate-x-1/2 border-t-0"></div>
            
            <!-- Corner arcs -->
            <div class="absolute bottom-0 left-0 w-4 h-4 border-t-2 border-r-2 border-white opacity-60 rounded-tr-full"></div>
            <div class="absolute bottom-0 right-0 w-4 h-4 border-t-2 border-l-2 border-white opacity-60 rounded-tl-full"></div>
            <div class="absolute top-0 left-0 w-4 h-4 border-b-2 border-r-2 border-white opacity-60 rounded-br-full"></div>
            <div class="absolute top-0 right-0 w-4 h-4 border-b-2 border-l-2 border-white opacity-60 rounded-bl-full"></div>
        `;
    }
    
    generatePlayerPositions(teamName, players) {
        const formation = this.formations[this.currentFormation];
        let html = '';
        let playerIndex = 0;
        
        for (const [position, coords] of Object.entries(formation.positions)) {
            coords.forEach((coord, coordIndex) => {
                const player = players[playerIndex] || null;
                const positionId = `${position}-${coordIndex}`;
                
                html += `
                    <div class="player-position absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" 
                         style="left: ${coord.x}%; top: ${coord.y}%;"
                         data-position="${position}"
                         data-position-id="${positionId}"
                         ondrop="handlePlayerDrop(event)"
                         ondragover="allowDrop(event)">
                        ${player ? 
                            `<div class="player-card bg-slate-700 border-2 border-white rounded-full w-12 h-12 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                                  draggable="true"
                                  ondragstart="handlePlayerDragStart(event)"
                                  data-player-id="${player.id}">
                                <div class="text-center">
                                    <div class="text-xs">${player.name.split(' ').map(n => n[0]).join('')}</div>
                                </div>
                                <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs whitespace-nowrap">
                                    ${position}
                                </div>
                            </div>` :
                            `<div class="empty-position border-2 border-dashed border-white opacity-50 rounded-full w-12 h-12 flex items-center justify-center text-white text-xs">
                                ${position}
                            </div>`
                        }
                    </div>
                `;
                
                if (player) playerIndex++;
            });
        }
        
        return html;
    }
    
    generatePlayerPool(players) {
        const usedPlayers = this.getUsedPlayersCount();
        const availablePlayers = players.slice(usedPlayers);
        
        return availablePlayers.map(player => `
            <div class="player-pool-item bg-slate-700 rounded p-2 text-white text-sm cursor-move border border-slate-600 hover:border-slate-500"
                 draggable="true"
                 ondragstart="handlePlayerDragStart(event)"
                 data-player-id="${player.id}">
                <div class="font-medium">${player.name}</div>
                <div class="text-gray-400 text-xs">${player.position || 'Flexibel'}</div>
            </div>
        `).join('');
    }
    
    generateFormationStats(teamName, players) {
        const stats = this.calculateFormationStats(players);
        
        return `
            <div class="bg-slate-700 rounded p-3">
                <h5 class="text-white font-medium mb-2">Formation Stats</h5>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between text-gray-300">
                        <span>Angriff:</span>
                        <span class="text-red-400">${stats.attack}/10</span>
                    </div>
                    <div class="flex justify-between text-gray-300">
                        <span>Mittelfeld:</span>
                        <span class="text-yellow-400">${stats.midfield}/10</span>
                    </div>
                    <div class="flex justify-between text-gray-300">
                        <span>Verteidigung:</span>
                        <span class="text-blue-400">${stats.defense}/10</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-slate-700 rounded p-3">
                <h5 class="text-white font-medium mb-2">Spieler</h5>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between text-gray-300">
                        <span>Aufgestellt:</span>
                        <span class="text-green-400">${this.getUsedPlayersCount()}/11</span>
                    </div>
                    <div class="flex justify-between text-gray-300">
                        <span>Verfügbar:</span>
                        <span class="text-gray-400">${players.length}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    calculateFormationStats(players) {
        // Simple calculation based on formation structure
        const formation = this.formations[this.currentFormation];
        const positionCounts = {};
        
        for (const position of Object.keys(formation.positions)) {
            const category = this.getPositionCategory(position);
            positionCounts[category] = (positionCounts[category] || 0) + formation.positions[position].length;
        }
        
        return {
            attack: Math.min(10, (positionCounts.attack || 0) * 3),
            midfield: Math.min(10, (positionCounts.midfield || 0) * 2),
            defense: Math.min(10, (positionCounts.defense || 0) * 2)
        };
    }
    
    getPositionCategory(position) {
        const attackPositions = ['ST', 'CF', 'LW', 'RW'];
        const midfieldPositions = ['CM', 'CDM', 'CAM', 'LM', 'RM'];
        const defensePositions = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
        
        if (attackPositions.includes(position)) return 'attack';
        if (midfieldPositions.includes(position)) return 'midfield';
        if (defensePositions.includes(position)) return 'defense';
        return 'defense'; // Default for GK and others
    }
    
    getUsedPlayersCount() {
        const formation = this.formations[this.currentFormation];
        return Object.values(formation.positions).reduce((sum, coords) => sum + coords.length, 0);
    }
    
    attachEventListeners(containerId, teamName) {
        const container = document.getElementById(containerId);
        
        // Formation selector
        const selector = container.querySelector('#formation-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.currentFormation = e.target.value;
                this.renderFormationView(containerId, teamName);
            });
        }
        
        // Add global drag and drop handlers
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        // Add global functions for drag and drop
        window.handlePlayerDragStart = (event) => {
            event.dataTransfer.setData('text/plain', event.target.dataset.playerId);
            event.target.style.opacity = '0.5';
        };
        
        window.allowDrop = (event) => {
            event.preventDefault();
        };
        
        window.handlePlayerDrop = (event) => {
            event.preventDefault();
            const playerId = event.dataTransfer.getData('text/plain');
            const position = event.currentTarget.dataset.position;
            
            console.log(`Moving player ${playerId} to position ${position}`);
            // Here you would implement the actual player movement logic
        };
        
        // Reset opacity on drag end
        document.addEventListener('dragend', (event) => {
            if (event.target.dataset.playerId) {
                event.target.style.opacity = '1';
            }
        });
    }
    
    static createFormationViewHTML() {
        return `
            <div id="formation-container" class="formation-view-container">
                <!-- Formation content will be rendered here -->
            </div>
        `;
    }
}

// Helper function to integrate with existing tabs
export function addFormationToKaderTab() {
    // This would be integrated into kader.js
    const formationHTML = `
        <div class="formation-section mt-6">
            <button 
                onclick="toggleFormationView()" 
                class="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center"
            >
                <i class="fas fa-chess-board mr-2"></i>
                Formation anzeigen
            </button>
            
            <div id="formation-view" class="hidden mt-4">
                ${FormationVisualizer.createFormationViewHTML()}
            </div>
        </div>
    `;
    
    return formationHTML;
}

// Global functions for integration
window.toggleFormationView = function() {
    const formationView = document.getElementById('formation-view');
    const button = event.target;
    
    if (formationView.classList.contains('hidden')) {
        formationView.classList.remove('hidden');
        button.innerHTML = '<i class="fas fa-chess-board mr-2"></i>Formation ausblenden';
        
        // Initialize formation visualizer
        const visualizer = new FormationVisualizer();
        visualizer.renderFormationView('formation-container', 'AEK');
    } else {
        formationView.classList.add('hidden');
        button.innerHTML = '<i class="fas fa-chess-board mr-2"></i>Formation anzeigen';
    }
};

console.log("Formation visualizer loaded");