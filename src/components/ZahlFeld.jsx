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
 */
export default function ZahlFeld({ wert, onChange, ganzzahl = false, ...rest }) {
  const filtern = (roh) => {
    let s = roh.replace(ganzzahl ? /[^\d]/g : /[^\d.,]/g, '');
    if (!ganzzahl) {
      // Höchstens ein Trennzeichen, sonst entsteht "4,5,0".
      const i = s.search(/[.,]/);
      if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, '');
    }
    return s;
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
