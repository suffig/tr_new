import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Kraefteverhaeltnis from '../../Kraefteverhaeltnis';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import LoadingSpinner from '../../LoadingSpinner';
import ZahlFeld from '../../ZahlFeld';
import { zahl, alsText } from '../../../utils/zahlen';
import { supabaseDb } from '../../../utils/supabase';
import ListenPflege from './ListenPflege';
import AbendBild from './AbendBild';
import {
  PERSONEN, BIERARTEN, HERKUNFT, eigeneWerte, bestandNachFeld, preisEntwicklungJeBier, trinkprofil,
  ladeBoersen, ladeKatalog, ladeVerkostungen,
  wiederkauf, notenDrift, brauereiStatistik,
  herkunftVerteilung, alkoholVerlauf, preisJe100ml,
  findeOderLegeBierAn, boersenStatistik, bestenListe, katalogBestenListe,
  ZAHLER, rechnung, bierVerlauf, bierFundstuecke, sortenVerteilung,
  KATEGORIE_KATALOG, STANDARD_KATEGORIEN, kategorie,
  alleKategorien, alleKategorienMitStillgelegten, kategorieGruppen,
  legeKategorieAn, setzeKategorieAktiv, schluesselAus, schluesselFrei,
  ladeEinstellungen, sichereEinstellungen, noteAusKategorien, notenVon,
  geschmacksDuell, gesamtBilanz, kategorienProfil, sortenVorliebe, preisLeistung,
  abendText, bierZwilling, antiRekorde, abendKennzahlen,
} from '../../../utils/bierboerse';

const euro = (n) => `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
// Alkoholangaben kommen als Zahl aus der Datenbank und wuerden sonst als
// "5.2 %" mitten im deutschen Text stehen.
const prozent = (n) => `${Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
const datum = (s) => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
// Noten immer mit einer Nachkommastelle. "7" neben "7,5" sieht aus, als waere
// die eine Zahl genauer gemessen als die andere — dabei sind beide dasselbe
// Mittel aus denselben Kategorien.
const note = (n) => n == null
  ? '—'
  : Number(n).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Note 0–10 als Krüge statt als Zahl.
 *
 * Fünf Krüge zu je zwei Punkten: voll, halb oder leer. Eine 7 liest sich als
 * "drei volle und ein halber" — das erfasst man schneller als eine Ziffer,
 * und beim Vergleich zweier Biere sieht man den Unterschied sofort.
 */
function Kruege({ note, groesse = 14 }) {
  if (note == null) return <span className="text-caption2 text-text-tertiary">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${note} von 10`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const anteil = Math.max(0, Math.min(1, note / 2 - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: groesse, height: groesse }}>
            <Icon name="beer" size={groesse} strokeWidth={2}
                  className="absolute inset-0 text-text-tertiary/35" />
            {anteil > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${anteil * 100}%` }}>
                <Icon name="beer" size={groesse} strokeWidth={2.2} className="text-system-yellow" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Note setzen: elf Knöpfe, direkt antippbar. */
/**
 * Zwei Noten auf einer gemeinsamen Skala.
 *
 * Fuer Mengen — Glaeser, Ausgaben, Siege — ist die geteilte Flaeche die
 * richtige Darstellung: 12 zu 9 Glaeser sind wirklich 57 % zu 43 % des
 * Getrunkenen. Fuer Noten ist sie falsch. 7,5 zu 7,0 waeren 52 % zu 48 %, ein
 * fast mittiger Balken — er behauptete Gleichstand, wo auf einer Skala von
 * null bis zehn ein halber Punkt Unterschied liegt. Eine Note ist keine Menge,
 * die man zwischen zweien aufteilt.
 *
 * Also die Skala selbst: null links, zehn rechts, zwei Punkte darauf. Der
 * Abstand zwischen ihnen ist die Uneinigkeit, und die Lage sagt zusaetzlich,
 * ob es beiden gut oder beiden schlecht geschmeckt hat — das geht in jedem
 * Verhaeltnisbalken verloren.
 */
