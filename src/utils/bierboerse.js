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

/**
 * Gaengige Herkunftslaender als Vorauswahl.
 *
 * Nur ein Startpunkt: alles, was ihr selbst eintragt, steht danach ohnehin in
 * der Liste, weil sie aus dem Katalog ergaenzt wird.
 */
export const HERKUNFT = [
  'Deutschland', 'Belgien', 'Tschechien', 'Österreich', 'Niederlande',
  'Irland', 'England', 'Schottland', 'Dänemark', 'Polen', 'Italien',
  'Spanien', 'USA', 'Mexiko', 'Japan',
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
export async function findeOderLegeBierAn({ name, brauerei = null, art = null, alkohol = null, land = null, bierId = null }) {
  const sauber = String(name || '').trim();
  if (!sauber) throw new Error('Das Bier braucht einen Namen.');

  const katalog = await ladeKatalog();
  const felder = {
    name: sauber,
    brauerei: brauerei?.trim() || null,
    art: art || null,
    alkohol: alkohol == null || alkohol === '' ? null : Number(alkohol),
    land: land?.trim() || null,
  };

  // Wird eine BESTEHENDE Verkostung bearbeitet, ist das Bier bekannt — dann
  // wird genau diese Zeile geaendert.
  //
  // Vorher lief auch der Bearbeiten-Fall ueber die Suche unten, und die hat
  // zwei Dinge still falsch gemacht:
  //   - Sorte, Land oder Alkohol geaendert: der Treffer wurde gefunden und
  //     UNVERAENDERT zurueckgegeben. Die Aenderung fiel weg, ohne Meldung.
  //   - Brauerei geaendert: der Treffer griff nicht mehr (sie ist Teil des
  //     Suchschluessels), und es entstand ein ZWEITES Bier gleichen Namens.
  if (bierId != null) {
    const { error } = await supabaseDb.update('bier_katalog', felder, bierId);
    if (error) throw error;
    return { id: bierId, ...felder };
  }

  const treffer = katalog.find(
    (b) => b.name.trim().toLowerCase() === sauber.toLowerCase() &&
           String(b.brauerei || '').trim().toLowerCase() === String(brauerei || '').trim().toLowerCase()
  );
  if (treffer) {
    // Leere Felder auffuellen, ohne vorhandene zu ueberschreiben: wer ein Bier
    // zum zweiten Mal eintraegt und diesmal das Land angibt, soll es behalten
    // duerfen — aber eine bestehende Angabe nicht versehentlich ersetzen.
    const ergaenzung = {};
    for (const feld of ['brauerei', 'art', 'land', 'alkohol']) {
      if (!treffer[feld] && felder[feld] != null) ergaenzung[feld] = felder[feld];
    }
    if (Object.keys(ergaenzung).length) {
      const { error } = await supabaseDb.update('bier_katalog', ergaenzung, treffer.id);
      if (error) throw error;
      return { ...treffer, ...ergaenzung };
    }
    return treffer;
  }

  const { data, error } = await supabaseDb.insert('bier_katalog', felder);
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
    // VERSCHIEDENE Biere, nicht Verkostungszeilen. Wer dasselbe Bier an zwei
    // Abenden trinkt, hat nicht zwei Biere getrunken — die Beschriftung sagt
    // "Biere", also muss die Zahl das auch meinen. Vorher zaehlte hier
    // liste.length und damit die Zeilen.
    biere: new Set(liste.map((v) => v.bier_id).filter((id) => id != null)).size,
    // Die Zeilenzahl bleibt verfuegbar — die Bilanz zeigt beides.
    verkostungen: liste.length,
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
    const e = zaehler.get(art) || { art, glaeser: 0, biere: new Set(), noten: [] };
    e.glaeser += (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    // Verschiedene Biere, nicht Verkostungszeilen — wie in boersenStatistik.
    if (v.bier_id != null) e.biere.add(v.bier_id);
    const n = schnittNote(v);
    if (n != null) e.noten.push(n);
    zaehler.set(art, e);
  }
  return [...zaehler.values()]
    .map((e) => ({ ...e, biere: e.biere.size,
                   schnitt: e.noten.length ? e.noten.reduce((s, n) => s + n, 0) / e.noten.length : null }))
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

export const STANDARD_KATEGORIEN = KATEGORIE_KATALOG.filter((k) => k.standard).map((k) => k.id);

/* ---------------------------------------------------------------------------
   Eigene Kategorien (db/28)

   Die mitgelieferten oben bleiben im Code, die selbst angelegten kommen aus
   der Tabelle. Der GESAMTKATALOG ist beides übereinandergelegt — und weil
   fast jede Stelle in der App "gib mir die Kategorie zu diesem Schlüssel"
   fragt, liegt die Zusammenführung an genau einer Stelle: hier.
   --------------------------------------------------------------------------- */

/**
 * Die eigenen Kategorien, wie sie zuletzt geladen wurden.
 *
 * Ein Modul-Zwischenspeicher und keine Abfrage je Aufruf: `kategorie()` wird
 * beim Zeichnen des Formulars und jeder Auswertung dutzendfach aufgerufen und
 * muss synchron antworten. Gefüllt wird er von ladeKategorien().
 */
let eigeneKategorien = [];

/** Eigene Kategorien aus der Datenbank holen und merken. */
export async function ladeKategorien() {
  try {
    const { data, error } = await supabaseDb.select('bier_kategorien', '*', { skipFifaFilter: true });
    if (error) throw error;
    eigeneKategorien = (data || []).map((k) => ({
      id: k.id,
      label: k.label,
      hilfe: k.hilfe || null,
      gruppe: k.gruppe || 'Eigene',
      aktiv: k.aktiv !== false,
      sortierung: Number(k.sortierung) || 0,
      eigen: true,
    })).sort((a, b) => a.sortierung - b.sortierung || String(a.label).localeCompare(String(b.label)));
    return eigeneKategorien;
  } catch {
    // Migration noch nicht eingespielt: die Bierbörse bleibt bedienbar, es
    // gibt dann eben nur die mitgelieferten Kategorien.
    eigeneKategorien = [];
    return eigeneKategorien;
  }
}

/** Mitgelieferte und eigene zusammen. Ausgeblendete sind NICHT dabei. */
export function alleKategorien() {
  return [...KATEGORIE_KATALOG, ...eigeneKategorien.filter((k) => k.aktiv)];
}

/** Auch die ausgeblendeten — für die Verwaltung und für alte Noten. */
export function alleKategorienMitStillgelegten() {
  return [...KATEGORIE_KATALOG, ...eigeneKategorien];
}

/**
 * Nach Schlüssel nachschlagen.
 *
 * Sucht auch unter den AUSGEBLENDETEN. Eine stillgelegte Kategorie
 * verschwindet aus dem Formular, ihre bereits vergebenen Noten stehen aber
 * weiter in den Verkostungen — und die sollen in den Auswertungen ihren
 * Namen behalten statt als roher Schlüssel dazustehen.
 */
export const kategorie = (id) =>
  KATEGORIE_KATALOG.find((k) => k.id === id) ||
  eigeneKategorien.find((k) => k.id === id) ||
  null;

/**
 * Aus einer Bezeichnung einen Schlüssel bilden.
 *
 * Muss zur Prüfregel in db/28 passen: nur a-z und 0-9, 2 bis 32 Zeichen.
 * Umlaute werden aufgelöst statt entfernt — sonst würde aus "Süffigkeit"
 * "sffigkeit".
 */
export function schluesselAus(label) {
  const roh = String(label || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return roh.slice(0, 32);
}

/** Ist dieser Schlüssel schon vergeben? Auch stillgelegte zählen. */
export const schluesselFrei = (id) =>
  !KATEGORIE_KATALOG.some((k) => k.id === id) && !eigeneKategorien.some((k) => k.id === id);

/** Eine eigene Kategorie anlegen. */
export async function legeKategorieAn({ label, hilfe = null, gruppe = 'Eigene' }) {
  const sauber = String(label || '').trim();
  if (!sauber) throw new Error('Die Kategorie braucht eine Bezeichnung.');
  const id = schluesselAus(sauber);
  if (id.length < 2) {
    throw new Error('Aus dieser Bezeichnung lässt sich kein Schlüssel bilden — bitte Buchstaben verwenden.');
  }
  if (!schluesselFrei(id)) {
    throw new Error(`„${sauber}" gibt es schon.`);
  }
  const sortierung = eigeneKategorien.reduce((m, k) => Math.max(m, k.sortierung), 0) + 1;
  const { error } = await supabaseDb.insert('bier_kategorien', {
    id, label: sauber, hilfe: hilfe?.trim() || null, gruppe, aktiv: true, sortierung,
  });
  if (error) throw error;
  await ladeKategorien();
  return id;
}

/**
 * Eine eigene Kategorie ausblenden oder zurückholen.
 *
 * Kein Löschen: die vergebenen Noten stecken in jeder einzelnen
 * Verkostungszeile und gehören zur Geschichte des Abends. Sie mitzulöschen
 * wäre unwiderruflich, sie stehen zu lassen und die Kategorie zu entfernen
 * hinterließe Noten ohne Namen.
 */
export async function setzeKategorieAktiv(id, aktiv) {
  const { error } = await supabaseDb.update('bier_kategorien', { aktiv }, id);
  if (error) throw error;
  await ladeKategorien();
}

/** Die Gruppen in der Reihenfolge, in der sie vorkommen. */
export const kategorieGruppen = () => [...new Set(alleKategorien().map((k) => k.gruppe))];

/** Rueckwaertskompatibel — hiess frueher so und wird noch importiert. */
export const KATEGORIE_GRUPPEN = [...new Set(KATEGORIE_KATALOG.map((k) => k.gruppe))];

/**
 * Einstellungen laden.
 *
 * Faellt auf die Vorauswahl zurueck, wenn die Tabelle noch nicht existiert —
 * die Bierboerse soll auch dann bedienbar sein, wenn die Migration noch nicht
 * gelaufen ist. Dann eben im einfachen Modus.
 */
export async function ladeEinstellungen() {
  // ZUERST die eigenen Kategorien holen. Unten wird die gespeicherte Auswahl
  // durch kategorie() gefiltert — und was der Katalog nicht kennt, faellt
  // dabei still raus. Ohne diese Zeile wuerde eine selbst angelegte Kategorie
  // gespeichert und beim naechsten Laden kommentarlos verschwinden.
  await ladeKategorien();
  await ladeEigeneListen();
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

/* ===========================================================================
   Nochmal kaufen?
   =========================================================================== */

/** Der Daumen einer Person zu einer Verkostung: true, false oder null. */
export const wiederVon = (v, personKey) =>
  v?.[personKey === 'aek' ? 'wieder_aek' : 'wieder_real'] ?? null;

/**
 * Wer würde was nochmal kaufen — und wo seid ihr euch einig?
 *
 * Gezählt wird nur, was auch beantwortet wurde. Ein nicht gesetzter Daumen
 * ist kein "nein"; würde man ihn mitzählen, sänke jede Quote einfach dadurch,
 * dass jemand das Feld übersprungen hat.
 *
 * `einig` sind die Biere, bei denen BEIDE ja gesagt haben — das ist die
 * Einkaufsliste. `strittig` sind die mit genau einem Ja: die interessanteren,
 * weil dort der Geschmack auseinandergeht.
 */
export function wiederkauf(verkostungen, katalog) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const quote = { aek: { ja: 0, nein: 0 }, real: { ja: 0, nein: 0 } };
  const einig = [];
  const strittig = [];

  for (const v of verkostungen || []) {
    const a = wiederVon(v, 'aek');
    const r = wiederVon(v, 'real');
    if (a === true) quote.aek.ja += 1; else if (a === false) quote.aek.nein += 1;
    if (r === true) quote.real.ja += 1; else if (r === false) quote.real.nein += 1;

    // Uneinigkeit lässt sich nur feststellen, wenn beide geantwortet haben.
    if (a == null || r == null) continue;
    const bier = bierVon.get(v.bier_id) || null;
    if (a && r) einig.push({ verkostung: v, bier });
    else if (a !== r) strittig.push({ verkostung: v, bier, dafuer: a ? 'aek' : 'real' });
  }

  // Je Bier nur einmal. Dasselbe Bier kann an mehreren Abenden vorkommen —
  // eine Einkaufsliste, die "Augustiner Helles" zweimal nennt, ist keine.
  // Es gilt die JUENGSTE Verkostung: wenn ihr eure Meinung geaendert habt,
  // zaehlt die letzte.
  const jeBier = (liste) => {
    const raus = new Map();
    for (const e of liste) {
      const vorhanden = raus.get(e.verkostung.bier_id);
      if (!vorhanden || e.verkostung.id > vorhanden.verkostung.id) {
        raus.set(e.verkostung.bier_id, e);
      }
    }
    return [...raus.values()];
  };

  const anteil = (q) => (q.ja + q.nein ? q.ja / (q.ja + q.nein) : null);
  return {
    quote,
    anteilAek: anteil(quote.aek),
    anteilReal: anteil(quote.real),
    einig: jeBier(einig),
    strittig: jeBier(strittig),
    beantwortet: quote.aek.ja + quote.aek.nein + quote.real.ja + quote.real.nein,
  };
}

/* ===========================================================================
   Notendrift über den Abend
   =========================================================================== */

/**
 * Werden eure Noten im Lauf eines Abends milder oder strenger?
 *
 * Die Reihenfolge steht nirgends als Feld — sie steckt in der id, weil die
 * Verkostungen in der Reihenfolge angelegt werden, in der ihr trinkt. Genau
 * wie bei den Spielen eines Abends.
 *
 * Gemittelt wird über die POSITION, nicht über die Zeit: das erste Bier jedes
 * Abends bildet Position 1, das zweite Position 2 und so weiter. Anders ginge
 * es nicht — es gibt keine Uhrzeit je Verkostung.
 *
 * Zwei Vorbehalte, die das Ergebnis mitbestimmen und deshalb mitgeliefert
 * werden:
 *   - Späte Positionen kommen aus immer weniger Abenden. Position 9 kann aus
 *     einem einzigen stammen, und dann ist sie kein Trend, sondern ein Bier.
 *   - Ihr sucht euch die Reihenfolge selbst aus. Wer das Beste zum Schluss
 *     aufhebt, erzeugt einen Anstieg, der nichts mit Milde zu tun hat.
 */
export function notenDrift(verkostungen, boersen, mindestensAbende = 2) {
  const nachBoerse = new Map();
  for (const v of verkostungen || []) {
    if (!nachBoerse.has(v.boerse_id)) nachBoerse.set(v.boerse_id, []);
    nachBoerse.get(v.boerse_id).push(v);
  }

  const summe = new Map();  // Position -> { noten: [], abende: Set }
  for (const [boerseId, liste] of nachBoerse) {
    const chronologisch = [...liste].sort((a, b) => a.id - b.id);
    chronologisch.forEach((v, i) => {
      const note = schnittNote(v);
      if (note == null) return;
      const pos = i + 1;
      if (!summe.has(pos)) summe.set(pos, { noten: [], abende: new Set() });
      const eintrag = summe.get(pos);
      eintrag.noten.push(note);
      eintrag.abende.add(boerseId);
    });
  }

  const punkte = [...summe.entries()]
    .map(([position, e]) => ({
      position,
      schnitt: mittel(e.noten),
      anzahl: e.noten.length,
      abende: e.abende.size,
    }))
    .filter((p) => p.abende >= mindestensAbende)
    .sort((a, b) => a.position - b.position);

  if (punkte.length < 2) {
    return { punkte, richtung: null, unterschied: null, abende: nachBoerse.size };
  }

  // Erste gegen zweite Hälfte statt erster gegen letzter Punkt: ein einzelnes
  // Ausreißerbier am Anfang oder Ende würde die Aussage sonst allein tragen.
  const mitte = Math.floor(punkte.length / 2);
  const frueh = mittel(punkte.slice(0, mitte).map((p) => p.schnitt));
  const spaet = mittel(punkte.slice(punkte.length - mitte).map((p) => p.schnitt));
  const unterschied = (spaet ?? 0) - (frueh ?? 0);

  return {
    punkte,
    frueh,
    spaet,
    unterschied,
    // Unter einem Viertelpunkt ist das Rauschen, keine Richtung.
    richtung: Math.abs(unterschied) < 0.25 ? 'gleich' : (unterschied > 0 ? 'milder' : 'strenger'),
    abende: nachBoerse.size,
    boersen: (boersen || []).length,
  };
}

/* ===========================================================================
   Brauereien
   =========================================================================== */

/**
 * Was ihr von welcher Brauerei getrunken und wie ihr es bewertet habt.
 *
 * Die Angaben lagen längst im Katalog — ausgewertet wurde bisher nur die
 * Sorte. Dabei ist „von wem" beim Einkauf die nützlichere Frage: eine Sorte
 * sagt, was ihr mögt, eine Brauerei sagt, wo ihr es bekommt.
 *
 * `mindestens` filtert Zufallstreffer: bei EINEM Bier ist der Schnitt der
 * Brauerei die Note dieses einen Bieres und keine Aussage über die Brauerei.
 * Die Liste enthält sie trotzdem — nur die Bestenliste nicht.
 */
export function brauereiStatistik(verkostungen, katalog, mindestens = 2) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const nach = new Map();

  for (const v of verkostungen || []) {
    const bier = bierVon.get(v.bier_id);
    const name = bier?.brauerei;
    if (!name) continue;
    if (!nach.has(name)) {
      nach.set(name, { brauerei: name, biere: new Set(), glaeser: 0, ausgaben: 0, noten: [] });
    }
    const e = nach.get(name);
    e.biere.add(v.bier_id);
    const glaeser = (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    e.glaeser += glaeser;
    // Preis ist der Preis EINES Glases — mal der Anzahl, sonst zählt eine
    // Runde für sechs so viel wie ein einzelnes Glas.
    e.ausgaben += (Number(v.preis) || 0) * glaeser;
    const n = schnittNote(v);
    if (n != null) e.noten.push(n);
  }

  const liste = [...nach.values()].map((e) => ({
    brauerei: e.brauerei,
    biere: e.biere.size,
    glaeser: e.glaeser,
    ausgaben: e.ausgaben,
    schnitt: e.noten.length ? mittel(e.noten) : null,
    bewertet: e.noten.length,
  }));

  return {
    // Nach Gläsern: „wovon habt ihr am meisten getrunken".
    liste: [...liste].sort((a, b) => b.glaeser - a.glaeser
      || String(a.brauerei).localeCompare(String(b.brauerei), 'de')),
    // Nach Note, aber erst ab genug Bewertungen.
    beste: [...liste]
      .filter((x) => x.schnitt != null && x.bewertet >= mindestens)
      .sort((a, b) => b.schnitt - a.schnitt),
    mindestens,
  };
}

/* ===========================================================================
   Herkunft, Stärke und Preis je 100 ml
   =========================================================================== */

/**
 * Woher eure Biere kommen.
 *
 * Das Land wird seit db-Anfang erfasst und war nie ausgewertet. Gezählt
 * werden GLÄSER, nicht Sorten: fünf deutsche Biere einmal probiert sagen etwas
 * anderes als ein belgisches, von dem ihr zehn getrunken habt.
 *
 * Biere ohne Landangabe kommen als eigene Zeile — verschweigen wäre schlimmer,
 * denn dann summierte sich die Verteilung nicht auf das, was ihr getrunken
 * habt.
 */
export function herkunftVerteilung(verkostungen, katalog) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const z = new Map();
  let ohneAngabe = 0, gesamt = 0;

  for (const v of verkostungen || []) {
    const glaeser = (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    if (!glaeser) continue;
    gesamt += glaeser;
    const land = bierVon.get(v.bier_id)?.land;
    if (!land) { ohneAngabe += glaeser; continue; }
    z.set(land, (z.get(land) || 0) + glaeser);
  }

  return {
    liste: [...z.entries()]
      .map(([land, glaeser]) => ({ land, glaeser, anteil: gesamt ? glaeser / gesamt : 0 }))
      .sort((a, b) => b.glaeser - a.glaeser || String(a.land).localeCompare(String(b.land), 'de')),
    ohneAngabe, gesamt,
  };
}

/**
 * Wird es im Lauf des Abends stärker?
 *
 * Nach POSITION im Abend, wie bei der Notendrift — eine Uhrzeit je Bier gibt
 * es nicht. Gewichtet nach Gläsern: ein Doppelbock, von dem einer nippt,
 * verschiebt den Schnitt sonst so stark wie drei geteilte Halbe.
 *
 * Positionen aus weniger als zwei Abenden fallen raus: eine „Position 8" aus
 * einem einzigen Abend ist kein Trend, sondern ein Bier.
 */
export function alkoholVerlauf(verkostungen, katalog, mindestensAbende = 2) {
  // Der Alkoholgehalt haengt am BIER, nicht an der Verkostung — die Zeile
  // kennt nur Preis, Groesse, Anzahl und Noten.
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const nachBoerse = new Map();
  for (const v of verkostungen || []) {
    if (!nachBoerse.has(v.boerse_id)) nachBoerse.set(v.boerse_id, []);
    nachBoerse.get(v.boerse_id).push(v);
  }

  const summe = new Map();
  for (const [boerseId, liste] of nachBoerse) {
    [...liste].sort((a, b) => a.id - b.id).forEach((v, i) => {
      const prozent = Number(bierVon.get(v.bier_id)?.alkohol);
      if (!Number.isFinite(prozent)) return;
      const glaeser = (v.anzahl_aek || 0) + (v.anzahl_real || 0);
      if (!glaeser) return;
      const pos = i + 1;
      if (!summe.has(pos)) summe.set(pos, { gewicht: 0, produkt: 0, abende: new Set() });
      const e = summe.get(pos);
      e.gewicht += glaeser;
      e.produkt += prozent * glaeser;
      e.abende.add(boerseId);
    });
  }

  const punkte = [...summe.entries()]
    .map(([position, e]) => ({
      position,
      schnitt: e.gewicht ? Math.round((e.produkt / e.gewicht) * 10) / 10 : null,
      abende: e.abende.size,
    }))
    .filter((p) => p.schnitt != null && p.abende >= mindestensAbende)
    .sort((a, b) => a.position - b.position);

  if (punkte.length < 2) return { punkte, richtung: null, unterschied: null };

  const mitte = Math.floor(punkte.length / 2);
  const frueh = mittel(punkte.slice(0, mitte).map((p) => p.schnitt));
  const spaet = mittel(punkte.slice(punkte.length - mitte).map((p) => p.schnitt));
  const unterschied = (spaet ?? 0) - (frueh ?? 0);
  return {
    punkte, frueh, spaet, unterschied,
    // Unter 0,3 Prozentpunkten ist das Rauschen, keine Richtung.
    richtung: Math.abs(unterschied) < 0.3 ? 'gleich' : (unterschied > 0 ? 'stärker' : 'leichter'),
  };
}

/**
 * Preis je 100 ml — der ehrliche Vergleich zwischen 0,33 und 0,5.
 *
 * Der reine Glaspreis taeuscht: 4,00 € fuer eine Halbe ist guenstiger als
 * 3,20 € fuer eine 0,33. Bisher wurde das nur fuer ganze Abende gerechnet
 * ("guenstigster Liter"), nie je Bier.
 *
 * Nur Verkostungen mit Preis UND Groesse — ohne beides gibt es keinen
 * Vergleich, und ein geschaetzter waere schlimmer als keiner.
 */
export function preisJe100ml(verkostungen, katalog) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const z = new Map();

  for (const v of verkostungen || []) {
    const preis = Number(v.preis), ml = Number(v.groesse_ml);
    if (!Number.isFinite(preis) || !Number.isFinite(ml) || ml <= 0 || preis <= 0) continue;
    const bier = bierVon.get(v.bier_id);
    if (!bier) continue;
    const je100 = (preis / ml) * 100;
    // Mehrfach getrunken: der juengste Preis gilt — Preise aendern sich.
    const alt = z.get(bier.id);
    if (!alt || (v.id || 0) > alt.stand) {
      z.set(bier.id, { bier, je100, preis, ml, stand: v.id || 0 });
    }
  }

  const liste = [...z.values()]
    .map(({ bier, je100, preis, ml }) => ({
      bier, je100: Math.round(je100 * 100) / 100, preis, ml,
    }))
    .sort((a, b) => a.je100 - b.je100);

  return { liste, guenstigstes: liste[0] || null, teuerstes: liste[liste.length - 1] || null };
}

/* ===========================================================================
   Listen pflegen
   =========================================================================== */

/* ---------------------------------------------------------------------------
   Eigene Listeneinträge (db/29)

   Brauereien, Sorten und Länder existieren nur, solange ein Bier sie trägt.
   Wer einen Wert auf Vorrat anlegen will, braucht deshalb einen Ort dafür —
   das ist die jsonb-Spalte `eigene_listen` auf der Einstellungszeile.
   --------------------------------------------------------------------------- */

let eigeneListen = { brauerei: [], art: [], land: [] };

/** Die eigenen Listen aus der Datenbank holen und merken. */
export async function ladeEigeneListen() {
  try {
    const { data, error } = await supabaseDb.select('bierboerse_einstellungen', '*', { skipFifaFilter: true });
    if (error) throw error;
    let roh = (data || [])[0]?.eigene_listen;
    if (typeof roh === 'string') { try { roh = JSON.parse(roh); } catch { roh = null; } }
    eigeneListen = {
      brauerei: Array.isArray(roh?.brauerei) ? roh.brauerei : [],
      art: Array.isArray(roh?.art) ? roh.art : [],
      land: Array.isArray(roh?.land) ? roh.land : [],
    };
  } catch {
    // Migration noch nicht eingespielt: die Auswahl kommt dann eben nur aus
    // dem Katalog, alles andere bleibt bedienbar.
    eigeneListen = { brauerei: [], art: [], land: [] };
  }
  return eigeneListen;
}

/** Die gemerkten eigenen Werte eines Feldes. */
export const eigeneWerte = (feld) => eigeneListen[feld] || [];

/** Einen Wert auf Vorrat anlegen. */
export async function legeListenwertAn(feld, wert) {
  const sauber = String(wert || '').trim();
  if (!sauber) throw new Error('Der Eintrag darf nicht leer sein.');
  const vorhanden = (eigeneListen[feld] || []).some(
    (x) => String(x).toLowerCase() === sauber.toLowerCase());
  if (vorhanden) throw new Error(`„${sauber}" steht schon in der Liste.`);

  const neu = { ...eigeneListen, [feld]: [...(eigeneListen[feld] || []), sauber] };
  const { error } = await supabaseDb.update('bierboerse_einstellungen', { eigene_listen: neu }, 1);
  if (error) throw error;
  eigeneListen = neu;
}

/**
 * Einen eigenen Wert wieder entfernen.
 *
 * Das betrifft NUR den Vorrat. Biere, die den Wert tragen, behalten ihn —
 * dafür gibt es entferneFeldWert(), und das ist ein anderer Vorgang mit
 * anderen Folgen.
 */
export async function entferneListenwert(feld, wert) {
  const neu = {
    ...eigeneListen,
    [feld]: (eigeneListen[feld] || []).filter((x) => x !== wert),
  };
  const { error } = await supabaseDb.update('bierboerse_einstellungen', { eigene_listen: neu }, 1);
  if (error) throw error;
  eigeneListen = neu;
}

/** Die Felder, die sich als Liste pflegen lassen — Text in jeder Bierzeile. */
export const PFLEGE_FELDER = [
  { id: 'brauerei', label: 'Brauereien', einzahl: 'Brauerei' },
  { id: 'art', label: 'Sorten', einzahl: 'Sorte' },
  { id: 'land', label: 'Länder', einzahl: 'Land' },
];

/**
 * Welche Werte kommen wie oft vor?
 *
 * Die Zahl ist wichtig, bevor man etwas anfasst: „Augustiner (12 Biere)"
 * umzubenennen ist etwas anderes als „Augustiner Bräu (1 Bier)" — und meist
 * ist genau das der Tippfehler, den man zusammenführen will.
 */
export function feldWerte(katalog, feld) {
  const z = new Map();
  for (const b of katalog || []) {
    const w = b?.[feld];
    if (!w) continue;
    if (!z.has(w)) z.set(w, []);
    z.get(w).push(b);
  }
  return [...z.entries()]
    .map(([wert, biere]) => ({ wert, anzahl: biere.length, biere }))
    .sort((a, b) => b.anzahl - a.anzahl || String(a.wert).localeCompare(String(b.wert), 'de'));
}

/**
 * Einen Wert umbenennen — in ALLEN Bierzeilen, die ihn tragen.
 *
 * Ist der neue Name schon vergeben, ist das kein Fehler, sondern ein
 * ZUSAMMENFÜHREN: „Augustiner Bräu" auf „Augustiner" zu setzen ist genau der
 * Vorgang, der drei Schreibweisen auf eine bringt. Deshalb keine Warnung —
 * die Anzahl daneben sagt vorher, wie viele Biere betroffen sind.
 */
export async function benenneFeldUm(feld, alt, neu, katalog) {
  const sauber = String(neu || '').trim();
  if (!sauber) throw new Error('Der neue Name darf nicht leer sein.');
  if (sauber === alt) return { geaendert: 0 };

  const betroffen = (katalog || []).filter((b) => b?.[feld] === alt);
  let geaendert = 0;
  for (const b of betroffen) {
    const { error } = await supabaseDb.update('bier_katalog', { [feld]: sauber }, b.id);
    if (error) throw error;
    geaendert += 1;
  }
  return { geaendert };
}

/**
 * Einen Wert aus allen Bierzeilen entfernen.
 *
 * Das ist Datenverlust, kein Aufräumen: die Biere bleiben, nur ihre Brauerei
 * (oder Sorte, oder Land) ist danach leer. Der Aufrufer muss das so sagen und
 * nachfragen — hier wird nur ausgeführt.
 */
export async function entferneFeldWert(feld, wert, katalog) {
  const betroffen = (katalog || []).filter((b) => b?.[feld] === wert);
  let geleert = 0;
  for (const b of betroffen) {
    const { error } = await supabaseDb.update('bier_katalog', { [feld]: null }, b.id);
    if (error) throw error;
    geleert += 1;
  }
  return { geleert };
}

/** Ein Bier ändern — Name, Brauerei, Sorte, Land, Alkohol. */
export async function aendereBier(id, daten) {
  const sauber = {};
  for (const feld of ['name', 'brauerei', 'art', 'land']) {
    if (feld in daten) sauber[feld] = String(daten[feld] || '').trim() || null;
  }
  if ('alkohol' in daten) {
    const a = daten.alkohol;
    sauber.alkohol = a == null || a === '' ? null : Number(a);
  }
  if (!sauber.name && 'name' in sauber) throw new Error('Das Bier braucht einen Namen.');
  const { error } = await supabaseDb.update('bier_katalog', sauber, id);
  if (error) throw error;
}

/**
 * Ein Bier löschen — nur, wenn es nie getrunken wurde.
 *
 * bier_verkostungen.bier_id verweist mit `on delete restrict` auf den Katalog.
 * Ein Bier mit Verkostungen kann die Datenbank gar nicht löschen, und das ist
 * richtig: sonst verlöre eine Verkostung ihr Bier. Wir prüfen es vorher
 * selbst, damit statt einer Fremdschlüsselmeldung ein verständlicher Satz
 * herauskommt.
 */
export async function loescheBier(id, verkostungen) {
  const anzahl = (verkostungen || []).filter((v) => v.bier_id === id).length;
  if (anzahl > 0) {
    throw new Error(
      `Dieses Bier steht in ${anzahl} ${anzahl === 1 ? 'Verkostung' : 'Verkostungen'} — `
      + 'es lässt sich nicht löschen, ohne die Abende zu beschädigen.');
  }
  const { error } = await supabaseDb.delete('bier_katalog', id);
  if (error) throw error;
}

/* ==========================================================================
   DOPPELTE BIERE FINDEN UND ZUSAMMENFÜHREN
   ========================================================================== */

/**
 * Wie sehr gleichen sich zwei Namen? 0 = gar nicht, 1 = gleich.
 *
 * Levenshtein statt „fängt gleich an": „Augustiner Helles" und „Augustiner
 * Hell" unterscheiden sich am ENDE, „Paulaner" und „Paulander" in der Mitte.
 * Ein Präfixvergleich fände nur den ersten Fall.
 */
function aehnlichkeit(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  // Eine Zeile reicht: wir brauchen nur den Abstand, nicht den Weg dorthin.
  let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i];
    for (let j = 1; j <= b.length; j++) {
      jetzt[j] = Math.min(
        vorher[j] + 1,                                        // löschen
        jetzt[j - 1] + 1,                                     // einfügen
        vorher[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)       // ersetzen
      );
    }
    vorher = jetzt;
  }
  return 1 - vorher[b.length] / Math.max(a.length, b.length);
}

