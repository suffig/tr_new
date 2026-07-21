// Merkt sich kurzzeitig, welche Datensaetze DIESES Geraet gerade selbst
// angelegt hat.
//
// Hintergrund: beim Eintragen eines Spiels wird die Benachrichtigung lokal
// ausgeloest — und zusaetzlich meldet Supabase Realtime dasselbe INSERT an
// alle Clients zurueck, den Absender eingeschlossen. Ohne diese Sperre
// bekommt derjenige, der das Spiel eintraegt, die Meldung doppelt.
//
// Bewusst nur im Speicher und mit kurzer Haltbarkeit: es geht ausschliesslich
// um das Zeitfenster zwischen eigenem Insert und dem Realtime-Echo.

const TTL_MS = 30_000;
const seen = new Map(); // "tabelle:id" -> Zeitstempel

function keyOf(table, id) {
  return `${table}:${id}`;
}

function prune(now) {
  for (const [k, ts] of seen) {
    if (now - ts > TTL_MS) seen.delete(k);
  }
}

/** Nach einem eigenen Insert aufrufen. */
export function markSelfInsert(table, id) {
  if (id === null || id === undefined) return;
  const now = Date.now();
  prune(now);
  seen.set(keyOf(table, id), now);
}

/** true, wenn dieses Geraet den Datensatz gerade selbst angelegt hat. */
export function wasSelfInsert(table, id) {
  if (id === null || id === undefined) return false;
  const now = Date.now();
  prune(now);
  const ts = seen.get(keyOf(table, id));
  if (ts === undefined) return false;
  // Einmalig: nach dem Abfangen des Echos wird der Eintrag frei
  seen.delete(keyOf(table, id));
  return now - ts <= TTL_MS;
}