function Notenvergleich({ label, aek, real, aekName, realName, klein = false }) {
  const a = Math.min(10, Math.max(0, Number(aek) || 0));
  const r = Math.min(10, Math.max(0, Number(real) || 0));
  const einig = Math.abs(a - r) < 0.05;
  const pos = (v) => `${(v / 10) * 100}%`;
  const von = Math.min(a, r), bis = Math.max(a, r);

  return (
    <div className={klein ? 'py-2' : 'py-2.5'}>
      <div className={`flex items-baseline gap-2 ${klein ? 'mb-1.5' : 'mb-2'}`}>
        <span className={`${klein ? 'text-footnote' : 'text-callout'} font-bold num-tabular ${
          a > r ? 'text-system-blue' : 'text-text-secondary'}`}>{note(a)}</span>
        <span className="flex-1 text-center text-caption2 text-text-tertiary truncate">{label}</span>
        <span className={`${klein ? 'text-footnote' : 'text-callout'} font-bold num-tabular ${
          r > a ? 'text-system-red' : 'text-text-secondary'}`}>{note(r)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-bg-tertiary">
        {/* Die Strecke zwischen den beiden Noten — so weit lagt ihr auseinander. */}
        {!einig && (
          <div className="absolute inset-y-0 bg-text-tertiary/30 rounded-full"
               style={{ left: pos(von), width: pos(bis - von) }} />
        )}
        {einig ? (
          <span className="absolute w-2.5 h-2.5 rounded-full bg-system-green border-2 border-bg-secondary"
                style={{ left: pos(a), top: '50%', transform: 'translate(-50%, -50%)' }} />
        ) : (
          <>
            <span className="absolute w-2.5 h-2.5 rounded-full bg-system-blue border-2 border-bg-secondary"
                  style={{ left: pos(a), top: '50%', transform: 'translate(-50%, -50%)' }} />
            <span className="absolute w-2.5 h-2.5 rounded-full bg-system-red border-2 border-bg-secondary"
                  style={{ left: pos(r), top: '50%', transform: 'translate(-50%, -50%)' }} />
          </>
        )}
      </div>
      <div className="sr-only">
        {label}: {aekName} {note(a)} von 10, {realName} {note(r)} von 10.
        {einig ? ' Einig.' : ''}
      </div>
    </div>
  );
}

function NotenWahl({ wert, onChange, farbe, beschriftung = 'Note' }) {
  return (
    <div className="flex flex-wrap gap-1">
      {[...Array(11).keys()].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(wert === n ? null : n)}
          className={`w-8 h-8 rounded-lg text-caption1 font-bold transition-colors num-tabular ${
            wert === n ? `${farbe} bg-bg-elevated ring-2 ring-current` : 'bg-bg-tertiary text-text-secondary'
          }`}
          aria-label={`${beschriftung} ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/**
 * Bewertung einer Person.
 *
 * Zwei Modi, weil die beiden Situationen verschieden sind: auf einer Börse
 * mit zwanzig Bieren will man zwei Taps und weiter, zu Hause bei drei
 * besonderen Flaschen darf es ausführlich sein.
 *
 *   einfach       eine Note von 0 bis 10, direkt eingetippt.
 *   ausführlich   je eingeschalteter Kategorie eine Note; die Gesamtnote
 *                 wird daraus gemittelt und ist KEIN Eingabefeld — zwei
 *                 Zahlen, die dasselbe meinen, laufen sonst auseinander.
 *
 * Die Gesamtnote ist in beiden Fällen dieselbe Zahl, mit der alle
 * Auswertungen rechnen. Ein Wechsel des Modus macht alte Einträge deshalb
 * nicht wertlos.
 */
function BewertungsBlock({ modus, kategorien, noten, onNoten, gesamt, auswahl, onGesamt, farbe }) {
  const gerechnet = noteAusKategorien(noten);
  const anzeige = modus === 'ausfuehrlich' ? (gerechnet ?? gesamt ?? null) : (gesamt ?? null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Kruege note={anzeige} groesse={16} />
        <span className="text-caption2 text-text-tertiary">
          {anzeige == null ? 'noch nicht bewertet' : `${note(anzeige)} von 10`}
          {modus === 'ausfuehrlich' && gerechnet == null && gesamt != null ? ' (bisher)' : ''}
        </span>
      </div>

      {modus === 'einfach' ? (
        <NotenWahl wert={auswahl ?? gesamt} onChange={onGesamt} farbe={farbe} />
      ) : kategorien.length === 0 ? (
        <p className="text-caption2 text-text-tertiary">
          Keine Kategorie eingeschaltet — unter „Einstellungen“ auswählen.
        </p>
      ) : (
        kategorien.map((id) => {
          const k = kategorie(id);
          if (!k) return null;
          return (
            <div key={id}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-caption2 text-text-secondary">{k.label}</span>
                <span className="text-caption2 text-text-tertiary truncate hidden min-[340px]:inline">{k.hilfe}</span>
                <span className="ml-auto text-caption2 num-tabular text-text-tertiary flex-shrink-0">
                  {noten[id] == null ? '—' : noten[id]}
                </span>
              </div>
              <NotenWahl wert={noten[id] ?? null} beschriftung={k.label} farbe={farbe}
                         onChange={(n) => {
                           const neu = { ...noten };
                           if (n == null) delete neu[id]; else neu[id] = n;
                           onNoten(neu);
                         }} />
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Einstellungen der Bierbörse.
 *
 * Der Modus ist nur der Vorschlag beim Öffnen des Formulars — dort lässt er
 * sich je Bier umschalten. Die Kategorienauswahl gilt dagegen für alle:
 * abgewählte verschwinden aus dem Formular, ihre bereits vergebenen Noten
 * bleiben aber erhalten und zählen in der Bilanz weiter mit. Man kann sie
 * also gefahrlos ausprobieren.
 */
function EinstellungenFormular({ einstellungen, bierKatalog, verkostungen, onDatenGeaendert, onSchliessen, onFertig }) {
  const [modus, setModus] = useState(einstellungen.modus);
  const [gewaehlt, setGewaehlt] = useState(einstellungen.kategorien);
  const [speichert, setSpeichert] = useState(false);
  // Neu angelegte Kategorien liegen im Modul-Zwischenspeicher; dieser Zaehler
  // stoesst das Neuzeichnen an, weil sich sonst nichts am Zustand aendert.
  const [stand, setStand] = useState(0);
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState('');
  const [neuHilfe, setNeuHilfe] = useState('');
  const [legtAn, setLegtAn] = useState(false);

  const katalog = useMemo(() => alleKategorien(), [stand]); // eslint-disable-line react-hooks/exhaustive-deps
  const gruppen = useMemo(() => kategorieGruppen(), [stand]); // eslint-disable-line react-hooks/exhaustive-deps
  const stillgelegte = useMemo(
    () => alleKategorienMitStillgelegten().filter((k) => k.eigen && !k.aktiv),
    [stand]); // eslint-disable-line react-hooks/exhaustive-deps

  const neuAnlegen = async () => {
    setLegtAn(true);
    try {
      const id = await legeKategorieAn({ label: neuLabel, hilfe: neuHilfe });
      setStand((n) => n + 1);
      // Direkt mit auswaehlen — wer eine Kategorie anlegt, will sie benutzen.
      setGewaehlt((alt) => (alt.includes(id) ? alt : [...alt, id]));
      setNeuLabel(''); setNeuHilfe(''); setNeuOffen(false);
      toast.success('Kategorie angelegt.');
    } catch (err) {
      toast.error(err?.message || 'Konnte nicht angelegt werden.');
    } finally {
      setLegtAn(false);
    }
  };

  const zurueckholen = async (id) => {
    try {
      await setzeKategorieAktiv(id, true);
      setStand((n) => n + 1);
      toast.success('Wieder da.');
    } catch { toast.error('Ging nicht.'); }
  };

  const stilllegen = async (id) => {
    try {
      await setzeKategorieAktiv(id, false);
      setStand((n) => n + 1);
      setGewaehlt((alt) => alt.filter((x) => x !== id));
      toast.success('Ausgeblendet. Vergebene Noten bleiben erhalten.');
    } catch { toast.error('Ging nicht.'); }
  };

  const umschalten = (id) => setGewaehlt((alt) =>
    alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]);

  const speichern = async () => {
    setSpeichert(true);
    try {
      // In der Reihenfolge des Katalogs sichern, nicht in der des Antippens —
      // sonst steht "Abgang" mal vor, mal hinter "Antrunk".
      const sortiert = katalog.filter((k) => gewaehlt.includes(k.id)).map((k) => k.id);
      await sichereEinstellungen({ modus, kategorien: sortiert });
      toast.success('Gespeichert.');
      onFertig();
    } catch {
      toast.error('Konnte nicht gespeichert werden.');
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <Modal titel="Einstellungen" onSchliessen={onSchliessen}>
      <div className="space-y-4">
        <div>
          <div className="text-footnote text-text-secondary mb-1.5">Voreinstellung beim Eintragen</div>
          <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
            {[['einfach', 'Einfach'], ['ausfuehrlich', 'Ausführlich']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setModus(id)}
                      className={`flex-1 py-2 rounded-lg text-footnote font-semibold transition-colors ${
                        modus === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-1.5">
            {modus === 'einfach'
              ? 'Eine Note von 0 bis 10 je Person. Im Formular jederzeit umschaltbar.'
              : 'Je Kategorie eine Note, die Gesamtnote wird daraus gemittelt.'}
          </p>
        </div>

        <div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-footnote text-text-secondary">Kategorien</span>
            <span className="ml-auto text-caption2 text-text-tertiary num-tabular">
              {gewaehlt.length} von {katalog.length}
            </span>
          </div>
          <div className="space-y-3">
            {gruppen.map((gruppe) => (
              <div key={gruppe}>
                <div className="text-caption2 text-text-tertiary mb-1.5">{gruppe}</div>
                <div className="flex flex-wrap gap-1.5">
                  {katalog.filter((k) => k.gruppe === gruppe).map((k) => {
                    const an = gewaehlt.includes(k.id);
                    // Eigene bekommen ein × zum Ausblenden. Die
                    // mitgelieferten nicht: die stehen im Code und liessen
                    // sich hier gar nicht entfernen.
                    return (
                      <span key={k.id}
                            className={`inline-flex items-center rounded-lg text-caption1 font-medium transition-colors ${
                              an ? 'bg-system-yellow/15 text-system-yellow ring-1 ring-system-yellow/40'
                                 : 'bg-bg-tertiary text-text-secondary'}`}>
                        <button type="button" onClick={() => umschalten(k.id)}
                                title={k.hilfe || undefined}
                                className={`px-2.5 py-1.5 ${k.eigen ? 'pr-1.5' : ''}`}>
                          {k.label}
                        </button>
                        {k.eigen && (
                          <button type="button" onClick={() => stilllegen(k.id)}
                                  aria-label={`${k.label} ausblenden`}
                                  title="Ausblenden — vergebene Noten bleiben"
                                  className="pl-0.5 pr-2 py-1.5 text-text-tertiary hover:text-system-red">
                            <Icon name="x" size={12} strokeWidth={2.6} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Eigene Kategorie anlegen (db/28).
              Der Schluessel wird aus der Bezeichnung gebildet und ist danach
              unveraenderlich — er steht als Schluessel in jeder vergebenen
              Note. Deshalb steht er hier sichtbar dabei, statt still im
              Hintergrund zu entstehen. */}
          {neuOffen ? (
            <div className="panel-gray rounded-xl p-3 mt-3 space-y-2">
              <input
                value={neuLabel}
                onChange={(e) => setNeuLabel(e.target.value)}
                placeholder="Bezeichnung, z. B. Süffigkeit"
                className="form-input w-full"
                autoFocus
              />
              <input
                value={neuHilfe}
                onChange={(e) => setNeuHilfe(e.target.value)}
                placeholder="Kurzer Hinweis (freiwillig)"
                className="form-input w-full"
              />
              {(() => {
                const id = schluesselAus(neuLabel);
                if (!neuLabel.trim()) return null;
                if (id.length < 2) {
                  return (
                    <p className="text-caption2 text-system-red">
                      Daraus lässt sich kein Schlüssel bilden — bitte Buchstaben verwenden.
                    </p>
                  );
                }
                if (!schluesselFrei(id)) {
                  return <p className="text-caption2 text-system-red">Gibt es schon.</p>;
                }
                return (
                  <p className="text-caption2 text-text-tertiary">
                    Schlüssel: <span className="num-tabular">{id}</span> — steht später in jeder Note
                    und lässt sich nicht mehr ändern.
                  </p>
                );
              })()}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setNeuOffen(false); setNeuLabel(''); setNeuHilfe(''); }}
                        className="btn-secondary flex-1">
                  Abbrechen
                </button>
                <button type="button" onClick={neuAnlegen}
                        disabled={legtAn || !neuLabel.trim() || schluesselAus(neuLabel).length < 2
                                  || !schluesselFrei(schluesselAus(neuLabel))}
                        className="btn-primary flex-1 disabled:opacity-50">
                  {legtAn ? 'Legt an…' : 'Anlegen'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setNeuOffen(true)}
                    className="mt-3 w-full py-2 rounded-xl bg-bg-tertiary text-text-secondary text-footnote font-medium">
              + Eigene Kategorie
            </button>
          )}

          {/* Stillgelegte zurueckholen. Sie sind nicht geloescht — die
              vergebenen Noten stehen weiter in den Verkostungen. */}
          {stillgelegte.length > 0 && (
            <div className="mt-3">
              <div className="text-caption2 text-text-tertiary mb-1.5">Ausgeblendet</div>
              <div className="flex flex-wrap gap-1.5">
                {stillgelegte.map((k) => (
                  <button key={k.id} type="button" onClick={() => zurueckholen(k.id)}
                          className="px-2.5 py-1.5 rounded-lg text-caption1 bg-bg-tertiary text-text-tertiary line-through">
                    {k.label}
                  </button>
                ))}
              </div>
              <p className="text-caption2 text-text-tertiary mt-1">
                Antippen holt sie zurück. Die damals vergebenen Noten sind nie weg gewesen.
              </p>
            </div>
          )}

          <button type="button" onClick={() => setGewaehlt(STANDARD_KATEGORIEN)}
                  className="mt-2 text-caption2 text-text-tertiary underline">
            Auf die drei Standardkategorien zurücksetzen
          </button>
        </div>

        <p className="text-caption2 text-text-tertiary">
          Abgewählte Kategorien verschwinden nur aus dem Formular. Vergebene
          Noten bleiben gespeichert und zählen in der Bilanz weiter.
        </p>

        <ListenPflege katalog={bierKatalog} verkostungen={verkostungen} onGeaendert={onDatenGeaendert} />

        <button onClick={speichern} disabled={speichert} className="btn-primary w-full">
          {speichert ? 'Speichert…' : 'Sichern'}
        </button>
      </div>
    </Modal>
  );
}

export default function BierboerseTab() {
  const [boersen, setBoersen] = useState([]);
  const [katalog, setKatalog] = useState([]);
  const [verkostungen, setVerkostungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(null);
  const [offen, setOffen] = useState(null);        // id der geöffneten Börse
  const [formular, setFormular] = useState(null);  // 'boerse' | 'bier' | {bearbeiten}
  const [ansicht, setAnsicht] = useState('boersen'); // boersen | katalog | bilanz
  const [bierOffen, setBierOffen] = useState(null);   // Bier-Detailansicht
  const [einstellungen, setEinstellungen] = useState(
    { modus: 'einfach', kategorien: STANDARD_KATEGORIEN });

  const laden4 = useCallback(async () => {
    setLaden(true); setFehler(null);
    try {
      const [b, k, v, e] = await Promise.all([
        ladeBoersen(), ladeKatalog(), ladeVerkostungen(), ladeEinstellungen(),
      ]);
      setBoersen(b); setKatalog(k); setVerkostungen(v); setEinstellungen(e);
    } catch (e) {
      setFehler(e?.message || 'Die Bierbörsen konnten nicht geladen werden.');
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => { laden4(); }, [laden4]);

  const proBoerse = useMemo(() => {
    const m = new Map();
    for (const v of verkostungen) {
      if (!m.has(v.boerse_id)) m.set(v.boerse_id, []);
      m.get(v.boerse_id).push(v);
    }
    return m;
  }, [verkostungen]);

  if (laden) return <LoadingSpinner message="Lade Bierbörsen…" />;

  if (fehler) {
    return (
      <div className="p-4">
        <div className="modern-card p-5 text-center">
          <Icon name="warning" size={24} strokeWidth={2} className="text-system-orange mx-auto mb-2" />
          <p className="text-text-secondary text-sm mb-1">{fehler}</p>
          <p className="text-caption2 text-text-tertiary mb-4">
            Falls die Tabellen noch fehlen: <code>db/19_bierboerse.sql</code> ausführen.
          </p>
          <button onClick={laden4} className="btn-primary">Erneut versuchen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 mobile-safe-bottom space-y-4">
      <div className="flex items-center gap-2">
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl flex-1 min-w-0">
        {[['boersen', 'Börsen'], ['katalog', 'Alle Biere'], ['bilanz', 'Bilanz']].map(([id, label]) => (
          <button key={id} onClick={() => setAnsicht(id)}
            className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
              ansicht === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>
        <button onClick={() => setFormular({ art: 'einstellungen' })}
                className="w-10 h-10 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                aria-label="Einstellungen" title="Einstellungen">
          <Icon name="settings" size={17} strokeWidth={2.2} />
        </button>
      </div>

      {ansicht === 'bilanz' ? (
        <BilanzAnsicht boersen={boersen} verkostungen={verkostungen} katalog={katalog} />
      ) : ansicht === 'katalog' ? (
        <KatalogAnsicht katalog={katalog} verkostungen={verkostungen} boersen={boersen}
                        onBier={(b) => setBierOffen(b)} />
      ) : (
        <>
          <button onClick={() => setFormular({ art: 'boerse' })} className="btn-primary w-full">
            <Icon name="plus" size={17} strokeWidth={2.6} className="mr-1.5" />
            Neue Bierbörse
          </button>

          {boersen.length === 0 ? (
            <div className="modern-card p-8 text-center">
              <Icon name="beer" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
              <p className="text-text-muted">Noch keine Bierbörse erfasst.</p>
              <p className="text-footnote text-text-tertiary mt-1">
                Lege eine an, dann könnt ihr Biere eintragen und bewerten.
              </p>
            </div>
          ) : boersen.map((b) => (
            <BoersenKarte
              key={b.id}
              boerse={b}
              verkostungen={proBoerse.get(b.id) || []}
              katalog={katalog}
              offen={offen === b.id}
              onToggle={() => setOffen(offen === b.id ? null : b.id)}
              onNeuesBier={() => setFormular({ art: 'bier', boerse: b })}
              onBoerseBearbeiten={() => setFormular({ art: 'boerse', boerse: b })}
              onBearbeiten={(v) => setFormular({ art: 'bier', boerse: b, verkostung: v })}
              onBier={(bier) => setBierOffen(bier)}
              onAendern={laden4}
            />
          ))}
        </>
      )}

      {formular?.art === 'boerse' && (
        <BoersenFormular
          boerse={formular.boerse}
          onSchliessen={() => setFormular(null)}
          onFertig={() => { setFormular(null); laden4(); }}
        />
      )}
      {bierOffen && (
        <BierDetail bier={bierOffen} verkostungen={verkostungen} boersen={boersen}
                    katalog={katalog} onSchliessen={() => setBierOffen(null)} />
      )}
      {formular?.art === 'einstellungen' && (
        <EinstellungenFormular
          einstellungen={einstellungen}
          bierKatalog={katalog}
          verkostungen={verkostungen}
          onDatenGeaendert={laden4}
          onSchliessen={() => setFormular(null)}
          onFertig={() => { setFormular(null); laden4(); }}
        />
      )}
      {formular?.art === 'bier' && (
        <BierFormular
          boerse={formular.boerse}
          verkostung={formular.verkostung}
          katalog={katalog}
          verkostungen={verkostungen}
          einstellungen={einstellungen}
          onSchliessen={() => setFormular(null)}
          onFertig={() => { setFormular(null); laden4(); }}
        />
      )}
    </div>
  );
}

/** Eine Börse: Kopfzahlen, aufklappbar zur Bestenliste. */
function BoersenKarte({ boerse, verkostungen, katalog, offen, onToggle, onNeuesBier, onBearbeiten, onBoerseBearbeiten, onBier, onAendern }) {
  const stat = useMemo(() => boersenStatistik(verkostungen, katalog), [verkostungen, katalog]);
  const beste = useMemo(() => bestenListe(verkostungen, katalog), [verkostungen, katalog]);
  const kasse = useMemo(() => rechnung(verkostungen), [verkostungen]);

  // Reihenfolge der Bierliste. 'note' zeigt die Bestenliste, 'reihe' die
  // Eingabereihenfolge — beides gab es vorher, aber als zwei getrennte
  // Listen derselben Biere.
  const [bierSort, setBierSort] = useState('note');
  const [bildOffen, setBildOffen] = useState(false);

  /**
   * Die Biere dieser Boerse, in der gewaehlten Reihenfolge.
   *
   * `bestenListe` liefert die Verkostungen samt Bier und Gesamtnote und ist
   * bereits nach Note sortiert. Fuer die Eingabereihenfolge wird dieselbe
   * Liste nach id sortiert — nicht die rohen Verkostungen genommen, sonst
   * fehlten Bier und Note, die die Zeile anzeigt.
   */
  const sortierteBiere = useMemo(() => {
    if (bierSort === 'note') return beste;
    return [...beste].sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [beste, bierSort]);

  // Boerse loeschen. Die Verkostungen haengen per ON DELETE CASCADE daran und
  // gehen mit — deshalb steht die Zahl in der Rueckfrage, sonst loescht man
  // ahnungslos einen ganzen Abend.
  const boerseLoeschen = async () => {
    const anzahl = verkostungen.length;
    if (!window.confirm(
      `„${boerse.name}“ wirklich löschen?\n\n`
      + (anzahl === 0
        ? 'Auf dieser Börse steht noch kein Bier.'
        : `${anzahl} ${anzahl === 1 ? 'eingetragenes Bier' : 'eingetragene Biere'} werden `
          + 'mitgelöscht. Im Katalog bleiben die Biere erhalten.')
      + '\n\nDas lässt sich nicht rückgängig machen.'
    )) return;
    const { error } = await supabaseDb.delete('bierboersen', boerse.id);
    if (error) toast.error('Konnte nicht gelöscht werden.');
    else { toast.success('Bierbörse gelöscht.'); onAendern(); }
  };

  // Abend verschicken. `navigator.share` oeffnet das Teilen-Menue des
  // Telefons — wohin es geht, entscheidet ihr dort, die App verschickt
  // nichts von sich aus. Auf dem Rechner gibt es das meist nicht, dort
  // landet der Text in der Zwischenablage.
  const teilen = async () => {
    const text = abendText(boerse, verkostungen, katalog);
    try {
      if (navigator.share) {
        await navigator.share({ title: boerse.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('In die Zwischenablage kopiert.');
      }
    } catch (e) {
      // Abbrechen im Teilen-Menue ist kein Fehler und braucht keine Meldung.
      if (e?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success('In die Zwischenablage kopiert.');
      } catch {
        toast.error('Konnte nicht geteilt werden.');
      }
    }
  };

  const loeschen = async (v) => {
    if (!window.confirm(`„${katalog.find((b) => b.id === v.bier_id)?.name || 'Dieses Bier'}" von dieser Börse entfernen?`)) return;
    const { error } = await supabaseDb.delete('bier_verkostungen', v.id);
    if (error) toast.error('Konnte nicht entfernt werden.');
    else { toast.success('Entfernt.'); onAendern(); }
  };

  return (
    <div className="modern-card overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-system-yellow/12 text-system-yellow flex items-center justify-center flex-shrink-0">
            <Icon name="beer" size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-callout font-semibold text-text-primary truncate">{boerse.name}</div>
            <div className="text-caption1 text-text-secondary truncate">
              {datum(boerse.datum)}{boerse.ort ? ` · ${boerse.ort}` : ''}
            </div>
          </div>
          <Icon name={offen ? 'chevronUp' : 'chevronDown'} size={18} strokeWidth={2.4}
                className="text-text-tertiary flex-shrink-0 mt-1" />
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            ['Biere', stat.biere],
            ['Gläser', stat.glaeser],
            ['Liter', stat.liter.toLocaleString('de-DE', { maximumFractionDigits: 1 })],
            ['Ausgaben', euro(stat.ausgaben)],
          ].map(([label, wert]) => (
            <div key={label} className="text-center">
              <div className="stat-display text-[15px] num-tabular text-text-primary truncate">{wert}</div>
              <div className="text-caption2 text-text-tertiary">{label}</div>
            </div>
          ))}
        </div>
      </button>

      {offen && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-light pt-3">
          {boerse.notiz && (
            <p className="text-caption1 text-text-secondary italic">{boerse.notiz}</p>
          )}

          {/* Pro Person: getrunken, ausgegeben, wie streng bewertet */}
          <div className="grid grid-cols-2 gap-2">
            {PERSONEN.map((p) => {
              const s = stat.proPerson[p.team];
              return (
                <div key={p.key} className="panel-gray rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TeamLogo team={p.key} size="xs" />
                    <span className={`text-footnote font-semibold truncate ${p.farbe}`}>{p.name}</span>
                  </div>
                  <div className="space-y-0.5 text-caption1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Gläser</span>
                      <span className="num-tabular text-text-primary">{s.glaeser}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Liter</span>
                      <span className="num-tabular text-text-primary">
                        {(s.ml / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Ausgaben</span>
                      <span className="num-tabular text-text-primary">{euro(s.ausgaben)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Ø Note</span>
                      <span className="num-tabular text-text-primary">
                        {note(s.schnitt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {stat.standardglaeser > 0 && (
            <p className="text-caption2 text-text-tertiary">
              Zusammen rund {stat.standardglaeser.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Standardgläser
              reiner Alkohol ({(stat.alkoholMl / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 })} cl).
            </p>
          )}

          {/* Wer hat bezahlt — erst sinnvoll, sobald an einer Runde ein Zahler steht */}
          {kasse.zugeordnet > 0 && (
            <div className="panel-gray rounded-xl p-3">
              <div className="text-footnote font-semibold text-text-muted mb-2">Rechnung</div>
              {/* Kleine Tabelle statt drei Angaben je Zeile: Name, Betrag und
                  zweiter Betrag passten auf 375px nicht nebeneinander, der
                  erste Betrag wurde abgeschnitten. */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-caption1">
                <span />
                <span className="text-caption2 text-text-tertiary text-right">gezahlt</span>
                <span className="text-caption2 text-text-tertiary text-right">vertrunken</span>
                {PERSONEN.map((p) => (
                  <Fragment key={p.key}>
                    <span className={`font-semibold truncate ${p.farbe}`}>{p.name}</span>
                    <span className="num-tabular text-text-secondary text-right">
                      {euro(kasse[p.team].bezahlt)}
                    </span>
                    <span className="num-tabular text-text-primary text-right">
                      {euro(kasse[p.team].getrunken)}
                    </span>
                  </Fragment>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-border-light text-caption1">
                {Math.abs(kasse.ausgleich) < 0.01 ? (
                  <span className="text-system-green font-semibold">Ausgeglichen — keiner schuldet dem anderen etwas.</span>
                ) : (
                  <span className="text-text-primary">
                    <span className={kasse.ausgleich > 0 ? 'text-system-red font-semibold' : 'text-system-blue font-semibold'}>
                      {kasse.ausgleich > 0 ? 'Philip' : 'Alexander'}
                    </span>
                    {' schuldet '}
                    {kasse.ausgleich > 0 ? 'Alexander' : 'Philip'}
                    {' '}
                    <span className="num-tabular font-bold">{euro(Math.abs(kasse.ausgleich))}</span>.
                  </span>
                )}
              </div>
              {kasse.offeneRunden > 0 && (
                <p className="text-caption2 text-text-tertiary mt-1.5">
                  {kasse.offeneRunden === 1 ? 'Bei einem Bier' : `Bei ${kasse.offeneRunden} Bieren`} steht kein Zahler
                  ({euro(kasse.offen)}) — nicht mitgerechnet.
                </p>
              )}
            </div>
          )}

          {/* EINE Liste statt zweier.
              Vorher standen dieselben Biere zweimal da: als "Bestenliste"
              mit Brauerei und Preis, und darunter als "Alle Biere" mit
              Glaesern und Zahler. Wer wissen wollte, was ein Bier gekostet
              hat UND wer es bezahlt hat, musste zwischen zwei Listen
              springen und beide Male denselben Namen suchen. */}
          {verkostungen.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-footnote font-semibold text-text-muted">
                  {verkostungen.length} {verkostungen.length === 1 ? 'Bier' : 'Biere'}
                </span>
                {/* Die Reihenfolge war vorher fest: die eine Liste nach Note,
                    die andere nach Eingabe. Jetzt entscheidet man es. */}
                {verkostungen.length > 1 && (
                  <div className="flex gap-1 p-0.5 bg-bg-tertiary rounded-lg">
                    {[['note', 'Nach Note'], ['reihe', 'Der Reihe nach']].map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setBierSort(id)}
                              aria-pressed={bierSort === id}
                              className={`px-2 py-1 rounded-md text-caption2 font-semibold transition-colors ${
                                bierSort === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {sortierteBiere.map((v, i) => {
                  const bier = v.bier;
                  const zahler = ZAHLER.find((z) => z.id === v.bezahlt_von);
                  const glaeser = (v.anzahl_aek || 0) + (v.anzahl_real || 0);
                  // Was die Runde gekostet hat, nicht was ein Glas kostet —
                  // das ist die Zahl, um die es beim Zahler geht.
                  const rundenSumme = v.preis != null ? Number(v.preis) * glaeser : null;
                  return (
                    <div key={v.id} className="panel-gray rounded-xl p-2.5">
                      <div className="flex items-start gap-2.5">
                        {/* Platzziffer nur farbig, wenn nach Note sortiert
                            ist. In Eingabereihenfolge waere eine gelbe "1"
                            der erste Eintrag und nicht der beste. */}
                        <span className={`w-5 text-center text-sm font-bold flex-shrink-0 mt-0.5 num-tabular ${
                          bierSort !== 'note' ? 'text-text-tertiary'
                          : i === 0 ? 'text-system-yellow' : i === 1 ? 'text-text-secondary'
                          : i === 2 ? 'text-system-orange' : 'text-text-tertiary'}`}>
                          {i + 1}
                        </span>

                        <button type="button" onClick={() => bier && onBier(bier)} disabled={!bier}
                                className="min-w-0 flex-1 text-left disabled:cursor-default">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm text-text-primary truncate">{bier?.name || '—'}</span>
                            <span className="ml-auto num-tabular text-sm font-bold text-text-primary flex-shrink-0">
                              {note(v.note)}
                            </span>
                          </div>
                          <div className="text-caption2 text-text-tertiary truncate">
                            {[bier?.brauerei, bier?.art,
                              bier?.alkohol ? prozent(bier.alkohol) : null,
                              v.groesse_ml ? `${v.groesse_ml} ml` : null,
                              v.preis != null ? `${euro(v.preis)} je Glas` : null]
                              .filter(Boolean).join(' · ') || 'keine Angaben'}
                          </div>
                          <div className="mt-1"><Kruege note={v.note} /></div>
                        </button>

                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => onBearbeiten(v)}
                                  className="w-8 h-8 rounded-lg bg-bg-tertiary text-text-secondary flex items-center justify-center"
                                  aria-label={`${bier?.name || 'Eintrag'} bearbeiten`}>
                            <Icon name="edit" size={15} strokeWidth={2.2} />
                          </button>
                          <button onClick={() => loeschen(v)}
                                  className="w-8 h-8 rounded-lg bg-system-red/10 text-system-red flex items-center justify-center"
                                  aria-label={`${bier?.name || 'Eintrag'} entfernen`}>
                            <Icon name="trash" size={15} strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>

                      {/* Wer hat wie viel getrunken, und wer hat bezahlt —
                          in EINER Zeile unter dem Bier statt in einer
                          zweiten Liste weiter unten. */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pl-7">
                        {PERSONEN.map((p) => {
                          const anzahl = (p.key === 'aek' ? v.anzahl_aek : v.anzahl_real) || 0;
                          const eigene = p.key === 'aek' ? v.note_aek : v.note_real;
                          // Wer nichts getrunken und nichts bewertet hat,
                          // bekommt kein Chip — ein "0x" ist keine Angabe.
                          if (!anzahl && eigene == null) return null;
                          return (
                            <span key={p.key}
                                  className={`chip chip-sm ${p.key === 'aek' ? 'chip-blue' : 'chip-red'}`}>
                              {p.name} {anzahl}×{eigene != null ? ` · ${note(eigene)}` : ''}
                            </span>
                          );
                        })}

                        {/* Der Zahler mit dem Betrag der Runde. Vorher stand
                            hier nur "zahlt Philip" — die Zahl, um die es
                            geht, musste man sich selbst ausrechnen. */}
                        {zahler ? (
                          <span className={`chip chip-sm chip-gray ml-auto ${zahler.farbe}`}>
                            {zahler.id === 'geteilt' ? 'geteilt' : `${zahler.label} zahlt`}
                            {rundenSumme != null ? ` ${euro(rundenSumme)}` : ''}
                          </span>
                        ) : (
                          // "Kein Zahler" heisst: faellt aus der Rechnung
                          // raus. Das gehoert ans Bier, nicht nur in die
                          // Fussnote unter der Rechnung.
                          <span className="chip chip-sm chip-gray ml-auto">
                            kein Zahler{rundenSumme != null ? ` · ${euro(rundenSumme)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onNeuesBier} className="btn-secondary flex-1">
              <Icon name="plus" size={16} strokeWidth={2.6} className="mr-1.5" />
              Bier eintragen
            </button>
            {/* Ändern und Löschen liegen bewusst hier unten im aufgeklappten
                Bereich — nicht neben dem Kopf, wo man beim Auf- und Zuklappen
                danebentippen kann. */}
            {/* Zwei Wege statt einem: Text zum Nachlesen, Bild zum
                Verschicken. Vorher gab es nur den Text, und der landet im
                Chat als Wand aus Zeilen. */}
            <button onClick={() => setBildOffen(true)}
                    className="w-11 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                    aria-label="Abend als Bild" title="Abend als Bild">
              <Icon name="eye" size={16} strokeWidth={2.2} />
            </button>
            <button onClick={teilen}
                    className="w-11 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                    aria-label="Abend als Text teilen" title="Abend als Text teilen">
              <Icon name="share" size={16} strokeWidth={2.2} />
            </button>
            <button onClick={onBoerseBearbeiten}
                    className="w-11 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                    aria-label="Bierbörse ändern" title="Bierbörse ändern">
              <Icon name="edit" size={16} strokeWidth={2.2} />
            </button>
            <button onClick={boerseLoeschen}
                    className="w-11 rounded-xl bg-system-red/10 text-system-red flex items-center justify-center flex-shrink-0"
                    aria-label="Bierbörse löschen" title="Bierbörse löschen">
              <Icon name="trash" size={16} strokeWidth={2.2} />
            </button>
          </div>

          {bildOffen && (
            <AbendBild boerse={boerse} verkostungen={verkostungen} katalog={katalog}
                       onSchliessen={() => setBildOffen(false)} />
          )}
        </div>
      )}
    </div>
  );
}

/** Katalogansicht: alle Biere über alle Börsen hinweg. */
function KatalogAnsicht({ katalog, verkostungen, boersen, onBier }) {
  const [suche, setSuche] = useState('');
  const [art, setArt] = useState('alle');
  const [brauerei, setBrauerei] = useState('alle');
  const [land, setLand] = useState('alle');
  // 'note' ist die bisherige Reihenfolge (Bestenliste). 'brauerei' gruppiert
  // stattdessen — sinnvoll, wenn man wissen will, was man von wem schon hatte.
  const [sortierung, setSortierung] = useState('note');

  const funde = useMemo(() => bierFundstuecke(verkostungen, katalog), [verkostungen, katalog]);
  const sorten = useMemo(() => sortenVerteilung(verkostungen, katalog), [verkostungen, katalog]);

  const liste = useMemo(() => {
    const alle = katalogBestenListe(verkostungen, katalog);
    const s = suche.trim().toLowerCase();
    // Den Rang aus der Bestenliste festhalten, BEVOR umsortiert wird.
    //
    // Die Zahl links war der Listenplatz (i + 1). Nach Note stimmt das
    // zufaellig mit dem Rang ueberein — nach Brauerei sortiert waere sie eine
    // fortlaufende Nummer ohne Bedeutung, und der gelb hervorgehobene "Erste"
    // waere nur die alphabetisch erste Brauerei.
    const mitRang = alle.map((e, i) => ({ ...e, rang: i + 1 }));
    const gefiltert = mitRang.filter((e) =>
      (art === 'alle' || e.bier.art === art) &&
      (brauerei === 'alle' || (e.bier.brauerei || '') === brauerei) &&
      (land === 'alle' || (e.bier.land || '') === land) &&
      (!s || e.bier.name.toLowerCase().includes(s) ||
        String(e.bier.brauerei || '').toLowerCase().includes(s)));

    // Nach Brauerei sortieren heisst: Brauerei zuerst, innerhalb davon der
    // Name. Sonst stuenden die Biere einer Brauerei zwar beieinander, aber in
    // zufaelliger Reihenfolge. Biere OHNE Brauerei ans Ende, nicht an den
    // Anfang — sonst begruesst die Liste einen mit dem Unbekannten.
    if (sortierung === 'brauerei') {
      return [...gefiltert].sort((x, y) => {
        const bx = x.bier.brauerei || '';
        const by = y.bier.brauerei || '';
        if (!bx !== !by) return bx ? -1 : 1;
        return String(bx).localeCompare(String(by), 'de')
          || String(x.bier.name).localeCompare(String(y.bier.name), 'de');
      });
    }
    return gefiltert;
  }, [katalog, verkostungen, suche, art, brauerei, land, sortierung]);

  const brauereien = useMemo(
    () => [...new Set(katalog.map((b) => b.brauerei).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'de')),
    [katalog]);

  const arten = useMemo(
    () => [...new Set(katalog.map((b) => b.art).filter(Boolean))].sort(),
    [katalog]
  );

  const laender = useMemo(
    () => [...new Set(katalog.map((b) => b.land).filter(Boolean))].sort(),
    [katalog]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon name="search" size={16} strokeWidth={2.2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input type="search" value={suche} onChange={(e) => setSuche(e.target.value)}
               placeholder="Bier oder Brauerei suchen…" className="form-input w-full pl-9" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {arten.length > 0 && (
          <select value={art} onChange={(e) => setArt(e.target.value)} className="form-input w-full text-sm">
            <option value="alle">Alle Sorten</option>
            {arten.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {brauereien.length > 0 && (
          <select value={brauerei} onChange={(e) => setBrauerei(e.target.value)} className="form-input w-full text-sm">
            <option value="alle">Alle Brauereien</option>
            {brauereien.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        {/* Nur zeigen, wenn wirklich mehrere Laender vorkommen. Bei einer
            reinen Deutschland-Sammlung waere das ein Filter, der nichts
            filtert. */}
        {laender.length > 1 && (
          <select value={land} onChange={(e) => setLand(e.target.value)}
                  className="form-input w-full text-sm col-span-2">
            <option value="alle">Alle Länder</option>
            {laender.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {[['note', 'Nach Note'], ['brauerei', 'Nach Brauerei']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSortierung(id)}
                  aria-pressed={sortierung === id}
                  className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
                    sortierung === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between px-1">
        <span className="text-caption1 text-text-secondary">{liste.length} Biere</span>
        <span className="text-caption1 text-text-tertiary">{boersen.length} Börsen</span>
      </div>

      {liste.length === 0 ? (
        <div className="modern-card p-8 text-center text-text-muted">Noch nichts im Katalog.</div>
      ) : (
        <div className="modern-card divide-y divide-border-light">
          {liste.map((e) => (
            /* Gestapelt statt alles in einer Zeile: Krüge, Note und Rang
               fressen auf 375px so viel Breite, dass für den Text keine 100px
               blieben — da wurde schon der Biername abgeschnitten. Jetzt
               stehen Name und Note oben, die Angaben darunter über die volle
               Breite. */
            <button key={e.bier_id} type="button" onClick={() => onBier(e.bier)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left">
              <span className={`w-5 text-center text-sm font-bold flex-shrink-0 mt-0.5 ${
                e.rang === 1 ? 'text-system-yellow' : 'text-text-tertiary'}`}>{e.rang}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-text-primary truncate">{e.bier.name}</span>
                  <span className="ml-auto num-tabular text-sm font-bold text-text-primary flex-shrink-0">
                    {note(e.note)}
                  </span>
                </div>
                <div className="text-caption2 text-text-tertiary">
                  {[e.bier.brauerei, e.bier.art, e.bier.alkohol ? prozent(e.bier.alkohol) : null,
                    `${e.glaeser}× getrunken`,
                    e.preisSchnitt != null ? `Ø ${euro(e.preisSchnitt)}` : null].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-1"><Kruege note={e.note} /></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Auswertungen — sie beziehen sich auf ALLE Biere, deshalb erst unter der
          Liste und nur, solange nicht gefiltert wird. Sonst stünden hier Zahlen,
          die zu dem darüber nicht passen. */}
      {suche.trim() === '' && art === 'alle' && (
        <>
          {sorten.length > 1 && (
            <div className="modern-card p-4">
              <div className="text-footnote font-semibold text-text-muted mb-2.5">Nach Sorte</div>
              <div className="space-y-2">
                {sorten.map((s) => {
                  const anteil = sorten[0].glaeser ? (s.glaeser / sorten[0].glaeser) * 100 : 0;
                  return (
                    <div key={s.art}>
                      <div className="flex items-baseline gap-2 text-caption1 mb-0.5">
                        <span className="text-text-primary truncate">{s.art}</span>
                        <span className="ml-auto num-tabular text-text-secondary flex-shrink-0">
                          {s.glaeser} {s.glaeser === 1 ? 'Glas' : 'Gläser'}
                        </span>
                        <span className="num-tabular text-text-tertiary w-8 text-right flex-shrink-0">
                          {note(s.schnitt)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className="h-full rounded-full bg-system-yellow" style={{ width: `${anteil}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-caption2 text-text-tertiary mt-2">
                Balken zeigen die Gläser, die Zahl rechts die Durchschnittsnote der Sorte.
              </p>
            </div>
          )}

          {funde.length > 0 && (
            <div className="modern-card p-4">
              <div className="text-footnote font-semibold text-text-muted mb-2.5">Fundstücke</div>
              <div className="space-y-2.5">
                {funde.map((f) => (
                  <div key={f.id} className="flex items-start gap-2.5">
                    <Icon name={f.icon} size={16} strokeWidth={2.2}
                          className={`${f.farbe} flex-shrink-0 mt-0.5`} />
                    <div className="min-w-0">
                      <div className="text-caption1 font-semibold text-text-primary">{f.titel}</div>
                      <div className="text-caption1 text-text-secondary">{f.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Bilanz über alle Börsen.
 *
 * Bis hierher endete jede Auswertung an der Börsengrenze: die Karte zeigte
 * einen Abend, das Bier-Detail ein Bier. Wie viel ihr insgesamt getrunken und
 * ausgegeben habt, wie sich das über die Abende entwickelt und wie weit euer
 * Geschmack auseinanderliegt, stand nirgends.
 */
function BilanzAnsicht({ boersen, verkostungen, katalog }) {
  const b = useMemo(() => gesamtBilanz(boersen, verkostungen, katalog), [boersen, verkostungen, katalog]);
  const duell = useMemo(() => geschmacksDuell(verkostungen, katalog), [verkostungen, katalog]);
  const profil = useMemo(() => kategorienProfil(verkostungen), [verkostungen]);
  const sorten = useMemo(() => sortenVorliebe(verkostungen, katalog), [verkostungen, katalog]);
  const pl = useMemo(() => preisLeistung(verkostungen, katalog), [verkostungen, katalog]);
  const anti = useMemo(() => antiRekorde(verkostungen, boersen, katalog), [verkostungen, boersen, katalog]);
  const wieder = useMemo(() => wiederkauf(verkostungen, katalog), [verkostungen, katalog]);
  const drift = useMemo(() => notenDrift(verkostungen, boersen), [verkostungen, boersen]);
  const brauereien = useMemo(() => brauereiStatistik(verkostungen, katalog), [verkostungen, katalog]);
  const herkunft = useMemo(() => herkunftVerteilung(verkostungen, katalog), [verkostungen, katalog]);
  const staerke = useMemo(() => alkoholVerlauf(verkostungen, katalog), [verkostungen, katalog]);
  const je100 = useMemo(() => preisJe100ml(verkostungen, katalog), [verkostungen, katalog]);
  // Vorbelegt mit den beiden juengsten Abenden — die will man am ehesten
  // vergleichen, und so steht die Karte sofort mit Inhalt da.
  const [vergleichA, setVergleichA] = useState(null);
  const [vergleichB, setVergleichB] = useState(null);
  const sortierteBoersen = useMemo(
    () => [...(boersen || [])].sort((a, b) => String(b.datum || '').localeCompare(String(a.datum || ''))),
    [boersen]);
  const linkeBoerse = sortierteBoersen.find((b) => b.id === vergleichA) || sortierteBoersen[0] || null;
  const rechteBoerse = sortierteBoersen.find((b) => b.id === vergleichB)
    || sortierteBoersen.find((b) => b.id !== linkeBoerse?.id) || null;
  const kennzahlenA = useMemo(
    () => abendKennzahlen(linkeBoerse, verkostungen, katalog), [linkeBoerse, verkostungen, katalog]);
  const kennzahlenB = useMemo(
    () => abendKennzahlen(rechteBoerse, verkostungen, katalog), [rechteBoerse, verkostungen, katalog]);

  const kommaEins = (n, stellen = 1) =>
    n == null ? '—' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: stellen });

  if (!boersen.length) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="chart" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Börse zum Auswerten.</p>
      </div>
    );
  }

  const maxGlaeser = Math.max(1, ...b.proBoerse.map((e) => e.glaeser));
  const aekSumme = b.proPerson[PERSONEN[0].team];
  const realSumme = b.proPerson[PERSONEN[1].team];

  const rekorde = [
    b.rekorde.groessterAbend && {
      id: 'gross', icon: 'beer', farbe: 'text-system-yellow', titel: 'Längster Abend',
      text: b.rekorde.groessterAbend.boerse.name + ' — ' + b.rekorde.groessterAbend.glaeser + ' Gläser.',
    },
    b.rekorde.teuersterAbend && {
      id: 'teuer', icon: 'euro', farbe: 'text-system-orange', titel: 'Teuerster Abend',
      text: b.rekorde.teuersterAbend.boerse.name + ' — ' + euro(b.rekorde.teuersterAbend.ausgaben) + '.',
    },
    b.rekorde.besterAbend && {
      id: 'best', icon: 'star', farbe: 'text-system-green', titel: 'Bester Abend',
      text: b.rekorde.besterAbend.boerse.name + ' — Schnitt ' + note(b.rekorde.besterAbend.schnitt) + '.',
    },
    b.rekorde.teuerstesGlas && {
      id: 'literTeuer', icon: 'trendingUp', farbe: 'text-system-red', titel: 'Teuerster Liter',
      text: (b.rekorde.teuerstesGlas.bier?.name || 'Unbekannt') + ' — ' + euro(b.rekorde.teuerstesGlas.preis) + ' je Liter.',
    },
    b.rekorde.guenstigstesGlas && {
      id: 'literGuenstig', icon: 'wallet', farbe: 'text-system-blue', titel: 'Günstigster Liter',
      text: (b.rekorde.guenstigstesGlas.bier?.name || 'Unbekannt') + ' — ' + euro(b.rekorde.guenstigstesGlas.preis) + ' je Liter.',
    },
    // Anti-Rekorde: wo die Erinnerung getruegt hat. Nur wenn dasselbe Bier
    // wirklich zweimal bewertet wurde.
    anti.absturz && {
      id: 'absturz', icon: 'trendingUp', farbe: 'text-system-red', titel: 'Enttäuschung beim Wiedersehen',
      text: anti.absturz.bier.name + ': ' + note(anti.absturz.erste.note) + ' auf '
        + anti.absturz.letzte.boerse.name + ' nur noch ' + note(anti.absturz.letzte.note) + '.',
    },
    anti.aufsteiger && {
      id: 'aufsteiger', icon: 'sparkles', farbe: 'text-system-green', titel: 'Beim zweiten Mal besser',
      text: anti.aufsteiger.bier.name + ': ' + note(anti.aufsteiger.erste.note) + ' auf '
        + anti.aufsteiger.letzte.boerse.name + ' schon ' + note(anti.aufsteiger.letzte.note) + '.',
    },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Alles zusammen */}
      <div className="modern-card p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Börsen', b.boersen],
            ['Biere', b.verschiedeneBiere],
            ['Gläser', b.glaeser],
            ['Liter', kommaEins(b.liter)],
            ['Ausgaben', euro(b.ausgaben)],
            ['Ø je Glas', b.glaeser ? euro(b.ausgaben / b.glaeser) : '—'],
          ].map(([label, wert]) => (
            <div key={label} className="text-center">
              <div className="stat-display text-[15px] num-tabular text-text-primary truncate">{wert}</div>
              <div className="text-caption2 text-text-tertiary">{label}</div>
            </div>
          ))}
        </div>
        {b.standardglaeser > 0 && (
          <p className="text-caption2 text-text-tertiary mt-3 pt-3 border-t border-border-light">
            Zusammen rund {kommaEins(b.standardglaeser)} Standardgläser reiner Alkohol
            über {b.boersen} {b.boersen === 1 ? 'Abend' : 'Abende'}.
          </p>
        )}
      </div>

      {/* Je Person über alles.
          Standen als zwei Karten nebeneinander, jede mit vier Zeilen
          "Schlüssel — Wert". Wer wissen wollte, ob er mehr getrunken oder mehr
          ausgegeben hat als der andere, musste die Zahlen quer über die Lücke
          zwischen den Karten vergleichen. Als geteilte Fläche ist genau das
          die Darstellung — dieselbe wie im Duell und in der Statistik. */}
      <div className="modern-card p-4">
        <div className="text-footnote font-semibold text-text-muted mb-1">Wer wie viel</div>
        <div className="divide-y divide-border-light">
          <Kraefteverhaeltnis
            label="Gläser" aek={aekSumme.glaeser} real={realSumme.glaeser}
            aekName={PERSONEN[0].name} realName={PERSONEN[1].name} />
          <Kraefteverhaeltnis
            label="Liter" aek={aekSumme.ml / 1000} real={realSumme.ml / 1000}
            anzeige={(n) => kommaEins(n, 2)}
            aekName={PERSONEN[0].name} realName={PERSONEN[1].name} />
          <Kraefteverhaeltnis
            label="Ausgaben" aek={aekSumme.ausgaben} real={realSumme.ausgaben}
            anzeige={(n) => euro(n)}
            aekName={PERSONEN[0].name} realName={PERSONEN[1].name} />
          {/* Die Note nicht als geteilte Fläche, sondern auf ihrer Skala —
              warum, steht bei Notenvergleich. */}
          <Notenvergleich
            label="Ø Note (0–10)"
            aek={aekSumme.schnitt} real={realSumme.schnitt}
            aekName={PERSONEN[0].name} realName={PERSONEN[1].name} />
        </div>
      </div>

      {/* Geschmacks-Duell */}
      {duell.anzahl > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Geschmacks-Duell</div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="stat-display text-[15px] num-tabular text-text-primary">
                {kommaEins(duell.einigkeit, 0)} %
              </div>
              <div className="text-caption2 text-text-tertiary">einig</div>
            </div>
            <div className="text-center">
              <div className="stat-display text-[15px] num-tabular text-text-primary">
                {note(duell.abstandSchnitt)}
              </div>
              <div className="text-caption2 text-text-tertiary">Ø Abstand</div>
            </div>
            <div className="text-center">
              <div className="stat-display text-[15px] num-tabular text-text-primary">{duell.anzahl}</div>
              <div className="text-caption2 text-text-tertiary">verglichen</div>
            </div>
          </div>

          {/* Je Kategorie: wer vergibt hier mehr Punkte */}
          {duell.proKategorie.length > 0 && (
            <div className="divide-y divide-border-light mb-3">
              {duell.proKategorie.map((k) => (
                <Notenvergleich
                  key={k.id} klein
                  label={k.label}
                  aek={k.aek} real={k.real}
                  aekName={PERSONEN[0].name} realName={PERSONEN[1].name} />
              ))}
            </div>
          )}

          <div className="space-y-1.5 text-caption1">
            {/* Beide Namen mit IHRER Zahl. Vorher stand da "Philip bewertet
                strenger — 7,5 gegen 7,0", wobei die 7,5 Alexanders Schnitt
                war: der Satz nannte den einen und begann mit dem Wert des
                anderen. */}
            {duell.strenger && (
              <p className="text-text-secondary">
                <span className="text-system-blue font-semibold">Alexander</span>
                {' '}
                <span className="num-tabular text-text-primary">{note(duell.schnittAek)}</span>
                {' · '}
                <span className="text-system-red font-semibold">Philip</span>
                {' '}
                <span className="num-tabular text-text-primary">{note(duell.schnittReal)}</span>
                {' — '}
                {duell.strenger === 'AEK' ? 'Alexander' : 'Philip'} bewertet strenger.
              </p>
            )}
            {duell.streit && (
              <p className="text-text-secondary">
                {'Größter Streit: '}
                <span className="text-text-primary font-semibold">{duell.streit.bier?.name || 'Unbekannt'}</span>
                {' — '}
                <span className="num-tabular text-system-blue">{note(duell.streit.aek)}</span>
                {' gegen '}
                <span className="num-tabular text-system-red">{note(duell.streit.real)}</span>.
              </p>
            )}
            {duell.einigkeitsbier && (
              <p className="text-text-secondary">
                {'Da wart ihr euch einig: '}
                <span className="text-text-primary font-semibold">{duell.einigkeitsbier.bier?.name || 'Unbekannt'}</span>
                {' mit '}
                <span className="num-tabular">
                  {note((duell.einigkeitsbier.aek + duell.einigkeitsbier.real) / 2)}
                </span>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Preis-Leistung */}
      {pl.sieger && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Preis-Leistung</div>

          <div className="flex items-start gap-3 mb-3">
            <span className="w-10 h-10 rounded-xl bg-system-green/15 text-system-green flex items-center justify-center flex-shrink-0">
              <Icon name="award" size={20} strokeWidth={2.1} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-caption2 text-text-tertiary">Sieger nach Punkten je Euro</div>
              <div className="font-semibold text-text-primary truncate">{pl.sieger.bier.name}</div>
              <div className="text-caption2 text-text-secondary num-tabular">
                {note(pl.sieger.note)} von 10 für {euro(pl.sieger.literpreis)} je Liter
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="stat-display text-xl text-system-green num-tabular leading-none">
                {note(pl.sieger.punkteJeEuro)}
              </div>
              <div className="text-caption2 text-text-tertiary mt-0.5">P/€</div>
            </div>
          </div>

          {/* Die Rangliste, damit die Zahl nachvollziehbar bleibt */}
          <div className="space-y-1.5">
            {pl.gerechnet.slice(0, 5).map((e, i) => {
              const anteil = pl.sieger.punkteJeEuro
                ? (e.punkteJeEuro / pl.sieger.punkteJeEuro) * 100 : 0;
              return (
                <div key={e.bier.id}>
                  <div className="flex items-baseline gap-2 text-caption2 mb-0.5">
                    <span className={`w-4 text-center font-bold flex-shrink-0 ${
                      i === 0 ? 'text-system-green' : 'text-text-tertiary'}`}>{i + 1}</span>
                    <span className="text-text-primary truncate">{e.bier.name}</span>
                    <span className="ml-auto num-tabular text-text-tertiary flex-shrink-0">
                      {euro(e.literpreis)}/l
                    </span>
                    <span className="num-tabular text-text-secondary w-8 text-right flex-shrink-0">
                      {note(e.punkteJeEuro)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden ml-6">
                    <div className="h-full rounded-full bg-system-green" style={{ width: `${anteil}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 space-y-1 text-caption1 text-text-secondary">
            {/* Gerechnet gegen gefuehlt — wenn beide auseinanderlaufen, ist
                das die eigentliche Aussage. */}
            {pl.gefuehlterSieger && (
              pl.einig ? (
                <p>
                  Eure eigene Preis-Leistungs-Note sieht es genauso:{' '}
                  <span className="text-text-primary font-semibold">{pl.gefuehlterSieger.bier.name}</span>
                  {' mit '}<span className="num-tabular">{note(pl.gefuehlterSieger.note)}</span>.
                </p>
              ) : (
                <p>
                  Gefühlt liegt allerdings{' '}
                  <span className="text-text-primary font-semibold">{pl.gefuehlterSieger.bier.name}</span>
                  {' vorn ('}<span className="num-tabular">{note(pl.gefuehlterSieger.note)}</span>
                  {' in der Kategorie Preis-Leistung) — die Rechnung kennt eben nicht, dass manches sein Geld wert ist.'}
                </p>
              )
            )}
            {pl.teuerUndMau && (
              <p>
                Am wenigsten fürs Geld gab es bei{' '}
                <span className="text-text-primary font-semibold">{pl.teuerUndMau.bier.name}</span>
                {': '}<span className="num-tabular">{euro(pl.teuerUndMau.literpreis)}</span>
                {' je Liter für '}<span className="num-tabular">{note(pl.teuerUndMau.note)}</span>
                {' Punkte.'}
              </p>
            )}
          </div>
          <p className="text-caption2 text-text-tertiary mt-2">
            Punkte je Euro = Durchschnittsnote geteilt durch den Literpreis. Der Literpreis,
            weil 0,3 l und 0,5 l sonst nicht vergleichbar sind.
          </p>
        </div>
      )}

      {/* Wo die Strenge sitzt */}
      {profil.length > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-1">Streng und milde</div>
          <p className="text-caption2 text-text-tertiary mb-2.5">
            Wie weit jede Kategorie über oder unter der Gesamtnote derselben Bewertung liegt.
          </p>
          <div className="space-y-2">
            {profil.map((k) => {
              // Der Balken geht von der Mitte nach links (strenger) oder
              // rechts (milder). Zwei Punkte Abstand fuellen ihn ganz aus —
              // mehr kommt in der Praxis kaum vor.
              const anteil = Math.min(Math.abs(k.abstand) / 2, 1) * 50;
              const streng = k.abstand < 0;
              return (
                <div key={k.id}>
                  <div className="flex items-baseline gap-2 text-caption2 mb-1">
                    <span className="text-text-secondary truncate">{k.label}</span>
                    <span className={`ml-auto num-tabular font-semibold flex-shrink-0 ${
                      streng ? 'text-system-red' : 'text-system-green'}`}>
                      {k.abstand > 0 ? '+' : ''}{note(k.abstand)}
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border-light" />
                    <div className={`absolute inset-y-0 rounded-full ${streng ? 'bg-system-red' : 'bg-system-green'}`}
                         style={streng
                           ? { right: '50%', width: `${anteil}%` }
                           : { left: '50%', width: `${anteil}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {profil[0] && profil[0].abstand < -0.3 && (
            <p className="text-caption1 text-text-secondary mt-2.5">
              Am strengsten seid ihr bei <span className="font-semibold text-text-primary">{profil[0].label}</span>
              {' — im Schnitt '}
              <span className="num-tabular">{note(Math.abs(profil[0].abstand))}</span>
              {' Punkte unter der Gesamtnote.'}
            </p>
          )}
        </div>
      )}

      {/* Sorten-Vorliebe */}
      {sorten.sorten.length > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-1">Wer mag was</div>
          <p className="text-caption2 text-text-tertiary mb-2.5">
            Durchschnittsnote je Sorte, getrennt nach euch beiden.
          </p>
          <div className="space-y-2">
            {sorten.sorten.map((e) => (
              <div key={e.art}>
                <div className="flex items-baseline gap-2 text-caption2 mb-1">
                  <span className="text-text-primary truncate">{e.art}</span>
                  <span className="ml-auto num-tabular text-system-blue font-semibold">{note(e.aek)}</span>
                  <span className="text-text-tertiary">:</span>
                  <span className="num-tabular text-system-red font-semibold">{note(e.real)}</span>
                </div>
                <div className="flex gap-0.5">
                  <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full rounded-full bg-system-blue ml-auto"
                         style={{ width: `${((e.aek || 0) / 10) * 100}%` }} />
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full rounded-full bg-system-red"
                         style={{ width: `${((e.real || 0) / 10) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 space-y-0.5 text-caption1 text-text-secondary">
            {sorten.lieblingAek && (
              <p>
                <span className="text-system-blue font-semibold">Alexander</span> mag{' '}
                <span className="text-text-primary font-semibold">{sorten.lieblingAek.art}</span> am liebsten
                {' ('}<span className="num-tabular">{note(sorten.lieblingAek.aek)}</span>{')'}.
              </p>
            )}
            {sorten.lieblingReal && (
              <p>
                <span className="text-system-red font-semibold">Philip</span> mag{' '}
                <span className="text-text-primary font-semibold">{sorten.lieblingReal.art}</span> am liebsten
                {' ('}<span className="num-tabular">{note(sorten.lieblingReal.real)}</span>{')'}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Zwei Abende nebeneinander */}
      {sortierteBoersen.length > 1 && kennzahlenA && kennzahlenB && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Zwei Abende vergleichen</div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { wert: linkeBoerse.id, setzen: setVergleichA, farbe: 'text-system-blue' },
              { wert: rechteBoerse.id, setzen: setVergleichB, farbe: 'text-system-red' },
            ].map((seite, i) => (
              <select key={i} value={seite.wert}
                      onChange={(e) => seite.setzen(Number(e.target.value))}
                      className={`form-input w-full text-sm font-semibold ${seite.farbe}`}
                      aria-label={i === 0 ? 'Linker Abend' : 'Rechter Abend'}>
                {sortierteBoersen.map((bo) => (
                  <option key={bo.id} value={bo.id}>{bo.name}</option>
                ))}
              </select>
            ))}
          </div>

          {linkeBoerse.id === rechteBoerse.id ? (
            <p className="text-caption1 text-text-tertiary">Zweimal derselbe Abend — such rechts einen anderen aus.</p>
          ) : (
            <div className="space-y-1.5">
              {[
                ['Biere', kennzahlenA.biere, kennzahlenB.biere, false],
                ['Gläser', kennzahlenA.glaeser, kennzahlenB.glaeser, false],
                ['Liter', kennzahlenA.liter, kennzahlenB.liter, false, (n) => kommaEins(n)],
                ['Ausgaben', kennzahlenA.ausgaben, kennzahlenB.ausgaben, false, euro],
                ['Ø je Glas', kennzahlenA.jeGlas, kennzahlenB.jeGlas, true, euro],
                ['Ø Note', kennzahlenA.schnitt, kennzahlenB.schnitt, false, note],
              ].map(([label, a, bWert, wenigerIstBesser, form]) => {
                // Der bessere Wert wird hervorgehoben. Bei "Ø je Glas" ist
                // weniger besser — deshalb die Umkehrung, sonst stuende der
                // teurere Abend als Sieger da.
                //
                // Fehlt einer der beiden Werte, wird NICHTS hervorgehoben.
                // Mit `Number(null) || 0` waere ein Abend ohne Glaeser bei
                // "Ø je Glas" mit 0,00 € der guenstigste gewesen — und bei
                // "Ø Note" haette ein unbewerteter Abend eine 0 bekommen,
                // statt gar keine Aussage zu machen.
                const fehlt = a == null || bWert == null;
                const zahlA = Number(a) || 0, zahlB = Number(bWert) || 0;
                const gleich = fehlt || Math.abs(zahlA - zahlB) < 0.005;
                const aVorn = wenigerIstBesser ? zahlA < zahlB : zahlA > zahlB;
                const zeig = form || ((n) => (n == null ? '—' : String(n)));
                return (
                  <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-caption1">
                    <span className={`num-tabular text-right font-semibold ${
                      gleich ? 'text-text-secondary' : aVorn ? 'text-system-blue' : 'text-text-tertiary'}`}>
                      {zeig(a)}
                    </span>
                    <span className="text-caption2 text-text-tertiary text-center px-1">{label}</span>
                    <span className={`num-tabular font-semibold ${
                      gleich ? 'text-text-secondary' : aVorn ? 'text-text-tertiary' : 'text-system-red'}`}>
                      {zeig(bWert)}
                    </span>
                  </div>
                );
              })}
              <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-caption2 pt-1.5 border-t border-border-light">
                <span className="text-right text-text-primary truncate">{kennzahlenA.sieger?.bier?.name || '—'}</span>
                <span className="text-text-tertiary text-center px-1">Sieger</span>
                <span className="text-text-primary truncate">{kennzahlenB.sieger?.bier?.name || '—'}</span>
              </div>
              {/* Ohne diesen Satz bedeutet dieselbe Farbe zweimal etwas
                  anderes: bei "Gläser" den groesseren Wert, bei "Ø je Glas"
                  den kleineren. Farbig hervorgehoben ohne Erklaerung liest
                  sich das wie eine Auszeichnung fuer den teureren Abend. */}
              <p className="text-caption2 text-text-tertiary pt-1">
                Farbig steht der höhere Wert — bei „Ø je Glas“ der günstigere.
                Fehlt eine Angabe, bleibt die Zeile grau.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Verlauf über die Abende */}
      {b.proBoerse.length > 1 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Abend für Abend</div>
          <div className="space-y-2">
            {b.proBoerse.map((e) => (
              <div key={e.boerse.id}>
                <div className="flex items-baseline gap-2 text-caption2 mb-0.5">
                  <span className="text-text-primary truncate">{e.boerse.name}</span>
                  <span className="ml-auto num-tabular text-text-secondary flex-shrink-0">
                    {e.glaeser} {e.glaeser === 1 ? 'Glas' : 'Gläser'}
                  </span>
                  <span className="num-tabular text-text-tertiary w-8 text-right flex-shrink-0">
                    {note(e.schnitt)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div className="h-full rounded-full bg-system-yellow"
                       style={{ width: `${(e.glaeser / maxGlaeser) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-2">
            Balken zeigen die Gläser, die Zahl rechts die Durchschnittsnote des Abends.
          </p>
        </div>
      )}

      {/* Herkunft — das Land wird erfasst und war nie ausgewertet.
          Gezaehlt werden GLAESER, nicht Sorten: fuenf deutsche Biere einmal
          probiert sagen etwas anderes als ein belgisches, von dem ihr zehn
          getrunken habt. */}
      {herkunft.liste.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-baseline justify-between gap-2 mb-2.5">
            <span className="text-footnote font-semibold text-text-muted">Herkunft</span>
            <span className="text-caption2 text-text-tertiary">{herkunft.gesamt} Gläser</span>
          </div>
          <div className="space-y-1.5">
            {herkunft.liste.slice(0, 6).map((x) => (
              <div key={x.land}>
                <div className="flex items-baseline gap-2 text-caption1">
                  <span className="text-text-primary truncate flex-1 min-w-0">{x.land}</span>
                  <span className="num-tabular text-text-secondary flex-shrink-0">
                    {x.glaeser} · {Math.round(x.anteil * 100)} %
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
                  <div className="h-full bg-system-indigo/70"
                       style={{ width: `${Math.max(3, x.anteil * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {/* Ohne Angabe nicht verschweigen: sonst summierte sich die
              Verteilung nicht auf das, was ihr getrunken habt. */}
          {herkunft.ohneAngabe > 0 && (
            <p className="text-caption2 text-text-tertiary mt-2">
              {herkunft.ohneAngabe} {herkunft.ohneAngabe === 1 ? 'Glas' : 'Gläser'} ohne Landangabe.
            </p>
          )}
        </div>
      )}

      <Bestandskarte katalog={katalog} verkostungen={verkostungen} />

      <Trinkprofil verkostungen={verkostungen} katalog={katalog} />

      <Preisentwicklung verkostungen={verkostungen} boersen={boersen} katalog={katalog} />

      {/* Wird es im Lauf des Abends staerker? Wie die Notendrift nach
          POSITION, und nach Glaesern gewichtet — ein Doppelbock, von dem
          einer nippt, verschoebe den Schnitt sonst wie drei geteilte Halbe. */}
      {staerke.punkte.length >= 2 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-1">Stärke im Lauf des Abends</div>
          <p className="text-callout text-text-primary mb-2.5">
            {staerke.richtung === 'gleich'
              ? 'Ihr bleibt über den Abend bei ähnlicher Stärke.'
              : `Später am Abend wird es ${staerke.richtung} — ${kommaEins(Math.abs(staerke.unterschied))} Prozentpunkte.`}
          </p>
          <div className="flex items-end gap-1.5 h-20">
            {staerke.punkte.map((pt) => (
              <div key={pt.position} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-caption2 text-text-tertiary num-tabular">{kommaEins(pt.schnitt)}</span>
                <div className="w-full rounded-t bg-system-purple/70"
                     style={{ height: `${Math.max(6, (pt.schnitt / 12) * 100)}%` }} />
                <span className="text-caption2 text-text-tertiary num-tabular">{pt.position}.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preis je 100 ml — der ehrliche Vergleich zwischen 0,33 und 0,5.
          4,00 € fuer eine Halbe ist guenstiger als 3,20 € fuer eine 0,33,
          und genau das sieht man am Glaspreis nicht. */}
      {je100.liste.length > 1 && (
        <div className="modern-card p-4">
          <div className="flex items-baseline justify-between gap-2 mb-2.5">
            <span className="text-footnote font-semibold text-text-muted">Preis je 100 ml</span>
            <span className="text-caption2 text-text-tertiary">{je100.liste.length} Biere</span>
          </div>
          <div className="space-y-1.5">
            {je100.liste.slice(0, 6).map((x) => {
              const hoechst = je100.teuerstes?.je100 || 1;
              return (
                <div key={x.bier.id}>
                  <div className="flex items-baseline gap-2 text-caption1">
                    <span className="text-text-primary truncate flex-1 min-w-0">{x.bier.name}</span>
                    <span className="num-tabular text-text-secondary flex-shrink-0">
                      {euro(x.preis)} / {x.ml} ml
                    </span>
                    <span className="num-tabular font-semibold text-text-primary w-14 text-right flex-shrink-0">
                      {euro(x.je100)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
                    <div className="h-full bg-system-green/70"
                         style={{ width: `${Math.max(4, (x.je100 / hoechst) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-caption2 text-text-tertiary mt-2">
            Bei mehrfach getrunkenen Bieren gilt der jüngste Preis.
          </p>
        </div>
      )}

      {/* Brauereien — die Angabe lag laengst im Katalog, ausgewertet wurde nur
          die Sorte. Beim Einkauf ist "von wem" aber die nuetzlichere Frage:
          eine Sorte sagt, was ihr moegt, eine Brauerei sagt, wo ihr es
          bekommt. */}
      {brauereien.liste.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-baseline justify-between gap-2 mb-2.5">
            <span className="text-footnote font-semibold text-text-muted">Brauereien</span>
            <span className="text-caption2 text-text-tertiary">
              {brauereien.liste.length} {brauereien.liste.length === 1 ? 'Brauerei' : 'Brauereien'}
            </span>
          </div>

          <div className="space-y-1.5">
            {brauereien.liste.slice(0, 6).map((x) => {
              const meiste = brauereien.liste[0].glaeser || 1;
              return (
                <div key={x.brauerei}>
                  <div className="flex items-baseline gap-2 text-caption1">
                    <span className="text-text-primary truncate flex-1 min-w-0">{x.brauerei}</span>
                    <span className="num-tabular text-text-secondary flex-shrink-0">
                      {x.glaeser} {x.glaeser === 1 ? 'Glas' : 'Gläser'}
                    </span>
                    {x.schnitt != null && (
                      <span className="num-tabular font-semibold text-text-primary w-8 text-right flex-shrink-0">
                        {kommaEins(x.schnitt)}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
                    <div className="h-full bg-system-teal/70"
                         style={{ width: `${Math.max(4, (x.glaeser / meiste) * 100)}%` }} />
                  </div>
                  <div className="text-caption2 text-text-tertiary mt-0.5">
                    {x.biere} {x.biere === 1 ? 'Bier' : 'Biere'} · {euro(x.ausgaben)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Die beste Brauerei — erst ab genug Bewertungen. Bei EINEM Bier
              waere der "Schnitt der Brauerei" die Note dieses einen Bieres. */}
          {brauereien.beste.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <div className="text-caption2 text-text-tertiary mb-1">
                Bester Schnitt (ab {brauereien.mindestens} Bewertungen)
              </div>
              <div className="text-callout text-text-primary">
                <span className="font-semibold">{brauereien.beste[0].brauerei}</span>
                {' '}mit {kommaEins(brauereien.beste[0].schnitt)}
                <span className="text-text-tertiary">
                  {' '}aus {brauereien.beste[0].bewertet} Bewertungen
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nochmal kaufen — die Frage, die im Laden zaehlt.
          Die Quote rechnet nur mit beantworteten Faellen: ein uebersprungenes
          Feld ist kein "nein" und darf niemandem die Quote druecken. */}
      {wieder.beantwortet > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Nochmal kaufen</div>
          <Kraefteverhaeltnis
            label="Würden wieder" klein zusatz="Anteil der beantworteten Biere"
            aek={Math.round((wieder.anteilAek ?? 0) * 100)}
            real={Math.round((wieder.anteilReal ?? 0) * 100)}
            anzeige={(n) => `${n} %`}
            aekName={PERSONEN[0].name} realName={PERSONEN[1].name} />

          {wieder.einig.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <div className="text-caption2 text-text-tertiary mb-1.5">
                Beide wieder — die Einkaufsliste
              </div>
              <div className="flex flex-wrap gap-1.5">
                {wieder.einig.slice(0, 8).map((e) => (
                  <span key={e.verkostung.id} className="chip chip-sm chip-green">
                    {e.bier?.name || 'Unbekannt'}
                  </span>
                ))}
                {wieder.einig.length > 8 && (
                  <span className="chip chip-sm chip-gray">+{wieder.einig.length - 8}</span>
                )}
              </div>
            </div>
          )}

          {wieder.strittig.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <div className="text-caption2 text-text-tertiary mb-1.5">Uneinig</div>
              <div className="space-y-1">
                {wieder.strittig.slice(0, 5).map((e) => (
                  <div key={e.verkostung.id} className="flex items-center gap-2 text-caption1">
                    <span className="text-text-primary truncate flex-1 min-w-0">
                      {e.bier?.name || 'Unbekannt'}
                    </span>
                    <span className={`flex-shrink-0 font-medium ${
                      e.dafuer === 'aek' ? PERSONEN[0].farbe : PERSONEN[1].farbe}`}>
                      nur {e.dafuer === 'aek' ? PERSONEN[0].name : PERSONEN[1].name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notendrift — braucht mindestens zwei Abende je Position, sonst waere
          eine "Position 9" ein einzelnes Bier und kein Trend. */}
      {drift.punkte.length >= 2 && (
        <div className="modern-card p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-footnote font-semibold text-text-muted">Im Lauf des Abends</span>
            <span className="text-caption2 text-text-tertiary">{drift.abende} Abende</span>
          </div>
          <p className="text-callout text-text-primary mb-2.5">
            {drift.richtung === 'gleich'
              ? 'Eure Noten bleiben über den Abend stabil.'
              : `Später am Abend bewertet ihr ${drift.richtung} — ${kommaEins(Math.abs(drift.unterschied))} Punkte.`}
          </p>
          <div className="flex items-end gap-1.5 h-24">
            {drift.punkte.map((pt) => (
              <div key={pt.position} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-caption2 text-text-tertiary num-tabular">{kommaEins(pt.schnitt)}</span>
                <div className="w-full rounded-t bg-system-yellow/40"
                     style={{ height: `${Math.max(6, (pt.schnitt / 10) * 100)}%` }} />
                <span className="text-caption2 text-text-tertiary num-tabular">{pt.position}.</span>
              </div>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-2">
            Nach Position im Abend, nicht nach Uhrzeit — eine Uhrzeit je Bier
            gibt es nicht. Und ihr sucht die Reihenfolge selbst aus: wer das
            Beste zum Schluss aufhebt, erzeugt einen Anstieg ganz ohne Milde.
          </p>
        </div>
      )}

      {/* Rekorde */}
      {rekorde.length > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Rekorde</div>
          <div className="space-y-2.5">
            {rekorde.map((r) => (
              <div key={r.id} className="flex items-start gap-2.5">
                <Icon name={r.icon} size={16} strokeWidth={2.2} className={`${r.farbe} flex-shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <div className="text-caption1 font-semibold text-text-primary">{r.titel}</div>
                  <div className="text-caption1 text-text-secondary">{r.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rechnung über alle Börsen — bewusst getrennt von den FIFA-Finanzen:
          Bier ist Privatvergnügen und hat mit dem Echtgeld-Ausgleich der
          Saison nichts zu tun. */}
      {b.rechnung.zugeordnet > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2">Rechnung über alles</div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-caption1">
            <span />
            <span className="text-caption2 text-text-tertiary text-right">gezahlt</span>
            <span className="text-caption2 text-text-tertiary text-right">vertrunken</span>
            {PERSONEN.map((p) => (
              <Fragment key={p.key}>
                <span className={`font-semibold truncate ${p.farbe}`}>{p.name}</span>
                <span className="num-tabular text-text-secondary text-right">{euro(b.rechnung[p.team].bezahlt)}</span>
                <span className="num-tabular text-text-primary text-right">{euro(b.rechnung[p.team].getrunken)}</span>
              </Fragment>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border-light text-caption1">
            {Math.abs(b.rechnung.ausgleich) < 0.01 ? (
              <span className="text-system-green font-semibold">Ausgeglichen — über alle Abende hinweg quitt.</span>
            ) : (
              <span className="text-text-primary">
                <span className={b.rechnung.ausgleich > 0 ? 'text-system-red font-semibold' : 'text-system-blue font-semibold'}>
                  {b.rechnung.ausgleich > 0 ? 'Philip' : 'Alexander'}
                </span>
                {' schuldet '}
                {b.rechnung.ausgleich > 0 ? 'Alexander' : 'Philip'}
                {' insgesamt '}
                <span className="num-tabular font-bold">{euro(Math.abs(b.rechnung.ausgleich))}</span>.
              </span>
            )}
          </div>
          {b.rechnung.offeneRunden > 0 && (
            <p className="text-caption2 text-text-tertiary mt-1.5">
              {b.rechnung.offeneRunden === 1 ? 'Bei einem Bier' : `Bei ${b.rechnung.offeneRunden} Bieren`} steht kein
              Zahler ({euro(b.rechnung.offen)}) — nicht mitgerechnet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Börse anlegen. */
function BoersenFormular({ boerse, onSchliessen, onFertig }) {
  // Bisher konnte man eine Boerse nur anlegen und loeschen. Ein Tippfehler im
  // Namen oder ein falsches Datum liessen sich nur beheben, indem man den
  // ganzen Abend samt Bieren weggeworfen und neu eingetragen hat.
  const [name, setName] = useState(boerse?.name || '');
  const [ort, setOrt] = useState(boerse?.ort || '');
  const [tag, setTag] = useState(() => boerse?.datum || new Date().toISOString().slice(0, 10));
  const [notiz, setNotiz] = useState(boerse?.notiz || '');
  const [speichert, setSpeichert] = useState(false);

  const speichern = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Die Börse braucht einen Namen.'); return; }
    setSpeichert(true);
    const daten = {
      name: name.trim(), ort: ort.trim() || null, datum: tag, notiz: notiz.trim() || null,
    };
    const { error } = boerse
      ? await supabaseDb.update('bierboersen', daten, boerse.id)
      : await supabaseDb.insert('bierboersen', daten);
    setSpeichert(false);
    if (error) { toast.error('Konnte nicht gespeichert werden.'); return; }
    toast.success(boerse ? 'Geändert.' : 'Bierbörse angelegt.');
    onFertig();
  };

  return (
    <Modal titel={boerse ? 'Bierbörse ändern' : 'Neue Bierbörse'} onSchliessen={onSchliessen}>
      <form onSubmit={speichern} className="space-y-3">
        <label className="block">
          <span className="text-footnote text-text-secondary">Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="form-input w-full mt-1"
                 placeholder="z. B. Bierbörse Dortmund" autoFocus />
        </label>
        <label className="block">
          <span className="text-footnote text-text-secondary">Ort</span>
          <input value={ort} onChange={(e) => setOrt(e.target.value)} className="form-input w-full mt-1" />
        </label>
        <label className="block">
          <span className="text-footnote text-text-secondary">Datum</span>
          <input type="date" value={tag} onChange={(e) => setTag(e.target.value)} className="form-input w-full mt-1" />
        </label>
        <label className="block">
          <span className="text-footnote text-text-secondary">Notiz</span>
          <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2}
                    className="form-input w-full mt-1 resize-none"
                    placeholder="Wer war dabei, wie war der Abend …" />
        </label>
        <button type="submit" disabled={speichert} className="btn-primary w-full">
          {speichert ? 'Speichert…' : boerse ? 'Änderungen sichern' : 'Anlegen'}
        </button>
      </form>
    </Modal>
  );
}

/** Bier zu einer Börse eintragen oder ändern. */
function BierFormular({ boerse, verkostung, katalog, verkostungen, einstellungen, onSchliessen, onFertig }) {
  const vorhandenes = verkostung ? katalog.find((b) => b.id === verkostung.bier_id) : null;
  const [name, setName] = useState(vorhandenes?.name || '');
  const [brauerei, setBrauerei] = useState(vorhandenes?.brauerei || '');
  // Das Land stand in der Tabelle und wurde in der Bierkarte sogar angezeigt —
  // nur gefragt hat nie jemand danach. Die Spalte war damit tot.
  const [land, setLand] = useState(vorhandenes?.land || '');
  // Was schon im Katalog steht, plus die mitgelieferten Sorten. Alphabetisch,
  // damit man beim Tippen weiss, wo man landet.
  const bekannteLaender = useMemo(
    () => [...new Set([...HERKUNFT, ...eigeneWerte('land'), ...(katalog || []).map((b) => b.land).filter(Boolean)])]
      .sort((a, b) => String(a).localeCompare(String(b), 'de')),
    [katalog]);
  const bekannteBrauereien = useMemo(
    () => [...new Set([...eigeneWerte('brauerei'), ...(katalog || []).map((b) => b.brauerei).filter(Boolean)])]
      .sort((a, b) => String(a).localeCompare(String(b), 'de')),
    [katalog]);
  const bekannteArten = useMemo(
    () => [...new Set([...BIERARTEN, ...eigeneWerte('art'), ...(katalog || []).map((b) => b.art).filter(Boolean)])]
      .sort((a, b) => String(a).localeCompare(String(b), 'de')),
    [katalog]);
  const [art, setArt] = useState(vorhandenes?.art || '');
  const [alkohol, setAlkohol] = useState(alsText(vorhandenes?.alkohol));
  const [preis, setPreis] = useState(alsText(verkostung?.preis));
  const [ml, setMl] = useState(alsText(verkostung?.groesse_ml));
  const [anzahlAek, setAnzahlAek] = useState(verkostung?.anzahl_aek ?? 0);
  const [anzahlReal, setAnzahlReal] = useState(verkostung?.anzahl_real ?? 0);
  const [notenAek, setNotenAek] = useState(() => notenVon(verkostung, 'aek'));
  const [notenReal, setNotenReal] = useState(() => notenVon(verkostung, 'real'));
  const [gesamtAek, setGesamtAek] = useState(verkostung?.note_aek ?? null);
  const [gesamtReal, setGesamtReal] = useState(verkostung?.note_real ?? null);
  const [notiz, setNotiz] = useState(verkostung?.notiz || '');
  const [zahler, setZahler] = useState(verkostung?.bezahlt_von ?? null);
  // Drei Zustaende, nicht zwei: null heisst "nicht beantwortet". Ein nicht
  // gesetzter Daumen ist kein Daumen nach unten.
  const [wiederAek, setWiederAek] = useState(verkostung?.wieder_aek ?? null);
  const [wiederReal, setWiederReal] = useState(verkostung?.wieder_real ?? null);
  const [speichert, setSpeichert] = useState(false);

  // Der Modus kommt aus den Einstellungen, lässt sich hier aber je Bier
  // umschalten: auf einer langen Börse tippt man schnell durch und macht
  // beim einen besonderen Bier eine Ausnahme.
  // Ein Eintrag, der bereits Kategorienoten hat, öffnet ausführlich — sonst
  // sähe man seine Bewertung nicht.
  const [modus, setModus] = useState(() =>
    Object.keys(notenVon(verkostung, 'aek')).length ||
    Object.keys(notenVon(verkostung, 'real')).length
      ? 'ausfuehrlich' : einstellungen.modus);

  const summe = (zahl(preis) || 0) * ((Number(anzahlAek) || 0) + (Number(anzahlReal) || 0));

  // Vorschläge aus dem Katalog, damit dasselbe Bier nicht zweimal entsteht.
  const vorschlaege = useMemo(() => {
    const s = name.trim().toLowerCase();
    // Ab dem ERSTEN Buchstaben. Zwei waren fuer "Ale" oder "IPA" eine Huerde,
    // die nichts einspart.
    if (!s || vorhandenes) return [];
    // Ist eine Brauerei gewaehlt, nur deren Biere: bei vielen Eintraegen ist
    // "Brauerei zuerst" der schnellere Weg als tippen — und wer Augustiner
    // gewaehlt hat, meint kein Rothaus.
    const b = brauerei.trim().toLowerCase();
    return katalog
      .filter((x) => x.name.toLowerCase().includes(s))
      .filter((x) => !b || String(x.brauerei || '').toLowerCase() === b)
      .slice(0, 5);
  }, [name, katalog, vorhandenes, brauerei]);

  /**
   * Die zuletzt getrunkenen Biere — ohne einen Buchstaben zu tippen.
   *
   * An einem Abend trinkt man oft dasselbe nochmal, und die Vorschlaege
   * erscheinen erst beim Tippen. Neueste zuerst, jedes Bier nur einmal, und
   * was in DIESER Boerse schon steht, faellt raus: es waere ein Vorschlag,
   * der beim Speichern an der Eindeutigkeit scheitert (boerse_id + bier_id).
   */
  const zuletzt = useMemo(() => {
    if (vorhandenes) return [];
    const schonDrin = new Set(
      (verkostungen || []).filter((v) => v.boerse_id === boerse?.id).map((v) => v.bier_id));
    const bierVon = new Map((katalog || []).map((b) => [b.id, b]));
    const raus = [], gesehen = new Set();
    for (const v of [...(verkostungen || [])].sort((a, b) => (b.id || 0) - (a.id || 0))) {
      if (schonDrin.has(v.bier_id) || gesehen.has(v.bier_id)) continue;
      const b = bierVon.get(v.bier_id);
      if (!b) continue;
      gesehen.add(v.bier_id);
      raus.push(b);
      if (raus.length >= 5) break;
    }
    return raus;
  }, [verkostungen, katalog, boerse?.id, vorhandenes]);

  const uebernehmen = (b) => {
    setName(b.name); setBrauerei(b.brauerei || ''); setArt(b.art || ''); setLand(b.land || '');
    setAlkohol(alsText(b.alkohol));
    // Preis und Größe von der letzten Verkostung desselben Biers. Meist ist es
    // dieselbe Kneipe und dieselbe Flasche — und wenn nicht, steht die Zahl
    // wenigstens schon im Feld und muss nur geändert werden.
    const letzte = (verkostungen || [])
      .filter((v) => v.bier_id === b.id && (v.preis != null || v.groesse_ml != null))
      .sort((x, y) => (y.id || 0) - (x.id || 0))[0];
    if (letzte) {
      if (!zahl(preis) && letzte.preis != null) setPreis(alsText(letzte.preis));
      if (!zahl(ml) && letzte.groesse_ml != null) setMl(alsText(letzte.groesse_ml));
    }
  };

  // Gängige Glasgrößen. Auf dem Handy, spät am Abend, ist ein Tap auf "0,5"
  // etwas anderes als drei Ziffern über die Zahlentastatur.
  const GROESSEN = [200, 300, 330, 400, 500];

  const speichern = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Das Bier braucht einen Namen.'); return; }
    if (anzahlAek + anzahlReal === 0) { toast.error('Mindestens ein Glas eintragen.'); return; }
    // Das Textfeld hat kein min/max mehr, die Grenzen müssen also hierher.
    // Absichtlich grosszuegig: das soll Vertipper abfangen, nicht bevormunden.
    const a = zahl(alkohol);
    if (a != null && (a < 0 || a > 80)) { toast.error('Alkohol zwischen 0 und 80 % angeben.'); return; }
    const g = zahl(ml);
    if (g != null && (g < 1 || g > 5000)) { toast.error('Größe zwischen 1 und 5000 ml angeben.'); return; }
    const p = zahl(preis);
    if (p != null && (p < 0 || p > 1000)) { toast.error('Preis zwischen 0 und 1000 € angeben.'); return; }
    setSpeichert(true);
    try {
      // bierId beim Bearbeiten mitgeben: sonst wird die Aenderung an Sorte,
      // Land oder Alkohol still verworfen, und eine geaenderte Brauerei legt
      // ein zweites Bier gleichen Namens an.
      const bier = await findeOderLegeBierAn({
        name, brauerei, art, alkohol: a, land, bierId: verkostung?.bier_id ?? null });
      const daten = {
        boerse_id: boerse.id,
        bier_id: bier.id,
        preis: p,
        groesse_ml: g,
        anzahl_aek: Number(anzahlAek) || 0,
        anzahl_real: Number(anzahlReal) || 0,
        // Die Gesamtnote ist in beiden Modi dieselbe Zahl — nur ihre Herkunft
        // unterscheidet sich. Im ausfuehrlichen Modus ohne eine einzige
        // vergebene Kategorie bleibt die bisherige stehen, sonst verloere ein
        // Eintrag seine Bewertung, nur weil jemand den Preis korrigiert.
        //
        // Im einfachen Modus werden die Kategorienoten GELEERT. Ohne das
        // entstand eine Zeile mit zwei widersprechenden Bewertungen: die
        // getippte Gesamtnote und die alten Kategorien. Beim naechsten
        // Oeffnen gewann die Kategorie-Seite (der Modus richtet sich danach,
        // ob Kategorien vorhanden sind), die getippte Note war unsichtbar —
        // und das naechste Speichern hat sie still ueberschrieben.
        // Nachgestellt: Augustiner im einfachen Modus auf 5 gesetzt, die
        // Liste zeigte 5, das Formular beim Wiederoeffnen 8,0.
        note_aek: modus === 'ausfuehrlich' ? (noteAusKategorien(notenAek) ?? gesamtAek) : gesamtAek,
        note_real: modus === 'ausfuehrlich' ? (noteAusKategorien(notenReal) ?? gesamtReal) : gesamtReal,
        noten_aek: modus === 'ausfuehrlich' ? notenAek : {},
        noten_real: modus === 'ausfuehrlich' ? notenReal : {},
        notiz: notiz.trim() || null,
        bezahlt_von: zahler,
        wieder_aek: wiederAek,
        wieder_real: wiederReal,
      };
      const { error } = verkostung
        ? await supabaseDb.update('bier_verkostungen', daten, verkostung.id)
        : await supabaseDb.insert('bier_verkostungen', daten);
      if (error) throw error;
      toast.success(verkostung ? 'Geändert.' : 'Eingetragen.');
      onFertig();
    } catch (err) {
      // Der eindeutige Schluessel (boerse_id, bier_id) schlaegt zu, wenn das
      // Bier auf dieser Boerse schon steht — dann gehoert die Anzahl erhoeht.
      const doppelt = String(err?.message || '').includes('bier_verkostungen_key');
      toast.error(doppelt
        ? 'Dieses Bier steht auf der Börse schon — bearbeite den Eintrag und erhöhe die Anzahl.'
        : 'Konnte nicht gespeichert werden.');
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <Modal titel={verkostung ? 'Bier ändern' : 'Bier eintragen'} onSchliessen={onSchliessen}>
      <form onSubmit={speichern} className="space-y-3">
        {/* Zuletzt getrunken — ein Tipp statt tippen.
            Steht ueber dem Namensfeld, weil es der schnellere Weg ist: wer
            hier faendig wird, muss das Feld gar nicht erst anfassen. */}
        {zuletzt.length > 0 && (
          <div>
            <div className="text-caption2 text-text-tertiary mb-1.5">Zuletzt getrunken</div>
            <div className="flex flex-wrap gap-1.5">
              {zuletzt.map((b) => (
                <button key={b.id} type="button" onClick={() => uebernehmen(b)}
                        className="chip chip-sm chip-gray max-w-full truncate">
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block">
          <span className="text-footnote text-text-secondary">Bier *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="form-input w-full mt-1"
                 placeholder="z. B. Augustiner Helles" autoFocus />
        </label>
        {vorschlaege.length > 0 && (
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {vorschlaege.map((b) => (
              <button key={b.id} type="button" onClick={() => uebernehmen(b)}
                      className="chip-gray text-caption2">
                {b.name}{b.brauerei ? ` · ${b.brauerei}` : ''}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {/* Brauerei und Sorte als AUSWAHL, die sich selbst erweitert.
              Die Liste kommt aus dem Katalog: was einmal eingetragen wurde,
              steht beim naechsten Mal zur Auswahl. Deshalb braucht es keine
              zweite Tabelle und keine Pflege — und keine drei Schreibweisen
              derselben Brauerei, weil man sie ab dem zweiten Mal auswaehlt
              statt sie erneut zu tippen. */}
          <AuswahlMitNeu
            label="Brauerei"
            wert={brauerei}
            onChange={setBrauerei}
            vorhandene={bekannteBrauereien}
            platzhalter="z. B. Augustiner"
          />
          <AuswahlMitNeu
            label="Sorte"
            wert={art}
            onChange={setArt}
            vorhandene={bekannteArten}
            platzhalter="z. B. Kellerbier"
          />
          <AuswahlMitNeu
            label="Land"
            wert={land}
            onChange={setLand}
            vorhandene={bekannteLaender}
            platzhalter="z. B. Belgien"
          />
          <label className="block">
            <span className="text-footnote text-text-secondary">Alkohol %</span>
            <ZahlFeld wert={alkohol} onChange={setAlkohol}
                      className="form-input w-full mt-1" placeholder="5,2" />
          </label>
          <label className="block">
            <span className="text-footnote text-text-secondary">Größe ml</span>
            <ZahlFeld wert={ml} onChange={setMl} ganzzahl
                      className="form-input w-full mt-1" placeholder="500" />
          </label>
          <div className="col-span-2 flex flex-wrap gap-1.5 -mt-1">
            {GROESSEN.map((g) => (
              <button key={g} type="button"
                      onClick={() => setMl(String(ml) === String(g) ? '' : String(g))}
                      className={`px-2.5 py-1 rounded-lg text-caption2 font-semibold transition-colors num-tabular ${
                        String(ml) === String(g)
                          ? 'bg-bg-elevated ring-2 ring-current text-system-yellow'
                          : 'bg-bg-tertiary text-text-secondary'}`}>
                {(g / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1 })} l
              </button>
            ))}
          </div>
          <label className="block col-span-2">
            <span className="text-footnote text-text-secondary">Preis je Glas €</span>
            <ZahlFeld wert={preis} onChange={setPreis}
                      className="form-input w-full mt-1" placeholder="4,50" />
          </label>
          {zahl(preis) > 0 && zahl(ml) > 0 && (
            <p className="col-span-2 -mt-1 text-caption2 text-text-tertiary num-tabular">
              Literpreis: {euro((zahl(preis) / zahl(ml)) * 1000)}
            </p>
          )}
        </div>

        {/* Modus je Bier. Steht bewusst über den Personen und nicht in den
            Einstellungen allein: die Entscheidung "schnell oder genau" faellt
            beim einzelnen Bier, nicht einmal für immer. */}
        <div className="flex items-center gap-2">
          <span className="text-footnote text-text-secondary flex-shrink-0">Bewertung</span>
          <div className="ml-auto flex gap-1 p-0.5 bg-bg-tertiary rounded-lg">
            {[['einfach', 'Einfach'], ['ausfuehrlich', 'Ausführlich']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setModus(id)}
                      className={`px-2.5 py-1 rounded-md text-caption2 font-semibold transition-colors ${
                        modus === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Ehrlich ansagen, was der Wechsel kostet — er verwirft beim
            Speichern die Kategorienoten. Ohne den Hinweis waere das eine
            stille Loeschung. */}
        {modus === 'einfach'
          && (Object.keys(notenAek).length > 0 || Object.keys(notenReal).length > 0) && (
          <p className="-mt-1 text-caption2 text-system-orange">
            Beim Speichern werden die bisherigen Kategorie-Noten dieses Biers verworfen.
          </p>
        )}

        {/* Anzahl und Bewertung getrennt je Person */}
        {PERSONEN.map((p) => {
          const anzahl = p.key === 'aek' ? anzahlAek : anzahlReal;
          const setAnzahl = p.key === 'aek' ? setAnzahlAek : setAnzahlReal;
          const noten = p.key === 'aek' ? notenAek : notenReal;
          const setNoten = p.key === 'aek' ? setNotenAek : setNotenReal;
          const gesamt = p.key === 'aek' ? gesamtAek : gesamtReal;
          const setGesamt = p.key === 'aek' ? setGesamtAek : setGesamtReal;
          // Beim Wechsel nach "einfach" soll die Auswahl auf der bisherigen
          // Note stehen. Eine gemittelte 7,7 trifft aber keinen der elf
          // Knoepfe — dann lieber die naechstliegende ganze Zahl markieren
          // als gar keine.
          const gerundet = gesamt == null ? null : Math.round(Number(gesamt));

          // WER BEWERTET, HAT GETRUNKEN.
          // Der Zaehler stand bei 0, und ohne mindestens ein Glas verweigert
          // das Formular das Speichern — mit einer Fehlermeldung, die erst
          // nach dem Absenden kommt. Die Note sagt aber laengst aus, dass die
          // Person das Bier im Glas hatte. Also zaehlt die erste Bewertung
          // still auf 1 hoch.
          //
          // Nur von 0 aus: wer schon zwei Glaeser eingetragen hat, soll sie
          // durch eine spaetere Bewertung nicht wieder verlieren. Und nur beim
          // SETZEN einer Note — wer seine Bewertung zuruecknimmt, hat das Bier
          // trotzdem getrunken.
          const zaehleErstesGlas = () => setAnzahl((n) => (n === 0 ? 1 : n));
          const gesamtGesetzt = (wert) => {
            setGesamt(wert);
            if (wert != null) zaehleErstesGlas();
          };
          const notenGesetzt = (wert) => {
            setNoten(wert);
            zaehleErstesGlas();
          };
          return (
            <div key={p.key} className="panel-gray rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <TeamLogo team={p.key} size="xs" />
                <span className={`text-footnote font-semibold ${p.farbe}`}>{p.name}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {/* Funktional hochzaehlen: zwei schnelle Taps landen sonst
                      im selben React-Batch und lesen beide denselben alten
                      Wert — aus zweimal Plus wird dann eins. */}
                  <button type="button" onClick={() => setAnzahl((n) => Math.max(0, n - 1))}
                          className="w-8 h-8 rounded-lg bg-bg-tertiary text-text-primary font-bold"
                          aria-label="Weniger">−</button>
                  <span className="w-8 text-center num-tabular font-bold text-text-primary">{anzahl}</span>
                  <button type="button" onClick={() => setAnzahl((n) => n + 1)}
                          className="w-8 h-8 rounded-lg bg-bg-tertiary text-text-primary font-bold"
                          aria-label="Mehr">+</button>
                </div>
              </div>
              <BewertungsBlock
                modus={modus}
                kategorien={einstellungen.kategorien}
                noten={noten} onNoten={notenGesetzt}
                gesamt={gesamt} auswahl={gerundet} onGesamt={gesamtGesetzt}
                farbe={p.farbe}
              />
            </div>
          );
        })}

        <label className="block">
          <span className="text-footnote text-text-secondary">Notiz</span>
          <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2}
                    className="form-input w-full mt-1 resize-none"
                    placeholder="z. B. „viel zu warm ausgeschenkt“" />
        </label>

        {/* Wer die Runde bezahlt hat. Bleibt bewusst freiwillig — ein Abend
            ohne Zahler ist immer noch ein erfasster Abend, nur eben einer
            ohne Rechnung. */}
        <div className="panel-gray rounded-xl p-3">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-footnote font-semibold text-text-secondary">Wer zahlt?</span>
            {summe > 0 && (
              <span className="ml-auto text-caption2 text-text-tertiary num-tabular">
                Runde: {euro(summe)}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {ZAHLER.map((z) => (
              <button key={z.id} type="button"
                      onClick={() => setZahler(zahler === z.id ? null : z.id)}
                      className={`flex-1 py-2 rounded-lg text-caption1 font-semibold transition-colors ${
                        zahler === z.id
                          ? `bg-bg-elevated ring-2 ring-current ${z.farbe}`
                          : 'bg-bg-tertiary text-text-secondary'}`}>
                {z.label}
              </button>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-1.5">
            {zahler ? 'Nochmal antippen, um es wieder offen zu lassen.' : 'Kann auch offen bleiben.'}
          </p>
        </div>

        {/* Nochmal kaufen?
            Neben der Note, nicht statt ihr: die Note sagt, wie gut es war,
            der Daumen, ob es wieder in den Korb kommt. Wie beim Zahler
            freiwillig — nichts angetippt heisst "nicht beantwortet" und
            zaehlt in keiner Quote mit. */}
        <div className="panel-gray rounded-xl p-3">
          <div className="text-footnote font-semibold text-text-secondary mb-2">Nochmal kaufen?</div>
          <div className="space-y-2">
            {[
              { key: 'aek', person: PERSONEN[0], wert: wiederAek, setzen: setWiederAek },
              { key: 'real', person: PERSONEN[1], wert: wiederReal, setzen: setWiederReal },
            ].map((zeile) => (
              <div key={zeile.key} className="flex items-center gap-2">
                <span className={`text-caption1 font-medium w-20 flex-shrink-0 truncate ${zeile.person.farbe}`}>
                  {zeile.person.name}
                </span>
                <div className="flex gap-1.5 flex-1">
                  {[
                    { v: true, label: 'Ja', an: 'bg-system-green/20 text-text-primary ring-2 ring-system-green' },
                    { v: false, label: 'Nein', an: 'bg-system-red/20 text-text-primary ring-2 ring-system-red' },
                  ].map((o) => (
                    <button key={String(o.v)} type="button"
                            onClick={() => zeile.setzen(zeile.wert === o.v ? null : o.v)}
                            className={`flex-1 py-1.5 rounded-lg text-caption1 font-semibold transition-colors ${
                              zeile.wert === o.v ? o.an : 'bg-bg-tertiary text-text-secondary'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-1.5">
            {wiederAek == null && wiederReal == null
              ? 'Kann auch offen bleiben.'
              : 'Nochmal antippen, um es wieder offen zu lassen.'}
          </p>
        </div>

        <button type="submit" disabled={speichert} className="btn-primary w-full">
          {speichert ? 'Speichert…' : verkostung ? 'Änderungen sichern' : 'Eintragen'}
        </button>
      </form>
    </Modal>
  );
}

/**
 * Ein Bier über alle Börsen hinweg.
 *
 * Erst hier zahlt sich der Katalog aus: dasselbe Bier auf drei Abenden ist
 * drei Zeilen in der Datenbank, aber ein Bier — und die Frage, ob es beim
 * zweiten Mal besser ankam oder nur billiger war, lässt sich vorher nirgends
 * beantworten.
 */
function BierDetail({ bier, verkostungen, boersen, katalog, onSchliessen }) {
  const v = useMemo(() => bierVerlauf(bier.id, verkostungen, boersen), [bier.id, verkostungen, boersen]);
  const literSchnitt = v.literpreise.length
    ? v.literpreise.reduce((s, p) => s + p, 0) / v.literpreise.length : null;

  // Je Kategorie der Schnitt beider ueber alle Verkostungen dieses Biers.
  // Die Gesamtnote sagt "7,3" — hier sieht man, ob das ein rundes Bier war
  // oder eines, das nur wegen des Preises so weit oben steht.
  const proKategorie = useMemo(() => {
    const eigene = (verkostungen || []).filter((x) => x.bier_id === bier.id);
    return KATEGORIE_KATALOG.map((k) => {
      const werte = [];
      for (const x of eigene) {
        for (const key of ['aek', 'real']) {
          const n = notenVon(x, key)[k.id];
          if (n != null) werte.push(Number(n));
        }
      }
      return { ...k, schnitt: werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : null };
    }).filter((k) => k.schnitt != null);
  }, [bier.id, verkostungen]);

  const zwilling = useMemo(
    () => bierZwilling(bier.id, verkostungen, katalog),
    [bier.id, verkostungen, katalog]);

  return (
    <Modal titel={bier.name} onSchliessen={onSchliessen}>
      <div className="space-y-3">
        <div className="text-center">
          <div className="text-caption1 text-text-secondary">
            {[bier.brauerei, bier.art, bier.alkohol ? prozent(bier.alkohol) : null,
              bier.land].filter(Boolean).join(' · ') || 'Keine weiteren Angaben'}
          </div>
          <div className="stat-display text-[34px] num-tabular text-text-primary mt-2 leading-none">
            {note(v.schnitt)}
          </div>
          <div className="mt-1.5"><Kruege note={v.schnitt} groesse={20} /></div>
          <div className="text-caption2 text-text-tertiary mt-1">
            {v.schnitt == null ? 'noch nicht bewertet' : 'von 10'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['Börsen', v.boersen],
            ['Gläser', v.glaeser],
            ['Ø Preis', v.preisSchnitt == null ? '—' : euro(v.preisSchnitt)],
          ].map(([label, wert]) => (
            <div key={label} className="panel-gray rounded-xl p-2.5 text-center">
              <div className="stat-display text-[15px] num-tabular text-text-primary truncate">{wert}</div>
              <div className="text-caption2 text-text-tertiary">{label}</div>
            </div>
          ))}
        </div>

        {/* Wie die beiden es sehen */}
        <div className="grid grid-cols-2 gap-2">
          {PERSONEN.map((p) => {
            const s = v.jePerson[p.team];
            return (
              <div key={p.key} className="panel-gray rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TeamLogo team={p.key} size="xs" />
                  <span className={`text-footnote font-semibold truncate ${p.farbe}`}>{p.name}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="stat-display text-[17px] num-tabular text-text-primary">
                    {note(s.schnitt)}
                  </span>
                  <span className="text-caption2 text-text-tertiary">
                    {s.glaeser} {s.glaeser === 1 ? 'Glas' : 'Gläser'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {proKategorie.length > 0 && (
          <div className="panel-gray rounded-xl p-3">
            <div className="text-caption2 text-text-tertiary mb-2">Aufgeschlüsselt</div>
            <div className="space-y-2">
              {proKategorie.map((k) => (
                <div key={k.id}>
                  <div className="flex items-baseline gap-2 text-caption2 mb-0.5">
                    <span className="text-text-secondary">{k.label}</span>
                    <span className="ml-auto num-tabular text-text-primary font-semibold">{note(k.schnitt)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full rounded-full bg-system-yellow"
                         style={{ width: `${(k.schnitt / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Das Bier mit dem ähnlichsten Kategorie-Profil. Erst mit den
            Kategorien wird so ein Vergleich moeglich — zwei Gesamtnoten von
            7,0 sagen nichts darueber, ob es dieselbe Art von 7,0 war. */}
        {zwilling && (
          <div className="panel-gray rounded-xl p-3">
            <div className="text-caption2 text-text-tertiary mb-1">Ähnlich fandet ihr</div>
            <div className="font-semibold text-text-primary truncate">{zwilling.bier.name}</div>
            <div className="text-caption2 text-text-secondary">
              {zwilling.abstand < 0.5 ? 'Fast dasselbe Profil' : `Im Schnitt ${note(zwilling.abstand)} Punkte Abstand`}
              {` über ${zwilling.gemeinsam} ${zwilling.gemeinsam === 1 ? 'Kategorie' : 'Kategorien'}`}
              {/* "am deutlichsten", nicht "nur": es ist der groesste der
                  Unterschiede, nicht der einzige. */}
              {zwilling.groessterUnterschied && Math.abs(zwilling.groessterUnterschied.differenz) >= 1 && (
                <>
                  {`, am deutlichsten bei ${zwilling.groessterUnterschied.label} `}
                  {`(${note(Math.abs(zwilling.groessterUnterschied.differenz))} `}
                  {zwilling.groessterUnterschied.differenz > 0 ? 'besser)' : 'schlechter)'}
                </>
              )}
              .
            </div>
          </div>
        )}

        {v.einig != null && (
          <p className="text-caption1 text-text-secondary">
            {v.einig < 0.5
              ? 'Da sind sich beide einig.'
              : v.einig >= 3
                ? `Streitfall — ${note(v.einig)} Punkte auseinander.`
                : `${note(v.einig)} Punkte auseinander.`}
          </p>
        )}

        {/* Preise. Der Literpreis steht dabei, weil ein Glaspreis ohne die
            Größe nichts über teuer oder billig aussagt. */}
        {v.preisSchnitt != null && (
          <div className="panel-gray rounded-xl p-3 space-y-1 text-caption1">
            <div className="flex justify-between">
              <span className="text-text-secondary">Günstigstes Glas</span>
              <span className="num-tabular text-text-primary">{euro(v.preisMin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Teuerstes Glas</span>
              <span className="num-tabular text-text-primary">{euro(v.preisMax)}</span>
            </div>
            {literSchnitt != null && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Ø je Liter</span>
                <span className="num-tabular text-text-primary">{euro(literSchnitt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Wo es getrunken wurde */}
        <div>
          <div className="text-footnote font-semibold text-text-muted mb-2">
            Getrunken auf {v.boersen} {v.boersen === 1 ? 'Börse' : 'Börsen'}
          </div>
          <div className="divide-y divide-border-light">
            {v.verkostungen.map((e) => {
              const zahler = ZAHLER.find((z) => z.id === e.bezahlt_von);
              return (
                <div key={e.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-text-primary truncate">{e.boerse?.name || 'Unbekannte Börse'}</div>
                    {/* Kein truncate: sonst faellt genau der Zahler hinten
                        weg, der hier die interessanteste Angabe ist. */}
                    <div className="text-caption2 text-text-tertiary">
                      {[datum(e.boerse?.datum),
                        e.preis != null ? euro(e.preis) : null,
                        e.groesse_ml ? `${e.groesse_ml} ml` : null,
                        `${(e.anzahl_aek || 0) + (e.anzahl_real || 0)}×`,
                        zahler ? (zahler.id === 'geteilt' ? 'geteilt' : `zahlt ${zahler.label}`) : null,
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Kruege note={e.note} />
                  <span className="num-tabular text-sm font-bold text-text-primary w-8 text-right flex-shrink-0">
                    {note(e.note)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Dialog — als Portal an document.body, nicht an Ort und Stelle.
 *
 * Ein hoeherer z-index allein reicht NICHT: der Tab-Inhalt steckt in
 * `.tab-transition`, und die Klasse setzt `will-change: opacity`. Das erzeugt
 * einen eigenen Stapelkontext. Jeder z-index darin — auch z-[70] — gilt nur
 * INNERHALB dieses Kontexts, und der Kontext selbst liegt im DOM vor der
 * unteren Navigation (z-50). Der Dialog landete dadurch zwangslaeufig
 * darunter, egal wie hoch die Zahl war.
 *
 * Das Portal haengt den Dialog direkt an body und umgeht damit jeden
 * Stapelkontext der Vorfahren. Zusaetzlich haelt der Inhalt unten Abstand zur
 * Navigation, damit der Absende-Knopf auch bei kurzem Bildschirm frei liegt.
 */
function Modal({ titel, onSchliessen, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onSchliessen(); };
    document.addEventListener('keydown', esc);
    // Hintergrund nicht mitscrollen lassen, solange der Dialog offen ist.
    const vorher = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = vorher;
    };
  }, [onSchliessen]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
         onClick={onSchliessen} role="dialog" aria-modal="true" aria-label={titel}>
      <div className="bg-bg-secondary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88dvh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg-secondary px-4 py-3 border-b border-border-light flex items-center justify-between z-10">
          <h3 className="karten-titel">{titel}</h3>
          <button onClick={onSchliessen} className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                  aria-label="Schließen">
            <Icon name="x" size={16} strokeWidth={2.4} />
          </button>
        </div>
        {/* Der untere Abstand haelt den Absende-Knopf von der Systemleiste
            und der App-Navigation frei. */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Auswahl aus dem Bekannten — oder etwas Neues eintippen.
 *
 * Eine reine Liste liesse nichts Neues zu, ein reines Textfeld erzeugt drei
 * Schreibweisen derselben Brauerei. Deshalb beides: die Liste zeigt, was es
 * schon gibt, „+ Neu" macht daraus ein Textfeld.
 *
 * Ein Wert, der (noch) nicht in der Liste steht — etwa beim Bearbeiten eines
 * alten Eintrags —, oeffnet das Feld von selbst. Sonst waere er beim
 * Speichern still verschwunden, weil die Auswahl ihn nicht kennt.
 */
function AuswahlMitNeu({ label, wert, onChange, vorhandene, platzhalter }) {
  const kenntWert = !wert || vorhandene.includes(wert);
  const [frei, setFrei] = useState(!kenntWert);

  return (
    <label className="block">
      <span className="text-footnote text-text-secondary flex items-center gap-1.5">
        {label}
        <button type="button"
                onClick={() => { setFrei((f) => !f); if (!frei) onChange(''); }}
                className="text-caption2 text-system-blue">
          {frei ? 'Liste' : '+ Neu'}
        </button>
      </span>
      {frei ? (
        <input value={wert} onChange={(e) => onChange(e.target.value)}
               placeholder={platzhalter} autoComplete="off"
               className="form-input w-full mt-1" />
      ) : (
        <select value={wert} onChange={(e) => onChange(e.target.value)}
                className="form-input w-full mt-1">
          <option value="">—</option>
          {vorhandene.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      )}
    </label>
  );
}

/**
 * Bestand — jede Sorte, jedes Land, jede Brauerei, die es gibt.
 *
 * DIE ANDEREN KARTEN BEANTWORTEN EINE ANDERE FRAGE
 * "Sortenvorliebe" und "Herkunft" laufen über die Verkostungen und zeigen,
 * was ihr getrunken habt. Wer in der Verwaltung eine Sorte anlegt, sucht sie
 * dort vergeblich — und das sieht aus, als sei das Anlegen nicht angekommen.
 * Diese Karte zeigt den BESTAND: alles Bekannte, auch das noch nicht
 * Getrunkene, klar als solches ausgewiesen.
 *
 * Kein erfundener Nullwert: was nie im Glas war, bekommt keine Note und
 * keinen Balken, sondern steht als "noch nicht getrunken" da.
 */
function Bestandskarte({ katalog, verkostungen }) {
  const [feld, setFeld] = useState('art');
  const reiter = [
    { id: 'art', label: 'Sorten', einzahl: 'Sorte' },
    { id: 'land', label: 'Länder', einzahl: 'Land' },
    { id: 'brauerei', label: 'Brauereien', einzahl: 'Brauerei' },
  ];
  const aktuell = reiter.find((r) => r.id === feld);

  const liste = useMemo(
    () => bestandNachFeld(feld, katalog, verkostungen, eigeneWerte(feld)),
    [feld, katalog, verkostungen]
  );
  const hoechster = liste[0]?.glaeser || 1;
  const offen = liste.filter((e) => !e.getrunken);

  if (!liste.length) return null;

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <span className="text-footnote font-semibold text-text-muted">Bestand</span>
        <span className="text-caption2 text-text-tertiary">
          {liste.length} {liste.length === 1 ? aktuell.einzahl : aktuell.label}
        </span>
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-2.5">
        {reiter.map((r) => (
          <button key={r.id} type="button" onClick={() => setFeld(r.id)}
                  aria-pressed={feld === r.id}
                  className={`flex-1 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                    feld === r.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {liste.map((e) => (
          <div key={e.wert}>
            <div className="flex items-baseline gap-2 text-caption1">
              <span className={`truncate flex-1 min-w-0 ${
                e.getrunken ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {e.wert}
              </span>
              <span className="num-tabular text-text-secondary flex-shrink-0 text-caption2">
                {e.getrunken
                  ? `${e.glaeser} ${e.glaeser === 1 ? 'Glas' : 'Gläser'}`
                    + ` · ${e.biere} ${e.biere === 1 ? 'Bier' : 'Biere'}`
                    + (e.schnitt != null ? ` · ${note(e.schnitt)}` : '')
                  : e.biere > 0
                    ? `${e.biere} ${e.biere === 1 ? 'Bier' : 'Biere'} · noch nicht getrunken`
                    : 'noch kein Bier'}
              </span>
            </div>
            {/* Balken nur, wo etwas getrunken wurde. Ein Nullbalken sähe aus
                wie ein sehr kleiner Wert, nicht wie "gar keiner". */}
            {e.getrunken && (
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
                <div className="h-full bg-system-teal/70"
                     style={{ width: `${Math.max(3, (e.glaeser / hoechster) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {offen.length > 0 && (
        <p className="text-caption2 text-text-tertiary mt-2">
          {offen.length} {offen.length === 1 ? `${aktuell.einzahl} wartet` : `${aktuell.label} warten`} noch
          — angelegt, aber noch nicht im Glas gewesen.
        </p>
      )}
    </div>
  );
}

/**
 * Trinkprofil — die Gesamtsicht auf beide, über alle Abende.
 *
 * Je Abend gibt es diese Zahlen schon; was fehlte, war der Vergleich über
 * alles. "Wer trinkt mehr" beantwortet ein einzelner Abend nicht.
 */
function Trinkprofil({ verkostungen, katalog }) {
  const profile = useMemo(() => trinkprofil(verkostungen, katalog), [verkostungen, katalog]);
  if (!profile.some((p) => p.glaeser > 0 || p.bewertet > 0)) return null;

  // Fuer die Balken: der jeweils groessere Wert ist der Massstab, damit man
  // die beiden nebeneinander vergleichen kann statt gegen eine feste Skala.
  const max = (feld) => Math.max(...profile.map((p) => Number(p[feld]) || 0), 1);
  // kommaEins lebt in BilanzAnsicht; hier die gleiche Formatierung lokal,
  // statt sie nach oben zu ziehen und zwei Stellen aneinanderzubinden.
  const einsNach = (n, stellen = 1) =>
    n == null ? '—' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: stellen });

  const zeilen = [
    { feld: 'glaeser', label: 'Gläser', zeige: (p) => p.glaeser },
    { feld: 'liter', label: 'Liter', zeige: (p) => einsNach(p.liter, 1) },
    { feld: 'ausgaben', label: 'Wert des Getrunkenen', zeige: (p) => euro(p.ausgaben) },
    { feld: 'staerke', label: 'Ø Stärke', zeige: (p) => (p.staerke == null ? '—' : `${einsNach(p.staerke, 1)} %`) },
    { feld: 'schnitt', label: 'Ø Note', zeige: (p) => note(p.schnitt) },
  ];

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <span className="text-footnote font-semibold text-text-muted">Trinkprofil</span>
        <span className="text-caption2 text-text-tertiary">über alle Abende</span>
      </div>

      <div className="space-y-2.5">
        {zeilen.map((z) => (
          <div key={z.feld}>
            <div className="text-caption2 text-text-tertiary mb-1">{z.label}</div>
            {profile.map((p) => (
              <div key={p.key} className="flex items-center gap-2 mb-1">
                <TeamLogo team={p.key} size="xs" />
                <div className="flex-1 min-w-0 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                  <div className={`h-full ${p.key === 'aek' ? 'bg-system-blue/70' : 'bg-system-red/70'}`}
                       style={{ width: `${Math.max(3, ((Number(p[z.feld]) || 0) / max(z.feld)) * 100)}%` }} />
                </div>
                <span className="num-tabular text-caption2 text-text-secondary w-20 text-right flex-shrink-0">
                  {z.zeige(p)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Die Lieblingssorte steht dazu, weil sie die Zahlen erklaert: wer
          Doppelbock mag, liegt bei der Staerke vorn, ohne mehr zu trinken. */}
      <div className="mt-2.5 pt-2.5 border-t border-border-light space-y-1">
        {profile.map((p) => (
          <div key={p.key} className="text-caption2 text-text-tertiary">
            <span className={`font-semibold ${p.farbe}`}>{p.name}</span>
            {p.lieblingssorte
              ? ` trinkt am liebsten ${p.lieblingssorte.art} (${p.lieblingssorte.glaeser} ${
                  p.lieblingssorte.glaeser === 1 ? 'Glas' : 'Gläser'})`
              : ' — noch keine Sorte oft genug getrunken'}
            {p.bewertet > 0 && ` · ${p.bewertet} ${p.bewertet === 1 ? 'Bewertung' : 'Bewertungen'}`}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Preisentwicklung je Bier.
 *
 * Nur Biere mit mindestens zwei Preisen — ein einzelner Preis ist keine
 * Entwicklung. Verkostungen ohne Preis fallen raus statt als 0 € zu zaehlen:
 * ein nicht eingetragener Preis ist kein geschenktes Bier.
 */
function Preisentwicklung({ verkostungen, boersen, katalog }) {
  const liste = useMemo(
    () => preisEntwicklungJeBier(verkostungen, boersen, katalog),
    [verkostungen, boersen, katalog]);
  if (!liste.length) return null;

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <span className="text-footnote font-semibold text-text-muted">Preisentwicklung</span>
        <span className="text-caption2 text-text-tertiary">
          {liste.length} {liste.length === 1 ? 'Bier' : 'Biere'} mehrfach gekauft
        </span>
      </div>
      <div className="space-y-2.5">
        {liste.slice(0, 8).map((e) => {
          const teurer = e.differenz > 0.001;
          const guenstiger = e.differenz < -0.001;
          return (
            <div key={e.bier.id}>
              <div className="flex items-baseline gap-2 text-caption1">
                <span className="text-text-primary truncate flex-1 min-w-0">{e.bier.name}</span>
                <span className="num-tabular text-text-secondary flex-shrink-0 text-caption2">
                  {euro(e.erster)} → {euro(e.letzter)}
                </span>
              </div>
              <div className="flex items-baseline gap-2 text-caption2 mt-0.5">
                <span className={teurer ? 'text-system-red' : guenstiger ? 'text-system-green' : 'text-text-tertiary'}>
                  {teurer ? '+' : ''}{euro(e.differenz)}
                  {!teurer && !guenstiger && ' gleich geblieben'}
                </span>
                <span className="text-text-tertiary ml-auto">
                  {e.punkte.length}× gekauft
                  {e.teuerster !== e.guenstigster
                    && ` · ${euro(e.guenstigster)}–${euro(e.teuerster)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
