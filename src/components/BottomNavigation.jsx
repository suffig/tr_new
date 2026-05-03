import { useState, useEffect } from 'react';

const baseTabs = [
  { id: 'matches', icon: '⚽', label: 'Spiele', ariaLabel: 'Zu Spiele-Übersicht wechseln' },
  { id: 'bans', icon: '🚫', label: 'Bans', ariaLabel: 'Zu Bans-Übersicht wechseln' },
  { id: 'finanzen', icon: '€', label: 'Finanzen', ariaLabel: 'Zu Finanzen-Übersicht wechseln' },
  { id: 'squad', icon: '👥', label: 'Kader', ariaLabel: 'Zu Kader-Übersicht wechseln' },
  { id: 'stats', icon: '📊', label: 'Stats', ariaLabel: 'Zu Statistik-Übersicht wechseln' },
  { id: 'events', icon: '🎉', label: 'Events', ariaLabel: 'Zu Events-Übersicht wechseln' },
  { id: 'alcohol',        icon: '🍺', label: 'Alkohol',  ariaLabel: 'Zu Alkohol & Blackjack-Tracker wechseln' },
  { id: 'spielersaufen', icon: '🎙️', label: 'Saufen',   ariaLabel: 'Zu Spielersaufen wechseln' },
  { id: 'admin',         icon: '⚙️', label: 'Admin',    ariaLabel: 'Zu Verwaltung wechseln' },
];

export default function BottomNavigation({ activeTab, onTabChange, user }) {
  const [tabs, setTabs] = useState(baseTabs);

  useEffect(() => {
    // Check if events tab should be shown
    const eventsEnabled = localStorage.getItem('eventsTabEnabled');
    const showEvents = eventsEnabled !== null ? JSON.parse(eventsEnabled) : false;
    
    // Check if admin tab should be shown (only for specific user)
    const isAdminUser = user?.email === 'philip-melchert@live.de';
    
    let filteredTabs = baseTabs;
    
    // Filter out events tab if not enabled
    if (!showEvents) {
      filteredTabs = filteredTabs.filter(tab => tab.id !== 'events');
    }
    
    // Filter out admin tab if user is not authorized
    if (!isAdminUser) {
      filteredTabs = filteredTabs.filter(tab => tab.id !== 'admin');
    }
    
    setTabs(filteredTabs);
  }, [user]);

  return (
    <nav 
      className="glass-ios border-t border-separator fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      role="navigation"
      aria-label="Hauptnavigation"
    >
      <div className="px-2 py-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center justify-around min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-ios-lg transition-all duration-ios touch-target btn-spring-press ${
                activeTab === tab.id 
                  ? 'text-system-blue bg-system-blue/10' 
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50'
              }`}
              aria-label={tab.ariaLabel}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <div className={`text-lg mb-1 transition-transform duration-ios icon-bounce-hover ${
                activeTab === tab.id ? 'scale-110' : ''
              }`}>
                {tab.icon}
              </div>
              <span className="text-caption2 font-medium leading-none">
                {tab.label}
              </span>
              
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-system-blue rounded-full animate-scale-in"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}