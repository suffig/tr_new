import { useState, useEffect } from 'react';
import Icon from './icons/Icon';
import { getVisibleTabs } from '../constants/navigation';

// The most-used destinations stay in the bar; everything else lives in the
// "Mehr" sheet. This keeps the bar slim with comfortable 44px touch targets
// instead of cramming 9-10 items into a horizontally scrolling strip.
const PRIMARY_IDS = ['matches', 'finanzen', 'stats', 'alcohol', 'admin'];

export default function BottomNavigation({ activeTab, onTabChange, user }) {
  const [tabs, setTabs] = useState(() => getVisibleTabs(user));
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setTabs(getVisibleTabs(user));
  }, [user]);

  // Close the sheet whenever the active tab changes (e.g. via swipe)
  useEffect(() => {
    setSheetOpen(false);
  }, [activeTab]);

  const primaryTabs = tabs.filter((t) => PRIMARY_IDS.includes(t.id));
  const overflowTabs = tabs.filter((t) => !PRIMARY_IDS.includes(t.id));
  const activeOverflowTab = overflowTabs.find((t) => t.id === activeTab);

  const renderTab = (tab) => (
    <button
      key={tab.id}
      onClick={() => onTabChange(tab.id)}
      className={`nav-tab flex flex-col items-center justify-center px-3 py-1.5 rounded-ios-lg transition-colors duration-ios touch-target ${
        activeTab === tab.id ? 'text-system-green' : 'text-text-tertiary hover:text-text-secondary'
      }`}
      aria-label={tab.ariaLabel}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span className="nav-pill" aria-hidden="true"></span>
      <span className="nav-icon relative mb-0.5">
        <Icon name={tab.icon} size={22} strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
      </span>
      <span className="nav-label text-caption2 font-medium leading-none relative">{tab.label}</span>
    </button>
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
        role="navigation"
        aria-label="Hauptnavigation"
      >
        <div className="nav-floating pointer-events-auto mx-auto max-w-2xl">
          <div className="flex items-center justify-around px-1 py-1">
            {primaryTabs.map(renderTab)}

            {overflowTabs.length > 0 && (
              <button
                onClick={() => setSheetOpen(true)}
                className={`nav-tab flex flex-col items-center justify-center px-3 py-1.5 rounded-ios-lg transition-colors duration-ios touch-target ${
                  activeOverflowTab ? 'text-system-green' : 'text-text-tertiary hover:text-text-secondary'
                }`}
                aria-label="Weitere Bereiche öffnen"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                aria-current={activeOverflowTab ? 'page' : undefined}
              >
                <span className="nav-pill" aria-hidden="true"></span>
                <span className="nav-icon relative mb-0.5">
                  <Icon name={activeOverflowTab ? activeOverflowTab.icon : 'grid'} size={22} strokeWidth={activeOverflowTab ? 2.2 : 1.8} />
                </span>
                <span className="nav-label text-caption2 font-medium leading-none relative">
                  {activeOverflowTab ? activeOverflowTab.label : 'Mehr'}
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* "Mehr" sheet — a quick grid of every destination */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Alle Bereiche"
        >
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Schließen"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="relative w-full max-w-2xl bg-bg-elevated rounded-t-3xl shadow-ios-floating p-4 animate-mobile-slide-in"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-text-primary">Alle Bereiche</h3>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center"
                aria-label="Schließen"
              >
                <Icon name="x" size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onTabChange(tab.id); setSheetOpen(false); }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl transition-colors ${
                      isActive ? 'bg-system-green/12 text-system-green' : 'bg-bg-tertiary text-text-secondary active:bg-bg-hover'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon name={tab.icon} size={24} strokeWidth={isActive ? 2.2 : 1.9} />
                    <span className="text-[11px] font-medium leading-none text-center truncate max-w-full">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
