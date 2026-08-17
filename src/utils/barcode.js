import { supabaseDb } from './supabase';

/**
 * Bier über den Strichcode finden.
 *
 * WARUM BARCODE UND NICHT DAS ETIKETT LESEN
 * Ein EAN-Code ist zum Maschinenlesen gemacht. Bieretiketten sind der
 * schlechteste Fall für Texterkennung: Frakturschrift, Bögen, Prägungen,
 * Goldfolie. Der Strichcode trifft oder trifft nicht — er rät nicht.
 *
 * ZWEI QUELLEN, IN DIESER REIHENFOLGE
 *   1. Der eigene Katalog. Wer eine Flasche zum zweiten Mal scannt, soll
 *      SEINE Angaben zurückbekommen — samt der Sorte, die er selbst
 *      eingetragen hat — und nicht die einer fremden Datenbank.
 *   2. Open Food Facts. Frei, ohne Schlüssel, mit CORS.
 *
 * WAS DABEI NACH DRAUSSEN GEHT
 * Nur die Ziffernfolge des Strichcodes. Kein Foto, kein Standort, nichts
 * über die Person. Trotzdem ist es eine Anfrage an einen fremden Server —
 * deshalb passiert sie erst nach dem bewussten Antippen des Scanners und
 * nicht im Hintergrund.
 */

const OFF = 'https://world.openfoodfacts.org/api/v2/product';

/** Nur Ziffern, und eine plausible Länge. Sonst gar nicht erst fragen. */
export const istEan = (code) => /^\d{8}$|^\d{12,14}$/.test(String(code || '').trim());

/**
 * Aus einem OFF-Datensatz die Felder machen, die das Formular kennt.
 *
 * Jedes Feld darf fehlen. Ein leeres Feld ist besser als ein geratenes:
 * lieber tippt jemand die Sorte selbst, als dass „Bier" darin steht.
 */
function ausOff(p) {
  if (!p) return null;

  const text = (x) => {
    const s = String(x || '').trim();
    return s && s.toLowerCase() !== 'unknown' ? s : null;
  };

  // Die Marke ist bei Bier fast immer die Brauerei. Mehrere durch Komma
  // getrennte Marken: die erste nehmen, der Rest sind meist Konzernnamen.
  const brauerei = text(String(p.brands || '').split(',')[0]);

  // Alkohol steht in den Nährwerten, nicht am Produkt.
  const alkoholRoh = p.nutriments?.alcohol_value ?? p.nutriments?.alcohol_100g ?? null;
  const alkohol = Number.isFinite(Number(alkoholRoh)) && Number(alkoholRoh) > 0
    ? Number(alkoholRoh) : null;

  // DAS LAND KOMMT BEWUSST NICHT AUS DEN DATEN.
  // Naheliegend waere `countries_tags`. Das Feld nennt aber die Laender, in
  // denen das Produkt VERKAUFT wird, nicht seine Herkunft. Nachgeprueft an
  // echten Datensaetzen:
  //   Beck's (Bremen)      -> ['en:belgium', 'en:france']
  //   Augustiner (Muenchen) -> ['en:germany', 'en:italy']
  // Beim ersten waere "Belgien" ins Feld gelaufen, beim zweiten haette nur
  // die Reihenfolge gerettet. Eine Angabe, die in der Haelfte der Faelle
  // falsch ist, ist schlechter als keine — das Feld bleibt leer.
  const land = null;

  // Menge: „500 ml" oder „0,5 l" — beides kommt vor.
  let ml = null;
  const menge = String(p.quantity || '').toLowerCase().replace(',', '.');
  const mlTreffer = menge.match(/([\d.]+)\s*(ml|cl|l)\b/);
  if (mlTreffer) {
    const n = parseFloat(mlTreffer[1]);
    if (Number.isFinite(n)) {
      ml = mlTreffer[2] === 'l' ? Math.round(n * 1000)
        : mlTreffer[2] === 'cl' ? Math.round(n * 10) : Math.round(n);
    }
  }

  const name = text(p.product_name_de) || text(p.product_name) || null;
  if (!name && !brauerei) return null;   // Ein Treffer ohne beides ist keiner

  // Die SORTE bewusst nicht raten. OFF hat dafür keine verlässliche Angabe;
  // Kategorien wie „Beverages, Alcoholic beverages, Beers" sagen nichts über
  // Helles gegen Pils. Das Feld bleibt leer und wird selbst gewählt.
  return { name, brauerei, alkohol, land, ml, art: null };
}

/**
 * Den Strichcode auflösen.
 *
 * Gibt `{ quelle, treffer, bier }` zurück. `quelle` ist 'katalog' oder
 * 'off' — die Anzeige soll sagen dürfen, woher die Angaben stammen, damit
 * niemand fremde Daten für die eigenen hält.
 */
export async function sucheBarcode(code, katalog = []) {
  const ean = String(code || '').trim();
  if (!istEan(ean)) return { quelle: null, treffer: false, bier: null };

  // 1. Eigener Katalog
  const eigenes = (katalog || []).find((b) => String(b.ean || '') === ean);
  if (eigenes) {
    return {
      quelle: 'katalog', treffer: true,
      bier: { name: eigenes.name, brauerei: eigenes.brauerei, art: eigenes.art,
              alkohol: eigenes.alkohol, land: eigenes.land, ml: null, id: eigenes.id },
    };
  }

  // 2. Open Food Facts
  try {
    const felder = 'product_name,product_name_de,brands,countries_tags,quantity,nutriments';
    const antwort = await fetch(`${OFF}/${encodeURIComponent(ean)}.json?fields=${felder}`, {
      headers: { Accept: 'application/json' },
    });
    if (!antwort.ok) return { quelle: 'off', treffer: false, bier: null };
    const daten = await antwort.json();
    if (daten?.status !== 1) return { quelle: 'off', treffer: false, bier: null };
    const bier = ausOff(daten.product);
    return { quelle: 'off', treffer: !!bier, bier };
  } catch {
    // Kein Netz, gesperrt, Zeitüberschreitung — alles derselbe Ausgang für
    // den Benutzer: es geht gerade nicht, tipp es ein.
    return { quelle: 'off', treffer: false, bier: null, fehler: true };
  }
}

/**
 * Den Strichcode am Bier merken.
 *
 * Damit findet der zweite Scan derselben Flasche das Bier im eigenen
 * Katalog — ohne Netz und mit den selbst gepflegten Angaben.
 *
 * Scheitert still, wenn die Spalte fehlt (db/30 nicht eingespielt): das
 * Eintragen des Biers soll nicht daran hängen, dass eine Bequemlichkeit
 * nicht verfügbar ist.
 */
export async function merkeBarcode(bierId, ean) {
  if (!bierId || !istEan(ean)) return false;
  try {
    const { error } = await supabaseDb.update('bier_katalog', { ean: String(ean).trim() }, bierId);
    return !error;
  } catch {
    return false;
  }
}
