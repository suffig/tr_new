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
