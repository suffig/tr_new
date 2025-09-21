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

export default function AdminTab({ onLogout, onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  const [activeSubTab, setActiveSubTab] = useState('search');

  const subTabs = [
    { id: 'search', label: '', icon: 'fas fa-search' }, // Removed label as per requirement #3
    { id: 'matches', label: 'Spiele hinzufügen', icon: 'fas fa-futbol' },
    { id: 'bans', label: 'Sperren hinzufügen', icon: 'fas fa-ban' },
    { id: 'players', label: 'Spieler hinzufügen', icon: 'fas fa-users' },
    { id: 'transactions', label: 'Transaktionen hinzufügen', icon: 'fas fa-euro-sign' },
    { id: 'settings', label: 'Team-Einstellungen', icon: 'fas fa-cog' },
    { id: 'events', label: 'Events & Benachrichtigungen', icon: 'fas fa-bell' },
    { id: 'delete', label: 'Daten löschen', icon: 'fas fa-trash' },
    { id: 'manager', label: 'System-Manager', icon: 'fas fa-tools' }, // Combined Season & FIFA manager at the end
  ];

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-bg-secondary border-b border-border-light flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Verwaltung
          </h2>
          <p className="text-text-muted text-sm">
            Hinzufügen und verwalten von Daten
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center px-3 py-2 bg-accent-red text-white rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          aria-label="Abmelden"
        >
          <i className="fas fa-sign-out-alt mr-2"></i>
          <span className="text-sm">Logout</span>
        </button>
      </div>

      {/* Sub-tab navigation */}
      <div className="bg-bg-secondary border-b border-border-light">
        <div className="flex overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'text-primary-green border-b-2 border-primary-green bg-bg-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
              title={tab.id === 'search' ? 'Globale Suche' : tab.label} // Add tooltip for search icon
              aria-label={tab.id === 'search' ? 'Globale Suche' : tab.label}
            >
              <i className={`${tab.icon} ${tab.label ? 'mr-2' : ''}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto">
        {renderSubTabContent()}
      </div>
    </div>
  );
}