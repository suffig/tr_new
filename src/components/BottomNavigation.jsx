import { useState, useEffect } from 'react';
import Icon from './icons/Icon';
import { getVisibleTabs } from '../constants/navigation';

// Seit der thematischen Neuordnung gibt es nur noch sechs Bereiche (fuenf ohne
// Admin) — die passen alle in die Leiste. Damit entfaellt das "Mehr"-Sheet samt
// der Moeglichkeit, sich die Leiste selbst zusammenzustellen: beides gab es nur,
// weil vorher zehn Eintraege um fuenf Plaetze konkurriert haben. Jetzt ist jeder
// Bereich mit einem Tipp erreichbar, ohne dass etwas versteckt waere.
const ALTE_AUSWAHL_KEY = 'fusta_nav_primary_v1';

export default function BottomNavigation({ activeTab, onTabChange, user }) {
  const [tabs, setTabs] = useState(() => getVisibleTabs(user));

  useEffect(() => { setTabs(getVisibleTabs(user)); }, [user]);

  // Die alte, nun bedeutungslose Leisten-Auswahl einmalig entfernen. Sie enthaelt
  // Tab-Namen, die es nicht mehr gibt.
  useEffect(() => {
    try { localStorage.removeItem(ALTE_AUSWAHL_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      role="navigation"
      aria-label="Hauptnavigation"
    >
      <div className="nav-floating pointer-events-auto mx-auto max-w-2xl">
        {/* Gleich breite Spalten statt justify-around: so bekommt jeder Bereich
            denselben Platz und nichts rutscht auf schmalen Handys aus der
            Leiste, wenn Admin den sechsten Eintrag sieht. */}
        <div
          className="grid items-center px-1 py-1"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`nav-tab flex flex-col items-center justify-center min-w-0 px-1 py-1.5 rounded-ios-lg transition-colors duration-ios touch-target ${
                  isActive ? 'text-system-green' : 'text-text-tertiary hover:text-text-secondary'
                }`}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-pill" aria-hidden="true"></span>
                <span className="nav-icon relative mb-0.5">
                  <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span className="nav-label text-caption2 font-medium leading-none relative max-w-full truncate">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
