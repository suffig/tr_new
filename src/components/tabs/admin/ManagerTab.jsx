import React, { useState } from 'react';
import SeasonManagerTab from './SeasonManagerTab';
import FifaVersionManagerTab from './FifaVersionManagerTab';
import VersionTeamSettingsTab from './VersionTeamSettingsTab';
import DataExportImportTab from './DataExportImportTab';

const ManagerTab = () => {
  const [activeManagerTab, setActiveManagerTab] = useState('season');

  const managerTabs = [
    { 
      id: 'season', 
      label: 'Saison-Manager', 
      icon: 'fas fa-calendar-alt',
      description: 'Verwalten Sie Legacy- und FC26-Daten'
    },
    { 
      id: 'fifa-versions', 
      label: 'FIFA Versionen', 
      icon: 'fas fa-gamepad',
      description: 'Verwalten und erstellen Sie FIFA Versionen'
    },
    { 
      id: 'version-teams', 
      label: 'Versions-Teams', 
      icon: 'fas fa-users-cog',
      description: 'Konfigurieren Sie Team-Namen und Icons pro Version'
    },
    { 
      id: 'data-export', 
      label: 'Daten-Export', 
      icon: 'fas fa-download',
      description: 'Legacy-Daten exportieren und Finanzen kopieren'
    }
  ];

  const renderManagerTabContent = () => {
    switch (activeManagerTab) {
      case 'season':
        return <SeasonManagerTab />;
      case 'fifa-versions':
        return <FifaVersionManagerTab />;
      case 'version-teams':
        return <VersionTeamSettingsTab />;
      case 'data-export':
        return <DataExportImportTab />;
      default:
        return <SeasonManagerTab />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Manager Header */}
      <div className="bg-bg-secondary border-b border-separator">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-system-green/12 text-system-green rounded-xl flex items-center justify-center">
              <i className="fas fa-cogs text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1 text-text-primary">System-Manager</h2>
              <p className="text-text-secondary text-sm">Zentrale Verwaltung für Saisons, FIFA Versionen und Teams</p>
            </div>
          </div>

          {/* Manager sub-navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {managerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveManagerTab(tab.id)}
                className={`rounded-xl p-4 text-left transition-all duration-200 border ${
                  activeManagerTab === tab.id
                    ? 'bg-system-green/10 border-system-green/40 shadow-sm'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
                title={tab.description}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  activeManagerTab === tab.id
                    ? 'bg-system-green/15 text-system-green'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <i className={`${tab.icon}`}></i>
                </div>
                <div className={`font-semibold mb-1 ${
                  activeManagerTab === tab.id ? 'text-system-green' : 'text-gray-900'
                }`}>
                  {tab.label}
                </div>
                <div className="text-xs text-gray-500">
                  {tab.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manager content */}
      <div className="flex-1 overflow-y-auto bg-bg-primary">
        {renderManagerTabContent()}
      </div>
    </div>
  );
};

export default ManagerTab;