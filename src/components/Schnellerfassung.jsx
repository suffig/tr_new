import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './icons/Icon';
import {
  ARTEN, erfasse, entferne, ladeLokal, logischesDatum, standFuer,
} from '../utils/abende';

/**
 * Sterne, Bier und Kurze eintragen — ohne die Seite zu verlassen.
 *
 * DAS PROBLEM
 * An einem Abend fällt beides gleichzeitig an: man trägt das Duell ein und
 * jemand trinkt einen Kurzen; man trägt ein Spiel ein und muss nebenbei einen
 * Schnaps vermerken. Bisher hieß das: Formular als Entwurf speichern, Bereich
 * wechseln, zählen, zurückwechseln, Entwurf wieder öffnen. Vier Schritte für
 * einen Strich.
 *
 * DIE LÖSUNG IST EINE EBENE, KEINE SEITE
 * Diese Erfassung liegt auf z-[120] und damit ÜBER allem, was die App sonst
 * öffnet (Modals liegen auf 60, 70, 100 und 110). Das Formular darunter bleibt
 * unberührt stehen — kein Entwurf, kein Bereichswechsel, nichts geht verloren.
 * Sie ist auch kein zweiter Zähler, sondern schreibt in dasselbe
 * Ereignisprotokoll wie der Alkohol-Bereich (`erfasse`): es gibt weiterhin
 * eine Wahrheit.
 *
 * WARUM SIE DEN HINTERGRUND NICHT SPERRT
 * Alle anderen Dialoge setzen über `useModal` `body { overflow: hidden }`.
 * Das tut diese hier bewusst NICHT: wenn sie über einem Formular aufgeht, hat
 * dieses die Sperre schon gesetzt, und sie beim Schließen wieder freizugeben
 * würde den Hintergrund des noch offenen Formulars scrollbar machen.
 *
 * WARUM MIT DATUM
 * Ein Abend läuft bis 6 Uhr morgens (`logischesDatum`), aber manchmal trägt
 * man Tage später nach. Die Auswahl oben entscheidet, in welchen Abend ein
 * Strich geht — ohne sie landete alles auf dem heutigen und wäre im Rückblick
 * am falschen Tag.
 *
 * WAS SIE NICHT KANN
 * Sperren. Eine Sperre braucht Spieler, Art und Spielzahl, also ein Formular
 * und keinen Zähler — das wäre hier ein Dialog im Dialog. Sie bleibt im
 * Verwaltungsbereich.
 */

const PERSONEN = [
  { id: 'alexander', name: 'Alexander', farbe: 'text-system-blue', flaeche: 'panel-blue' },
  { id: 'philip', name: 'Philip', farbe: 'text-system-red', flaeche: 'panel-red' },
];

/** Was sich zählen lässt. `art` muss in ARTEN stehen, sonst wirft `erfasse`. */
const ZEILEN = [
  { art: 'stern', label: 'Sterne', icon: 'starFilled', farbe: 'text-system-yellow' },
  { art: 'bier', label: 'Bier', icon: 'beer', farbe: 'text-system-orange' },
  { art: 'shot20', label: 'Kurzer 20 %', icon: 'glass', farbe: 'text-system-purple' },
  { art: 'shot40', label: 'Kurzer 40 %', icon: 'glass', farbe: 'text-system-purple' },
  { art: 'schnaps', label: 'Schnaps', icon: 'glass', farbe: 'text-system-teal' },
];

// Fällt beim Laden des Moduls auf, nicht erst beim Tippen auf einen Knopf.
ZEILEN.forEach((z) => {
  if (!ARTEN.includes(z.art)) {
    throw new Error(`Schnellerfassung: unbekannte Art "${z.art}" — erlaubt sind ${ARTEN.join(', ')}`);
  }
});

/** Die letzten sieben Abende zur Auswahl, der laufende zuerst. */
function letzteAbende() {
  // Mittags als Uhrzeit, damit die Sommerzeit-Umstellung den Tag nicht kippt.
  const d = new Date(`${logischesDatum()}T12:00:00`);
  const p = (n) => String(n).padStart(2, '0');
  const raus = [];
  for (let i = 0; i < 7; i++) {
    raus.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    d.setDate(d.getDate() - 1);
  }
  return raus;
}

const kurzesDatum = (iso) => {
  if (iso === logischesDatum()) return 'Heute';
  const [j, m, t] = iso.split('-');
  return `${t}.${m}.${j.slice(2)}`;
};