/** Für den Vergleich: Groß/klein, Umlaute, Satzzeichen und Leerraum egal. */
const vergleichsform = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]/g, '');

/**
 * Bierpaare, die vermutlich dasselbe Bier meinen.
 *
 * WARUM ES DIE DOPPEL ÜBERHAUPT GIBT
 * Bis heute legte das Formular ein zweites Bier gleichen Namens an, sobald
 * man an einer bestehenden Verkostung die Brauerei änderte — der Katalog
 * wurde über Name + Brauerei gesucht, und mit der neuen Brauerei griff der
 * Treffer nicht mehr. Das ist behoben; die bereits entstandenen Doppel räumt
 * diese Ansicht auf.
 *
 * VORSCHLAG, KEINE AUTOMATIK
 * „Augustiner Helles" und „Augustiner Edelstoff" sind ähnlich und trotzdem
 * verschiedene Biere. Zusammengeführt wird deshalb nur, was jemand bestätigt.
 *
 * ZUR SCHWELLE 0,82
 * An echten Biernamen durchgerechnet. Erkannt werden u. a. „Augustiner
 * Helles"/„Augustiner Hell" (0,875), „Tannenzäpfle"/„Tannenzaepfle" (1,0),
 * „Paulaner Salvator"/„Paulaner Salvador" (0,938). In Ruhe gelassen werden
 * „Augustiner Helles"/„Augustiner Dunkel" (0,688), „Weihenstephan
 * Hefe"/„Weihenstephan Kristall" (0,619), „Rothaus Pils"/„Rothaus Märzen"
 * (0,500). Zwischen dem höchsten Fehltreffer und dem niedrigsten echten
 * Treffer liegt Luft — die Schwelle steht nicht auf der Kippe.
 */
