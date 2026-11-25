/**
 * Lokales Protokoll und Datenbank zusammenführen — reine Rechnung, kein Netz.
 *
 * Vorher gab es nur „ersetzen" oder „gar nichts tun": hatte die Datenbank
 * mindestens so viele Ereignisse wie das Gerät, wurde das Gerät überschrieben
 * (ein nie hochgeladener Schnaps war weg), hatte sie weniger, wurde nie wieder
 * abgeglichen. Nach dem Saisonwechsel war das der Dauerzustand, weil die neue
 * Saison bei null anfängt.
 */

// Neue Einträge schreiben ihre eigene Zeit in created_at — die stimmt bis auf
// Rundung überein. Ältere bekamen die Zeit der Datenbank, also Sekunden später.
const NAEHE_NEU = 1000;
const NAEHE_ALT = 2 * 60 * 1000;

// Ältere Einträge ohne Gegenstück in der Datenbank können auch solche sein, die
// das andere Gerät längst gelöscht hat. Die nicht wiederbeleben.
const ALT_HOECHSTENS = 14 * 24 * 3600 * 1000;

const zeit = (e) => new Date(e.ts).getTime() || 0;

/**
 * @param {object} e
 * @param {Array} e.lokal Protokoll des Geräts
 * @param {Array} e.db Ereignisse der Datenbank, ALLE Saisons
 * @param {string} e.saison laufende Saison — nur sie landet im Protokoll
 * @param {Set<string>} [e.unterwegs] ids, deren Upload gerade läuft
 * @param {number} [e.start] wann die Datenbank gelesen wurde (ms)
 * @returns {{liste: Array, hochladen: Array}}
 */
export function fuehreZusammen({ lokal, db, saison, unterwegs = new Set(), start = Date.now() }) {
  const nachId = new Set(db.map((z) => z.dbId));
  const vergeben = new Set(lokal.filter((e) => e.dbId).map((e) => e.dbId));
  const ausblenden = new Set();

  // Die zeitlich nächste noch freie Zeile. Gegen ALLE Saisons, sonst würde ein
  // FC26-Schnaps in FC27 noch einmal angelegt.
  const findeZeile = (e) => {
    const naehe = e.fifa_version ? NAEHE_NEU : NAEHE_ALT;
    let treffer = null;
    for (const z of db) {
      if (vergeben.has(z.dbId) || z.person !== e.person || z.art !== e.art) continue;
      if (Number(z.menge) !== Number(e.menge) || z.datum !== e.datum) continue;
      const abstand = Math.abs(zeit(z) - zeit(e));
      if (abstand <= naehe && (!treffer || abstand < treffer.abstand)) treffer = { z, abstand };
    }
    if (treffer) vergeben.add(treffer.z.dbId);
    return treffer?.z || null;
  };

  const behalten = [];
  const hochladen = [];
  for (const e of lokal) {
    if (e.dbId) {
      // Fehlt sie oben, wurde sie woanders gelöscht — es sei denn, sie kam
      // erst an, nachdem gelesen wurde.
      if (!nachId.has(e.dbId) && (e.hoch || 0) >= start) behalten.push(e);
    } else if (unterwegs.has(e.id)) {
      const zeile = findeZeile(e);
      if (zeile) ausblenden.add(zeile.dbId);
      behalten.push(e);
    } else if (!findeZeile(e)) {
      behalten.push(e);
      if (e.fifa_version || start - zeit(e) <= ALT_HOECHSTENS) hochladen.push(e);
    }
  }

  const liste = [
    ...db.filter((z) => z.fifa_version === saison && !ausblenden.has(z.dbId)),
    ...behalten,
  ].sort((a, b) => zeit(a) - zeit(b));
  return { liste, hochladen };
}
