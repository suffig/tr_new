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

export const LEGACY_SAISONS = {
  FC15: {
    label: 'FIFA 15 Ultimate Team',
    // Was in dieser Saison erfasst wurde — und was nicht.
    vorhanden: ['Tore', 'Spieler des Spiels', 'Sperren', 'Kader', 'Kontostand'],
    fehlt: ['Einzelne Spiele', 'Bilanz', 'Duell', 'Form', 'Echtgeld'],
  },
};

/** Ist diese Saison eine reine Zahlen-Saison? */
export function istLegacySaison(version) {
  return Boolean(version && LEGACY_SAISONS[version]);
}

/** Metadaten zur Legacy-Saison, sonst null. */
export function legacyInfo(version) {
  return LEGACY_SAISONS[version] || null;
}