export function doppelteBiere(katalog, verkostungen = [], schwelle = 0.82) {
  const liste = katalog || [];
  const anzahlVon = (id) => verkostungen.filter((v) => v.bier_id === id).length;
  const paare = [];

  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j];
      const na = vergleichsform(a.name), nb = vergleichsform(b.name);
      if (!na || !nb) continue;

      const namensNaehe = aehnlichkeit(na, nb);
      if (namensNaehe < schwelle) continue;

      // Verschiedene Brauereien sind ein Gegenargument, aber keins, das
      // ausschliesst: genau das falsch eingetragene Brauereifeld hat die
      // Doppel ja erzeugt. Eine leere Brauerei sagt gar nichts.
      const ba = vergleichsform(a.brauerei), bb = vergleichsform(b.brauerei);
      const brauereiPasst = !ba || !bb || ba === bb;

      paare.push({
        a, b, naehe: namensNaehe, brauereiPasst,
        gleicherName: na === nb,
        anzahlA: anzahlVon(a.id), anzahlB: anzahlVon(b.id),
      });
    }
  }
  // Sicherste Treffer zuerst: gleicher Name und passende Brauerei.
  return paare.sort((x, y) =>
    (y.gleicherName - x.gleicherName) || (y.brauereiPasst - x.brauereiPasst) || (y.naehe - x.naehe));
}

