import React, { useState } from 'react';
import SeasonManagerTab from './SeasonManagerTab';
import FifaVersionManagerTab from './FifaVersionManagerTab';

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
    }
  ];

  const renderManagerTabContent = () => {
    switch (activeManagerTab) {
      case 'season':
        return <SeasonManagerTab />;
      case 'fifa-versions':
        return <FifaVersionManagerTab />;
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
            <p className="text-gray-600">Zentrale Verwaltung für Saisons und FIFA Versionen</p>
          </div>
        </div>

        {/* Manager sub-navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          {managerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveManagerTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeManagerTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={tab.description}
            >
              <i className={tab.icon}></i>
              <span className="hidden sm:inline">{tab.label}</span>
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