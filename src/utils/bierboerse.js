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
  // Kopie vor dem Sortieren: sort() arbeitet in place und wuerde sonst die
  // Reihenfolge im Aufrufer mitverändern.
  return [...(data || [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
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

/** Wer hat bezahlt — die drei Möglichkeiten. */
export const ZAHLER = [
  { id: 'AEK', label: 'Alexander', farbe: 'text-system-blue', balken: 'bg-system-blue' },
  { id: 'Real', label: 'Philip', farbe: 'text-system-red', balken: 'bg-system-red' },
  { id: 'geteilt', label: 'Geteilt', farbe: 'text-text-secondary', balken: 'bg-text-tertiary/50' },
];

/**
 * Wer hat an einem Abend wie viel bezahlt — und wie viel getrunken.
 *
 * Zwei verschiedene Zahlen: wer eine Runde ausgibt, hat sie bezahlt, aber
 * nicht unbedingt getrunken. Die Differenz ist am Ende die interessante.
 */
export function rechnung(verkostungen) {
  const raus = {
    AEK: { bezahlt: 0, getrunken: 0, runden: 0 },
    Real: { bezahlt: 0, getrunken: 0, runden: 0 },
    geteilt: { bezahlt: 0, runden: 0 },
    offen: 0,
    offeneRunden: 0,
  };
  // Der Ausgleich zaehlt NUR ueber zugeordnete Runden: > 0 heisst, Philip
  // schuldet Alexander. Nicht erfasste Biere duerfen hier nicht mitlaufen —
  // wer sie bezahlt hat, weiss niemand, und sie wuerden den Betrag je nach
  // Trinkmenge in die eine oder andere Richtung verschieben.
  let ausgleich = 0;
  for (const v of verkostungen || []) {
    const preis = Number(v.preis) || 0;
    const aek = v.anzahl_aek || 0;
    const real = v.anzahl_real || 0;
    const summe = preis * (aek + real);
    raus.AEK.getrunken += preis * aek;
    raus.Real.getrunken += preis * real;
    if (v.bezahlt_von === 'AEK') {
      raus.AEK.bezahlt += summe; raus.AEK.runden += 1;
      ausgleich += preis * real;              // Philip trank auf Alexanders Deckel
    } else if (v.bezahlt_von === 'Real') {
      raus.Real.bezahlt += summe; raus.Real.runden += 1;
      ausgleich -= preis * aek;
    } else if (v.bezahlt_von === 'geteilt') {
      raus.AEK.bezahlt += summe / 2; raus.Real.bezahlt += summe / 2;
      raus.geteilt.bezahlt += summe; raus.geteilt.runden += 1;
      // Jeder zahlt die Haelfte, getrunken hat aber selten jeder die Haelfte.
      ausgleich += summe / 2 - preis * aek;
    } else {
      raus.offen += summe;
      raus.offeneRunden += 1;
    }
  }
  // Wer mehr bezahlt hat, als er getrunken hat, liegt vorn.
  raus.saldo = {
    AEK: raus.AEK.bezahlt - raus.AEK.getrunken,
    Real: raus.Real.bezahlt - raus.Real.getrunken,
  };
  raus.ausgleich = ausgleich;
  raus.zugeordnet = raus.AEK.runden + raus.Real.runden + raus.geteilt.runden;
  return raus;
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

/**
 * Alles zu EINEM Bier über alle Börsen hinweg.
 *
 * Der Grund für den Katalog: erst dadurch lässt sich sagen, wie oft ihr ein
 * Bier hattet, ob es beim zweiten Mal besser ankam und was es im Schnitt
 * gekostet hat.
 */
export function bierVerlauf(bierId, verkostungen, boersen) {
  const nachBoerse = new Map((boersen || []).map((b) => [b.id, b]));
  const eigene = (verkostungen || [])
    .filter((v) => v.bier_id === bierId)
    .map((v) => ({ ...v, boerse: nachBoerse.get(v.boerse_id) || null, note: schnittNote(v) }))
    .sort((a, b) => String(b.boerse?.datum || '').localeCompare(String(a.boerse?.datum || '')));

  const glaeser = eigene.reduce((s, v) => s + (v.anzahl_aek || 0) + (v.anzahl_real || 0), 0);
  const preise = eigene.map((v) => Number(v.preis)).filter((p) => Number.isFinite(p) && p > 0);
  const noten = eigene.map((v) => v.note).filter((n) => n != null);

  const jePerson = {};
  for (const { key, team } of PERSONEN) {
    const feld = key === 'aek' ? 'anzahl_aek' : 'anzahl_real';
    const note = key === 'aek' ? 'note_aek' : 'note_real';
    const bewertet = eigene.filter((v) => v[note] != null);
    jePerson[team] = {
      glaeser: eigene.reduce((s, v) => s + (v[feld] || 0), 0),
      schnitt: bewertet.length ? bewertet.reduce((s, v) => s + v[note], 0) / bewertet.length : null,
    };
  }

  return {
    verkostungen: eigene,
    boersen: eigene.length,
    glaeser,
    schnitt: noten.length ? noten.reduce((s, n) => s + n, 0) / noten.length : null,
    preisMin: preise.length ? Math.min(...preise) : null,
    preisMax: preise.length ? Math.max(...preise) : null,
    preisSchnitt: preise.length ? preise.reduce((s, p) => s + p, 0) / preise.length : null,
    // Literpreis macht Größen vergleichbar: 3 € für 0,3 l ist teurer als
    // 4 € für 0,5 l, und das sieht man am Glaspreis nicht.
    literpreise: eigene
      .filter((v) => v.preis > 0 && v.groesse_ml > 0)
      .map((v) => (Number(v.preis) / v.groesse_ml) * 1000),
    jePerson,
    einig: jePerson.AEK.schnitt != null && jePerson.Real.schnitt != null
      ? Math.abs(jePerson.AEK.schnitt - jePerson.Real.schnitt) : null,
  };
}

/**
 * Fundstücke über alle Börsen — nur aus den vorhandenen Zahlen.
 */
export function bierFundstuecke(verkostungen, katalog) {
  const liste = katalogBestenListe(verkostungen, katalog);
  const raus = [];
  if (!liste.length) return raus;

  const bewertet = liste.filter((e) => e.note != null);
  if (bewertet.length) {
    raus.push({ id: 'bestes', icon: 'trophy', farbe: 'text-system-yellow',
      titel: 'Bestes Bier',
      text: `${bewertet[0].bier.name} — ${bewertet[0].note.toLocaleString('de-DE', { maximumFractionDigits: 1 })} von 10.` });
    const schlechtestes = bewertet[bewertet.length - 1];
    if (bewertet.length > 1) {
      raus.push({ id: 'schlechtestes', icon: 'ban', farbe: 'text-system-red',
        titel: 'Größte Enttäuschung',
        text: `${schlechtestes.bier.name} — ${schlechtestes.note.toLocaleString('de-DE', { maximumFractionDigits: 1 })} von 10.` });
    }
  }

  const meiste = [...liste].sort((a, b) => b.glaeser - a.glaeser)[0];
  if (meiste?.glaeser > 0) {
    raus.push({ id: 'meiste', icon: 'beer', farbe: 'text-system-orange',
      titel: 'Am häufigsten getrunken',
      text: `${meiste.bier.name} — ${meiste.glaeser} ${meiste.glaeser === 1 ? 'Glas' : 'Gläser'}.` });
  }

  // Wo sind sich die beiden am uneinigsten?
  const strittig = (verkostungen || [])
    .filter((v) => v.note_aek != null && v.note_real != null)
    .map((v) => ({ v, diff: Math.abs(v.note_aek - v.note_real) }))
    .sort((a, b) => b.diff - a.diff)[0];
  if (strittig && strittig.diff >= 2) {
    const bier = (katalog || []).find((b) => b.id === strittig.v.bier_id);
    raus.push({ id: 'strittig', icon: 'zap', farbe: 'text-system-purple',
      titel: 'Größte Uneinigkeit',
      text: `${bier?.name || 'Ein Bier'} — Alexander ${strittig.v.note_aek}, Philip ${strittig.v.note_real}.` });
  }

  // Preis-Leistung: beste Note je Euro Literpreis.
  const wert = (verkostungen || [])
    .filter((v) => v.preis > 0 && v.groesse_ml > 0 && schnittNote(v) != null)
    .map((v) => ({ v, literpreis: (Number(v.preis) / v.groesse_ml) * 1000, note: schnittNote(v) }))
    .sort((a, b) => (b.note / b.literpreis) - (a.note / a.literpreis))[0];
  if (wert) {
    const bier = (katalog || []).find((b) => b.id === wert.v.bier_id);
    raus.push({ id: 'preisleistung', icon: 'euro', farbe: 'text-system-teal',
      titel: 'Bestes Preis-Leistungs-Verhältnis',
      text: `${bier?.name || 'Ein Bier'} — Note ${wert.note.toLocaleString('de-DE', { maximumFractionDigits: 1 })} bei `
        + `${wert.literpreis.toLocaleString('de-DE', { maximumFractionDigits: 2 })} € je Liter.` });
  }

  const staerkste = (katalog || []).filter((b) => b.alkohol > 0)
    .sort((a, b) => b.alkohol - a.alkohol)[0];
  if (staerkste) {
    raus.push({ id: 'staerkste', icon: 'glass', farbe: 'text-system-yellow',
      titel: 'Stärkstes Bier',
      text: `${staerkste.name} mit ${staerkste.alkohol} %.` });
  }

  return raus;
}

/** Sorten-Verteilung über alle Börsen. */
export function sortenVerteilung(verkostungen, katalog) {
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  const zaehler = new Map();
  for (const v of verkostungen || []) {
    const art = nachId.get(v.bier_id)?.art || 'Ohne Sorte';
    const e = zaehler.get(art) || { art, glaeser: 0, biere: 0, noten: [] };
    e.glaeser += (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    e.biere += 1;
    const n = schnittNote(v);
    if (n != null) e.noten.push(n);
    zaehler.set(art, e);
  }
  return [...zaehler.values()]
    .map((e) => ({ ...e, schnitt: e.noten.length ? e.noten.reduce((s, n) => s + n, 0) / e.noten.length : null }))
    .sort((a, b) => b.glaeser - a.glaeser);
}

/* ===========================================================================
   Bewertung: einfach oder ausführlich (db/21_bierboerse_kategorien.sql)
   =========================================================================== */

/**
 * Was sich an einem Bier bewerten lässt.
 *
 * Der Katalog steht im Code, nicht in der Datenbank: eine neue Kategorie ist
 * damit eine Zeile hier statt einer Migration. In der Datenbank steht nur,
 * welche davon gerade abgefragt werden (bierboerse_einstellungen.kategorien)
 * und die vergebenen Noten als JSONB.
 *
 * `standard` markiert die Vorauswahl — drei reichen für den Anfang, alles
 * andere schaltet man in den Einstellungen dazu.
 */
export const KATEGORIE_KATALOG = [
  // Der erste Eindruck
  { id: 'aussehen', label: 'Aussehen', hilfe: 'Farbe, Klarheit, Schaumkrone', gruppe: 'Optik', standard: true },
  { id: 'schaum', label: 'Schaum', hilfe: 'Wie fest, wie lange er steht', gruppe: 'Optik' },
  { id: 'geruch', label: 'Geruch', hilfe: 'Was in der Nase ankommt', gruppe: 'Optik' },

  // Der Kern
  { id: 'geschmack', label: 'Geschmack', hilfe: 'Der Gesamteindruck im Mund', gruppe: 'Geschmack', standard: true },
  { id: 'antrunk', label: 'Antrunk', hilfe: 'Der erste Schluck', gruppe: 'Geschmack' },
  { id: 'abgang', label: 'Abgang', hilfe: 'Was bleibt, nachdem geschluckt ist', gruppe: 'Geschmack' },
  { id: 'bittere', label: 'Bittere', hilfe: 'Hopfen — 0 süß, 10 sehr bitter', gruppe: 'Geschmack' },
  { id: 'malz', label: 'Malz', hilfe: 'Brot, Karamell, Röstaromen', gruppe: 'Geschmack' },
  { id: 'frische', label: 'Frische', hilfe: 'Spritzig oder schal', gruppe: 'Geschmack' },
  { id: 'koerper', label: 'Körper', hilfe: 'Dünn oder vollmundig', gruppe: 'Geschmack' },

  // Drumherum
  { id: 'preisleistung', label: 'Preis-Leistung', hilfe: 'War es das Geld wert?', gruppe: 'Drumherum', standard: true },
  { id: 'suffigkeit', label: 'Suffigkeit', hilfe: 'Könnte man davon drei trinken?', gruppe: 'Drumherum' },
  { id: 'temperatur', label: 'Temperatur', hilfe: 'Richtig kalt ausgeschenkt?', gruppe: 'Drumherum' },
  { id: 'zapfung', label: 'Zapfung', hilfe: 'Sauber gezapft oder hingerotzt', gruppe: 'Drumherum' },
  { id: 'etikett', label: 'Etikett', hilfe: 'Flasche, Aufmachung, Name', gruppe: 'Drumherum' },
  { id: 'wiederholung', label: 'Nochmal?', hilfe: 'Würdest du es wieder bestellen?', gruppe: 'Drumherum' },
];

/** Nach Schlüssel nachschlagen. */
export const kategorie = (id) => KATEGORIE_KATALOG.find((k) => k.id === id) || null;

export const STANDARD_KATEGORIEN = KATEGORIE_KATALOG.filter((k) => k.standard).map((k) => k.id);

/** Die Gruppen in der Reihenfolge, in der sie im Katalog vorkommen. */
export const KATEGORIE_GRUPPEN = [...new Set(KATEGORIE_KATALOG.map((k) => k.gruppe))];

/**
 * Einstellungen laden.
 *
 * Faellt auf die Vorauswahl zurueck, wenn die Tabelle noch nicht existiert —
 * die Bierboerse soll auch dann bedienbar sein, wenn die Migration noch nicht
 * gelaufen ist. Dann eben im einfachen Modus.
 */
export async function ladeEinstellungen() {
  try {
    const { data, error } = await supabaseDb.select('bierboerse_einstellungen', '*', { skipFifaFilter: true });
    if (error) throw error;
    const e = (data || [])[0];
    if (!e) throw new Error('keine Zeile');
    return {
      modus: e.modus === 'ausfuehrlich' ? 'ausfuehrlich' : 'einfach',
      // Unbekannte Schluessel filtern: wer eine Kategorie aus dem Katalog
      // entfernt, soll keine leere Zeile im Formular bekommen.
      kategorien: (Array.isArray(e.kategorien) ? e.kategorien : []).filter(kategorie),
    };
  } catch {
    return { modus: 'einfach', kategorien: STANDARD_KATEGORIEN };
  }
}

/**
 * Einstellungen sichern.
 *
 * Die Migration legt die Zeile mit id = 1 an. Falls sie trotzdem fehlt —
 * versehentlich geloescht, oder die Datenbank wurde neu aufgesetzt —, wuerde
 * ein reines UPDATE keine Zeile treffen und mit einem Fehler enden, dessen
 * Ursache man dem Text nicht ansieht. Deshalb im zweiten Anlauf ein INSERT.
 */
export async function sichereEinstellungen({ modus, kategorien }) {
  const daten = { modus, kategorien, geaendert: new Date().toISOString() };
  const { error } = await supabaseDb.update('bierboerse_einstellungen', daten, 1);
  if (!error) return;

  const { error: fehler2 } = await supabaseDb.insert('bierboerse_einstellungen', { id: 1, ...daten });
  if (fehler2) throw fehler2;
}

/**
 * Gesamtnote aus den Kategorienoten — Mittel der vergebenen.
 *
 * `null`, wenn keine einzige vergeben wurde. Der Aufrufer behaelt dann die
 * bisherige Gesamtnote, statt sie zu loeschen: sonst verloere ein Eintrag
 * seine Bewertung, nur weil jemand den Preis korrigiert.
 */
export function noteAusKategorien(noten) {
  const werte = Object.values(noten || {}).filter((n) => n != null && n !== '');
  if (!werte.length) return null;
  const mittel = werte.reduce((s, n) => s + Number(n), 0) / werte.length;
  return Math.round(mittel * 10) / 10;
}

/** Die Kategorienoten einer Person aus einer Verkostungszeile. */
export function notenVon(verkostung, personKey) {
  const roh = verkostung?.[personKey === 'aek' ? 'noten_aek' : 'noten_real'];
  if (!roh) return {};
  // Supabase liefert jsonb als Objekt; aus dem Demo-Fallback kann ein String kommen.
  if (typeof roh === 'string') { try { return JSON.parse(roh); } catch { return {}; } }
  return { ...roh };
}

/* ===========================================================================
   Geschmacks-Duell
   =========================================================================== */

const mittel = (zahlen) => zahlen.length ? zahlen.reduce((s, n) => s + n, 0) / zahlen.length : null;

/**
 * Wie weit Alexander und Philip auseinanderliegen.
 *
 * Zaehlt NUR Verkostungen, die beide bewertet haben — bei einer einseitigen
 * Note gibt es keine Abweichung zu messen, und sie wuerde den Schnitt in die
 * Richtung dessen ziehen, der fleissiger bewertet.
 */
export function geschmacksDuell(verkostungen, katalog) {
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  const beide = (verkostungen || []).filter((v) => v.note_aek != null && v.note_real != null);

  const paare = beide.map((v) => ({
    verkostung: v,
    bier: nachId.get(v.bier_id) || null,
    aek: Number(v.note_aek),
    real: Number(v.note_real),
    abstand: Math.abs(Number(v.note_aek) - Number(v.note_real)),
  }));

  // "Einig" heisst hoechstens einen ganzen Punkt auseinander. Auf exakte
  // Gleichheit zu pruefen sagt nichts: mit Kategorien sind die Gesamtnoten
  // gemittelt und krumm (7,7 gegen 7,3). Und die Grenze muss den Abstand 1
  // einschliessen — bei ganzzahligen Noten ist "8 gegen 9" der haeufigste
  // Fall ueberhaupt. Mit `< 1` kamen im Test 0 % Einigkeit heraus, obwohl
  // drei von vier Bieren nur einen Punkt auseinanderlagen.
  const einig = paare.filter((p) => p.abstand <= 1);
  const sortiert = [...paare].sort((a, b) => b.abstand - a.abstand);

  // Ueber alle Kategorien, zu denen es Noten gibt — nicht nur die gerade
  // eingeschalteten. Sonst verschwaende eine abgewaehlte Kategorie rueckwirkend
  // die Bewertungen, die man mit ihr vergeben hat.
  const proKategorie = KATEGORIE_KATALOG.map((k) => {
    const zeilen = (verkostungen || []).filter((v) => {
      const a = notenVon(v, 'aek')[k.id], r = notenVon(v, 'real')[k.id];
      return a != null && r != null;
    });
    return {
      ...k,
      anzahl: zeilen.length,
      aek: mittel(zeilen.map((v) => Number(notenVon(v, 'aek')[k.id]))),
      real: mittel(zeilen.map((v) => Number(notenVon(v, 'real')[k.id]))),
      abstand: mittel(zeilen.map(
        (v) => Math.abs(Number(notenVon(v, 'aek')[k.id]) - Number(notenVon(v, 'real')[k.id])))),
    };
  }).filter((k) => k.anzahl > 0);

  const schnittAek = mittel(paare.map((p) => p.aek));
  const schnittReal = mittel(paare.map((p) => p.real));

  return {
    anzahl: paare.length,
    einig: einig.length,
    einigkeit: paare.length ? (einig.length / paare.length) * 100 : null,
    abstandSchnitt: mittel(paare.map((p) => p.abstand)),
    streit: sortiert[0]?.abstand > 0 ? sortiert[0] : null,
    einigkeitsbier: einig.length ? [...einig].sort((a, b) => (b.aek + b.real) - (a.aek + a.real))[0] : null,
    schnittAek,
    schnittReal,
    // Wer im Mittel niedriger benotet, ist der strengere. Bei Gleichstand
    // niemand — eine Differenz von 0,0 zum "Strengeren" zu erklaeren waere
    // eine Aussage ueber Rundung, nicht ueber Geschmack.
    strenger: schnittAek == null || schnittReal == null || Math.abs(schnittAek - schnittReal) < 0.05
      ? null : (schnittAek < schnittReal ? 'AEK' : 'Real'),
    proKategorie,
  };
}

/* ===========================================================================
   Wo die Strenge sitzt, und wer welche Sorte mag
   =========================================================================== */

/**
 * Welche Kategorie zieht die Note nach unten?
 *
 * Je Kategorie der Abstand zur Gesamtnote derselben Bewertung. "Preis-Leistung
 * liegt 1,2 Punkte unter der Gesamtnote" heisst: ihr findet die Biere gut,
 * aber zu teuer. Ein Schnitt allein sagt das nicht — der haengt daran, welche
 * Biere ihr getrunken habt, nicht daran, wie ihr sie einordnet.
 *
 * Bewusst der Abstand und keine Korrelation: bei einer Handvoll Bieren ist ein
 * Korrelationswert reines Rauschen, waehrend "im Schnitt 1,2 drunter" auch bei
 * fuenf Bewertungen stimmt.
 */
export function kategorienProfil(verkostungen) {
  const treffer = new Map();
  for (const v of verkostungen || []) {
    for (const key of ['aek', 'real']) {
      const gesamt = key === 'aek' ? v.note_aek : v.note_real;
      if (gesamt == null) continue;
      const noten = notenVon(v, key);
      for (const [id, wert] of Object.entries(noten)) {
        if (wert == null) continue;
        const e = treffer.get(id) || { id, werte: [], abstaende: [] };
        e.werte.push(Number(wert));
        e.abstaende.push(Number(wert) - Number(gesamt));
        treffer.set(id, e);
      }
    }
  }
  return KATEGORIE_KATALOG
    .filter((k) => treffer.has(k.id))
    .map((k) => {
      const e = treffer.get(k.id);
      return {
        ...k,
        anzahl: e.werte.length,
        schnitt: mittel(e.werte),
        abstand: mittel(e.abstaende),
      };
    })
    .sort((a, b) => a.abstand - b.abstand);
}

/**
 * Wer mag welche Sorte?
 *
 * Je Sorte der Schnitt getrennt nach Person. Die vorhandene
 * `sortenVerteilung` zaehlt Glaeser und mittelt ueber beide zusammen — damit
 * laesst sich nicht sagen, ob einer von euch Weizen mag und der andere es nur
 * mittrinkt.
 *
 * Sorten mit einer einzigen Bewertung fliegen raus: ein einzelnes Bier ist
 * keine Vorliebe.
 */
export function sortenVorliebe(verkostungen, katalog, mindestens = 2) {
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  const proSorte = new Map();

  for (const v of verkostungen || []) {
    const art = nachId.get(v.bier_id)?.art;
    if (!art) continue;
    const e = proSorte.get(art) || { art, aek: [], real: [], glaeser: 0 };
    if (v.note_aek != null) e.aek.push(Number(v.note_aek));
    if (v.note_real != null) e.real.push(Number(v.note_real));
    e.glaeser += (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    proSorte.set(art, e);
  }

  const liste = [...proSorte.values()]
    .map((e) => ({
      art: e.art,
      glaeser: e.glaeser,
      anzahl: Math.max(e.aek.length, e.real.length),
      aek: e.aek.length ? mittel(e.aek) : null,
      real: e.real.length ? mittel(e.real) : null,
    }))
    .filter((e) => e.anzahl >= mindestens && (e.aek != null || e.real != null))
    .sort((a, b) => Math.max(b.aek ?? 0, b.real ?? 0) - Math.max(a.aek ?? 0, a.real ?? 0));

  const bestesVon = (feld) => liste.filter((e) => e[feld] != null)
    .sort((a, b) => b[feld] - a[feld])[0] || null;

  return {
    sorten: liste,
    lieblingAek: bestesVon('aek'),
    lieblingReal: bestesVon('real'),
  };
}

/* ===========================================================================
   Bier-Zwilling, Anti-Rekorde, Abend-Vergleich
   =========================================================================== */

/**
 * Das Kategorie-Profil eines Biers: je Kategorie der Schnitt über beide
 * Personen und alle Verkostungen.
 */
function profilVon(bierId, verkostungen) {
  const werte = {};
  for (const v of verkostungen || []) {
    if (v.bier_id !== bierId) continue;
    for (const key of ['aek', 'real']) {
      for (const [id, n] of Object.entries(notenVon(v, key))) {
        // Schluessel, die der Katalog nicht (mehr) kennt, ueberspringen. Sonst
        // stuende im Vergleich "am deutlichsten bei undefined" — die Noten
        // liegen im JSONB und ueberleben das Entfernen einer Kategorie aus
        // dem Katalog.
        if (n == null || !kategorie(id)) continue;
        (werte[id] = werte[id] || []).push(Number(n));
      }
    }
  }
  const raus = {};
  for (const [id, liste] of Object.entries(werte)) raus[id] = mittel(liste);
  return raus;
}

/**
 * Das Bier mit dem ähnlichsten Kategorie-Profil.
 *
 * "Ähnlich" heisst: über die Kategorien, die BEIDE Biere haben, ist der
 * mittlere Abstand am kleinsten. Nur die gemeinsamen zu vergleichen ist
 * wichtig — sonst gilt ein Bier, das nur nach Geschmack bewertet wurde,
 * automatisch als aehnlich zu allem.
 *
 * Mindestens zwei gemeinsame Kategorien, sonst ist es keine Aussage, sondern
 * Zufall: bei einer einzigen gemeinsamen Kategorie waeren zwei Biere mit je
 * einer 7 "identisch".
 */
export function bierZwilling(bierId, verkostungen, katalog, mindestGemeinsam = 2) {
  const eigenes = profilVon(bierId, verkostungen);
  const eigeneIds = Object.keys(eigenes);
  if (eigeneIds.length < mindestGemeinsam) return null;

  const andere = [...new Set((verkostungen || []).map((v) => v.bier_id))].filter((id) => id !== bierId);
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));

  const kandidaten = andere.map((id) => {
    const p = profilVon(id, verkostungen);
    const gemeinsam = eigeneIds.filter((k) => p[k] != null);
    if (gemeinsam.length < mindestGemeinsam) return null;
    return {
      bier: nachId.get(id) || null,
      gemeinsam: gemeinsam.length,
      abstand: mittel(gemeinsam.map((k) => Math.abs(eigenes[k] - p[k]))),
      // Wo sie sich am staerksten unterscheiden — das ist der interessante Teil.
      groessterUnterschied: gemeinsam
        .map((k) => ({ ...kategorie(k), differenz: eigenes[k] - p[k] }))
        .sort((a, b) => Math.abs(b.differenz) - Math.abs(a.differenz))[0] || null,
    };
  }).filter((k) => k && k.bier);

  if (!kandidaten.length) return null;
  return kandidaten.sort((a, b) => a.abstand - b.abstand)[0];
}

/**
 * Wo die Erinnerung trügt: das Bier, das beim zweiten Mal am stärksten
 * abgefallen ist — und das, das am meisten dazugewonnen hat.
 *
 * Verglichen werden die erste und die letzte Verkostung nach Datum der Börse.
 * Nicht der Schnitt gegen die einzelne Bewertung: der Schnitt enthaelt die
 * Bewertung selbst und daempft den Unterschied genau dann, wenn er
 * interessant wird.
 */
export function antiRekorde(verkostungen, boersen, katalog) {
  const nachBoerse = new Map((boersen || []).map((b) => [b.id, b]));
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));
  const proBier = new Map();

  for (const v of verkostungen || []) {
    const note = schnittNote(v);
    if (note == null) continue;
    const boerse = nachBoerse.get(v.boerse_id);
    if (!boerse) continue;
    if (!proBier.has(v.bier_id)) proBier.set(v.bier_id, []);
    proBier.get(v.bier_id).push({ note: Number(note), boerse, datum: String(boerse.datum || '') });
  }

  const veraenderungen = [...proBier.entries()]
    .map(([bierId, liste]) => {
      if (liste.length < 2) return null;
      const sortiert = [...liste].sort((a, b) => a.datum.localeCompare(b.datum));
      const erste = sortiert[0];
      const letzte = sortiert[sortiert.length - 1];
      return {
        bier: nachId.get(bierId) || null,
        erste, letzte,
        anzahl: sortiert.length,
        differenz: letzte.note - erste.note,
      };
    })
    .filter((e) => e && e.bier && Math.abs(e.differenz) >= 0.5);

  const absturz = [...veraenderungen].sort((a, b) => a.differenz - b.differenz)[0] || null;
  const aufsteiger = [...veraenderungen].sort((a, b) => b.differenz - a.differenz)[0] || null;

  return {
    absturz: absturz && absturz.differenz < 0 ? absturz : null,
    aufsteiger: aufsteiger && aufsteiger.differenz > 0 ? aufsteiger : null,
    alle: veraenderungen.sort((a, b) => a.differenz - b.differenz),
  };
}

/** Kennzahlen einer Börse für den Vergleich zweier Abende. */
export function abendKennzahlen(boerse, verkostungen, katalog) {
  if (!boerse) return null;
  const eigene = (verkostungen || []).filter((v) => v.boerse_id === boerse.id);
  const stat = boersenStatistik(eigene, katalog);
  const beste = bestenListe(eigene, katalog);
  const noten = eigene.map(schnittNote).filter((n) => n != null);
  return {
    boerse,
    biere: stat.biere,
    glaeser: stat.glaeser,
    liter: stat.liter,
    ausgaben: stat.ausgaben,
    jeGlas: stat.glaeser ? stat.ausgaben / stat.glaeser : null,
    schnitt: mittel(noten),
    sieger: beste[0] || null,
    standardglaeser: stat.standardglaeser,
  };
}

/**
 * Ein Abend als Text zum Verschicken.
 *
 * Bewusst reiner Text und kein Bild: er landet in WhatsApp, wo Text zitierbar
 * und durchsuchbar ist, und er funktioniert auch, wenn jemand die App gar
 * nicht hat.
 *
 * Deutsche Zahlen, keine Emoji — dieselbe Sprache wie in der App. Leere
 * Abschnitte fallen weg, statt als "Sieger: —" dazustehen.
 */
export function abendText(boerse, verkostungen, katalog) {
  const eigene = (verkostungen || []).filter((v) => v.boerse_id === boerse.id);
  const stat = boersenStatistik(eigene, katalog);
  const beste = bestenListe(eigene, katalog);
  const kasse = rechnung(eigene);
  const duell = geschmacksDuell(eigene, katalog);
  const pl = preisLeistung(eigene, katalog);

  const zahl1 = (n) => n == null ? '—' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  // Noten immer mit einer Nachkommastelle, wie in der App. Sonst stand im
  // Text "Alexander 3, Philip 9" neben "Bestes Bier: Salvator (6,5)".
  const note1 = (n) => n == null ? '—'
    : Number(n).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const geld = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const datumText = boerse.datum
    ? new Date(boerse.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const zeilen = [];
  zeilen.push(boerse.name);
  zeilen.push([datumText, boerse.ort].filter(Boolean).join(' · '));
  zeilen.push('');
  zeilen.push([
    `${stat.biere} ${stat.biere === 1 ? 'Bier' : 'Biere'}`,
    `${stat.glaeser} ${stat.glaeser === 1 ? 'Glas' : 'Gläser'}`,
    `${zahl1(stat.liter)} l`,
    geld(stat.ausgaben),
  ].join(' · '));

  if (beste.length) {
    zeilen.push('');
    zeilen.push(`Bestes Bier: ${beste[0].bier?.name || 'Unbekannt'} (${note1(beste[0].note)})`);
    if (beste.length > 1) {
      const letztes = beste[beste.length - 1];
      zeilen.push(`Schlusslicht: ${letztes.bier?.name || 'Unbekannt'} (${note1(letztes.note)})`);
    }
  }
  if (pl.sieger) {
    zeilen.push(`Preis-Leistung: ${pl.sieger.bier.name} (${note1(pl.sieger.punkteJeEuro)} Punkte je Euro)`);
  }
  if (duell.streit && duell.streit.abstand >= 2) {
    zeilen.push(`Größter Streit: ${duell.streit.bier?.name || 'Unbekannt'} — `
      + `Alexander ${note1(duell.streit.aek)}, Philip ${note1(duell.streit.real)}`);
  }

  zeilen.push('');
  for (const person of PERSONEN) {
    const s = stat.proPerson[person.team];
    if (!s.glaeser && s.schnitt == null) continue;
    zeilen.push(`${person.name}: ${s.glaeser} ${s.glaeser === 1 ? 'Glas' : 'Gläser'}`
      + `, ${geld(s.ausgaben)}`
      + (s.schnitt == null ? '' : `, Ø ${note1(s.schnitt)}`));
  }

  if (kasse.zugeordnet > 0) {
    zeilen.push('');
    zeilen.push(Math.abs(kasse.ausgleich) < 0.01
      ? 'Rechnung: ausgeglichen.'
      : kasse.ausgleich > 0
        ? `Philip schuldet Alexander ${geld(kasse.ausgleich)}.`
        : `Alexander schuldet Philip ${geld(-kasse.ausgleich)}.`);
  }

  if (boerse.notiz) {
    zeilen.push('');
    zeilen.push(boerse.notiz);
  }

  return zeilen.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Preis-Leistung über alle Börsen.
 *
 * Zwei Sieger, weil "Preis-Leistung" zwei verschiedene Dinge heissen kann:
 *
 *   gerechnet   Notenpunkte je Euro Literpreis. Rein objektiv, aus Note,
 *               Preis und Glasgroesse. Bevorzugt naturgemaess das Billige —
 *               genau das ist die Frage "was war am meisten fuers Geld".
 *   gefuehlt    Eure eigene Kategorie "Preis-Leistung", falls vergeben.
 *               Da steckt drin, was die Rechnung nicht weiss: dass fuer ein
 *               Salvator eben 5 € in Ordnung gehen.
 *
 * Die beiden auseinanderzuhalten ist wichtiger, als sie zu einer Zahl zu
 * verruehren — wenn sie auseinanderlaufen, ist das die interessante Aussage.
 *
 * Der Literpreis statt des Glaspreises, weil 0,3 l fuer 3,80 € und 0,5 l fuer
 * 4,50 € sonst nicht vergleichbar waeren.
 */
export function preisLeistung(verkostungen, katalog) {
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));

  // Je Bier zusammenfassen: dasselbe Bier auf zwei Abenden ist ein Bier.
  const proBier = new Map();
  for (const v of verkostungen || []) {
    const note = schnittNote(v);
    if (note == null || v.preis == null || !(v.groesse_ml > 0)) continue;
    const e = proBier.get(v.bier_id) || { bier_id: v.bier_id, noten: [], literpreise: [], glaeser: 0 };
    e.noten.push(Number(note));
    e.literpreise.push((Number(v.preis) / v.groesse_ml) * 1000);
    e.glaeser += (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    proBier.set(v.bier_id, e);
  }

  const gerechnet = [...proBier.values()]
    .map((e) => {
      const note = mittel(e.noten);
      const literpreis = mittel(e.literpreise);
      return {
        bier: nachId.get(e.bier_id) || null,
        note,
        literpreis,
        glaeser: e.glaeser,
        // Punkte je Euro Literpreis. Ein Bier, das 8 Punkte holt und 4 € je
        // Liter kostet, bringt 2,0 Punkte pro Euro.
        punkteJeEuro: literpreis > 0 ? note / literpreis : null,
      };
    })
    .filter((e) => e.bier && e.punkteJeEuro != null)
    .sort((a, b) => b.punkteJeEuro - a.punkteJeEuro);

  // Gefuehlt: Schnitt der Kategorie "preisleistung" ueber beide Personen.
  const gefuehltMap = new Map();
  for (const v of verkostungen || []) {
    for (const key of ['aek', 'real']) {
      const n = notenVon(v, key).preisleistung;
      if (n == null) continue;
      const e = gefuehltMap.get(v.bier_id) || { bier_id: v.bier_id, werte: [] };
      e.werte.push(Number(n));
      gefuehltMap.set(v.bier_id, e);
    }
  }
  const gefuehlt = [...gefuehltMap.values()]
    .map((e) => ({ bier: nachId.get(e.bier_id) || null, note: mittel(e.werte), anzahl: e.werte.length }))
    .filter((e) => e.bier)
    .sort((a, b) => b.note - a.note);

  // "Geldverbrennung": teuer und trotzdem unter dem Schnitt. Nur melden, wenn
  // es wirklich einen Ausreisser gibt — sonst wird das teuerste Bier auch dann
  // angeprangert, wenn es gut war.
  const schnittAlle = mittel(gerechnet.map((e) => e.note));
  const teuerUndMau = [...gerechnet]
    .filter((e) => schnittAlle != null && e.note < schnittAlle)
    .sort((a, b) => b.literpreis - a.literpreis)[0] || null;

  return {
    gerechnet,
    gefuehlt,
    sieger: gerechnet[0] || null,
    schlusslicht: gerechnet.length > 1 ? gerechnet[gerechnet.length - 1] : null,
    gefuehlterSieger: gefuehlt[0] || null,
    teuerUndMau,
    // Laufen objektiver und gefuehlter Sieger auseinander? Das ist die
    // eigentliche Aussage der Karte.
    einig: !!(gerechnet[0] && gefuehlt[0] && gerechnet[0].bier?.id === gefuehlt[0].bier?.id),
  };
}

/* ===========================================================================
   Bilanz über alle Börsen
   =========================================================================== */

/**
 * Alles zusammengezaehlt.
 *
 * Bis hierher endete jede Auswertung an der Boersengrenze: die Karte zeigte
 * einen Abend, das Bier-Detail ein Bier. Wie viel ihr insgesamt getrunken,
 * ausgegeben und wie sich das ueber die Abende entwickelt hat, stand nirgends.
 */
export function gesamtBilanz(boersen, verkostungen, katalog) {
  const alle = verkostungen || [];
  const gesamt = boersenStatistik(alle, katalog);
  const nachId = new Map((katalog || []).map((b) => [b.id, b]));

  // Je Boerse eine Zeile, aelteste zuerst — so liest sich der Verlauf von
  // links nach rechts wie eine Zeitachse.
  const proBoerse = (boersen || []).map((b) => {
    const eigene = alle.filter((v) => v.boerse_id === b.id);
    const s = boersenStatistik(eigene, katalog);
    const noten = eigene.map(schnittNote).filter((n) => n != null);
    return {
      boerse: b,
      biere: s.biere,
      glaeser: s.glaeser,
      liter: s.liter,
      ausgaben: s.ausgaben,
      schnitt: mittel(noten),
      proGlas: s.glaeser ? s.ausgaben / s.glaeser : null,
    };
  }).sort((a, b) => String(a.boerse.datum || '').localeCompare(String(b.boerse.datum || '')));

  const mitGlaesern = proBoerse.filter((e) => e.glaeser > 0);
  const bestesVon = (liste, feld) => liste.filter((e) => e[feld] != null)
    .sort((a, b) => b[feld] - a[feld])[0] || null;

  // Literpreis je Verkostung — die ehrlichste Preisangabe, weil sie 0,3 l
  // und 0,5 l vergleichbar macht.
  const literpreise = alle
    .filter((v) => v.preis != null && v.groesse_ml > 0)
    .map((v) => ({ v, bier: nachId.get(v.bier_id) || null, preis: (Number(v.preis) / v.groesse_ml) * 1000 }));

  return {
    boersen: (boersen || []).length,
    verschiedeneBiere: new Set(alle.map((v) => v.bier_id)).size,
    ...gesamt,
    proBoerse,
    rechnung: rechnung(alle),
    rekorde: {
      teuersterAbend: bestesVon(mitGlaesern, 'ausgaben'),
      groessterAbend: bestesVon(mitGlaesern, 'glaeser'),
      besterAbend: bestesVon(mitGlaesern, 'schnitt'),
      teuerstesGlas: literpreise.length ? [...literpreise].sort((a, b) => b.preis - a.preis)[0] : null,
      guenstigstesGlas: literpreise.length ? [...literpreise].sort((a, b) => a.preis - b.preis)[0] : null,
    },
  };
}
