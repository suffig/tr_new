import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from './icons/Icon';
import {
  ARTEN, erfasse, entferne, ladeLokal, logischesDatum, standFuer,
} from '../utils/abende';
import { beende, istAbgeschlossen, nurOffene, wiederOeffnen } from '../utils/abendAbschluss';
import { BAN_TYPES } from '../constants/banTypes';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { supabaseDb } from '../utils/supabase';
import { getTeamShort } from '../constants/teams';

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

/**
 * Was sich zählen lässt. `art` muss in ARTEN stehen, sonst wirft `erfasse`.
 *
 * NUR SCHNAPS.
 * Hier standen erst Sterne und Bier mit drin, dann noch „Kurzer 20 %" und
 * „Kurzer 40 %". Sterne stehen ohnehin im Duell, Bier wird in der Bierbörse
 * mit Sorte und Zahler erfasst — ein Strich hier wäre die unschärfere zweite
 * Quelle. Und die Unterscheidung nach Prozenten ist mitten im Spiel keine
 * Frage, die sich jemand stellt: es ist ein Kurzer. Wer sie braucht, hat sie
 * im Alkohol-Bereich.
 *
 * Eine Zeile statt fünf heißt auch: der Dialog ist kurz genug, um das
 * Formular darunter nicht zu verdecken.
 */
const ZEILEN = [
  { art: 'schnaps', label: 'Schnaps', icon: 'glass', farbe: 'text-system-teal' },
];

// Fällt beim Laden des Moduls auf, nicht erst beim Tippen auf einen Knopf.
ZEILEN.forEach((z) => {
  if (!ARTEN.includes(z.art)) {
    throw new Error(`Schnellerfassung: unbekannte Art "${z.art}" — erlaubt sind ${ARTEN.join(', ')}`);
  }
});

/**
 * Welche Abende zur Auswahl stehen.
 *
 * DIE ABENDE MIT EINTRÄGEN, NICHT DIE LETZTEN SIEBEN TAGE.
 * Hier stand eine Liste der letzten sieben Kalendertage. Damit war der
 * wichtigste Fall nicht erreichbar: liegt der letzte Spielabend länger
 * zurück — und das ist der Normalfall, es wird nicht jeden Tag gespielt —
 * tauchte er in der Auswahl gar nicht auf, und man konnte ihn nicht
 * abschließen. Genau das war gemeldet.
 *
 * Jetzt: der laufende Abend immer (dort trägt man gerade ein), dazu jeder
 * Abend, von dem noch Einträge offen sind. Absteigend, der jüngste zuerst.
 *
 * @param {Array} ereignisse Das Protokoll (voll, nicht gefiltert).
 * @returns {string[]} Datumswerte 'YYYY-MM-DD'.
 */
