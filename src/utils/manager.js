import { supabaseDb } from './supabase';

/**
 * Die beiden Manager (Alexander = id 1, Philip = id 2).
 *
 * WARUM ES DIESE DATEI GIBT
 * Zwei Komponenten hingen für genau drei Aufrufe noch an `dataManager.js` aus
 * der alten Vanilla-App. Die zieht `connectionMonitor.js` mit — einen zweiten
 * Verbindungswächter mit eigener Wiederverbindungs-Schleife, der bei jedem
 * Start eine Fehlerflut und am Ende „Max reconnection attempts reached" in die
 * Konsole schreibt. Zwei Datenschichten nebeneinander heißt außerdem: zwei
 * Zwischenspeicher, zwei Vorstellungen davon, ob die Datenbank erreichbar ist.
 *
 * Der Rest der App spricht über `supabaseDb`. Diese Datei stellt dieselben
 * drei Aufrufe darauf um — mehr wurde von dataManager nie benutzt.
 *
 * DIE PRÜFUNGEN SIND ÜBERNOMMEN, NICHT ERFUNDEN
 * Gewicht 40–200 kg und Alter 18–80 standen so in dataManager.validationRules
 * und dienen der Promille-Rechnung: ein vertipptes Gewicht (11 statt 110)
 * würde dort stillschweigend unsinnige Werte erzeugen.
 */

const REGELN = {
  name: { text: 'Name', typ: 'text', minLaenge: 1 },
  gewicht: { text: 'Gewicht', typ: 'zahl', min: 40, max: 200 },
  age: { text: 'Alter', typ: 'zahl', min: 18, max: 80 },
};

/** Gibt die Liste der Beanstandungen zurück — leer heißt in Ordnung. */
export function pruefeManager(daten) {
  const fehler = [];
  for (const [feld, regel] of Object.entries(REGELN)) {
    const wert = daten?.[feld];
    // Alle Felder sind optional: wer nur den Namen ändert, soll das können.
    if (wert === undefined || wert === null || wert === '') continue;

    if (regel.typ === 'text') {
      if (typeof wert !== 'string') fehler.push(`${regel.text} muss ein Text sein`);
      else if (wert.length < regel.minLaenge) fehler.push(`${regel.text} darf nicht leer sein`);
      continue;
    }
    if (typeof wert !== 'number' || Number.isNaN(wert)) {
      fehler.push(`${regel.text} muss eine Zahl sein`);
    } else if (wert < regel.min || wert > regel.max) {
      fehler.push(`${regel.text} muss zwischen ${regel.min} und ${regel.max} liegen`);
    }
  }
  return fehler;
}

/** Beide Manager, nach id sortiert. Rückgabe wie bisher: { data, error }. */
export async function ladeManager() {
  return supabaseDb.select('manager', '*', { order: { column: 'id', ascending: true } });
}

export async function legeManagerAn(daten) {
  const fehler = pruefeManager(daten);
  if (fehler.length) throw new Error(`Validierungsfehler: ${fehler.join(', ')}`);
  return supabaseDb.insert('manager', daten);
}

export async function aendereManager(id, daten) {
  const fehler = pruefeManager(daten);
  if (fehler.length) throw new Error(`Validierungsfehler: ${fehler.join(', ')}`);
  return supabaseDb.update('manager', daten, id);
}
