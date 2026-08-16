import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import {
  PFLEGE_FELDER, feldWerte, benenneFeldUm, entferneFeldWert,
  aendereBier, loescheBier, eigeneWerte, legeListenwertAn, entferneListenwert,
  doppelteBiere, fuehreBiereZusammen,
} from '../../../utils/bierboerse';

/**
 * Listen pflegen — Biere, Brauereien, Sorten, Länder.
 *
 * DIE LISTEN SIND NICHT GLEICH AUFGEBAUT
 * Biere sind echte Zeilen im Katalog. Brauereien, Sorten und Länder stehen
 * dagegen als Text IN jeder Bierzeile — sie sind keine eigenen Dinge. Deshalb
 * heißt „umbenennen" dort: alle betroffenen Biere ändern. Und „entfernen"
 * heißt: das Feld bei allen leeren. Beides steht mit der Anzahl dabei, damit
 * niemand aus Versehen zwölf Biere anfasst.
 *
 * HINZUFÜGEN BRAUCHT EINEN EIGENEN ORT
 * Eine Brauerei ohne Bier existiert nirgends — sie wäre beim nächsten Laden
 * wieder weg. Angelegte Werte liegen deshalb in `bierboerse_einstellungen.
 * eigene_listen` (db/29) und werden über die Werte aus dem Katalog gelegt.
 * Sobald ein Bier den Wert trägt, kommt er ohnehin von dort; der Vorrat ist
 * nur die Brücke bis dahin.
 *
 * Bei einem Vorratswert gibt es kein „Umbenennen": es hängt kein Bier daran,
 * der Vorgang hätte keine Wirkung. Und sein „Entfernen" ist harmlos — im
 * Gegensatz zum Entfernen eines benutzten Werts, das Daten leert.
 */
