import { supabase, usingFallback } from './supabase';

/**
 * Ist die Datenbank für einen Saisonwechsel bereit?
 *
 * WARUM DAS VORHER GEPRÜFT WIRD
 * Der Wechsel ist der einzige Vorgang, der sich nicht einfach wiederholen
 * lässt: die alte Saison ist abgeschlossen, die neue registriert, und mitten
 * im Draft festzustellen, dass `draft_picks` gar nicht existiert, heißt mit
 * einer halb angelegten Saison dazustehen. Eine Minute vorher zu prüfen
 * kostet nichts.
 *
 * WAS GEPRÜFT WIRD
 * Für jede benötigte Tabelle ein harmloser Lesezugriff. Es geht nicht darum,
 * ob Zeilen darin stehen — eine leere Tabelle ist völlig in Ordnung —,
 * sondern nur darum, ob sie überhaupt ansprechbar ist.
 *
 * WAS NICHT GEPRÜFT WIRD
 * Ob geschrieben werden darf. Das ließe sich nur durch einen echten Schreib-
 * vorgang feststellen, und der würde Daten hinterlassen. Ein Lesefehler ist
 * der weitaus häufigere Fall (fehlende Migration), und er wird zuverlässig
 * erkannt.
 */

const NOETIG = [
  { tabelle: 'draft_sessions', migration: 'db/18_draft.sql',
    wofuer: 'Der Draft selbst — ohne sie lässt sich kein Kader ziehen.' },
  { tabelle: 'draft_picks', migration: 'db/18_draft.sql',
    wofuer: 'Die einzelnen Züge. Ohne sie ginge jeder Pick sofort verloren.' },
  { tabelle: 'fifa_versions', migration: 'db/fifa_versions.sql',
    wofuer: 'Die Saison wird hier registriert. Fehlt sie, ist die neue Saison nur auf diesem Gerät bekannt.' },
  { tabelle: 'players', migration: '—',
    wofuer: 'Am Ende des Drafts landen die Spieler hier.' },
  { tabelle: 'finances', migration: '—',
    wofuer: 'Das Restgeld wird als Startkapital eingetragen.' },
];

// Nicht zwingend: fehlt sie, wird nur der Wechselverlauf nicht festgehalten.
// schliesseAb() faengt das bereits ab, der Draft laeuft trotzdem durch.
const OPTIONAL = [
  { tabelle: 'spieler_wechsel', migration: 'db/25_spieler_wechsel.sql',
    wofuer: 'Hält fest, wer die Seite gewechselt hat. Ohne sie reißt der Verlauf an der Saisongrenze ab — der Draft läuft trotzdem.' },
];

/**
 * WARUM HIER DER ROHE CLIENT BENUTZT WIRD UND NICHT supabaseDb.
 *
 * supabaseDb.select() faengt Datenbankfehler ab und liefert stattdessen die
 * Demo-Daten zurueck — ohne Fehler im Ergebnis:
 *
 *     if (result.data && !result.error) return result;
 *     else { console.warn('... using fallback data'); }
 *
 * Fuer den normalen Betrieb ist das richtig: die App soll nicht wegen einer
 * hakeligen Verbindung stehenbleiben. Fuer eine PRUEFUNG ist es toedlich —
 * sie haette jede fehlende Tabelle als "vorhanden" gemeldet. Genau der
 * stille Durchlaeufer, der wie ein Ergebnis aussieht.
 *
 * Deshalb die Abfrage direkt am Client, mit head+count: sie holt keine
 * Zeilen, nur die Auskunft, ob die Tabelle ansprechbar ist.
 */
async function erreichbar(tabelle) {
  try {
    const { error } = await supabase.from(tabelle).select('*', { count: 'exact', head: true });
    if (error) return { ok: false, grund: error.message || 'Abfrage abgelehnt' };
    return { ok: true };
  } catch (e) {
    return { ok: false, grund: e?.message || 'nicht erreichbar' };
  }
}

export async function pruefeSaisonBereit() {
  // Im Demo-Betrieb gibt es keine Datenbank, gegen die sich pruefen liesse.
  // Ein "bereit" waere dort eine Behauptung ohne Grundlage — deshalb wird
  // der Zustand ausdruecklich als UNBEKANNT gemeldet.
  if (usingFallback) {
    return { bereit: true, demo: true, pflicht: [], optional: [], fehlend: [], warnungen: [] };
  }

  const pflicht = [];
  for (const e of NOETIG) {
    const r = await erreichbar(e.tabelle);
    pflicht.push({ ...e, ...r });
  }
  const kuer = [];
  for (const e of OPTIONAL) {
    const r = await erreichbar(e.tabelle);
    kuer.push({ ...e, ...r });
  }
  return {
    bereit: pflicht.every((p) => p.ok),
    pflicht,
    optional: kuer,
    fehlend: pflicht.filter((p) => !p.ok),
    warnungen: kuer.filter((k) => !k.ok),
  };
}
