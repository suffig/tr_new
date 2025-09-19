/**
 * Offline Mode Manager for FIFA Tracker
 * Handles offline functionality, data syncing, and service worker integration
 */

export class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingActions = [];
        this.syncQueue = [];
        this.lastSyncTime = localStorage.getItem('fifa_tracker_last_sync') || null;
        
        this.init();
    }
    
    init() {
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Check connection status periodically
        setInterval(() => {
            this.checkConnection();
        }, 30000); // Check every 30 seconds
        
        // Initialize offline indicator
        this.updateOfflineIndicator();
        
        // Register service worker for offline support
        this.registerServiceWorker();
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    handleOnline() {
        this.isOnline = true;
        this.updateOfflineIndicator();
        this.syncPendingActions();
        this.showConnectionNotification('✅ Wieder online - Daten werden synchronisiert...');
    }
    
    handleOffline() {
        this.isOnline = false;
        this.updateOfflineIndicator();
        this.showConnectionNotification('⚠️ Offline-Modus aktiv - Änderungen werden lokal gespeichert');
    }
    
    async checkConnection() {
        try {
            // Try to fetch a small resource to test connectivity
            const response = await fetch('/test_main_app.html', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            if (response.ok && !this.isOnline) {
                this.handleOnline();
            }
        } catch (error) {
            if (this.isOnline) {
                this.handleOffline();
            }
        }
    }
    
    updateOfflineIndicator() {
        let indicator = document.getElementById('offline-indicator');
        
        if (!this.isOnline) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'offline-indicator';
                indicator.className = 'fixed top-2 left-2 z-50 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2';
                document.body.appendChild(indicator);
            }
            
            indicator.innerHTML = `
                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>Offline</span>
                <span class="text-xs">(${this.pendingActions.length} wartend)</span>
            `;
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }
    
    // Add action to offline queue
    addPendingAction(action) {
        const actionWithTimestamp = {
            ...action,
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            retryCount: 0
        };
        
        this.pendingActions.push(actionWithTimestamp);
        this.savePendingActions();
        this.updateOfflineIndicator();
        
        return actionWithTimestamp.id;
    }
    
    // Save data locally when offline
    async saveOfflineData(type, data) {
        const storageKey = `fifa_tracker_offline_${type}`;
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const dataWithMeta = {
            ...data,
            _offline: true,
            _timestamp: new Date().toISOString(),
            _id: Date.now() + Math.random()
        };
        
        existingData.push(dataWithMeta);
        localStorage.setItem(storageKey, JSON.stringify(existingData));
        
        return dataWithMeta;
    }
    
    // Get offline data
    getOfflineData(type) {
        const storageKey = `fifa_tracker_offline_${type}`;
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    }
    
    // Clear offline data after successful sync
    clearOfflineData(type) {
        const storageKey = `fifa_tracker_offline_${type}`;
        localStorage.removeItem(storageKey);
    }
    
    // Sync pending actions when back online
    async syncPendingActions() {
        if (!this.isOnline || this.pendingActions.length === 0) return;
        
        const actionsToSync = [...this.pendingActions];
        let successCount = 0;
        let failCount = 0;
        
        for (const action of actionsToSync) {
            try {
                await this.executeAction(action);
                this.removePendingAction(action.id);
                successCount++;
            } catch (error) {
                console.error('Failed to sync action:', action, error);
                action.retryCount = (action.retryCount || 0) + 1;
                
                // Remove actions that have failed too many times
                if (action.retryCount >= 3) {
                    this.removePendingAction(action.id);
                    failCount++;
                }
            }
        }
        
        this.savePendingActions();
        this.updateOfflineIndicator();
        
        if (successCount > 0) {
            this.showConnectionNotification(`✅ ${successCount} Aktionen synchronisiert`);
        }
        
        if (failCount > 0) {
            this.showConnectionNotification(`❌ ${failCount} Aktionen fehlgeschlagen`, 'error');
        }
        
        // Update last sync time
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('fifa_tracker_last_sync', this.lastSyncTime);
    }
    
    // Execute a pending action
    async executeAction(action) {
        switch (action.type) {
            case 'save_player':
                // Implementation would call the actual save player function
                console.log('Syncing player save:', action.data);
                break;
            case 'save_match':
                console.log('Syncing match save:', action.data);
                break;
            case 'save_transaction':
                console.log('Syncing transaction save:', action.data);
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
    
    removePendingAction(actionId) {
        this.pendingActions = this.pendingActions.filter(action => action.id !== actionId);
    }
    
    savePendingActions() {
        localStorage.setItem('fifa_tracker_pending_actions', JSON.stringify(this.pendingActions));
    }
    
    loadPendingActions() {
        const saved = localStorage.getItem('fifa_tracker_pending_actions');
        if (saved) {
            this.pendingActions = JSON.parse(saved);
            this.updateOfflineIndicator();
        }
    }
    
    showConnectionNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `connection-notification fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 ${
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-download"></i>
                <div class="flex-1">
                    <div class="font-medium">Update verfügbar</div>
                    <div class="text-sm opacity-90">Neue Version der App ist bereit</div>
                </div>
                <button onclick="this.parentNode.parentNode.remove()" class="text-white hover:text-gray-300">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <button onclick="window.location.reload()" class="w-full mt-2 bg-white text-green-600 py-1 px-3 rounded font-medium text-sm">
                Jetzt aktualisieren
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }
    
    // Get offline status info for UI
    getOfflineStatus() {
        return {
            isOnline: this.isOnline,
            pendingActions: this.pendingActions.length,
            lastSync: this.lastSyncTime,
            hasOfflineData: this.hasOfflineData()
        };
    }
    
    hasOfflineData() {
        const types = ['players', 'matches', 'transactions', 'bans'];
        return types.some(type => this.getOfflineData(type).length > 0);
    }
    
    // Manual sync trigger
    async forcSync() {
        if (!this.isOnline) {
            this.showConnectionNotification('❌ Keine Internetverbindung für Synchronisation', 'error');
            return false;
        }
        
        this.showConnectionNotification('🔄 Synchronisation gestartet...');
        await this.syncPendingActions();
        return true;
    }
    
    // Clear all offline data (use with caution)
    clearAllOfflineData() {
        const types = ['players', 'matches', 'transactions', 'bans'];
        types.forEach(type => this.clearOfflineData(type));
        this.pendingActions = [];
        this.savePendingActions();
        this.updateOfflineIndicator();
    }
}

// Create global instance
window.offlineManager = new OfflineManager();

// Load pending actions on startup
window.offlineManager.loadPendingActions();

export default OfflineManager;