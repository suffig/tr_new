import Icon from '../icons/Icon';
import { useState } from 'react';
import { ADMIN_EMAIL } from '../../constants/navigation';
import AddMatchTab from './admin/AddMatchTab';
import AddBanTab from './admin/AddBanTab';
import AddPlayerTab from './admin/AddPlayerTab';
import AddTransactionTab from './admin/AddTransactionTab';
import DeleteTab from './admin/DeleteTab';
import SearchTab from './admin/SearchTab';
import TeamSettingsTab from './admin/TeamSettingsTab';
import TeamCatalogTab from './admin/TeamCatalogTab';
import EventsSettingsTab from './admin/EventsSettingsTab';
import ManagerTab from './admin/ManagerTab';

export default function AdminTab({ onLogout, onNavigate, showHints = false, user }) { // eslint-disable-line no-unused-vars
  const [activeSubTab, setActiveSubTab] = useState('matches');
  const [navOpen, setNavOpen] = useState(false);

  // Security check - only allow access for authorized user
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="modern-card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-system-red/12 text-system-red flex items-center justify-center" aria-hidden="true">
            <Icon name="ban" size={32} strokeWidth={1.8} />
          </div>
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
      icon: 'search',
      category: 'quick',
      description: 'Globale Suche durch alle Daten'
    },
    
    // Data Management
    { 
      id: 'matches', 
      label: 'Spiele', 
      icon: 'football',
      category: 'data',
      description: 'Neue Spiele hinzufügen und verwalten'
    },
    { 
      id: 'players', 
      label: 'Spieler', 
      icon: 'users',
      category: 'data',
      description: 'Spieler hinzufügen und bearbeiten'
    },
    { 
      id: 'transactions', 
      label: 'Finanzen', 
      icon: 'euro',
      category: 'data',
      description: 'Transaktionen und Finanzen verwalten'
    },
    { 
      id: 'bans', 
      label: 'Sperren', 
      icon: 'ban',
      category: 'data',
      description: 'Spielersperren hinzufügen und verwalten'
    },
    
    // Configuration
    { 
      id: 'settings', 
      label: 'Teams', 
      icon: 'settings',
      category: 'config',
      description: 'Team-Einstellungen und Konfiguration'
    },
    {
      id: 'events',
      label: 'Events',
      icon: 'bell',
      category: 'config',
      description: 'Events & Benachrichtigungen verwalten'
    },
    {
      id: 'fc26teams',
      label: 'FC26-Teams',
      icon: 'trophy',
      category: 'config',
      description: 'Team-Katalog & Star-Ratings bearbeiten'
    },

    // System Administration
    { 
      id: 'manager', 
      label: 'System', 
      icon: 'wrench',
      category: 'system',
      description: 'System-Manager für Saisons und Versionen'
    },
    { 
      id: 'delete', 
      label: 'Daten löschen', 
      icon: 'trash', 
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
      case 'fc26teams':
        return <TeamCatalogTab />;
      case 'delete':
        return <DeleteTab />;
      case 'manager':
        return <ManagerTab />;
      default:
        return <SearchTab onNavigate={onNavigate} />;
    }
  };

  const categorizedTabs = getCategorizedTabs();
  const currentTab = subTabs.find((t) => t.id === activeSubTab) || subTabs[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-separator">
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-system-green/12 text-system-green rounded-xl flex items-center justify-center">
              <Icon name="settings" size={24} strokeWidth={2} />
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
            <Icon name="logout" size={16} strokeWidth={2} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Collapsible section navigation — collapsed by default so the
          selected section's content is immediately visible on mobile */}
      <div className="bg-bg-secondary border-b border-border-light">
        <div className="p-4">
          <button
            onClick={() => setNavOpen((o) => !o)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-tertiary text-left"
            aria-expanded={navOpen}
          >
            <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-system-green/12 text-system-green flex items-center justify-center">
              <Icon name={currentTab.icon} size={20} strokeWidth={2} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-text-tertiary">Bereich</span>
              <span className="block font-semibold text-text-primary truncate">{currentTab.label}</span>
            </span>
            <span className={`flex-shrink-0 text-text-tertiary transition-transform duration-200 ${navOpen ? 'rotate-90' : ''}`}>
              <Icon name="chevronRight" size={20} strokeWidth={2.2} />
            </span>
          </button>

          {navOpen && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-mobile-slide-in">
              {categorizedTabs.map((categoryGroup) => (
                <div key={categoryGroup.category} className="space-y-2">
                  <div className="section-label flex items-center gap-2">
                    <Icon name={categoryGroup.icon} size={14} strokeWidth={2.2} className="text-system-green" />
                    {categoryGroup.name}
                  </div>
                  {categoryGroup.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveSubTab(tab.id); setNavOpen(false); }}
                      className={`w-full rounded-xl p-3 text-left transition-all duration-200 border ${
                        activeSubTab === tab.id
                          ? 'bg-system-green/10 border-system-green/40 shadow-sm'
                          : 'bg-bg-secondary hover:bg-bg-tertiary border-border-light'
                      }`}
                      title={tab.description}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          activeSubTab === tab.id ? 'bg-system-green/15 text-system-green' : 'bg-bg-tertiary text-text-tertiary'
                        }`}>
                          <Icon name={tab.icon} size={18} strokeWidth={2} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${activeSubTab === tab.id ? 'text-system-green' : 'text-text-primary'}`}>
                            {tab.label}
                          </div>
                          <div className="text-xs text-text-muted truncate">{tab.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto">
        {renderSubTabContent()}
      </div>
    </div>
  );
}