export default function ListenPflege({ katalog, verkostungen, onGeaendert }) {
  const [offen, setOffen] = useState(false);
  const [feld, setFeld] = useState('brauerei');
  const [arbeitet, setArbeitet] = useState(false);

  // Zaehler, damit ein neu angelegter Vorratswert sofort erscheint — er liegt
  // im Modul-Zwischenspeicher, am Zustand aendert sich sonst nichts.
  const [stand, setStand] = useState(0);

  const werte = useMemo(() => {
    const ausKatalog = feldWerte(katalog, feld);
    if (feld === 'bier') return ausKatalog;
    // Vorratswerte, an denen noch kein Bier haengt, gehoeren mit in die Liste
    // — sonst legt man sie an und sie sind sofort wieder unsichtbar.
    const schonDa = new Set(ausKatalog.map((x) => x.wert));
    const nurVorrat = eigeneWerte(feld)
      .filter((w) => !schonDa.has(w))
      .map((w) => ({ wert: w, anzahl: 0, biere: [], nurVorrat: true }));
    return [...ausKatalog, ...nurVorrat];
  }, [katalog, feld, stand]); // eslint-disable-line react-hooks/exhaustive-deps
  const aktuell = PFLEGE_FELDER.find((f) => f.id === feld) || PFLEGE_FELDER[0];

  const umbenennen = async (alt, anzahl) => {
    const neu = window.prompt(
      `„${alt}" umbenennen — ${anzahl} ${anzahl === 1 ? 'Bier' : 'Biere'} betroffen.\n\n`
      + 'Ein bereits vorhandener Name führt beide zusammen.', alt);
    if (neu == null || neu.trim() === alt) return;
    setArbeitet(true);
    try {
      const { geaendert } = await benenneFeldUm(feld, alt, neu, katalog);
      toast.success(`${geaendert} ${geaendert === 1 ? 'Bier' : 'Biere'} geändert.`);
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const entfernen = async (wert, anzahl) => {
    // Ausdrücklich als Datenverlust benennen: die Biere bleiben, aber ihre
    // Brauerei ist danach weg. „Löschen" wäre hier das falsche Wort, weil
    // nichts gelöscht wird — es wird etwas geleert.
    const sicher = window.confirm(
      `„${wert}" bei ${anzahl} ${anzahl === 1 ? 'Bier' : 'Bieren'} entfernen?\n\n`
      + `Die Biere bleiben, aber ihre ${aktuell.einzahl} ist danach leer. `
      + 'Das lässt sich nur durch erneutes Eintragen rückgängig machen.');
    if (!sicher) return;
    setArbeitet(true);
    try {
      const { geleert } = await entferneFeldWert(feld, wert, katalog);
      toast.success(`Bei ${geleert} ${geleert === 1 ? 'Bier' : 'Bieren'} entfernt.`);
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const anlegen = async () => {
    const wert = window.prompt(`Neue ${aktuell.einzahl} anlegen:`);
    if (wert == null || !wert.trim()) return;
    setArbeitet(true);
    try {
      await legeListenwertAn(feld, wert);
      setStand((n) => n + 1);
      toast.success(`„${wert.trim()}" angelegt.`);
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const vorratEntfernen = async (wert) => {
    setArbeitet(true);
    try {
      await entferneListenwert(feld, wert);
      setStand((n) => n + 1);
      toast.success('Aus der Liste genommen.');
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const bierUmbenennen = async (b) => {
    const neu = window.prompt('Bier umbenennen:', b.name);
    if (neu == null || !neu.trim() || neu.trim() === b.name) return;
    setArbeitet(true);
    try {
      await aendereBier(b.id, { name: neu });
      toast.success('Geändert.');
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  // Kandidaten für Doppel. Nur im Reiter „Biere" berechnet — die Suche
  // vergleicht jedes Bier mit jedem, das muss nicht bei jedem Reiterwechsel
  // laufen.
  const doppel = useMemo(
    () => (feld === 'bier' ? doppelteBiere(katalog, verkostungen) : []),
    [feld, katalog, verkostungen]
  );

  const zusammenfuehren = async (paar, behalten, aufgeben) => {
    const sicher = window.confirm(
      `„${aufgeben.name}" in „${behalten.name}" zusammenführen?\n\n`
      + `${paar.anzahlA + paar.anzahlB} Verkostungen hängen danach an „${behalten.name}", `
      + `„${aufgeben.name}" wird gelöscht.\n\n`
      + 'Leere Angaben werden dabei aus dem anderen Bier ergänzt.');
    if (!sicher) return;
    setArbeitet(true);
    try {
      const { umgehaengt, ergaenzt } = await fuehreBiereZusammen(
        behalten.id, aufgeben.id, verkostungen, katalog);
      // „0 Verkostungen umgehängt" liest sich wie ein Fehlschlag, obwohl es
      // der Normalfall ist, wenn das aufgegebene Bier nie getrunken wurde.
      const NAME = { brauerei: 'Brauerei', art: 'Sorte', land: 'Land', alkohol: 'Alkohol' };
      const felder = ergaenzt.map((f) => NAME[f] || f);
      const aufzaehlung = felder.length > 1
        ? `${felder.slice(0, -1).join(', ')} und ${felder.at(-1)}`
        : felder[0];
      toast.success(
        (umgehaengt > 0
          ? `Zusammengeführt — ${umgehaengt} ${umgehaengt === 1 ? 'Verkostung' : 'Verkostungen'} umgehängt`
          : 'Zusammengeführt')
        + (felder.length ? `, ${aufzaehlung} ergänzt.` : '.'));
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.', { duration: 6000 });
    } finally { setArbeitet(false); }
  };

  const bierLoeschen = async (b) => {
    if (!window.confirm(`„${b.name}" aus dem Katalog löschen?`)) return;
    setArbeitet(true);
    try {
      await loescheBier(b.id, verkostungen);
      toast.success('Gelöscht.');
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.', { duration: 6000 });
    } finally { setArbeitet(false); }
  };

  if (!offen) {
    return (
      <button type="button" onClick={() => setOffen(true)}
              className="w-full py-2 rounded-xl bg-bg-tertiary text-text-secondary text-footnote font-medium">
        Listen pflegen
      </button>
    );
  }

  const reiter = [...PFLEGE_FELDER, { id: 'bier', label: 'Biere', einzahl: 'Bier' }];

  return (
    <div className="panel-gray rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-footnote font-semibold text-text-secondary">Listen pflegen</span>
        <button type="button" onClick={() => setOffen(false)} className="text-caption2 text-system-blue">
          Zuklappen
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {reiter.map((f) => (
          <button key={f.id} type="button" onClick={() => setFeld(f.id)}
                  aria-pressed={feld === f.id}
                  className={`flex-1 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                    feld === f.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Doppel zuerst: wer hier aufräumt, will das meist erledigen, bevor
          er in der langen Liste weitersucht. Steht nur da, wenn es welche
          gibt — sonst wäre es eine leere Überschrift. */}
      {feld === 'bier' && doppel.length > 0 && (
        <div className="rounded-lg bg-system-yellow/10 ring-1 ring-system-yellow/25 p-2.5 space-y-2">
          <div className="text-caption1 font-semibold text-text-primary">
            {doppel.length} {doppel.length === 1 ? 'möglicher Doppeleintrag' : 'mögliche Doppeleinträge'}
          </div>
          {doppel.slice(0, 6).map((p) => (
            <div key={`${p.a.id}-${p.b.id}`} className="text-caption2 space-y-1.5">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-text-primary font-medium">{p.a.name}</span>
                <span className="text-text-tertiary">
                  ({p.anzahlA}×{p.a.brauerei ? ` · ${p.a.brauerei}` : ''})
                </span>
                <span className="text-text-tertiary">↔</span>
                <span className="text-text-primary font-medium">{p.b.name}</span>
                <span className="text-text-tertiary">
                  ({p.anzahlB}×{p.b.brauerei ? ` · ${p.b.brauerei}` : ''})
                </span>
              </div>
              {/* Verschiedene Brauereien nicht verschweigen: dann ist die
                  Wahrscheinlichkeit hoeher, dass es zwei echte Biere sind. */}
              {!p.brauereiPasst && (
                <div className="text-system-orange">
                  Verschiedene Brauereien — vor dem Zusammenführen prüfen.
                </div>
              )}
              <div className="flex gap-1.5">
                <button type="button" disabled={arbeitet}
                        onClick={() => zusammenfuehren(p, p.a, p.b)}
                        className="chip chip-sm chip-gray">
                  &bdquo;{p.a.name}&ldquo; behalten
                </button>
                <button type="button" disabled={arbeitet}
                        onClick={() => zusammenfuehren(p, p.b, p.a)}
                        className="chip chip-sm chip-gray">
                  &bdquo;{p.b.name}&ldquo; behalten
                </button>
              </div>
            </div>
          ))}
          {doppel.length > 6 && (
            <p className="text-caption2 text-text-tertiary">
              … und {doppel.length - 6} weitere. Nach dem Zusammenführen rücken sie nach.
            </p>
          )}
        </div>
      )}

      {feld === 'bier' ? (
        <div className="max-h-64 overflow-y-auto divide-y divide-border-light">
          {(katalog || []).length === 0 ? (
            <p className="text-caption1 text-text-tertiary py-2">Noch nichts im Katalog.</p>
          ) : [...katalog]
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'))
            .map((b) => {
              const genutzt = (verkostungen || []).filter((v) => v.bier_id === b.id).length;
              return (
                <div key={b.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-caption1 text-text-primary truncate">{b.name}</div>
                    <div className="text-caption2 text-text-tertiary truncate">
                      {[b.brauerei, b.art, b.land].filter(Boolean).join(' · ') || 'keine Angaben'}
                      {genutzt > 0 && ` · ${genutzt}× getrunken`}
                    </div>
                  </div>
                  <button type="button" onClick={() => bierUmbenennen(b)} disabled={arbeitet}
                          className="chip chip-sm chip-gray flex-shrink-0">
                    Umbenennen
                  </button>
                  {/* Nur anbieten, was auch geht: bier_verkostungen verweist mit
                      `on delete restrict` auf den Katalog, ein getrunkenes Bier
                      laesst die Datenbank also gar nicht loeschen. Ein Knopf,
                      der immer scheitert, ist schlimmer als keiner. */}
                  {genutzt === 0 && (
                    <button type="button" onClick={() => bierLoeschen(b)} disabled={arbeitet}
                            aria-label={`${b.name} löschen`}
                            className="text-text-tertiary hover:text-system-red flex-shrink-0 px-1">
                      <Icon name="x" size={14} strokeWidth={2.4} />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-border-light">
          {werte.length === 0 ? (
            <p className="text-caption1 text-text-tertiary py-2">
              Noch keine {aktuell.label} vergeben.
            </p>
          ) : werte.map((w) => (
            <div key={w.wert} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-caption1 text-text-primary truncate">{w.wert}</div>
                <div className="text-caption2 text-text-tertiary">
                  {w.nurVorrat ? 'noch kein Bier' : `${w.anzahl} ${w.anzahl === 1 ? 'Bier' : 'Biere'}`}
                </div>
              </div>
              {/* An einem Vorratswert haengt kein Bier — umbenennen waere ein
                  Vorgang ohne Wirkung, und Entfernen ist hier harmlos statt
                  Datenverlust. Deshalb nur der eine Knopf. */}
              {!w.nurVorrat && (
                <button type="button" onClick={() => umbenennen(w.wert, w.anzahl)} disabled={arbeitet}
                        className="chip chip-sm chip-gray flex-shrink-0">
                  Umbenennen
                </button>
              )}
              <button type="button"
                      onClick={() => (w.nurVorrat ? vorratEntfernen(w.wert) : entfernen(w.wert, w.anzahl))}
                      disabled={arbeitet}
                      aria-label={`${w.wert} entfernen`}
                      className="text-text-tertiary hover:text-system-red flex-shrink-0 px-1">
                <Icon name="x" size={14} strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>
      )}

      {feld !== 'bier' && (
        <button type="button" onClick={anlegen} disabled={arbeitet}
                className="w-full py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-caption1 font-semibold">
          + {aktuell.einzahl} anlegen
        </button>
      )}

      <p className="text-caption2 text-text-tertiary">
        {feld === 'bier'
          ? 'Getrunkene Biere lassen sich nicht löschen — sie hängen an den Verkostungen.'
          : `Umbenennen ändert alle betroffenen Biere; ein vorhandener Name führt beide `
            + `zusammen. Angelegte Einträge stehen sofort zur Auswahl, auch bevor ein `
            + `Bier sie trägt.`}
      </p>
    </div>
  );
}
