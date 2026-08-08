/**
 * Zahlen, so wie sie hier getippt werden — mit Komma.
 *
 * Gehoert bewusst nicht in eine Komponente: dieselbe Umrechnung braucht
 * jedes Formular, das einen Betrag, einen Marktwert oder einen Preis
 * entgegennimmt.
 */

/**
 * Eingetippte Zahl in eine echte Zahl verwandeln.
 *
 * Number("4,50") ist NaN, deshalb muss das Komma vorher weg. Leer bleibt
 * leer (null), nicht 0: "kostenlos" und "nicht erfasst" sind zwei
 * verschiedene Aussagen, und als 0 gespeichert laesst sich die zweite
 * spaeter nicht mehr von der ersten unterscheiden.
 */
export function zahl(text) {
  if (text == null) return null;
  let s = String(text).trim().replace(/\s/g, '');
  if (s === '') return null;
  // "1.234,56": der Punkt ist dann Tausendertrenner und muss raus.
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Umgekehrt: eine gespeicherte Zahl so ins Feld schreiben, wie sie getippt wuerde. */
export function alsText(n) {
  return n == null || n === '' ? '' : String(n).replace('.', ',');
}
