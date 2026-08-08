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
} from '../../../utils/bierboerse';

const euro = (n) => `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
// Alkoholangaben kommen als Zahl aus der Datenbank und wuerden sonst als
// "5.2 %" mitten im deutschen Text stehen.
const prozent = (n) => `${Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
const datum = (s) => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

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
function NotenWahl({ wert, onChange, farbe }) {
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
          aria-label={`Note ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
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
  const [ansicht, setAnsicht] = useState('boersen'); // boersen | katalog
  const [bierOffen, setBierOffen] = useState(null);   // Bier-Detailansicht

  const laden4 = useCallback(async () => {
    setLaden(true); setFehler(null);
    try {
      const [b, k, v] = await Promise.all([ladeBoersen(), ladeKatalog(), ladeVerkostungen()]);
      setBoersen(b); setKatalog(k); setVerkostungen(v);
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
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {[['boersen', 'Börsen'], ['katalog', 'Alle Biere']].map(([id, label]) => (
          <button key={id} onClick={() => setAnsicht(id)}
            className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
              ansicht === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {ansicht === 'katalog' ? (
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
      {formular?.art === 'bier' && (
        <BierFormular
          boerse={formular.boerse}
          verkostung={formular.verkostung}
          katalog={katalog}
          onSchliessen={() => setFormular(null)}
          onFertig={() => { setFormular(null); laden4(); }}
        />
      )}
    </div>
  );
}

/** Eine Börse: Kopfzahlen, aufklappbar zur Bestenliste. */
function BoersenKarte({ boerse, verkostungen, katalog, offen, onToggle, onNeuesBier, onBearbeiten, onBier, onAendern }) {
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
                        {s.schnitt == null ? '—' : s.schnitt.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
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
                          {v.note.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
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
            {/* Die ganze Börse löschen liegt bewusst hier unten im aufgeklappten
                Bereich — nicht neben dem Kopf, wo man beim Auf- und Zuklappen
                danebentippen kann. */}
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
                    {e.note == null ? '—' : e.note.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
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
                          {s.schnitt == null ? '—' : s.schnitt.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
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

/** Börse anlegen. */
function BoersenFormular({ onSchliessen, onFertig }) {
  const [name, setName] = useState('');
  const [ort, setOrt] = useState('');
  const [tag, setTag] = useState(() => new Date().toISOString().slice(0, 10));
  const [speichert, setSpeichert] = useState(false);

  const speichern = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Die Börse braucht einen Namen.'); return; }
    setSpeichert(true);
    const { error } = await supabaseDb.insert('bierboersen', {
      name: name.trim(), ort: ort.trim() || null, datum: tag,
    });
    setSpeichert(false);
    if (error) { toast.error('Konnte nicht gespeichert werden.'); return; }
    toast.success('Bierbörse angelegt.');
    onFertig();
  };

  return (
    <Modal titel="Neue Bierbörse" onSchliessen={onSchliessen}>
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
        <button type="submit" disabled={speichert} className="btn-primary w-full">
          {speichert ? 'Speichert…' : 'Anlegen'}
        </button>
      </form>
    </Modal>
  );
}

/** Bier zu einer Börse eintragen oder ändern. */
function BierFormular({ boerse, verkostung, katalog, onSchliessen, onFertig }) {
  const vorhandenes = verkostung ? katalog.find((b) => b.id === verkostung.bier_id) : null;
  const [name, setName] = useState(vorhandenes?.name || '');
  const [brauerei, setBrauerei] = useState(vorhandenes?.brauerei || '');
  const [art, setArt] = useState(vorhandenes?.art || '');
  const [alkohol, setAlkohol] = useState(alsText(vorhandenes?.alkohol));
  const [preis, setPreis] = useState(alsText(verkostung?.preis));
  const [ml, setMl] = useState(alsText(verkostung?.groesse_ml));
  const [anzahlAek, setAnzahlAek] = useState(verkostung?.anzahl_aek ?? 0);
  const [anzahlReal, setAnzahlReal] = useState(verkostung?.anzahl_real ?? 0);
  const [noteAek, setNoteAek] = useState(verkostung?.note_aek ?? null);
  const [noteReal, setNoteReal] = useState(verkostung?.note_real ?? null);
  const [zahler, setZahler] = useState(verkostung?.bezahlt_von ?? null);
  const [speichert, setSpeichert] = useState(false);

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
  };

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
        note_aek: noteAek,
        note_real: noteReal,
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
          <label className="block col-span-2">
            <span className="text-footnote text-text-secondary">Preis je Glas €</span>
            <ZahlFeld wert={preis} onChange={setPreis}
                      className="form-input w-full mt-1" placeholder="4,50" />
          </label>
        </div>

        {/* Anzahl und Note getrennt je Person */}
        {PERSONEN.map((p) => {
          const anzahl = p.key === 'aek' ? anzahlAek : anzahlReal;
          const setAnzahl = p.key === 'aek' ? setAnzahlAek : setAnzahlReal;
          const note = p.key === 'aek' ? noteAek : noteReal;
          const setNote = p.key === 'aek' ? setNoteAek : setNoteReal;
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
              <div className="flex items-center gap-2 mb-1.5">
                <Kruege note={note} groesse={16} />
                <span className="text-caption2 text-text-tertiary">
                  {note == null ? 'noch nicht bewertet' : `${note} von 10`}
                </span>
              </div>
              <NotenWahl wert={note} onChange={setNote} farbe={p.farbe} />
            </div>
          );
        })}

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

  return (
    <Modal titel={bier.name} onSchliessen={onSchliessen}>
      <div className="space-y-3">
        <div className="text-center">
          <div className="text-caption1 text-text-secondary">
            {[bier.brauerei, bier.art, bier.alkohol ? prozent(bier.alkohol) : null,
              bier.land].filter(Boolean).join(' · ') || 'Keine weiteren Angaben'}
          </div>
          <div className="stat-display text-[34px] num-tabular text-text-primary mt-2 leading-none">
            {v.schnitt == null ? '—' : v.schnitt.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
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
                    {s.schnitt == null ? '—' : s.schnitt.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-caption2 text-text-tertiary">
                    {s.glaeser} {s.glaeser === 1 ? 'Glas' : 'Gläser'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {v.einig != null && (
          <p className="text-caption1 text-text-secondary">
            {v.einig < 0.5
              ? 'Da sind sich beide einig.'
              : v.einig >= 3
                ? `Streitfall — ${v.einig.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Punkte auseinander.`
                : `${v.einig.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Punkte auseinander.`}
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
                    {e.note == null ? '—' : e.note.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
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
