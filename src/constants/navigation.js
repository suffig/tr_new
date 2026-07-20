/**
 * Central tab definition for bottom navigation and swipe gestures.
 * Icon names reference src/components/icons/Icon.jsx.
 */

export const ADMIN_EMAIL = 'philip-melchert@live.de';

export const BASE_TABS = [
  { id: 'matches', icon: 'football', label: 'Spiele', ariaLabel: 'Zu Spiele-Übersicht wechseln' },
  { id: 'duell', icon: 'zap', label: 'Duell', ariaLabel: 'Zum Duell-Dashboard wechseln' },
  { id: 'bans', icon: 'ban', label: 'Bans', ariaLabel: 'Zu Bans-Übersicht wechseln' },
  { id: 'finanzen', icon: 'euro', label: 'Finanzen', ariaLabel: 'Zu Finanzen-Übersicht wechseln' },
  { id: 'squad', icon: 'users', label: 'Kader', ariaLabel: 'Zu Kader-Übersicht wechseln' },
  { id: 'stats', icon: 'chart', label: 'Stats', ariaLabel: 'Zu Statistik-Übersicht wechseln' },
  { id: 'teams', icon: 'trophy', label: 'Teams', ariaLabel: 'Zu Team-Tracker wechseln' },
  { id: 'alcohol', icon: 'beer', label: 'Alkohol', ariaLabel: 'Zu Alkohol & Blackjack-Tracker wechseln' },
  { id: 'spielersaufen', icon: 'mic', label: 'Saufen', ariaLabel: 'Zu Spielersaufen wechseln' },
  { id: 'admin', icon: 'settings', label: 'Admin', ariaLabel: 'Zu Verwaltung wechseln' },
];

/**
 * Tabs that are actually visible for the given user
 * (admin tab is restricted).
 */
export function getVisibleTabs(user) {
  const isAdminUser = user?.email === ADMIN_EMAIL;

  return BASE_TABS.filter((tab) => {
    if (tab.id === 'admin' && !isAdminUser) return false;
    return true;
  });
}
