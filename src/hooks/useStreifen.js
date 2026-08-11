import { useCallback, useRef, useState } from 'react';

/**
 * Ein Streifen, über den man streicht.
 *
 * Eine Saison hat bis zu 176 Spiele. Nebeneinander gezeichnet ist ein Spiel
 * knapp zwei Pixel breit — zum Antippen zu wenig, zum Erkennen genug. Also
 * wird nicht getippt, sondern gestrichen: der Finger fährt über den Streifen,
 * daneben steht, wo er gerade ist. Wer loslässt, ohne gezogen zu haben, meinte
 * einen Tipp.
 *
 * Steckt in einem Hook, weil inzwischen zwei Darstellungen so bedient werden
 * (Saisonverlauf über der Spieleliste, Vorsprung in der Statistik) und die
 * Bedienung sich zwischen beiden nicht unterscheiden darf.
 *
 * @param anzahl  Wie viele Schritte der Streifen hat.
 * @param onTipp  Bekommt den Index, auf den getippt wurde (nicht: gestrichen).
 */
export function useStreifen(anzahl, onTipp) {
  const ref = useRef(null);
  const gezogen = useRef(false);
  const [aktiv, setAktiv] = useState(null);

  const indexAus = useCallback((clientX) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0 || anzahl <= 0) return null;
    return Math.min(anzahl - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * anzahl)));
  }, [anzahl]);

  const zeigerProps = {
    ref,
    onPointerDown: (e) => {
      gezogen.current = false;
      // Zeiger festhalten, damit die Bewegung weiterkommt, wenn der Finger den
      // Streifen nach oben oder unten verlässt. Muss in ein try:
      // setPointerCapture wirft NotFoundError, sobald die Zeiger-ID nicht mehr
      // aktiv ist — und ein Wurf hier reisst die ganze App in die Fehlergrenze.
      // Das Festhalten ist eine Bequemlichkeit, kein Muss.
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* egal */ }
      setAktiv(indexAus(e.clientX));
    },
    onPointerMove: (e) => {
      if (!e.buttons && e.pointerType !== 'touch') return;
      gezogen.current = true;
      setAktiv(indexAus(e.clientX));
    },
    onPointerUp: (e) => {
      const i = indexAus(e.clientX);
      // Nur ein Tipp springt weiter. Ein Streichen darf es nicht, sonst landete
      // man nach jedem Erkunden ungewollt woanders.
      if (!gezogen.current && i != null) onTipp?.(i);
    },
    onPointerLeave: () => setAktiv(null),
  };

  return { aktiv, zeigerProps };
}