/**
 * Zwei Biere zu einem machen.
 *
 * Reihenfolge ist wichtig: erst zeigen die Verkostungen auf das bleibende
 * Bier, DANN wird das andere gelöscht. Andersherum verweigert die Datenbank
 * das Löschen (`on delete restrict`) — oder schlimmer, die Verkostungen
 * hingen an einer verschwundenen Zeile.
 *
 * Leere Felder des bleibenden Biers werden aus dem aufgegebenen gefüllt:
 * wenn eins von beiden das Land kennt, soll es nicht verlorengehen.
 */
export async function fuehreBiereZusammen(behaltenId, aufgebenId, verkostungen = [], katalog = []) {
  if (behaltenId === aufgebenId) throw new Error('Das ist dasselbe Bier.');

  const behalten = katalog.find((b) => b.id === behaltenId);
  const aufgeben = katalog.find((b) => b.id === aufgebenId);
  if (!behalten || !aufgeben) throw new Error('Eines der beiden Biere gibt es nicht mehr.');

  const ergaenzung = {};
  for (const feld of ['brauerei', 'art', 'land', 'alkohol']) {
    if ((behalten[feld] == null || behalten[feld] === '') && aufgeben[feld] != null && aufgeben[feld] !== '') {
      ergaenzung[feld] = aufgeben[feld];
    }
  }
  if (Object.keys(ergaenzung).length) {
    const { error } = await supabaseDb.update('bier_katalog', ergaenzung, behaltenId);
    if (error) throw error;
  }

  const betroffen = (verkostungen || []).filter((v) => v.bier_id === aufgebenId);
  for (const v of betroffen) {
    const { error } = await supabaseDb.update('bier_verkostungen', { bier_id: behaltenId }, v.id);
    if (error) throw error;   // abbrechen statt halb umhängen
  }

  const { error } = await supabaseDb.delete('bier_katalog', aufgebenId);
  if (error) throw error;

  return { umgehaengt: betroffen.length, ergaenzt: Object.keys(ergaenzung) };
}

