import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import LoadingSpinner from '../../LoadingSpinner';
import ZahlFeld from '../../ZahlFeld';
import { zahl, alsText } from '../../../utils/zahlen';
import { supabaseDb } from '../../../utils/supabase';
import {
  PERSONEN, BIERARTEN, ladeBoersen, ladeKatalog, ladeVerkostungen,
  findeOderLegeBierAn, boersenStatistik, bestenListe, katalogBestenListe,
  ZAHLER, rechnung, bierVerlauf, bierFundstuecke, sortenVerteilung,
  KATEGORIE_KATALOG, KATEGORIE_GRUPPEN, STANDARD_KATEGORIEN, kategorie,
  ladeEinstellungen, sichereEinstellungen, noteAusKategorien, notenVon,
  geschmacksDuell, gesamtBilanz, kategorienProfil, sortenVorliebe, preisLeistung,
  abendText,
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
function EinstellungenFormular({ einstellungen, onSchliessen, onFertig }) {
  const [modus, setModus] = useState(einstellungen.modus);
  const [gewaehlt, setGewaehlt] = useState(einstellungen.kategorien);
  const [speichert, setSpeichert] = useState(false);

  const umschalten = (id) => setGewaehlt((alt) =>
    alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]);

  const speichern = async () => {
    setSpeichert(true);
    try {
      // In der Reihenfolge des Katalogs sichern, nicht in der des Antippens —
      // sonst steht "Abgang" mal vor, mal hinter "Antrunk".
      const sortiert = KATEGORIE_KATALOG.filter((k) => gewaehlt.includes(k.id)).map((k) => k.id);
      await sichereEinstellungen({ modus, kategorien: sortiert });
      toast.success('Gespeichert.');
      onFertig();
    } catch {
      toast.error('Konnte nicht gespeichert werden. Migration db/21 schon gelaufen?');
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
              {gewaehlt.length} von {KATEGORIE_KATALOG.length}
            </span>
          </div>
          <div className="space-y-3">
            {KATEGORIE_GRUPPEN.map((gruppe) => (
              <div key={gruppe}>
                <div className="text-caption2 text-text-tertiary mb-1.5">{gruppe}</div>
                <div className="flex flex-wrap gap-1.5">
                  {KATEGORIE_KATALOG.filter((k) => k.gruppe === gruppe).map((k) => {
                    const an = gewaehlt.includes(k.id);
                    return (
                      <button key={k.id} type="button" onClick={() => umschalten(k.id)}
                              title={k.hilfe}
                              className={`px-2.5 py-1.5 rounded-lg text-caption1 font-medium transition-colors ${
                                an ? 'bg-system-yellow/15 text-system-yellow ring-1 ring-system-yellow/40'
                                   : 'bg-bg-tertiary text-text-secondary'}`}>
                        {k.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setGewaehlt(STANDARD_KATEGORIEN)}
                  className="mt-2 text-caption2 text-text-tertiary underline">
            Auf die drei Standardkategorien zurücksetzen
          </button>
        </div>

        <p className="text-caption2 text-text-tertiary">
          Abgewählte Kategorien verschwinden nur aus dem Formular. Vergebene
          Noten bleiben gespeichert und zählen in der Bilanz weiter.
        </p>

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
                    onSchliessen={() => setBierOffen(null)} />
      )}
      {formular?.art === 'einstellungen' && (
        <EinstellungenFormular
          einstellungen={einstellungen}
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

          {/* Bestenliste */}
          {beste.length > 0 && (
            <div>
              <div className="text-footnote font-semibold text-text-muted mb-2">Bestenliste</div>
              <div className="space-y-1.5">
                {beste.map((v, i) => (
                  <button key={v.id} type="button" onClick={() => v.bier && onBier(v.bier)}
                          className="w-full flex items-start gap-2.5 text-left">
                    <span className={`w-5 text-center text-sm font-bold flex-shrink-0 mt-0.5 ${
                      i === 0 ? 'text-system-yellow' : i === 1 ? 'text-text-secondary'
                      : i === 2 ? 'text-system-orange' : 'text-text-tertiary'}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-text-primary truncate">{v.bier?.name}</span>
                        <span className="ml-auto num-tabular text-sm font-bold text-text-primary flex-shrink-0">
                          {note(v.note)}
                        </span>
                      </div>
                      <div className="text-caption2 text-text-tertiary">
                        {[v.bier?.brauerei, v.bier?.art,
                          v.bier?.alkohol ? prozent(v.bier.alkohol) : null,
                          v.groesse_ml ? `${v.groesse_ml} ml` : null,
                          v.preis != null ? euro(v.preis) : null].filter(Boolean).join(' · ')}
                      </div>
                      <div className="mt-1"><Kruege note={v.note} /></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alle Biere dieser Börse, änderbar */}
          {verkostungen.length > 0 && (
            <div>
              <div className="text-footnote font-semibold text-text-muted mb-2">Alle Biere</div>
              <div className="divide-y divide-border-light">
                {verkostungen.map((v) => {
                  const bier = katalog.find((b) => b.id === v.bier_id);
                  const zahler = ZAHLER.find((z) => z.id === v.bezahlt_von);
                  return (
                    <div key={v.id} className="flex items-center gap-2 py-2">
                      <button type="button" onClick={() => bier && onBier(bier)} disabled={!bier}
                              className="min-w-0 flex-1 text-left disabled:cursor-default">
                        <div className="text-sm text-text-primary truncate">{bier?.name || '—'}</div>
                        <div className="text-caption2 text-text-tertiary">
                          {PERSONEN.map((p) => {
                            const anzahl = p.key === 'aek' ? v.anzahl_aek : v.anzahl_real;
                            const note = p.key === 'aek' ? v.note_aek : v.note_real;
                            return (
                              <span key={p.key} className="mr-2">
                                <span className={p.farbe}>{p.name[0]}</span>
                                {' '}{anzahl}× {note != null ? `· ${note}` : ''}
                              </span>
                            );
                          })}
                          {zahler && (
                            <span className={zahler.farbe}>
                              {zahler.id === 'geteilt' ? 'geteilt' : `zahlt ${zahler.label}`}
                            </span>
                          )}
                        </div>
                      </button>
                      <button onClick={() => onBearbeiten(v)}
                              className="w-8 h-8 rounded-lg bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                              aria-label="Bearbeiten">
                        <Icon name="edit" size={15} strokeWidth={2.2} />
                      </button>
                      <button onClick={() => loeschen(v)}
                              className="w-8 h-8 rounded-lg bg-system-red/10 text-system-red flex items-center justify-center flex-shrink-0"
                              aria-label="Entfernen">
                        <Icon name="trash" size={15} strokeWidth={2.2} />
                      </button>
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
            <button onClick={teilen}
                    className="w-11 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                    aria-label="Abend teilen" title="Abend teilen">
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
        </div>
      )}
    </div>
  );
}

/** Katalogansicht: alle Biere über alle Börsen hinweg. */
function KatalogAnsicht({ katalog, verkostungen, boersen, onBier }) {
  const [suche, setSuche] = useState('');
  const [art, setArt] = useState('alle');

  const funde = useMemo(() => bierFundstuecke(verkostungen, katalog), [verkostungen, katalog]);
  const sorten = useMemo(() => sortenVerteilung(verkostungen, katalog), [verkostungen, katalog]);

  const liste = useMemo(() => {
    const alle = katalogBestenListe(verkostungen, katalog);
    const s = suche.trim().toLowerCase();
    return alle.filter((e) =>
      (art === 'alle' || e.bier.art === art) &&
      (!s || e.bier.name.toLowerCase().includes(s) ||
        String(e.bier.brauerei || '').toLowerCase().includes(s)));
  }, [katalog, verkostungen, suche, art]);

  const arten = useMemo(
    () => [...new Set(katalog.map((b) => b.art).filter(Boolean))].sort(),
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
      {arten.length > 0 && (
        <select value={art} onChange={(e) => setArt(e.target.value)} className="form-input w-full text-sm">
          <option value="alle">Alle Sorten</option>
          {arten.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}

      <div className="flex items-baseline justify-between px-1">
        <span className="text-caption1 text-text-secondary">{liste.length} Biere</span>
        <span className="text-caption1 text-text-tertiary">{boersen.length} Börsen</span>
      </div>

      {liste.length === 0 ? (
        <div className="modern-card p-8 text-center text-text-muted">Noch nichts im Katalog.</div>
      ) : (
        <div className="modern-card divide-y divide-border-light">
          {liste.map((e, i) => (
            /* Gestapelt statt alles in einer Zeile: Krüge, Note und Rang
               fressen auf 375px so viel Breite, dass für den Text keine 100px
               blieben — da wurde schon der Biername abgeschnitten. Jetzt
               stehen Name und Note oben, die Angaben darunter über die volle
               Breite. */
            <button key={e.bier_id} type="button" onClick={() => onBier(e.bier)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left">
              <span className={`w-5 text-center text-sm font-bold flex-shrink-0 mt-0.5 ${
                i === 0 ? 'text-system-yellow' : 'text-text-tertiary'}`}>{i + 1}</span>
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

      {/* Je Person über alles */}
      <div className="grid grid-cols-2 gap-2">
        {PERSONEN.map((p) => {
          const s = b.proPerson[p.team];
          return (
            <div key={p.key} className="modern-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TeamLogo team={p.key} size="xs" />
                <span className={`text-footnote font-semibold truncate ${p.farbe}`}>{p.name}</span>
              </div>
              <div className="space-y-0.5 text-caption1">
                {[
                  ['Gläser', s.glaeser],
                  ['Liter', kommaEins(s.ml / 1000, 2)],
                  ['Ausgaben', euro(s.ausgaben)],
                  ['Ø Note', note(s.schnitt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-text-secondary">{k}</span>
                    <span className="num-tabular text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
            <div className="space-y-2 mb-3">
              {duell.proKategorie.map((k) => {
                const gesamt = (k.aek || 0) + (k.real || 0);
                const anteilAek = gesamt ? (k.aek / gesamt) * 100 : 50;
                return (
                  <div key={k.id}>
                    <div className="flex items-baseline gap-2 text-caption2 mb-1">
                      <span className="text-text-secondary">{k.label}</span>
                      <span className="ml-auto num-tabular text-system-blue font-semibold">{note(k.aek)}</span>
                      <span className="text-text-tertiary">:</span>
                      <span className="num-tabular text-system-red font-semibold">{note(k.real)}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-bg-tertiary">
                      <div className="bg-system-blue" style={{ width: `${anteilAek}%` }} />
                      <div className="bg-system-red" style={{ width: `${100 - anteilAek}%` }} />
                    </div>
                  </div>
                );
              })}
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
    if (s.length < 2 || vorhandenes) return [];
    return katalog.filter((b) => b.name.toLowerCase().includes(s)).slice(0, 5);
  }, [name, katalog, vorhandenes]);

  const uebernehmen = (b) => {
    setName(b.name); setBrauerei(b.brauerei || ''); setArt(b.art || '');
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
      const bier = await findeOderLegeBierAn({ name, brauerei, art, alkohol: a });
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
          <label className="block">
            <span className="text-footnote text-text-secondary">Brauerei</span>
            <input value={brauerei} onChange={(e) => setBrauerei(e.target.value)} className="form-input w-full mt-1" />
          </label>
          <label className="block">
            <span className="text-footnote text-text-secondary">Sorte</span>
            <select value={art} onChange={(e) => setArt(e.target.value)} className="form-input w-full mt-1">
              <option value="">—</option>
              {BIERARTEN.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
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
                noten={noten} onNoten={setNoten}
                gesamt={gesamt} auswahl={gerundet} onGesamt={setGesamt}
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
function BierDetail({ bier, verkostungen, boersen, onSchliessen }) {
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
          <h3 className="text-callout font-semibold text-text-primary">{titel}</h3>
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
