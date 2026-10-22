import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../icons/Icon';

/**
 * Sprungleiste für das Spielformular.
 *
 * WARUM
 * Das Formular ist eine lange Liste: Datum, Torwertung mit beiden
 * Torschützenlisten, vier Kartenzähler, Spieler des Spiels samt Teamfilter,
 * Preisgelder. Auf dem Telefon sind das mehrere Bildschirmhöhen, und wer nur
 * eine gelbe Karte nachtragen will, scrollt suchend durch alles davor.
 *
 * Die Leiste springt direkt in einen Abschnitt und zeigt gleichzeitig, wo man
 * gerade ist. Das Zeigen ist nicht Zierde: eine Sprungleiste, die beim
 * Scrollen nicht mitwandert, lässt einen genauso ratlos wie keine.
 *
 * SIE BRICHT UM, SIE SCROLLT NICHT
 * In `HorizontalNavigation` wurde der seitlich scrollende Streifen bewusst
 * abgeschafft: ein abgeschnittener Eintrag sieht nicht nach „hier kann man
 * wischen" aus, sondern nach einem Anzeigefehler, und auf einem Telefon
 * findet man ihn schlicht nicht. Dieselbe Entscheidung gilt hier.
 *
 * WARUM NICHT scrollIntoView
 * Der Kopf des Dialogs ist `sticky top-0`. `scrollIntoView` setzt den
 * Abschnitt an den oberen Rand des Scroll-Bereichs — also UNTER den Kopf,
 * die Überschrift ist dann verdeckt. Deshalb von Hand gerechnet: Abstand des
 * Abschnitts zum Container plus aktueller scrollTop, minus Kopfhöhe.
 *
 * WARUM DIE UNTERKANTE DES KOPFES GEMESSEN WIRD UND NICHT SEINE HÖHE
 * Erster Versuch war `scrollTop - kopfHöhe - 8`. Gemessen im Browser landete
 * jeder Abschnitt dann 8 px UNTER dem Kopf, also verdeckt. Der Grund: der
 * Scroll-Bereich hat `p-4`, der klebende Kopf beginnt also 16 px unterhalb
 * seiner Oberkante — seine Unterkante liegt bei 16 + Höhe, nicht bei Höhe.
 *
 * Statt 16 dazuzurechnen (was beim nächsten Abstandswechsel wieder falsch
 * wäre) wird die Unterkante direkt gemessen, relativ zum Container. Das
 * stimmt unabhängig von Innenabständen, und es stimmt auch bei großer
 * Systemschrift, wenn der Kopf umbricht und höher wird.
 */

// KEIN EINTRAG FÜR DIE PREISGELDER.
// Der stand hier („Geld"), führt aber an eine Stelle, an der es nichts zu tun
// gibt: die Beträge werden aus Ergebnis und Karten gerechnet und nicht
// eingegeben — dort steht bewusst kein Eingabefeld. Ein Sprungziel ist für
// Stellen da, an denen man etwas einträgt.
//
// Der Abschnitt bleibt im Formular und wird beim Scrollen gelesen; nur
// angesprungen wird er nicht mehr.
const ABSCHNITTE = [
  { id: 'datum', label: 'Datum', icon: 'calendar' },
  { id: 'tore', label: 'Tore', icon: 'football' },
  { id: 'karten', label: 'Karten', icon: 'ban' },
  { id: 'sds', label: 'Spieler', icon: 'star' },
];

