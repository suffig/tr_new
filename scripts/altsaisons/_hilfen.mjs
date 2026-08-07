/**
 * Lesehilfen fuer die handgetippten Altsaison-Dateien.
 *
 * Jede Datei ist anders aufgebaut — mal mit Ueberschriften ("Torschützen",
 * "SdS", "Sperren"), mal ohne (FIFA 24), und die Ergebnisse stehen mal als
 * "2:3 (…)", mal als "A 2:3 P (…)", mal als "17) Keine Karten (2:3)".
 * Deshalb bringt jede Saisondatei ihr eigenes zerlege() mit und benutzt
 * diese Bausteine.
 */

/** Zeilen zwischen zwei Ueberschriften (beide exklusive). */
export function abschnitt(text, von, bis) {
  const zeilen = String(text).split('\n');
  const raus = [];
  let an = false;
  for (const roh of zeilen) {
    const z = roh.trim();
    if (!an) { if (new RegExp(`^${von}`, 'i').test(z)) an = true; continue; }
    if (bis && new RegExp(`^${bis}`, 'i').test(z)) break;
    if (z) raus.push(z);
  }
  return raus;
}

/**
 * "Depay 145" / "Ndyia 28+1" / "Silva 4,8" / "Neuer 45M x"
 *   -> "Depay 145" | "Ndyia 29" | "Silva 4.8" | "Neuer 45"
 *
 * Das Komma muss mit: die Kaderwerte sind in Mio mit deutschem Dezimalkomma
 * notiert, und ohne das fielen bei FIFA 21 neun von achtzehn Spielern raus.
 */
export function zahlenListe(zeilen, ausnehmen = []) {
  const weg = new Set(ausnehmen.map((s) => s.toLowerCase()));
  const raus = [];
  for (const z of zeilen) {
    const m = z.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s*\+\s*(\d+))?\s*[Mm]?\s*x?\s*$/i);
    if (!m) continue;
    const name = m[1].trim();
    if (weg.has(name.toLowerCase())) continue;
    const wert = Number(m[2].replace(',', '.')) + (m[3] ? Number(m[3]) : 0);
    raus.push(`${name} ${wert}`);
  }
  return raus.join('|');
}

/** Sperrzeilen "Pepe 6 (xxxxxx)" durchreichen, alles andere verwerfen. */
export function sperrListe(zeilen) {
  return zeilen.filter((z) => /^.+\s+\d+\s*\(\s*[xX0oO]*\s*\)\s*$/.test(z)).join('\n');
}

/**
 * Bilanz aus den Ergebniszeilen — OHNE die Einzelspiele zu importieren.
 *
 * Genau das ist der Punkt: die Ergebnisse sind ueberliefert, die DATEN dazu
 * nicht. Statt Daten zu erfinden, wird hier nur gezaehlt, was zaehlbar ist.
 *
 * @param {string[]} zeilen  Kandidatenzeilen
 * @param {RegExp} muster    muss zwei Zahlengruppen liefern (Heim, Gast)
 */
export function bilanzAusErgebnissen(zeilen, muster) {
  let spiele = 0, siegeA = 0, siegeB = 0, unentschieden = 0, toreA = 0, toreB = 0;
  const abende = [];
  let laufend = 0;
  for (const z of zeilen) {
    if (/^[-—_]{2,}$/.test(z.trim())) {
      if (laufend) { abende.push(laufend); laufend = 0; }
      continue;
    }
    const m = z.match(muster);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    spiele++; laufend++;
    toreA += a; toreB += b;
    if (a > b) siegeA++; else if (b > a) siegeB++; else unentschieden++;
  }
  if (laufend) abende.push(laufend);
  return { spiele, siegeA, siegeB, unentschieden, toreA, toreB, abende: abende.length };
}

/** Bilanz in die Form bringen, die legacySaison.js erwartet. */
export function alsBilanz(b) {
  return {
    spiele: b.spiele,
    unentschieden: b.unentschieden,
    abende: b.abende,
    AEK: { siege: b.siegeA, tore: b.toreA },
    Real: { siege: b.siegeB, tore: b.toreB },
  };
}
