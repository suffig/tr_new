import { useState, useEffect } from 'react';
import { dataManager } from '../../../../dataManager.js';
import ThemeSettings from '../../ThemeSettings';
import ColorCustomization from '../../ColorCustomization';
import NotificationSettings from '../../NotificationSettings';

export default function TeamSettingsTab() {
  const [managers, setManagers] = useState({
    aek: { name: 'Alexander', age: 30, weight: 110 },
    real: { name: 'Philip', age: 30, weight: 105 }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load manager settings from database
  useEffect(() => {
    loadManagersFromDatabase();
  }, []);

  const loadManagersFromDatabase = async () => {
    try {
      setLoading(true);
      console.log('🔄 [AdminTab] Loading managers from database...');
      const result = await dataManager.getManagers();
      console.log('📊 [AdminTab] Manager data result:', result);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length >= 2) {
        console.log('✅ [AdminTab] Manager data loaded successfully:', result.data);
        // Convert database format to component format
        // Assuming id=1 is AEK manager, id=2 is Real manager
        const aekManager = result.data.find(m => m.id === 1) || { name: 'Alexander', gewicht: 110, age: 30 };
        const realManager = result.data.find(m => m.id === 2) || { name: 'Philip', gewicht: 105, age: 30 };
        
        console.log('👤 [AdminTab] AEK Manager:', aekManager);
        console.log('👤 [AdminTab] Real Manager:', realManager);
        
        setManagers({
          aek: { name: aekManager.name, age: aekManager.age || 30, weight: aekManager.gewicht },
          real: { name: realManager.name, age: realManager.age || 30, weight: realManager.gewicht }
        });
      } else {
        console.warn('⚠️ [AdminTab] No manager data found, using defaults. Result:', result);
        // Use defaults if no data - but let's try to create the managers first
        await initializeManagers();
      }
    } catch (error) {
      console.error('❌ [AdminTab] Error loading manager settings from database:', error);
      // Try to initialize managers if they don't exist
      await initializeManagers();
    } finally {
      setLoading(false);
    }
  };

  // Initialize managers if they don't exist in database
  const initializeManagers = async () => {
    try {
      console.log('🔧 [AdminTab] Initializing default managers...');
      
      // Create AEK manager (id=1)
      const aekData = { name: 'Alexander', gewicht: 110, age: 30 };
      const aekResult = await dataManager.insertManager(aekData);
      console.log('✅ [AdminTab] AEK manager created:', aekResult);
      
      // Create Real manager (id=2)  
      const realData = { name: 'Philip', gewicht: 105, age: 30 };
      const realResult = await dataManager.insertManager(realData);
      console.log('✅ [AdminTab] Real manager created:', realResult);
      
      // Set defaults in state
      setManagers({
        aek: { name: 'Alexander', age: 30, weight: 110 },
        real: { name: 'Philip', age: 30, weight: 105 }
      });
      
    } catch (error) {
      console.error('❌ [AdminTab] Error initializing managers:', error);
      // Final fallback - just use state defaults
      setManagers({
        aek: { name: 'Alexander', age: 30, weight: 110 },
        real: { name: 'Philip', age: 30, weight: 105 }
      });
    }
  };

  const handleManagerChange = (team, field, value) => {
    setManagers(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [field]: field === 'name' ? value : parseInt(value) || 0
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // Debug: Log what we're trying to save
      console.log('💾 [TeamSettings] Saving manager settings:', managers);
      
      // Update both managers in the database
      const aekData = { name: managers.aek.name, gewicht: managers.aek.weight, age: managers.aek.age };
      const realData = { name: managers.real.name, gewicht: managers.real.weight, age: managers.real.age };
      
      console.log('💾 [TeamSettings] AEK Data:', aekData);
      console.log('💾 [TeamSettings] Real Data:', realData);
      
      // Update AEK manager (id=1)
      const aekResult = await dataManager.updateManager(1, aekData);
      console.log('💾 [TeamSettings] AEK Update Result:', aekResult);
      
      // Update Real manager (id=2)
      const realResult = await dataManager.updateManager(2, realData);
      console.log('💾 [TeamSettings] Real Update Result:', realResult);
      
      setHasChanges(false);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('managerSettingsChanged'));
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Manager-Einstellungen gespeichert!';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } catch (error) {
      console.error('Error saving manager settings:', error);
      
      // Show error message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Fehler beim Speichern!';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setManagers({
      aek: { name: 'Alexander', age: 30, weight: 110 },
      real: { name: 'Philip', age: 30, weight: 105 }
    });
    setHasChanges(true);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Theme Settings Section */}
      <ThemeSettings />
      
      {/* Color Customization Section */}
      <ColorCustomization />
      
      {/* Notification Settings Section */}
      <NotificationSettings />
      
      {loading ? (
        <div className="modern-card">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-green"></div>
            <span className="ml-2 text-text-muted">Lade Manager-Einstellungen...</span>
          </div>
        </div>
      ) : (
        <div className="modern-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            🏆 Team-Manager Einstellungen
          </h3>
          {hasChanges && (
            <span className="text-sm text-orange-600 font-medium">
              Ungespeicherte Änderungen
            </span>
          )}
        </div>
        
        <div className="text-sm text-text-muted mb-6">
          Hier können Sie die Daten der Team-Manager für die BAK-Berechnung anpassen.
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* AEK Manager */}
          <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-800 flex items-center">
              <div className="w-6 h-6 bg-blue-600 rounded mr-2"></div>
              AEK Manager
            </h4>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={managers.aek.name}
                onChange={(e) => handleManagerChange('aek', 'name', e.target.value)}
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Manager Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Alter</label>
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={managers.aek.age}
                  onChange={(e) => handleManagerChange('aek', 'age', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={managers.aek.weight}
                  onChange={(e) => handleManagerChange('aek', 'weight', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Real Manager */}
          <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
            <h4 className="font-medium text-red-800 flex items-center">
              <div className="w-6 h-6 bg-red-600 rounded mr-2"></div>
              Real Manager
            </h4>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={managers.real.name}
                onChange={(e) => handleManagerChange('real', 'name', e.target.value)}
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Manager Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Alter</label>
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={managers.real.age}
                  onChange={(e) => handleManagerChange('real', 'age', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={managers.real.weight}
                  onChange={(e) => handleManagerChange('real', 'weight', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-border-light">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Standardwerte wiederherstellen
          </button>
          
          <button
            onClick={saveSettings}
            disabled={!hasChanges || loading}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              hasChanges && !loading
                ? 'bg-primary-green text-white hover:bg-green-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            <strong>Hinweis:</strong> Diese Einstellungen werden für die BAK-Berechnung in der Statistik verwendet.
            Die Werte werden in der Datenbank gespeichert.
          </div>
        </div>
      </div>
      )}
    </div>
  );
}