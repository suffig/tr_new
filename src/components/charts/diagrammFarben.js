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

/**
 * Die beiden Seiten — dieselben Farben wie überall sonst in der App.
 *
 * Die Diagramme trugen ihr eigenes Blau (#3b82f6) und Rot (#ef4444), also
 * andere Töne als --system-blue (#0A6CFF hell, #3D9BFF dunkel) und
 * --system-red (#FF3B30). Wer vom Duell in die Diagramme wechselte, sah
 * dieselben zwei Seiten in leicht anderen Farben — und im Dunkelmodus blieben
 * die Diagramme beim hellen Blau, während der Rest der App aufhellte.
 */
export const aekFarbe = () => token('--system-blue', '#0A6CFF');
export const realFarbe = () => token('--system-red', '#FF3B30');
