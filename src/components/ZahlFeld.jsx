/**
 * Zahleneingabe, die ein Komma annimmt.
 *
 * <input type="number"> verwirft "4,50" kommentarlos: der Browser gibt einen
 * LEEREN Wert zurück, ohne dass das Feld rot wird oder sonst etwas passiert.
 * Wer einen Betrag mit Komma eintippt — also hier jeder — hat danach
 * stillschweigend nichts gespeichert. Deshalb ein Textfeld mit
 * Ziffern-Tastatur, das selbst filtert; in eine echte Zahl umgewandelt wird
 * erst beim Speichern, über zahl().
 *
 * `wert` ist immer ein String (das, was dasteht), nicht die Zahl. Erst
 * dadurch überlebt ein halb getipptes "4," den nächsten Tastendruck.
 *
 * `ganzzahl`    nur Ziffern (Stückzahlen, ganze Euro)
 * `vorzeichen`  führendes Minus erlaubt — für Beträge, die auch Ausgaben
 *               sein können. Standardmäßig aus, damit ein Preis oder eine
 *               Menge nicht versehentlich negativ wird.
 *
 * Für ein Feld mit Vorzeichen gehört auf dem Handy `inputMode="text"`
 * mitgegeben: der Ziffernblock von "numeric"/"decimal" hat keine Minustaste.
 */
export default function ZahlFeld({ wert, onChange, ganzzahl = false, vorzeichen = false, ...rest }) {
  const filtern = (roh) => {
    const negativ = vorzeichen && roh.trimStart().startsWith('-');
    let s = roh.replace(ganzzahl ? /[^\d]/g : /[^\d.,]/g, '');
    if (!ganzzahl) {
      // Höchstens ein Trennzeichen, sonst entsteht "4,5,0".
      const i = s.search(/[.,]/);
      if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, '');
    }
    // Das Minus wird vorne wieder angesetzt, nicht durchgereicht: sonst
    // liesse sich "1-2" tippen. Ein einzelnes "-" bleibt stehen, sonst
    // koennte man es gar nicht erst eingeben.
    return negativ ? `-${s}` : s;
  };
  return (
    <input
      type="text"
      inputMode={ganzzahl ? 'numeric' : 'decimal'}
      value={wert}
      onChange={(e) => onChange(filtern(e.target.value))}
      {...rest}
    />
  );
}
