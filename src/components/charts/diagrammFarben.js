/**
 * Diagrammfarben aus den Design-Tokens statt fest verdrahtet.
 *
 * Die vier D3-Diagramme trugen ihre Farben als Hex-Werte im Code: Achsen in
 * #9ca3af, Beschriftungen in #374151, Punktränder in 'white'. Im Dunkelmodus
 * hieß das dunkelgrauer Text auf dunkler Karte — die Mittelzahl des
 * Kreisdiagramms, seine Legende und die Balkenbeschriftungen waren praktisch
 * unsichtbar.
 *
 * D3 schreibt die Farbe direkt ins Attribut, kann also keine CSS-Klasse
 * erben; deshalb werden die Variablen hier ausgelesen. Bei jedem Zeichnen neu,
 * damit ein Themenwechsel ankommt.
 */
function token(name, ersatz) {
  if (typeof document === 'undefined') return ersatz;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ersatz;
}

/** Farbe der Karte, auf der das Diagramm liegt — für Ränder, die ausstanzen. */
export const flaechenfarbe = () => token('--bg-secondary', '#ffffff');

/** Kräftiger Text: Mittelzahlen, Legenden, Balkenwerte. */
export const schriftfarbe = () => token('--text-primary', '#374151');

/** Zurückhaltender Text: Achsen und Hilfsbeschriftungen. */
export const achsenfarbe = () => token('--text-tertiary', '#9ca3af');
