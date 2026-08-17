import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import Icon from '../../icons/Icon';

/**
 * Strichcode scannen.
 *
 * NUR DIE FORMATE, DIE AUF FLASCHEN STEHEN
 * EAN-13, EAN-8, UPC-A, UPC-E. Alle Formate zu erlauben macht die Erkennung
 * langsamer und die Fehltreffer häufiger — ein QR-Code auf dem Bierdeckel
 * soll hier nichts auslösen.
 *
 * DIE RÜCKKAMERA, WENN ES SIE GIBT
 * `facingMode: environment` als Wunsch, nicht als Bedingung: am Rechner gibt
 * es nur die Frontkamera, und ein harter Filter liefert dort gar kein Bild.
 *
 * AUFRÄUMEN IST HIER KEIN DETAIL
 * Ein nicht gestoppter Kamerastrom lässt die Leuchte an und zieht Akku, auch
 * wenn das Fenster längst zu ist. Deshalb wird in JEDEM Ausgang gestoppt —
 * beim Treffer, beim Abbrechen und beim Abräumen der Komponente.
 */
export default function BarcodeScanner({ onCode, onSchliessen }) {
  const videoRef = useRef(null);
  const steuerungRef = useRef(null);
  const [fehler, setFehler] = useState(null);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    let abgeraeumt = false;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    ]);
    const leser = new BrowserMultiFormatReader(hints);

    (async () => {
      try {
        const steuerung = await leser.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (ergebnis) => {
            if (!ergebnis || abgeraeumt) return;
            abgeraeumt = true;
            steuerung?.stop();
            // Kurzes Rütteln als Rückmeldung: man schaut auf die Flasche,
            // nicht auf den Bildschirm.
            navigator.vibrate?.(60);
            onCode(ergebnis.getText());
          }
        );
        steuerungRef.current = steuerung;
        if (abgeraeumt) steuerung.stop();
        else setLaeuft(true);
      } catch (e) {
        // Die häufigsten Fälle beim Namen nennen, statt "Fehler" zu zeigen.
        const name = e?.name || '';
        setFehler(
          name === 'NotAllowedError'
            ? 'Die Kamera ist nicht freigegeben. In den Browsereinstellungen erlauben und erneut versuchen.'
            : name === 'NotFoundError'
              ? 'Es ist keine Kamera gefunden worden.'
              : 'Die Kamera lässt sich gerade nicht öffnen.'
        );
      }
    })();

    return () => {
      abgeraeumt = true;
      try { steuerungRef.current?.stop(); } catch { /* schon gestoppt */ }
    };
  }, [onCode]);

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black flex flex-col"
         role="dialog" aria-modal="true" aria-label="Strichcode scannen">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-black/80">
        <h3 className="text-white font-semibold flex-1">Strichcode scannen</h3>
        <button onClick={onSchliessen} aria-label="Schließen"
                className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center">
          <Icon name="x" size={17} strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

        {/* Zielrahmen. Er tut nichts ausser zeigen, wohin man halten soll —
            gelesen wird das ganze Bild. */}
        {laeuft && !fehler && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4/5 max-w-xs h-28 rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {fehler && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/80">
            <p className="text-white text-center">{fehler}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/80">
        <p className="text-white/70 text-caption1 text-center">
          {fehler
            ? 'Das Bier lässt sich weiterhin von Hand eintragen.'
            : 'Den Strichcode der Flasche in den Rahmen halten.'}
        </p>
      </div>
    </div>,
    document.body
  );
}