export default function Schnellerfassung() {
  const [offen, setOffen] = useState(false);
  const [datum, setDatum] = useState(logischesDatum);
  const [log, setLog] = useState([]);
  const [laeuft, setLaeuft] = useState(null);

  const auffrischen = useCallback(() => setLog(ladeLokal()), []);

  // Beim Öffnen frisch lesen: zwischenzeitlich kann der Alkohol-Bereich
  // gezählt haben. Ein gemerkter Stand wäre dann falsch.
  useEffect(() => { if (offen) auffrischen(); }, [offen, auffrischen]);

  // Von überall aufrufbar, ohne die Komponente durchzureichen — dasselbe
  // Muster wie die globale Suche ('global-search-toggle' in App.jsx).
  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener('schnellerfassung-oeffnen', auf);
    return () => window.removeEventListener('schnellerfassung-oeffnen', auf);
  }, []);

  useEffect(() => {
    if (!offen) return undefined;
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOffen(false); } };
    // In der Erfassungsphase (capture), damit ein darunterliegendes Formular
    // sein Escape nicht zuerst sieht und sich mitschließt.
    document.addEventListener('keydown', esc, true);
    return () => document.removeEventListener('keydown', esc, true);
  }, [offen]);

  const stand = standFuer(log, datum);

  const buchen = async (person, art, richtung) => {
    const schluessel = `${person}-${art}`;
    setLaeuft(schluessel);
    try {
      if (richtung > 0) {
        await erfasse({ person, art, datum });
      } else {
        // Den JÜNGSTEN passenden Strich zurücknehmen, nicht irgendeinen:
        // sonst verschwindet ein Eintrag von vor zwei Stunden und der
        // Fehlgriff von gerade bleibt stehen.
        const treffer = ladeLokal()
          .filter((e) => e.person === person && e.art === art && e.datum === datum)
          .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))[0];
        if (treffer) await entferne(treffer);
      }
    } finally {
      auffrischen();
      setLaeuft(null);
    }
  };

  return (
    <>
      {/* Der Knopf liegt LINKS unten. Rechts sitzen schon zwei feste Knöpfe
          (nach oben scrollen und der grüne). Über der unteren Leiste, damit er
          sie nicht verdeckt. */}
      {!offen && (
        <button type="button" onClick={() => setOffen(true)}
                aria-label="Schnell eintragen: Sterne, Bier, Kurze"
                className="fixed left-4 z-[120] w-12 h-12 rounded-full bg-bg-elevated shadow-ios-floating
                           border border-border-light text-system-purple
                           flex items-center justify-center active:scale-95 transition-transform"
                style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }}>
          <Icon name="glass" size={22} strokeWidth={2.2} />
        </button>
      )}

      {offen && createPortal((
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button type="button" aria-label="Schließen"
                  onClick={() => setOffen(false)}
                  className="absolute inset-0 modal-schleier" />

          <div className="relative w-full sm:max-w-md bg-bg-elevated rounded-t-3xl sm:rounded-3xl
                          shadow-ios-floating p-4 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="karten-titel">Schnell eintragen</h2>
              <button type="button" onClick={() => setOffen(false)} aria-label="Schließen"
                      className="btn-compact w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary
                                 flex items-center justify-center flex-shrink-0">
                <Icon name="x" size={16} strokeWidth={2.4} />
              </button>
            </div>

            {/* Für welchen Abend? Vorbelegt ist der laufende. */}
            <div className="flex items-center gap-2 mb-3">
              <Icon name="calendar" size={15} strokeWidth={2.2} className="text-text-tertiary flex-shrink-0" />
              <select value={datum} onChange={(e) => setDatum(e.target.value)}
                      aria-label="Abend wählen"
                      className="btn-compact bg-bg-tertiary rounded-lg px-2 py-1.5 text-footnote
                                 font-medium text-text-primary focus:outline-none">
                {letzteAbende().map((d) => (
                  <option key={d} value={d}>{kurzesDatum(d)}</option>
                ))}
              </select>
              {datum !== logischesDatum() && (
                <span className="text-caption2 text-system-orange">wird nachgetragen</span>
              )}
            </div>

            <div className="space-y-2">
              {ZEILEN.map((z) => (
                <div key={z.art} className="panel-gray rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon name={z.icon} size={14} strokeWidth={2.2} className={`${z.farbe} flex-shrink-0`} />
                    <span className="text-caption1 font-semibold text-text-secondary">{z.label}</span>
                  </div>
                  <div className="flex gap-2">
                    {PERSONEN.map((p) => {
                      const wert = stand[z.art]?.[p.id] ?? 0;
                      const beschaeftigt = laeuft === `${p.id}-${z.art}`;
                      return (
                        <div key={p.id} className={`${p.flaeche} rounded-lg px-2 py-1.5 flex-1 min-w-0
                                                    flex items-center gap-1.5`}>
                          <span className={`text-caption2 font-semibold truncate min-w-0 flex-1 ${p.farbe}`}>
                            {p.name}
                          </span>
                          <button type="button" aria-label={`${z.label} für ${p.name} eins weniger`}
                                  disabled={beschaeftigt || wert <= 0}
                                  onClick={() => buchen(p.id, z.art, -1)}
                                  className="btn-compact stepper-btn w-7 h-7 rounded-md bg-bg-elevated
                                             text-text-secondary font-semibold disabled:opacity-40 flex-shrink-0">
                            −
                          </button>
                          <span className="num-tabular text-callout font-bold text-text-primary w-5 text-center flex-shrink-0">
                            {wert}
                          </span>
                          <button type="button" aria-label={`${z.label} für ${p.name} eins mehr`}
                                  disabled={beschaeftigt}
                                  onClick={() => buchen(p.id, z.art, 1)}
                                  className="btn-compact stepper-btn w-7 h-7 rounded-md bg-bg-elevated
                                             text-text-primary font-semibold disabled:opacity-40 flex-shrink-0">
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-caption2 text-text-tertiary mt-3">
              Landet im selben Protokoll wie der Alkohol-Bereich. Ein Abend
              läuft bis 6 Uhr morgens.
            </p>
          </div>
        </div>
      ), document.body)}
    </>
  );
}
