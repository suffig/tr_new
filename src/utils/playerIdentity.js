// Spieler-Identitaet ueber Saisons hinweg.
//
// Problem: players ist pro Saison eine eigene Zeile mit eigener id. Derselbe
// Mensch taucht also mehrfach auf — teils unter einem anderen Team (Benzema
// AEK -> Ehemalige, Kante AEK -> Real) und teils in leicht anderer Schreibweise
// ("St Juste" / "St. Juste"). Torzahlen sind je Saison kumuliert; die
// Karrieresumme entsteht erst durch Zusammenfassen dieser Zeilen.
//
// Zwei Wege, in dieser Reihenfolge:
//   1. players.person_id — falls die optionale DB-Erweiterung eingespielt ist
//      (db/04_spieler_identitaet.sql). Das ist der verlaessliche Weg: er
//      ueberlebt auch echte Umbenennungen und trennt zwei gleichnamige Spieler.
//   2. Normalisierter Name — funktioniert ohne jede DB-Aenderung und deckt den
//      heutigen Bestand vollstaendig ab.

/**
 * Normalisiert einen Namen zu einem Vergleichsschluessel:
 * Kleinschreibung, ohne Akzente, ohne Satz- und Leerzeichen.
 * "St. Juste" und "St Juste" ergeben denselben Schluessel, ebenso
 * "Rüdiger" und "Rudiger".
 */
export function nameKey(name) {
  if (name == null) return '';
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // Akzente entfernen
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Bevorzugt person_id, faellt sonst auf den normalisierten Namen zurueck. */
export function identityOf(player) {
  if (!player) return '';
  if (player.person_id != null && player.person_id !== '') return `p:${player.person_id}`;
  return `n:${nameKey(player.name)}`;
}

const versionNum = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/**
 * Fasst Spielerzeilen zu Personen zusammen.
 *
 * @returns {Array<{
 *   key: string, name: string, goals: number, value: number,
 *   teams: string[], currentTeam: string, seasons: Array<{version, team, goals, value}>,
 *   spellings: string[]
 * }>} absteigend nach Toren
 */
export function aggregatePlayers(players) {
  const byKey = new Map();

  for (const p of players || []) {
    if (!p || !p.name) continue;
    const key = identityOf(p);
    let e = byKey.get(key);
    if (!e) {
      e = { key, name: p.name, goals: 0, value: 0, teams: [], seasons: [], spellings: [] };
      byKey.set(key, e);
    }
    e.goals += Number(p.goals) || 0;
    e.seasons.push({
      version: p.fifa_version || null,
      team: p.team || null,
      goals: Number(p.goals) || 0,
      value: Number(p.value) || 0,
    });
    if (p.team && !e.teams.includes(p.team)) e.teams.push(p.team);
    if (!e.spellings.includes(p.name)) e.spellings.push(p.name);
  }

  for (const e of byKey.values()) {
    // Neueste Saison zuerst — sie bestimmt Anzeigename, aktuelles Team und
    // den heute gueltigen Marktwert. Frueheren Schreibweisen wird damit die
    // aktuelle vorgezogen.
    e.seasons.sort((a, b) => versionNum(b.version) - versionNum(a.version));
    const neueste = e.seasons[0];
    e.currentTeam = neueste?.team || null;
    e.value = neueste?.value || 0;
    const passend = (players || []).find(
      (p) => identityOf(p) === e.key && (p.fifa_version || null) === (neueste?.version || null)
    );
    if (passend?.name) e.name = passend.name;
  }

  return [...byKey.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

/** Karriere-Torsumme einer Person, ueber alle Saisons. */
export function careerGoals(players, name) {
  const key = `n:${nameKey(name)}`;
  return (players || [])
    .filter((p) => identityOf(p) === key || `n:${nameKey(p.name)}` === key)
    .reduce((sum, p) => sum + (Number(p.goals) || 0), 0);
}
