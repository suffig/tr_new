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
      {/* Enhanced Manager Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
              <i className="fas fa-cogs text-2xl text-white"></i>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">System-Manager</h2>
              <p className="text-white/90 text-lg">Zentrale Verwaltung für Saisons, FIFA Versionen und Teams</p>
            </div>
          </div>

          {/* Enhanced Manager sub-navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {managerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveManagerTab(tab.id)}
                className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 transform hover:scale-105 ${
                  activeManagerTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-2xl'
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20'
                }`}
                title={tab.description}
              >
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    activeManagerTab === tab.id 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-white/20 text-white'
                  }`}>
                    <i className={`${tab.icon} text-lg`}></i>
                  </div>
                  <div className={`font-bold text-lg mb-2 ${
                    activeManagerTab === tab.id ? 'text-indigo-600' : 'text-white'
                  }`}>
                    {tab.label}
                  </div>
                  <div className={`text-sm ${
                    activeManagerTab === tab.id ? 'text-indigo-500' : 'text-white/80'
                  }`}>
                    {tab.description}
                  </div>
                </div>
                
                {/* Hover effect background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Active indicator */}
                {activeManagerTab === tab.id && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-400 rounded-full shadow-lg"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manager content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {renderManagerTabContent()}
      </div>
    </div>
  );
};

export default ManagerTab;