export default function FormularSprungleiste({ containerRef, kopfRef }) {
  const [aktiv, setAktiv] = useState(ABSCHNITTE[0].id);
  const [vorhanden, setVorhanden] = useState([]);
  const zeitRef = useRef(0);

  // Nur Abschnitte anbieten, die im Formular wirklich stehen. Sonst führt ein
  // Knopf ins Leere, sobald ein Teil einmal ausgeblendet wird.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    setVorhanden(ABSCHNITTE.filter((a) => c.querySelector(`[data-abschnitt="${a.id}"]`)));
  }, [containerRef]);

  /** Unterkante des klebenden Kopfes, gemessen innerhalb des Scroll-Bereichs. */
  const kopfUnten = useCallback(() => {
    const c = containerRef.current;
    const k = kopfRef?.current;
    if (!c || !k) return 0;
    return k.getBoundingClientRect().bottom - c.getBoundingClientRect().top;
  }, [containerRef, kopfRef]);

  const springen = (id) => {
    const c = containerRef.current;
    const ziel = c?.querySelector(`[data-abschnitt="${id}"]`);
    if (!c || !ziel) return;
    const oben = ziel.getBoundingClientRect().top - c.getBoundingClientRect().top
      + c.scrollTop - kopfUnten() - 8;
    // Wer „Bewegung reduzieren" eingestellt hat, bekommt den Sprung ohne
    // Fahrt — ein langer sanfter Scroll ist genau die Bewegung, die damit
    // gemeint ist.
    const sanft = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    c.scrollTo({ top: Math.max(0, oben), behavior: sanft ? 'smooth' : 'auto' });
    setAktiv(id);
  };

  // Mitwandern beim Scrollen.
  //
  // Gedrosselt, nicht bei jedem Ereignis gerechnet: das Scroll-Ereignis feuert
  // sehr oft, und getBoundingClientRect erzwingt jedes Mal ein Nachrechnen des
  // Layouts.
  //
  // WARUM MIT setTimeout GEDROSSELT
  // Ein Einzelbild-Takt waere gleichwertig, laeuft aber nicht, wenn die Seite
  // im Hintergrund ist — und genau daran ist das Mitwandern beim Testen
  // gescheitert, ohne dass ein Fehler zu sehen war: der aktive Eintrag blieb
  // stehen, und es war nicht zu unterscheiden, ob die Rechnung falsch ist oder
  // nur kein Bild kommt. Eine Logik, die sich nicht pruefen laesst, ist
  // schlechter als eine, die 80 ms spaeter nachzieht.
  //
  // Die 80 ms sind der Nachlauf nach der letzten Bewegung. Fuer eine Anzeige
  // "hier bist du gerade" ist das nicht zu merken.
  useEffect(() => {
    const c = containerRef.current;
    if (!c || vorhanden.length === 0) return undefined;

    const messen = () => {
      zeitRef.current = 0;
      const grenze = c.getBoundingClientRect().top + kopfUnten() + 24;
      let jetzt = vorhanden[0].id;
      for (const a of vorhanden) {
        const el = c.querySelector(`[data-abschnitt="${a.id}"]`);
        if (el && el.getBoundingClientRect().top <= grenze) jetzt = a.id;
      }
      // Am unteren Ende immer der letzte Abschnitt. Sonst bleibt die Leiste
      // auf dem vorletzten stehen, weil der letzte nie über die Grenze kommt:
      // unter ihm ist kein Platz mehr, um ihn hochzuschieben.
      if (c.scrollTop + c.clientHeight >= c.scrollHeight - 4) {
        jetzt = vorhanden[vorhanden.length - 1].id;
      }
      setAktiv(jetzt);
    };

    const auf = () => { if (!zeitRef.current) zeitRef.current = setTimeout(messen, 80); };
    c.addEventListener('scroll', auf, { passive: true });
    messen();
    return () => {
      c.removeEventListener('scroll', auf);
      if (zeitRef.current) clearTimeout(zeitRef.current);
    };
  }, [containerRef, kopfUnten, vorhanden]);

  // Unter zwei Abschnitten gibt es nichts zu springen.
  if (vorhanden.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist"
         aria-label="Abschnitte des Formulars">
      {vorhanden.map((a) => {
        const an = aktiv === a.id;
        return (
          <button key={a.id} type="button" role="tab" aria-selected={an}
                  onClick={() => springen(a.id)}
                  className={`chip-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                    an ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
            <Icon name={a.icon} size={13} strokeWidth={2.2} />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
