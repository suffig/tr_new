import { useState, useEffect } from 'react';
import Icon from './icons/Icon';
import { getVisibleTabs } from '../constants/navigation';

// Default set for the bar; everything else lives in the "Mehr" sheet. The user
// can customise which destinations sit in the bar (persisted in localStorage).
const DEFAULT_PRIMARY_IDS = ['matches', 'finanzen', 'stats', 'alcohol', 'admin'];
const PRIMARY_KEY = 'fusta_nav_primary_v1';
const MAX_PRIMARY = 5;
const MIN_PRIMARY = 1;

function loadPrimary() {
  try {
    const raw = JSON.parse(localStorage.getItem(PRIMARY_KEY) || 'null');
    if (Array.isArray(raw) && raw.length >= MIN_PRIMARY) return raw;
  } catch { /* ignore */ }
  return DEFAULT_PRIMARY_IDS;
}

export default function BottomNavigation({ activeTab, onTabChange, user }) {
  const [tabs, setTabs] = useState(() => getVisibleTabs(user));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [primaryIds, setPrimaryIds] = useState(loadPrimary);

  useEffect(() => { setTabs(getVisibleTabs(user)); }, [user]);
  useEffect(() => { if (!sheetOpen) setEditMode(false); }, [sheetOpen]);
  // Close the sheet whenever the active tab changes (e.g. via swipe)
  useEffect(() => { setSheetOpen(false); }, [activeTab]);

  const savePrimary = (ids) => {
    setPrimaryIds(ids);
    try { localStorage.setItem(PRIMARY_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  };

  const togglePrimary = (id) => {
    const inBar = primaryIds.includes(id);
    if (inBar) {
      if (primaryIds.length <= MIN_PRIMARY) return; // keep at least one
      savePrimary(primaryIds.filter((x) => x !== id));
    } else {
      if (primaryIds.length >= MAX_PRIMARY) return; // bar is full
      savePrimary([...primaryIds, id]);
    }
  };

  const primaryTabs = tabs.filter((t) => primaryIds.includes(t.id));
  const overflowTabs = tabs.filter((t) => !primaryIds.includes(t.id));
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

      {/* "Mehr" sheet — quick grid + edit mode for customising the bar */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Alle Bereiche">
          <button className="absolute inset-0 bg-black/40" aria-label="Schließen" onClick={() => setSheetOpen(false)} />
          <div
            className="relative w-full max-w-2xl bg-bg-elevated rounded-t-3xl shadow-ios-floating p-4 animate-mobile-slide-in"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-text-primary">{editMode ? 'Leiste bearbeiten' : 'Alle Bereiche'}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode((e) => !e)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${editMode ? 'bg-system-green text-white' : 'bg-bg-tertiary text-text-secondary'}`}
                >
                  <Icon name={editMode ? 'check' : 'edit'} size={14} strokeWidth={2.2} />
                  {editMode ? 'Fertig' : 'Bearbeiten'}
                </button>
                <button onClick={() => setSheetOpen(false)} className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center" aria-label="Schließen">
                  <Icon name="x" size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {editMode && (
              <p className="text-[11px] text-text-tertiary mb-2">Tippe zum An-/Abwählen für die untere Leiste (max. {MAX_PRIMARY}). Gewählt: {primaryIds.length}/{MAX_PRIMARY}.</p>
            )}

            <div className="grid grid-cols-4 gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const inBar = primaryIds.includes(tab.id);
                if (editMode) {
                  const full = !inBar && primaryIds.length >= MAX_PRIMARY;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => togglePrimary(tab.id)}
                      disabled={full}
                      className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl transition-colors border ${
                        inBar ? 'bg-system-green/12 text-system-green border-system-green/40' : 'bg-bg-tertiary text-text-secondary border-transparent'
                      } ${full ? 'opacity-40' : 'active:bg-bg-hover'}`}
                    >
                      <span className="absolute top-1 right-1">
                        <Icon name={inBar ? 'starFilled' : 'star'} size={13} strokeWidth={2} className={inBar ? 'text-system-green' : 'text-text-tertiary'} />
                      </span>
                      <Icon name={tab.icon} size={24} strokeWidth={1.9} />
                      <span className="text-[11px] font-medium leading-none text-center truncate max-w-full">{tab.label}</span>
                    </button>
                  );
                }
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

            {editMode && (
              <button
                onClick={() => savePrimary(DEFAULT_PRIMARY_IDS)}
                className="mt-3 w-full py-2 rounded-xl bg-bg-tertiary text-text-secondary text-xs font-medium"
              >
                Standard wiederherstellen
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
