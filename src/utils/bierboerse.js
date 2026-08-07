/**
 * Bierbörsen — Datenzugriff und Auswertung.
 *
 * Drei Ebenen (siehe db/19_bierboerse.sql):
 *   bier_katalog       das Bier an sich
 *   bierboersen        die Veranstaltung
 *   bier_verkostungen  was ihr dort davon getrunken und vergeben habt
 *
 * Alexander = AEK, Philip = Real — dieselbe Zuordnung wie im Rest der App,
 * damit Farben und Namen ueberall zusammenpassen.
 */
import { supabaseDb } from './supabase';

export const PERSONEN = [
  { key: 'aek', team: 'AEK', name: 'Alexander', farbe: 'text-system-blue', balken: 'bg-system-blue' },
  { key: 'real', team: 'Real', name: 'Philip', farbe: 'text-system-red', balken: 'bg-system-red' },
];

/** Gaengige Biersorten als Vorauswahl — Freitext bleibt trotzdem moeglich. */
export const BIERARTEN = [
  'Pils', 'Helles', 'Weizen', 'Kellerbier', 'Märzen', 'Bock', 'Doppelbock',
  'IPA', 'Pale Ale', 'Stout', 'Porter', 'Sauerbier', 'Radler', 'Alkoholfrei', 'Sonstiges',
];

/** Bierbörsen, neueste zuerst. */
export async function ladeBoersen() {
  const { data, error } = await supabaseDb.select('bierboersen', '*', {
    order: { column: 'datum', ascending: false },
    skipFifaFilter: true,
  });
  if (error) throw error;
  return data || [];
}

/** Katalog, alphabetisch. */
export async function ladeKatalog() {
  const { data, error } = await supabaseDb.select('bier_katalog', '*', { skipFifaFilter: true });
  if (error) throw error;
  return (data || []).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/** Verkostungen — alle oder nur die einer Börse. */
export async function ladeVerkostungen(boerseId = null) {
  const optionen = { skipFifaFilter: true };
  if (boerseId) optionen.eq = { boerse_id: boerseId };
  const { data, error } = await supabaseDb.select('bier_verkostungen', '*', optionen);
  if (error) throw error;
  return data || [];
}

/**
 * Bier im Katalog finden oder anlegen.
 *
 * Der eindeutige Index laeuft ueber lower(name) + lower(brauerei); hier wird
 * genauso verglichen, damit "Augustiner Helles" nicht zweimal entsteht, nur
 * weil jemand es anders gross geschrieben hat.
 */
export async function findeOderLegeBierAn({ name, brauerei = null, art = null, alkohol = null, land = null }) {
  const sauber = String(name || '').trim();
  if (!sauber) throw new Error('Das Bier braucht einen Namen.');

  const katalog = await ladeKatalog();
  const treffer = katalog.find(
    (b) => b.name.trim().toLowerCase() === sauber.toLowerCase() &&
           String(b.brauerei || '').trim().toLowerCase() === String(brauerei || '').trim().toLowerCase()
  );
  if (treffer) return treffer;

  const { data, error } = await supabaseDb.insert('bier_katalog', {
    name: sauber,
    brauerei: brauerei?.trim() || null,
    art: art || null,
    alkohol: alkohol == null || alkohol === '' ? null : Number(alkohol),
    land: land?.trim() || null,
  });
  if (error) throw error;
  return data;
}

/** Kennzahlen einer Börse. */
export function boersenStatistik(verkostungen, katalog) {
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  const liste = (verkostungen || []).map((v) => ({ ...v, bier: nachId.get(v.bier_id) || null }));

  const glaeser = (v) => (v.anzahl_aek || 0) + (v.anzahl_real || 0);
  const gesamtGlaeser = liste.reduce((s, v) => s + glaeser(v), 0);
  const ausgaben = liste.reduce((s, v) => s + (Number(v.preis) || 0) * glaeser(v), 0);
  const ml = liste.reduce((s, v) => s + (v.groesse_ml || 0) * glaeser(v), 0);
  // Reiner Alkohol in ml, daraus die Standardgläser-Rechnung.
  const alkoholMl = liste.reduce(
    (s, v) => s + (v.groesse_ml || 0) * glaeser(v) * ((Number(v.bier?.alkohol) || 0) / 100), 0);

  const proPerson = {};
  for (const { key, team } of PERSONEN) {
    const feld = key === 'aek' ? 'anzahl_aek' : 'anzahl_real';
    const note = key === 'aek' ? 'note_aek' : 'note_real';
    const anzahl = liste.reduce((s, v) => s + (v[feld] || 0), 0);
    const bewertet = liste.filter((v) => v[note] != null);
    proPerson[team] = {
      glaeser: anzahl,
      ml: liste.reduce((s, v) => s + (v.groesse_ml || 0) * (v[feld] || 0), 0),
      ausgaben: liste.reduce((s, v) => s + (Number(v.preis) || 0) * (v[feld] || 0), 0),
      bewertungen: bewertet.length,
      schnitt: bewertet.length
        ? bewertet.reduce((s, v) => s + v[note], 0) / bewertet.length : null,
      alkoholMl: liste.reduce(
        (s, v) => s + (v.groesse_ml || 0) * (v[feld] || 0) * ((Number(v.bier?.alkohol) || 0) / 100), 0),
    };
  }

  return {
    biere: liste.length,
    glaeser: gesamtGlaeser,
    ausgaben,
    liter: ml / 1000,
    alkoholMl,
    // 1 Standardglas ≈ 12 g reiner Alkohol ≈ 15,2 ml (Dichte 0,789 g/ml).
    standardglaeser: alkoholMl / 15.2,
    proPerson,
  };
}

/** Durchschnittsnote einer Verkostung über beide Personen. */
export function schnittNote(v) {
  const noten = [v?.note_aek, v?.note_real].filter((n) => n != null);
  if (!noten.length) return null;
  return noten.reduce((s, n) => s + n, 0) / noten.length;
}

/** Bestenliste der Biere einer Börse — beste Durchschnittsnote zuerst. */
export function bestenListe(verkostungen, katalog) {
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  return (verkostungen || [])
    .map((v) => ({ ...v, bier: nachId.get(v.bier_id) || null, note: schnittNote(v) }))
    .filter((v) => v.note != null)
    .sort((a, b) => b.note - a.note || String(a.bier?.name).localeCompare(String(b.bier?.name)));
}

/**
 * Bestenliste über ALLE Börsen — dafür gibt es den Katalog.
 * Ein Bier, das mehrfach getrunken wurde, zählt einmal mit dem Schnitt aus
 * allen Verkostungen.
 */
export function katalogBestenListe(verkostungen, katalog) {
  const proBier = new Map();
  for (const v of verkostungen || []) {
    const e = proBier.get(v.bier_id) || { bier_id: v.bier_id, noten: [], glaeser: 0, boersen: 0, preise: [] };
    const n = schnittNote(v);
    if (n != null) e.noten.push(n);
    e.glaeser += (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    e.boersen += 1;
    if (v.preis != null) e.preise.push(Number(v.preis));
    proBier.set(v.bier_id, e);
  }
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  return [...proBier.values()]
    .map((e) => ({
      ...e,
      bier: nachId.get(e.bier_id) || null,
      note: e.noten.length ? e.noten.reduce((s, n) => s + n, 0) / e.noten.length : null,
      preisSchnitt: e.preise.length ? e.preise.reduce((s, p) => s + p, 0) / e.preise.length : null,
    }))
    .filter((e) => e.bier)
    .sort((a, b) => (b.note ?? -1) - (a.note ?? -1) || b.glaeser - a.glaeser);
}
