import { useState, useEffect } from 'react';
import Icon from './icons/Icon';
import { getVisibleTabs } from '../constants/navigation';

export default function BottomNavigation({ activeTab, onTabChange, user }) {
  const [tabs, setTabs] = useState(() => getVisibleTabs(user));

  useEffect(() => {
    setTabs(getVisibleTabs(user));
  }, [user]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      role="navigation"
      aria-label="Hauptnavigation"
    >
      <div className="nav-floating pointer-events-auto mx-auto max-w-2xl overflow-x-auto scrollbar-hide">
        <div className="flex items-center justify-around min-w-max px-1 py-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-tab flex flex-col items-center justify-center px-3 py-1.5 rounded-ios-lg transition-colors duration-ios touch-target ${
                activeTab === tab.id
                  ? 'text-system-green'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              aria-label={tab.ariaLabel}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="nav-pill" aria-hidden="true"></span>
              <span className="nav-icon relative mb-0.5">
                <Icon name={tab.icon} size={22} strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
              </span>
              <span className="nav-label text-caption2 font-medium leading-none relative">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