/**
 * Vollständige Übersicht über ein Listenfeld — Sorten, Länder, Brauereien.
 *
 * WARUM ES DAS ZUSÄTZLICH ZU sortenVorliebe/herkunftVerteilung GIBT
 * Jene beiden werten aus, was GETRUNKEN wurde: sie laufen über die
 * Verkostungen und kennen deshalb nur, was auch im Glas war. Wer in der
 * Verwaltung „Export" anlegt, sucht es danach in der Bilanz vergeblich — und
 * das sieht aus, als sei das Anlegen nicht angekommen.
 *
 * Diese Funktion kennt drei Quellen und hält sie auseinander:
 *   1. Werte aus Verkostungen  → mit Gläsern, Ausgaben, Schnitt
 *   2. Werte an Bieren im Katalog, die noch nie getrunken wurden
 *   3. Werte, die nur auf Vorrat angelegt sind (eigene_listen)
 *
 * Die Zahlen bleiben dabei ehrlich: ein nie getrunkener Wert bekommt keine
 * erfundene Null-Note, sondern `schnitt: null` und `getrunken: false`. Die
 * Anzeige kann das dann als „noch nicht getrunken" ausweisen, statt eine
 * Auswertung vorzutäuschen, die es nicht gibt.
 */
export function bestandNachFeld(feld, katalog, verkostungen, vorrat = []) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const nach = new Map();

  const eintrag = (wert) => {
    if (!nach.has(wert)) {
      nach.set(wert, { wert, biere: new Set(), glaeser: 0, ausgaben: 0, noten: [], verkostungen: 0 });
    }
    return nach.get(wert);
  };

  // 1. + Zahlen aus den Verkostungen
  for (const v of verkostungen || []) {
    const wert = bierVon.get(v.bier_id)?.[feld];
    if (!wert) continue;
    const e = eintrag(wert);
    e.biere.add(v.bier_id);
    e.verkostungen += 1;
    const glaeser = (v.anzahl_aek || 0) + (v.anzahl_real || 0);
    e.glaeser += glaeser;
    e.ausgaben += (Number(v.preis) || 0) * glaeser;
    const n = schnittNote(v);
    if (n != null) e.noten.push(n);
  }

  // 2. Biere im Katalog, die den Wert tragen — auch nie getrunkene. Sonst
  //    fehlte ein Bier, das jemand angelegt, aber noch nicht probiert hat.
  for (const b of katalog || []) {
    const wert = b?.[feld];
    if (!wert) continue;
    eintrag(wert).biere.add(b.id);
  }

  // 3. Reiner Vorrat: angelegt, aber noch an keinem Bier.
  for (const wert of vorrat || []) {
    if (wert) eintrag(wert);
  }

  return [...nach.values()]
    .map((e) => ({
      wert: e.wert,
      biere: e.biere.size,
      glaeser: e.glaeser,
      ausgaben: e.ausgaben,
      verkostungen: e.verkostungen,
      schnitt: e.noten.length ? mittel(e.noten) : null,
      bewertet: e.noten.length,
      getrunken: e.glaeser > 0,
    }))
    // Getrunkenes zuerst und darin nach Gläsern; der Rest alphabetisch
    // hinterher, damit die Liste nicht mit lauter Nullen anfängt.
    .sort((a, b) =>
      (b.getrunken - a.getrunken)
      || (b.glaeser - a.glaeser)
      || String(a.wert).localeCompare(String(b.wert), 'de'));
}

