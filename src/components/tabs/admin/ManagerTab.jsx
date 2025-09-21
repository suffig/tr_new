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
      {/* Combined Manager Header */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl 
                          flex items-center justify-center text-white text-xl font-bold">
            ⚙️
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">System-Manager</h2>
            <p className="text-gray-600">Zentrale Verwaltung für Saisons, FIFA Versionen und Teams</p>
          </div>
        </div>

        {/* Manager sub-navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
          {managerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveManagerTab(tab.id)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeManagerTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={tab.description}
            >
              <i className={tab.icon}></i>
              <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manager content */}
      <div className="flex-1 overflow-y-auto">
        {renderManagerTabContent()}
      </div>
    </div>
  );
};

export default ManagerTab;