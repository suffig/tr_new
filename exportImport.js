/**
 * Export/Import functionality for FIFA Tracker
 * Allows users to backup and restore their data
 */

import { supabase } from './supabaseClient.js';
import { dataManager } from './dataManager.js';
import { loadingManager, ErrorHandler } from './utils.js';

export class DataExportImport {
    static async exportAllData() {
        try {
            loadingManager.show('Exportiere Daten...');
            
            // Get all data from different tables
            const allData = await dataManager.loadAllAppData();
            
            // Create export object with metadata
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                appVersion: 'FIFA-Tracker-v1.0',
                data: allData,
                totalRecords: this.calculateTotalRecords(allData)
            };
            
            // Create and download the file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `fifa-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            loadingManager.hide();
            return { success: true, message: 'Daten erfolgreich exportiert!' };
            
        } catch (error) {
            loadingManager.hide();
            ErrorHandler.handle(error, 'Fehler beim Exportieren der Daten');
            return { success: false, error: error.message };
        }
    }
    
    static async importData(file) {
        try {
            loadingManager.show('Importiere Daten...');
            
            // Read file content
            const fileContent = await this.readFileAsText(file);
            const importData = JSON.parse(fileContent);
            
            // Validate import data structure
            if (!this.validateImportData(importData)) {
                throw new Error('Ungültiges Backup-Format');
            }
            
            // Confirm import with user
            const confirmMessage = `Backup vom ${new Date(importData.exportDate).toLocaleDateString('de-DE')} importieren?\n\n` +
                                 `Enthält ${importData.totalRecords} Datensätze.\n` +
                                 `WARNUNG: Aktuelle Daten werden überschrieben!`;
            
            if (!confirm(confirmMessage)) {
                loadingManager.hide();
                return { success: false, cancelled: true };
            }
            
            // Import data to database
            await this.importToDatabase(importData.data);
            
            loadingManager.hide();
            
            // Reload the current tab to show imported data
            if (window.renderCurrentTab) {
                await window.renderCurrentTab();
            }
            
            return { 
                success: true, 
                message: `${importData.totalRecords} Datensätze erfolgreich importiert!`,
                importDate: importData.exportDate 
            };
            
        } catch (error) {
            loadingManager.hide();
            ErrorHandler.handle(error, 'Fehler beim Importieren der Daten');
            return { success: false, error: error.message };
        }
    }
    
    static async exportPlayerStats() {
        try {
            loadingManager.show('Exportiere Spieler-Statistiken...');
            
            const players = await dataManager.getAllPlayers();
            const matches = await dataManager.getAllMatches();
            
            // Calculate comprehensive stats for each player
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
                
                return {
                    name: player.name,
                    team: player.team,
                    position: player.position,
                    matches: playerMatches.length,
                    goals: goals,
                    wins: wins,
                    winRate: playerMatches.length > 0 ? (wins / playerMatches.length * 100).toFixed(1) + '%' : '0%',
                    goalsPerGame: playerMatches.length > 0 ? (goals / playerMatches.length).toFixed(2) : '0.00'
                };
            });
            
            // Create CSV content
            const csvHeaders = 'Name,Team,Position,Spiele,Tore,Siege,Siegrate,Tore pro Spiel\n';
            const csvContent = playerStats.map(p => 
                `"${p.name}","${p.team}","${p.position}",${p.matches},${p.goals},${p.wins},"${p.winRate}","${p.goalsPerGame}"`
            ).join('\n');
            
            const fullCsv = csvHeaders + csvContent;
            
            // Download CSV file
            const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `spieler-statistiken-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            loadingManager.hide();
            return { success: true, message: 'Spieler-Statistiken erfolgreich exportiert!' };
            
        } catch (error) {
            loadingManager.hide();
            ErrorHandler.handle(error, 'Fehler beim Exportieren der Spieler-Statistiken');
            return { success: false, error: error.message };
        }
    }
    
    // Helper methods
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }
    
    static validateImportData(data) {
        return data && 
               data.version && 
               data.exportDate && 
               data.data && 
               typeof data.data === 'object';
    }
    
    static calculateTotalRecords(data) {
        let total = 0;
        if (data.players) total += data.players.length;
        if (data.matches) total += data.matches.length;
        if (data.bans) total += data.bans.length;
        if (data.transactions) total += data.transactions.length;
        if (data.finances) total += data.finances.length;
        return total;
    }
    
    static async importToDatabase(data) {
        const { user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Nicht angemeldet');
        
        // Clear existing data (with confirmation already given)
        if (data.players) {
            await supabase.from('players').delete().neq('id', 'never-match');
            if (data.players.length > 0) {
                await supabase.from('players').insert(data.players);
            }
        }
        
        if (data.matches) {
            await supabase.from('matches').delete().neq('id', 'never-match');
            if (data.matches.length > 0) {
                await supabase.from('matches').insert(data.matches);
            }
        }
        
        if (data.bans) {
            await supabase.from('bans').delete().neq('id', 'never-match');
            if (data.bans.length > 0) {
                await supabase.from('bans').insert(data.bans);
            }
        }
        
        if (data.transactions) {
            await supabase.from('transactions').delete().neq('id', 'never-match');
            if (data.transactions.length > 0) {
                await supabase.from('transactions').insert(data.transactions);
            }
        }
        
        if (data.finances) {
            await supabase.from('finances').delete().neq('id', 'never-match');
            if (data.finances.length > 0) {
                await supabase.from('finances').insert(data.finances);
            }
        }
    }
}

// UI Helper functions for integration
export function createExportImportUI() {
    return `
        <div class="export-import-section bg-slate-800 rounded-lg p-4 border border-slate-600 mb-4">
            <h3 class="text-white font-semibold mb-4 flex items-center">
                <i class="fas fa-download mr-2"></i>
                Daten Export/Import
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Export Section -->
                <div class="space-y-3">
                    <h4 class="text-gray-300 font-medium">Export</h4>
                    <button 
                        onclick="exportAllData()" 
                        class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                        <i class="fas fa-file-export mr-2"></i>
                        Alle Daten exportieren
                    </button>
                    <button 
                        onclick="exportPlayerStats()" 
                        class="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                        <i class="fas fa-chart-bar mr-2"></i>
                        Spieler-Statistiken (CSV)
                    </button>
                </div>
                
                <!-- Import Section -->
                <div class="space-y-3">
                    <h4 class="text-gray-300 font-medium">Import</h4>
                    <div class="relative">
                        <input 
                            type="file" 
                            id="import-file-input" 
                            accept=".json"
                            class="hidden"
                            onchange="handleImportFile(this)"
                        >
                        <button 
                            onclick="document.getElementById('import-file-input').click()" 
                            class="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center"
                        >
                            <i class="fas fa-file-import mr-2"></i>
                            Daten importieren
                        </button>
                    </div>
                    <p class="text-gray-400 text-xs">
                        Unterstützt: JSON-Backup-Dateien
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Global functions for UI integration
window.exportAllData = async function() {
    const result = await DataExportImport.exportAllData();
    if (result.success) {
        alert('✅ ' + result.message);
    } else {
        alert('❌ Export fehlgeschlagen: ' + result.error);
    }
};

window.exportPlayerStats = async function() {
    const result = await DataExportImport.exportPlayerStats();
    if (result.success) {
        alert('✅ ' + result.message);
    } else {
        alert('❌ Export fehlgeschlagen: ' + result.error);
    }
};

window.handleImportFile = async function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const result = await DataExportImport.importData(file);
    if (result.success) {
        alert('✅ ' + result.message);
    } else if (!result.cancelled) {
        alert('❌ Import fehlgeschlagen: ' + result.error);
    }
    
    // Clear file input
    input.value = '';
};