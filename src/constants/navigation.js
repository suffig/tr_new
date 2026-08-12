/**
 * Central tab definition for bottom navigation and swipe gestures.
 * Icon names reference src/components/icons/Icon.jsx.
 */

export const ADMIN_EMAIL = 'philip-melchert@live.de';

/**
 * Sechs thematische Bereiche statt vorher zehn Eintraege plus "Mehr"-Menue.
 * Nichts ist weggefallen — Kader, Sperren, Alkohol, Saufen und Teams liegen
 * jetzt als Unteransicht in dem Bereich, zu dem sie inhaltlich gehoeren.
 * Damit ist alles in hoechstens zwei Tipps erreichbar, ohne verstecktes
 * Untermenue.
 */
export const BASE_TABS = [
  { id: 'start', icon: 'sparkles', label: 'Start', ariaLabel: 'Zur Übersicht "Gerade jetzt" wechseln' },
  { id: 'spielbetrieb', icon: 'football', label: 'Spiele', ariaLabel: 'Zu Spiele-Übersicht wechseln' },
  { id: 'duell', icon: 'zap', label: 'Duell', ariaLabel: 'Zum Duell-Dashboard wechseln' },
  { id: 'stats', icon: 'chart', label: 'Statistik', ariaLabel: 'Zu Statistik-Übersicht wechseln' },
  { id: 'finanzen', icon: 'euro', label: 'Finanzen', ariaLabel: 'Zu Finanzen-Übersicht wechseln' },
  { id: 'abend', icon: 'beer', label: 'Abend', ariaLabel: 'Zu Teams, Alkohol und Saufen wechseln' },
];

/**
 * Verwaltung — bewusst NICHT in der Leiste.
 *
 * Mit der Startansicht waeren es sonst sieben Eintraege, und bei sieben bleiben
 * auf einem 375er Handy noch 49 px je Spalte: "Statistik" wuerde abgeschnitten.
 * Admin ist ausserdem kein Bereich, in den man mehrmals am Abend springt,
 * sondern eine Einstellung — und Einstellungen liegen in dieser App im Profil.
 * Von dort ist der Bereich mit zwei Tipps erreichbar, der Tab selbst
 * funktioniert unveraendert weiter.
 */
export const ADMIN_TAB = {
  id: 'admin', icon: 'settings', label: 'Verwaltung', ariaLabel: 'Zu Verwaltung wechseln',
};

/**
 * Alte Tab-Namen auf den neuen Bereich abbilden — samt Unteransicht.
 * Noetig, damit gespeicherte Startansichten, der zuletzt benutzte Tab und
 * bestehende onNavigate-Aufrufe (Profil-Schnellzugriff, "Spiel bearbeiten" …)
 * weiterhin dort landen, wo man sie erwartet. Ohne das waere nach dem Umbau
 * z. B. ein gespeichertes 'squad' ein unbekannter Tab.
 */
export const LEGACY_TAB_MAP = {
  matches: { tab: 'spielbetrieb', view: 'spiele' },
  squad: { tab: 'spielbetrieb', view: 'kader' },
  bans: { tab: 'spielbetrieb', view: 'sperren' },
  teams: { tab: 'abend', view: 'teams' },
  alcohol: { tab: 'abend', view: 'alkohol' },
  spielersaufen: { tab: 'abend', view: 'saufen' },
  // Englische Schreibweise aus der globalen Suche — zeigte schon vor dem Umbau
  // auf einen Tab, den es nie gab, und landete deshalb im Default.
  finances: { tab: 'finanzen', view: null },
  // Ohne diese Zeile landete ein Sprung auf "transfers" im Default-Zweig und
  // damit auf der zuletzt benutzten Unteransicht — also irgendwo.
  transfers: { tab: 'spielbetrieb', view: 'transfers' },
};

/** Loest einen (moeglicherweise alten) Tab-Namen auf. */
export function resolveTab(id) {
  if (LEGACY_TAB_MAP[id]) return LEGACY_TAB_MAP[id];
  return { tab: id, view: null };
}

/**
 * Die Bereiche der unteren Leiste — fuer alle dieselben sechs.
 * Verwaltung ist kein Leisten-Eintrag mehr, siehe ADMIN_TAB.
 */
export function getVisibleTabs() {
  return BASE_TABS;
}

/** Darf dieser Nutzer in den Verwaltungsbereich? */
export function istAdmin(user) {
  return user?.email === ADMIN_EMAIL;
}