function waehlbareAbende(ereignisse) {
  const heute = logischesDatum();
  const mit = new Set([heute]);
  for (const e of nurOffene(ereignisse)) {
    if (e?.datum) mit.add(e.datum);
  }
  return [...mit].sort((a, b) => (a < b ? 1 : -1));
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

  // Sperren: Spieler nur laden, wenn die Erfassung offen ist — sonst zieht
  // jede Seite der App diese Abfrage mit, nur weil der Knopf unten links
  // existiert.
  const { data: spieler } = useSupabaseQuery('players', '*', {}, [offen]);
  const [sperreSpieler, setSperreSpieler] = useState('');
  const [sperreArt, setSperreArt] = useState(BAN_TYPES[0]?.value || '');
  const [sperreSpiele, setSperreSpiele] = useState(BAN_TYPES[0]?.duration ?? 1);
  const [sperreLaeuft, setSperreLaeuft] = useState(false);

  // Beenden: Nachfrage statt Sofortwirkung, siehe Kommentar am Knopf.
  const [beendenGefragt, setBeendenGefragt] = useState(false);
  const [abgeschlossen, setAbgeschlossen] = useState(false);

  const auffrischen = useCallback(() => setLog(ladeLokal()), []);

  // Beim Öffnen frisch lesen: zwischenzeitlich kann der Alkohol-Bereich
  // gezählt haben. Ein gemerkter Stand wäre dann falsch.
  useEffect(() => { if (offen) auffrischen(); }, [offen, auffrischen]);

  // Ob der gewählte Abend schon abgeschlossen ist, hängt am Datum — und das
  // kann man hier umstellen. Deshalb bei jedem Wechsel neu nachsehen.
  useEffect(() => {
    setAbgeschlossen(istAbgeschlossen(datum));
    setBeendenGefragt(false);
  }, [datum, offen]);

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
  // Für die Nachfrage beim Beenden: gab es an diesem Abend überhaupt etwas?
  //
  // Schnaps UND Sterne, weil der Abschluss beide Zähler zurücksetzt. Nur den
  // Schnaps zu nennen hieße, etwas bestätigen zu lassen, das nicht dasteht.
  // `stand.sterne`, NICHT `stand.stern`: die Ereignis-Art heisst 'stern',
  // standFuer legt sie aber unter `sterne` ab. Mit dem Singular stand hier
  // `undefined`, und die Sterne fehlten in der Zusammenfassung — also genau
  // in der Nachfrage, die sie mit zurueckzusetzen verspricht.
  const gesamtAmAbend = (stand.schnaps?.gesamt || 0) + (stand.sterne?.gesamt || 0);

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

  /**
   * Eine Sperre eintragen.
   *
   * Dieselben Felder, die AddBanTab schreibt — player_id, team, type,
   * totalgames, matchesserved, reason. `team` kommt vom Spieler und nicht aus
   * einer eigenen Auswahl: der Spieler steht in genau einem Kader, eine
   * zweite Angabe wäre eine zweite Wahrheit.
   *
   * `matchesserved: 0`, weil eine frisch eingetragene Sperre noch nicht
   * abgesessen ist. Das ist der Wert, an dem die App „gesperrt" erkennt
   * (totalgames > matchesserved).
   */
  const sperreEintragen = async () => {
    const p = (spieler || []).find((s) => String(s.id) === String(sperreSpieler));
    if (!p) { toast.error('Bitte einen Spieler wählen.'); return; }
    const spiele = Math.max(1, Number(sperreSpiele) || 1);
    setSperreLaeuft(true);
    try {
      const { error } = await supabaseDb.insert('bans', {
        player_id: p.id,
        team: p.team,
        type: sperreArt,
        totalgames: spiele,
        matchesserved: 0,
        reason: sperreArt,
      });
      if (error) throw error;
      toast.success(`${p.name}: ${spiele} ${spiele === 1 ? 'Spiel' : 'Spiele'} gesperrt`);
      setSperreSpieler('');
    } catch (fehler) {
      toast.error(`Sperre nicht gespeichert: ${fehler?.message || 'unbekannter Fehler'}`);
    } finally {
      setSperreLaeuft(false);
    }
  };

  const abendBeenden = async () => {
    const { nurLokal } = await beende(datum);
    setAbgeschlossen(true);
    setBeendenGefragt(false);
    if (nurLokal) {
      toast.error('Abend nur auf diesem Gerät abgeschlossen — die Datenbank hat '
        + 'es nicht angenommen. Fehlt db/33_abend_abschluss.sql?', { duration: 7000 });
    } else {
      toast.success('Abend abgeschlossen. Die Zahlen stehen im Rückblick.');
    }
  };

  const abendWiederOeffnen = async () => {
    await wiederOeffnen(datum);
    setAbgeschlossen(false);
    toast.success('Abend zählt wieder mit.');
  };

  return (
    <>
      {/* AUCH DER KNOPF MUSS INS PORTAL — sonst liegt er NICHT über den
          anderen Dialogen.

          GEMESSEN, nicht vermutet: bei offenem Duell-Dialog denselben Knopf
          einmal als Kind von document.body und einmal im Baum von App.jsx,
          gleiche Klassen, gleiche Position. `document.elementFromPoint` auf
          seinem Mittelpunkt trifft im Portal den Knopf, im App-Baum dagegen
          einen Knopf INNERHALB des Dialogs. Er war dort also verdeckt und
          nicht antippbar — genau deshalb war die Schnellerfassung über einem
          offenen Dialog nutzlos.

          Die genaue Ursache habe ich NICHT festgenagelt. Mein erster Verdacht
          war ein Stapelkontext aus `will-change`/`transform` bei einem
          Vorfahren, wie ihn der Kommentar in AddMatchTab beschreibt; gemessen
          hat der einzige auffällige Vorfahr aber `will-change: auto`,
          `transform: none`, `z-index: auto`. Was bleibt, ist der Befund: als
          Kind von body erreichbar, im App-Baum nicht. Dialoge in dieser App
          hängen sich ohnehin alle per createPortal an body — der Knopf tut
          jetzt dasselbe und steht damit in derselben Ebene, wo sein z-index
          wirklich zählt.

          Meine frühere Prüfung hat das übersehen, weil sie den Knopf per
          `click()` ausgelöst hat. Das umgeht die Treffer-Erkennung vollständig
          und sagt nichts darüber, ob man ihn erreicht.

          Links unten, weil rechts schon zwei feste Knöpfe sitzen (nach oben
          scrollen und der grüne), und über der unteren Leiste. */}
      {!offen && createPortal((
        <button type="button" onClick={() => setOffen(true)}
                aria-label="Schnell eintragen: Schnaps und Sperre"
                className="fixed left-4 z-[120] w-12 h-12 rounded-full bg-bg-elevated shadow-ios-floating
                           border border-border-light text-system-purple
                           flex items-center justify-center active:scale-95 transition-transform"
                style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }}>
          <Icon name="glass" size={22} strokeWidth={2.2} />
        </button>
      ), document.body)}

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
                {waehlbareAbende(log).map((d) => (
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
                          {/* Bei abgeschlossenem Abend nicht bedienbar.
                              Die Zahlen bleiben sichtbar — sie sind der
                              Stand dieses Abends, und ihn nach dem Beenden
                              zu verstecken hiesse, die eigene Auskunft
                              wieder einzusammeln. Aber hinzufügen lässt sich
                              nichts mehr, ohne den Abend wieder zu öffnen:
                              sonst wäre „abgeschlossen" eine Behauptung. */}
                          <button type="button" aria-label={`${z.label} für ${p.name} eins weniger`}
                                  disabled={beschaeftigt || wert <= 0 || abgeschlossen}
                                  onClick={() => buchen(p.id, z.art, -1)}
                                  className="btn-compact stepper-btn w-7 h-7 rounded-md bg-bg-elevated
                                             text-text-secondary font-semibold disabled:opacity-40 flex-shrink-0">
                            −
                          </button>
                          <span className="num-tabular text-callout font-bold text-text-primary w-5 text-center flex-shrink-0">
                            {wert}
                          </span>
                          <button type="button" aria-label={`${z.label} für ${p.name} eins mehr`}
                                  disabled={beschaeftigt || abgeschlossen}
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

            {/* SPERRE — die zweite Sache, die mitten im Spiel anfällt.
                Ein Zähler reicht hier nicht: eine Sperre braucht Spieler,
                Art und Spielzahl. Deshalb drei Felder in einer Zeile und ein
                Knopf — kurz genug, um das Spielformular darunter nicht
                vergessen zu lassen.

                Die Spielzahl folgt der Art (Gelb-Rot = 1 Spiel), lässt sich
                aber überschreiben: bei Rot und Verletzung entscheidet der
                Fall, nicht die Vorgabe. */}
            <div className="panel-gray rounded-xl px-3 py-2 mt-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon name="ban" size={14} strokeWidth={2.2} className="text-system-red flex-shrink-0" />
                <span className="text-caption1 font-semibold text-text-secondary">Sperre</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <select value={sperreSpieler} onChange={(e) => setSperreSpieler(e.target.value)}
                        aria-label="Spieler für die Sperre"
                        className="btn-compact flex-1 min-w-[8rem] bg-bg-elevated rounded-lg px-2 py-1.5
                                   text-footnote text-text-primary focus:outline-none">
                  <option value="">Spieler …</option>
                  {(spieler || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {getTeamShort(s.team)}
                    </option>
                  ))}
                </select>
                <select value={sperreArt}
                        onChange={(e) => {
                          setSperreArt(e.target.value);
                          const t = BAN_TYPES.find((b) => b.value === e.target.value);
                          if (t) setSperreSpiele(t.duration ?? 1);
                        }}
                        aria-label="Art der Sperre"
                        className="btn-compact flex-1 min-w-[8rem] bg-bg-elevated rounded-lg px-2 py-1.5
                                   text-footnote text-text-primary focus:outline-none">
                  {BAN_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-bg-elevated rounded-lg px-2">
                  <input type="number" min="1" max="20" inputMode="numeric"
                         value={sperreSpiele}
                         onChange={(e) => setSperreSpiele(e.target.value)}
                         aria-label="Anzahl Spiele"
                         className="btn-compact w-10 bg-transparent text-footnote num-tabular
                                    text-text-primary text-center focus:outline-none" />
                  <span className="text-caption2 text-text-tertiary">Sp.</span>
                </div>
                <button type="button" onClick={sperreEintragen}
                        disabled={sperreLaeuft || !sperreSpieler}
                        className="btn-compact btn-soft-red px-3 py-1.5 rounded-lg text-footnote
                                   font-semibold disabled:opacity-40">
                  {sperreLaeuft ? '…' : 'Sperren'}
                </button>
              </div>
            </div>

            {/* ABEND BEENDEN.
                Der Abschluss ist eine MARKIERUNG, kein Löschen: die
                Ereignisse bleiben stehen, der Rückblick rechnet weiter daraus.
                „Zurücksetzen" heißt nur, dass die Zähler diesen Abend nicht
                mehr mitzählen — deshalb ist er auch umkehrbar.

                Mit Nachfrage, weil der Knopf die Zähler auf Null stellt und
                das ohne Rückfrage wie ein Datenverlust aussieht. Die
                Nachfrage nennt die Zahl, die gerade zusammenkam, damit man
                abschließt, was man gesehen hat. */}
            <div className="mt-3 pt-3 border-t border-border-light">
              {abgeschlossen ? (
                <div className="flex items-center gap-2">
                  <Icon name="check" size={16} strokeWidth={2.6} className="text-system-green flex-shrink-0" />
                  <span className="text-footnote text-text-secondary flex-1 min-w-0">
                    {kurzesDatum(datum)} ist abgeschlossen.
                  </span>
                  <button type="button" onClick={abendWiederOeffnen}
                          className="btn-compact text-footnote font-semibold text-system-blue px-2 py-1">
                    Wieder öffnen
                  </button>
                </div>
              ) : beendenGefragt ? (
                <div>
                  {/* DIE ZUSAMMENFASSUNG VOR DEM ABSCHLUSS.
                      Vorher stand hier nur die Schnapszahl. Das reichte
                      nicht: der Abschluss setzt auch die STERNE zurück, und
                      die standen in der Nachfrage gar nicht — man hätte etwas
                      bestätigt, das man nicht gesehen hat.

                      Je Person und nicht als Summe, weil genau das die Frage
                      des Abends ist. Was es nicht gab, steht auch nicht da:
                      eine Zeile „0 Sterne" sagt nichts. */}
                  <div className="section-label mb-1.5">{kurzesDatum(datum)}</div>
                  <div className="space-y-1 mb-2.5">
                    {PERSONEN.map((p) => {
                      const schnaps = stand.schnaps?.[p.id] || 0;
                      // `sterne` und nicht `stern` — siehe gesamtAmAbend.
                      const sterne = stand.sterne?.[p.id] || 0;
                      if (!schnaps && !sterne) return null;
                      return (
                        <div key={p.id} className="flex items-baseline gap-2 text-footnote">
                          <span className={`font-semibold ${p.farbe} w-20 flex-shrink-0`}>{p.name}</span>
                          <span className="text-text-secondary num-tabular">
                            {[
                              schnaps ? `${schnaps} Schnaps` : null,
                              sterne ? `+${sterne} ${sterne === 1 ? 'Stern' : 'Sterne'}` : null,
                            ].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      );
                    })}
                    {!gesamtAmAbend && (
                      <p className="text-footnote text-text-tertiary">
                        An diesem Abend ist nichts eingetragen.
                      </p>
                    )}
                  </div>
                  <p className="text-caption2 text-text-tertiary mb-2.5">
                    Abschließen setzt die Zähler zurück. Gelöscht wird nichts —
                    die Zahlen stehen danach im Abendrückblick.
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setBeendenGefragt(false)}
                            className="btn-secondary flex-1">Abbrechen</button>
                    <button type="button" onClick={abendBeenden}
                            className="btn-primary flex-1">Ja, abschließen</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setBeendenGefragt(true)}
                        className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                  <Icon name="check" size={16} strokeWidth={2.4} />
                  Abend beenden
                </button>
              )}
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
