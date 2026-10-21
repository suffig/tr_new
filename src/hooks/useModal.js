import { useEffect, useRef } from 'react';

/**
 * Das Verhalten, das jedes Modal haben muss: Escape schliesst, und der
 * Hintergrund scrollt nicht mit.
 *
 * WARUM ALS HOOK
 * Dasselbe useEffect stand kopiert in SpielerVerlauf, HallOfFame,
 * BierboerseTab und GlobalSearch — und fehlte in sieben weiteren Modals
 * (LiveMatchModal, AddBanTab, AddMatchTab, AddPlayerTab, AddTransactionTab,
 * DataExportImportTab, VersionTeamSettingsTab). Dort tat Escape nichts, und
 * auf dem Telefon lief der Hintergrund weiter: man scrollt im Formular, ist
 * unten angekommen, und ab da wandert die Seite dahinter.
 *
 * WARUM EIN ZAEHLER UND NICHT NUR SPEICHERN/ZURUECKLEGEN
 * Die Kopien machten `vorher = body.style.overflow`, setzten 'hidden' und
 * legten beim Aufraeumen `vorher` zurueck. Das geht gut, solange Modals in
 * umgekehrter Reihenfolge schliessen. Tun sie es nicht — das aeussere zuerst,
 * weil ein Klick beide Zustaende aendert — legt das aeussere '' zurueck,
 * waehrend das innere noch offen ist, und der Hintergrund scrollt wieder.
 *
 * Der Zaehler laeuft ueber das Modul, nicht ueber den Zustand einer
 * Komponente: er muss ueber alle Modals hinweg derselbe sein.
 *
 * WARUM DIE RUECKRUF-FUNKTION IN EINER REF STECKT
 * Die Aufrufer uebergeben fast immer einen inline geschriebenen Pfeil. Haengt
 * der Effekt an dieser Funktion, laeuft er bei JEDEM Rendern neu: Aufraeumen,
 * neu aufsetzen, Zaehler runter und wieder hoch. Das korrigiert sich hier
 * zwar selbst, weil das Aufraeumen den alten Wert zurueckgelegt hat, bevor
 * der Effekt ihn neu liest — aber darauf will ich mich nicht verlassen. Mit
 * der Ref laeuft der Effekt genau einmal und ruft trotzdem immer die
 * aktuelle Funktion.
 *
 * WARUM ES EINEN SCHALTER GIBT
 * Die meisten Modals stehen als `{offen && <div>...}` in der Komponente, die
 * sie aufruft. Ein Hook darf nicht bedingt aufgerufen werden, deshalb nimmt er
 * `aktiv` entgegen und tut nichts, solange das Modal geschlossen ist. Ein
 * Wrapper nur fuer den Hook waere die Alternative gewesen — mehr Dateien fuer
 * dieselbe Sache.
 *
 * WAS ER NICHT LEISTET
 * `overflow: hidden` auf <body> haelt Safari auf dem iPhone nicht in jedem
 * Fall. Der zuverlaessige Weg waere `position: fixed` plus das Merken der
 * Scroll-Position, was beim Schliessen sichtbar springt, wenn man es nur
 * halb richtig macht. Hier bleibt es bei dem, was die App schon tat — die
 * Modals sind kuerzer als der Bildschirm oder haben einen eigenen
 * Scroll-Bereich.
 */

let offen = 0;
let vorher = '';

export default function useModal(onSchliessen, aktiv = true) {
  const schliessen = useRef(onSchliessen);
  schliessen.current = onSchliessen;

  useEffect(() => {
    if (!aktiv) return undefined;

    const esc = (e) => { if (e.key === 'Escape') schliessen.current?.(); };
    document.addEventListener('keydown', esc);

    if (offen === 0) vorher = document.body.style.overflow;
    offen += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', esc);
      offen = Math.max(0, offen - 1);
      if (offen === 0) document.body.style.overflow = vorher;
    };
  }, [aktiv]);
}