/**
 * Was dasselbe Bier über die Abende gekostet hat.
 *
 * NUR BIERE MIT MINDESTENS ZWEI PREISEN
 * Ein einzelner Preis ist keine Entwicklung. Und Verkostungen ohne Preis
 * fallen raus, statt als 0 € durchzugehen — ein nicht eingetragener Preis
 * ist kein geschenktes Bier.
 *
 * Sortiert wird nach Datum der Börse, nicht nach id: die Abende werden nicht
 * zwingend in der Reihenfolge eingetragen, in der sie stattgefunden haben.
 */
export function preisEntwicklungJeBier(verkostungen, boersen, katalog, mindestens = 2) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
  const boerseVon = new Map((boersen || []).map((b) => [b.id, b]));
  const proBier = new Map();

  for (const v of verkostungen || []) {
    const preis = Number(v.preis);
    if (!Number.isFinite(preis) || v.preis == null) continue;
    const bier = bierVon.get(v.bier_id);
    if (!bier) continue;
    const datum = boerseVon.get(v.boerse_id)?.datum || null;
    if (!proBier.has(v.bier_id)) proBier.set(v.bier_id, { bier, punkte: [] });
    proBier.get(v.bier_id).punkte.push({
      datum, preis, ml: v.groesse_ml || null,
      // Preis je 100 ml macht 0,33-l- und 0,5-l-Glaeser vergleichbar.
      je100: v.groesse_ml ? (preis / v.groesse_ml) * 100 : null,
    });
  }

  return [...proBier.values()]
    .map((e) => {
      const punkte = e.punkte.sort((a, b) => String(a.datum || '').localeCompare(String(b.datum || '')));
      const erst = punkte[0], letzt = punkte.at(-1);
      return {
        bier: e.bier,
        punkte,
        erster: erst.preis,
        letzter: letzt.preis,
        differenz: letzt.preis - erst.preis,
        guenstigster: Math.min(...punkte.map((p) => p.preis)),
        teuerster: Math.max(...punkte.map((p) => p.preis)),
      };
    })
    .filter((e) => e.punkte.length >= mindestens)
    // Die groesste Veraenderung zuerst — egal in welche Richtung.
    .sort((a, b) => Math.abs(b.differenz) - Math.abs(a.differenz));
}

