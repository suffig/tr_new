import Icon from '../icons/Icon';
import { useState } from 'react';
import AddMatchTab from './admin/AddMatchTab';
import AddBanTab from './admin/AddBanTab';
import AddPlayerTab from './admin/AddPlayerTab';
import AddTransactionTab from './admin/AddTransactionTab';
import DeleteTab from './admin/DeleteTab';
import SearchTab from './admin/SearchTab';
import TeamSettingsTab from './admin/TeamSettingsTab';
import EventsSettingsTab from './admin/EventsSettingsTab';
import ManagerTab from './admin/ManagerTab';

export default function AdminTab({ onLogout, onNavigate, showHints = false, user }) { // eslint-disable-line no-unused-vars
  const [activeSubTab, setActiveSubTab] = useState('search');

  // Security check - only allow access for authorized user
  if (!user || user.email !== 'philip-melchert@live.de') {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="modern-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
          <h3 className="text-xl font-bold mb-2 text-text-primary">Zugriff verweigert</h3>
          <p className="text-text-secondary mb-4">
            Sie haben keine Berechtigung, auf den Admin-Bereich zuzugreifen.
          </p>
          <button 
            onClick={() => onNavigate('matches')}
            className="btn-primary"
            aria-label="Zur Übersicht zurückkehren"
          >
            Zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  // Organized admin tabs in logical groups
  const subTabs = [
    // Quick Access
    { 
      id: 'search', 
      label: 'Suche', 
      icon: 'fas fa-search', 
      category: 'quick',
      description: 'Globale Suche durch alle Daten'
    },
    
    // Data Management
    { 
      id: 'matches', 
      label: 'Spiele', 
      icon: 'fas fa-futbol', 
      category: 'data',
      description: 'Neue Spiele hinzufügen und verwalten'
    },
    { 
      id: 'players', 
      label: 'Spieler', 
      icon: 'fas fa-users', 
      category: 'data',
      description: 'Spieler hinzufügen und bearbeiten'
    },
    { 
      id: 'transactions', 
      label: 'Finanzen', 
      icon: 'fas fa-euro-sign', 
      category: 'data',
      description: 'Transaktionen und Finanzen verwalten'
    },
    { 
      id: 'bans', 
      label: 'Sperren', 
      icon: 'fas fa-ban', 
      category: 'data',
      description: 'Spielersperren hinzufügen und verwalten'
    },
    
    // Configuration
    { 
      id: 'settings', 
      label: 'Teams', 
      icon: 'fas fa-cog', 
      category: 'config',
      description: 'Team-Einstellungen und Konfiguration'
    },
    { 
      id: 'events', 
      label: 'Events', 
      icon: 'fas fa-bell', 
      category: 'config',
      description: 'Events & Benachrichtigungen verwalten'
    },
    
    // System Administration
    { 
      id: 'manager', 
      label: 'System', 
      icon: 'fas fa-tools', 
      category: 'system',
      description: 'System-Manager für Saisons und Versionen'
    },
    { 
      id: 'delete', 
      label: 'Daten löschen', 
      icon: 'fas fa-trash', 
      category: 'system',
      description: 'Daten löschen und bereinigen'
    },
  ];

  // Group tabs by category for better organization
  const getCategorizedTabs = () => {
    const categories = {
      quick: { name: 'Schnellzugriff', icon: 'zap', color: 'blue' },
      data: { name: 'Datenmanagement', icon: 'chart', color: 'green' },
      config: { name: 'Konfiguration', icon: 'settings', color: 'purple' },
      system: { name: 'System', icon: 'wrench', color: 'red' }
    };

    return Object.entries(categories).map(([key, meta]) => ({
      category: key,
      ...meta,
      tabs: subTabs.filter(tab => tab.category === key)
    }));
  };

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'search':
        return <SearchTab onNavigate={onNavigate} />;
      case 'matches':
        return <AddMatchTab />;
      case 'bans':
        return <AddBanTab />;
      case 'players':
        return <AddPlayerTab />;
      case 'transactions':
        return <AddTransactionTab />;
      case 'settings':
        return <TeamSettingsTab />;
      case 'events':
        return <EventsSettingsTab />;
      case 'delete':
        return <DeleteTab />;
      case 'manager':
        return <ManagerTab />;
      default:
        return <SearchTab onNavigate={onNavigate} />;
    }
  };

  const categorizedTabs = getCategorizedTabs();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-separator">
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-system-green/12 text-system-green rounded-xl flex items-center justify-center">
              <i className="fas fa-cogs text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1 text-text-primary">
                Verwaltung
              </h2>
              <p className="text-text-secondary text-sm">
                Zentrale Administration und Datenmanagement
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 btn-soft btn-soft-red rounded-xl"
            aria-label="Abmelden"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation with Categories */}
      <div className="bg-bg-secondary border-b border-border-light">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categorizedTabs.map((categoryGroup) => (
              <div key={categoryGroup.category} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={categoryGroup.icon} size={16} strokeWidth={2.2} className="text-system-green" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {categoryGroup.name}
                  </h3>
                </div>
                
                {/* Category Tabs */}
                <div className="space-y-2">
                  {categoryGroup.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`w-full group relative rounded-xl p-4 text-left transition-all duration-200 border ${
                        activeSubTab === tab.id
                          ? 'bg-system-green/10 border-system-green/40 shadow-sm'
                          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                      title={tab.description}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          activeSubTab === tab.id
                            ? 'bg-system-green/15'
                            : 'bg-gray-100'
                        }`}>
                          <i className={`${tab.icon} ${
                            activeSubTab === tab.id
                              ? 'text-system-green'
                              : 'text-gray-500'
                          }`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${
                            activeSubTab === tab.id ? 'text-system-green' : 'text-gray-900'
                          }`}>
                            {tab.label}
                          </div>
                          <div className="text-xs mt-1 text-gray-500">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto">
        {renderSubTabContent()}
      </div>
    </div>
  );
}