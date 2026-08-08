import { useState, useEffect } from 'react';
import ZahlFeld from '../../ZahlFeld';
import { zahl } from '../../../utils/zahlen';
import { dataManager } from '../../../../dataManager.js';
import ThemeSettings from '../../ThemeSettings';
import ColorCustomization from '../../ColorCustomization';
import NotificationSettings from '../../NotificationSettings';
import toast from 'react-hot-toast';

export default function TeamSettingsTab() {
  const [managers, setManagers] = useState({
    aek: { name: 'Alexander', age: 30, weight: 110 },
    real: { name: 'Philip', age: 30, weight: 105 }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

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
      // Expected in demo/offline mode — try to initialize defaults instead
      console.warn('[Admin] Manager-Einstellungen nicht geladen:', error?.message || error);
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
      // Final fallback - use defaults, but TELL the user (silent fallback hid
      // that edits here would not be persisted).
      setLoadFailed(true);
      setManagers({
        aek: { name: 'Alexander', age: 30, weight: 110 },
        real: { name: 'Philip', age: 30, weight: 105 }
      });
    }
  };

  // Der eingetippte Text bleibt hier stehen und wird erst beim Speichern in
  // eine Zahl gewandelt. Vorher lief jeder Tastendruck durch parseInt: aus
  // "82," wurde sofort wieder "82", und ein Gewicht mit Nachkommastelle liess
  // sich gar nicht eingeben.
  const handleManagerChange = (team, field, value) => {
    setManagers(prev => ({
      ...prev,
      [team]: { ...prev[team], [field]: value }
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // Debug: Log what we're trying to save
      console.log('💾 [TeamSettings] Saving manager settings:', managers);
      
      // Update both managers in the database
      // zahl() statt Rohwert: die Felder liefern jetzt Text, und "82,5" waere
      // fuer die Zahlenspalten der Datenbank kein gueltiger Wert.
      const aekData = { name: managers.aek.name, gewicht: zahl(managers.aek.weight), age: zahl(managers.aek.age) };
      const realData = { name: managers.real.name, gewicht: zahl(managers.real.weight), age: zahl(managers.real.age) };
      
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
      window.dispatchEvent(new CustomEvent('fusta-refresh'));
      toast.success('Manager-Einstellungen erfolgreich gespeichert!', {
        duration: 3000,
        position: 'top-center'
      });
      
    } catch (error) {
      console.error('Error saving manager settings:', error);
      
      // Show error message with details
      toast.error(`Fehler beim Speichern: ${error.message || 'Unbekannter Fehler'}`, {
        duration: 5000,
        position: 'top-center'
      });
      
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
      {loadFailed && (
        <div className="rounded-xl border border-system-yellow/40 bg-system-yellow/10 px-4 py-3 text-footnote text-system-yellow">
          Manager-Daten konnten nicht aus der Datenbank geladen werden — es werden
          Standardwerte angezeigt. Änderungen werden evtl. nicht gespeichert.
        </div>
      )}
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
            <span className="text-sm text-system-orange font-medium">
              Ungespeicherte Änderungen
            </span>
          )}
        </div>
        
        <div className="text-sm text-text-muted mb-6">
          Hier können Sie die Daten der Team-Manager für die BAK-Berechnung anpassen.
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* AEK Manager */}
          <div className="space-y-4 p-4 border border-system-blue/25 rounded-lg bg-system-blue/10">
            <h4 className="font-medium text-system-blue flex items-center">
              <div className="w-6 h-6 bg-system-blue rounded mr-2"></div>
              AEK Manager
            </h4>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={managers.aek.name}
                onChange={(e) => handleManagerChange('aek', 'name', e.target.value)}
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-system-blue"
                placeholder="Manager Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Alter</label>
                <ZahlFeld
                  ganzzahl
                  wert={managers.aek.age}
                  onChange={(w) => handleManagerChange('aek', 'age', w)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-system-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
                <ZahlFeld
                  wert={managers.aek.weight}
                  onChange={(w) => handleManagerChange('aek', 'weight', w)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-system-blue"
                />
              </div>
            </div>
          </div>

          {/* Real Manager */}
          <div className="space-y-4 p-4 border border-system-red/25 rounded-lg bg-system-red/10">
            <h4 className="font-medium text-system-red flex items-center">
              <div className="w-6 h-6 bg-system-red rounded mr-2"></div>
              Real Manager
            </h4>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={managers.real.name}
                onChange={(e) => handleManagerChange('real', 'name', e.target.value)}
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-system-red"
                placeholder="Manager Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Alter</label>
                <ZahlFeld
                  ganzzahl
                  wert={managers.real.age}
                  onChange={(w) => handleManagerChange('real', 'age', w)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-system-red"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
                <ZahlFeld
                  wert={managers.real.weight}
                  onChange={(w) => handleManagerChange('real', 'weight', w)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-system-red"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-border-light">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm bg-bg-tertiary text-text-secondary border border-border-medium rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            Standardwerte wiederherstellen
          </button>
          
          <button
            onClick={saveSettings}
            disabled={!hasChanges || loading}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              hasChanges && !loading
                ? 'bg-primary-green text-white hover:bg-system-green' 
                : 'bg-border-strong text-text-tertiary cursor-not-allowed'
            }`}
          >
            {loading ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-system-yellow/10 border border-system-yellow/25 rounded-lg">
          <div className="text-sm text-system-yellow">
            <strong>Hinweis:</strong> Diese Einstellungen werden für die BAK-Berechnung in der Statistik verwendet.
            Die Werte werden in der Datenbank gespeichert.
          </div>
        </div>
      </div>
      )}
    </div>
  );
}