/**
 * Trinkprofil je Person über alle Abende.
 *
 * Die Einzelwerte gibt es je Abend; was fehlte, war die Gesamtsicht — wer
 * trinkt mehr, wer teurer, wer stärker, wer bewertet strenger.
 *
 * WAS HIER BEWUSST NICHT PASSIERT
 * Die Ausgaben sind das, was die getrunkenen Gläser GEKOSTET haben, nicht
 * das, was jemand bezahlt hat. Wer zahlt, steht in `bezahlt_von` und ist
 * eine andere Frage (die Abrechnung). Beides zu vermischen ergäbe eine Zahl,
 * die keine von beiden ist.
 */
export function trinkprofil(verkostungen, katalog) {
  const bierVon = new Map((katalog || []).map((b) => [b.id, b]));

  return PERSONEN.map((p) => {
    const feld = p.key === 'aek' ? 'anzahl_aek' : 'anzahl_real';
    const noteFeld = p.key === 'aek' ? 'note_aek' : 'note_real';
    let glaeser = 0, ml = 0, ausgaben = 0, alkoholMl = 0;
    const noten = [];
    const biere = new Set();
    const sorten = new Map();

    for (const v of verkostungen || []) {
      const n = Number(v[feld]) || 0;
      if (n > 0) {
        const bier = bierVon.get(v.bier_id);
        glaeser += n;
        ml += (v.groesse_ml || 0) * n;
        ausgaben += (Number(v.preis) || 0) * n;
        alkoholMl += (v.groesse_ml || 0) * n * ((Number(bier?.alkohol) || 0) / 100);
        biere.add(v.bier_id);
        if (bier?.art) sorten.set(bier.art, (sorten.get(bier.art) || 0) + n);
      }
      // Bewertet werden kann auch ohne eigenes Glas — der Schluck vom anderen.
      const note = v[noteFeld];
      if (note != null) noten.push(Number(note));
    }

    const liebling = [...sorten.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    return {
      ...p,
      glaeser,
      liter: ml / 1000,
      ausgaben,
      biere: biere.size,
      proGlas: glaeser ? ausgaben / glaeser : null,
      // Durchschnittlicher Alkoholgehalt des Getrunkenen, nach Menge gewichtet:
      // ein Doppelbock, von dem nur genippt wurde, soll den Schnitt nicht so
      // heben wie drei Glaeser davon.
      staerke: ml ? (alkoholMl / ml) * 100 : null,
      standardglaeser: alkoholMl * 0.789 / 12,
      schnitt: noten.length ? mittel(noten) : null,
      bewertet: noten.length,
      lieblingssorte: liebling ? { art: liebling[0], glaeser: liebling[1] } : null,
    };
  });
}
