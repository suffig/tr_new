/**
 * Legacy-Saisons — Saisons, aus denen nur Gesamtzahlen ueberliefert sind.
 *
 * FIFA 15 UT wurde damals als Strichliste gefuehrt: Tore, Spieler des Spiels,
 * Sperren, Kader und Kontostaende sind vollstaendig, aber es gibt KEINE
 * einzelnen Spiele. Ohne Kennzeichnung zeigt die App dort ueberall "0 Spiele",
 * "0:0" und eine leere Form — das sieht nach einem Fehler aus, ist aber die
 * Datenlage.
 *
 * Bewusst eine feste Liste und nicht "hat Spieler, aber keine Spiele": eine
 * frisch angelegte Saison sieht genauso aus, solange das erste Spiel fehlt,
 * und wuerde faelschlich als Legacy markiert.
 */

// Neue Altsaison? Hier eine Zeile ergaenzen — dieselbe Version wie in
// scripts/altsaisons/<name>.mjs. Ohne den Eintrag zeigt die App dort ueberall
// Nullen, statt zu sagen, dass es nur Gesamtzahlen gibt.
export const LEGACY_SAISONS = {
  FC15: {
    label: 'FIFA 15 Ultimate Team',
    // Was in dieser Saison erfasst wurde — und was nicht.
    vorhanden: ['Tore', 'Spieler des Spiels', 'Sperren', 'Kader', 'Kontostand'],
    fehlt: ['Einzelne Spiele', 'Bilanz', 'Duell', 'Form', 'Echtgeld'],
  },
  FC16: {
    label: 'FIFA 16 Ultimate Team',
    vorhanden: ['Tore', 'Spieler des Spiels', 'Sperren', 'Kader', 'Kontostand', 'Siege'],
    fehlt: ['Einzelne Spiele', 'Ergebnisse', 'Form', 'Echtgeld'],
    // Aus FC16 ist die Siegbilanz ueberliefert — nicht aber, WIE die Spiele
    // ausgingen. Damit laesst sich eine echte Tabelle zeigen statt 0/0/0.
    bilanz: {
      AEK: { regulaer: 17, nachVerlaengerung: 2, nachElfmeter: 1 },
      Real: { regulaer: 18, nachVerlaengerung: 4, nachElfmeter: 2 },
    },
  },
};

/** Siege gesamt aus der ueberlieferten Bilanz. */
export function siegeGesamt(eintrag) {
  if (!eintrag) return 0;
  return (eintrag.regulaer || 0) + (eintrag.nachVerlaengerung || 0) + (eintrag.nachElfmeter || 0);
}

/** Ist diese Saison eine reine Zahlen-Saison? */
export function istLegacySaison(version) {
  return Boolean(version && LEGACY_SAISONS[version]);
}

/** Metadaten zur Legacy-Saison, sonst null. */
export function legacyInfo(version) {
  return LEGACY_SAISONS[version] || null;
}
