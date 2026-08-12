import { useEffect, useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import LoadingSpinner from '../LoadingSpinner';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { offeneRechnung } from './finanzen/OffeneRechnung';
import { ladeLokal, bierStand, schnapsStand, logischesDatum } from '../../utils/abende';
import { dez } from '../../utils/zahlen';
import { ladeWechsel } from '../../utils/spielerWechsel';
import { useIchBin } from '../../hooks/useIchBin';

/**
 * Gerade jetzt.
 *
 * Die App fiel beim Öffnen in eine Spieleliste — nützlich, wenn man ein Spiel
 * sucht, aber nicht die Frage, die man beim Aufmachen im Kopf hat: Wer führt
 * gerade? Was war zuletzt? Schuldet mir jemand was? Läuft heute ein Abend?
 *
 * Diese Seite beantwortet genau das und sonst nichts. Jede Zeile ist ein Weg
 * dorthin, wo es weitergeht — sie ersetzt keine der Ansichten, sie zeigt nur,
 * welche gerade interessant ist.
 */

const euroGanz = (n) => `${Math.round(Number(n) || 0).toLocaleString('de-DE')} €`;

/**
 * Tageszeit fuer die Begruessung.
 *
 * Die Grenzen richten sich danach, wann man die App aufmacht, nicht nach
 * einer Norm: gespielt wird abends, und "Guten Abend" soll schon dastehen,
 * wenn der erste Anpfiff faellt — nicht erst um 22 Uhr.
 */
function tageszeit(stunde = new Date().getHours()) {
  if (stunde < 5) return 'Gute Nacht';
  if (stunde < 11) return 'Guten Morgen';
  if (stunde < 17) return 'Hallo';
  return 'Guten Abend';
}

/** Wie lange ist das her? */
function seit(datum) {
  if (!datum) return null;
  const tage = Math.floor((Date.now() - new Date(datum).getTime()) / 86400000);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 7) return `vor ${tage} Tagen`;
  if (tage < 14) return 'vor einer Woche';
  if (tage < 60) return `vor ${Math.round(tage / 7)} Wochen`;
  return `vor ${Math.round(tage / 30)} Monaten`;
}

/**
 * Eine Zeile, die irgendwohin führt.
 *
 * Bewusst kein `modern-card` je Zeile: sechs Karten untereinander sind wieder
 * die Kachelwand, aus der diese Seite herausführen soll. Eine Karte, darin
 * Zeilen.
 */
function Zeile({ icon, farbe, titel, wert, hinweis, onClick }) {
  return (
    <button onClick={onClick}
            className="w-full flex items-center gap-3 py-3 text-left transition-colors active:bg-bg-tertiary/50">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${farbe}`}>
        <Icon name={icon} size={18} strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption2 text-text-tertiary">{titel}</span>
        <span className="block text-callout font-semibold text-text-primary truncate">{wert}</span>
        {hinweis && <span className="block text-caption2 text-text-tertiary truncate">{hinweis}</span>}
      </span>
      <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-text-tertiary flex-shrink-0" />
    </button>
  );
}

export default function StartTab({ onNavigate }) {
  const { darfEintragen, name: ichHeisse } = useIchBin();
  const { data: matches, loading: mLoading } = useSupabaseQuery('matches', '*');
  const { data: finances, loading: fLoading } = useSupabaseQuery('finances', '*');
  // Hier stehen die Personen, nicht die Vereine: "Alexander führt mit 1 Sieg"
  // ist die Frage, mit der man die App aufmacht — "AEK Athen führt" nicht.
  const { data: managers } = useSupabaseQuery('manager', '*');
  const { data: bans } = useSupabaseQuery('bans', '*');
  const { data: players } = useSupabaseQuery('players', 'id,name,team');
  const name = (team) => (team === 'AEK'
    ? managers?.find((m) => m.id === 1)?.name || 'Alexander'
    : managers?.find((m) => m.id === 2)?.name || 'Philip');

  const bilanz = useMemo(() => {
    const liste = matches || [];
    let aek = 0, real = 0, remis = 0;
    for (const m of liste) {
      const a = m.goalsa || 0, b = m.goalsb || 0;
      if (a > b) aek++; else if (b > a) real++; else remis++;
    }
    // Neuestes Spiel zuerst — die Liste kommt nicht garantiert sortiert.
    const sortiert = [...liste].sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
    const tore = liste.reduce((n, m) => n + (m.goalsa || 0) + (m.goalsb || 0), 0);
    return {
      aek, real, remis, gesamt: liste.length, letztes: sortiert[0] || null,
      tore,
      // Nur aus den Spielen dieser Saison — hier gibt es keine gezaehlten
      // Altsaisons, deren Tore fehlen koennten.
      schnitt: liste.length ? tore / liste.length : 0,
    };
  }, [matches]);

  /**
   * Wer hat gerade einen Lauf?
   *
   * Die Formkurve zeigt die letzten fuenf, aber nicht, ob daraus eine Serie
   * geworden ist — fuenf Kacheln muss man erst lesen. Ein Remis beendet die
   * Serie, es ist ja kein Sieg.
   */
  const serie = useMemo(() => {
    const neueste = [...(matches || [])]
      .filter((m) => m?.date)
      .sort((x, y) => String(y.date).localeCompare(String(x.date)));
    let wer = null, laenge = 0;
    for (const m of neueste) {
      const a = m.goalsa || 0, b = m.goalsb || 0;
      if (a === b) break;
      const sieger = a > b ? 'AEK' : 'Real';
      if (wer === null) { wer = sieger; laenge = 1; }
      else if (sieger === wer) laenge += 1;
      else break;
    }
    return laenge >= 2 ? { wer, laenge } : null;
  }, [matches]);

  /**
   * Der juengste Wechsel.
   *
   * Die Startzeilen (von = null) sind der Stand bei Einfuehrung der Erfassung
   * und kein Vorgang — sonst meldete die Seite am ersten Tag 41 "Wechsel".
   */
  const [letzterWechsel, setLetzterWechsel] = useState(null);
  useEffect(() => {
    let abgemeldet = false;
    ladeWechsel().then(({ wechsel, fehler }) => {
      if (abgemeldet || fehler) return;
      const echte = (wechsel || []).filter((w) => w.von != null);
      echte.sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || (b.id - a.id));
      setLetzterWechsel(echte[0] || null);
    });
    return () => { abgemeldet = true; };
  }, []);

  /**
   * Die letzten Spiele, neueste rechts.
   *
   * Der Saisonstand beantwortet "wer führt", aber nicht "wie läuft es
   * gerade" — und das sind zwei verschiedene Fragen. Wer 12:4 vorn liegt und
   * die letzten vier verloren hat, sieht auf der Tabelle souverän aus und
   * weiß trotzdem, dass es kippt.
   */
  const form = useMemo(() => {
    const sortiert = [...(matches || [])]
      .filter((m) => m?.date)
      .sort((x, y) => String(x.date).localeCompare(String(y.date)));
    return sortiert.slice(-5).map((m) => {
      const a = m.goalsa || 0, b = m.goalsb || 0;
      return { id: m.id, a, b, sieger: a > b ? 'AEK' : b > a ? 'Real' : null, datum: m.date };
    });
  }, [matches]);

  /**
   * Wer fehlt beim nächsten Mal?
   *
   * Die einzige Zahl hier, die vor dem Spielen etwas ändert: eine laufende
   * Sperre entscheidet über die Aufstellung. Deshalb steht sie vorn und nicht
   * drei Ansichten tief im Kader.
   */
  const gesperrt = useMemo(() => {
    const nachId = new Map((players || []).map((p) => [p.id, p]));
    return (bans || [])
      .map((b) => ({
        id: b.id,
        rest: Math.max(0, (b.totalgames || 0) - (b.matchesserved || 0)),
        // bans.team ist die Seite vom Tag der Sperre — die gilt, auch wenn der
        // Spieler seither gewechselt ist.
        team: b.team,
        name: nachId.get(b.player_id)?.name || 'Unbekannt',
      }))
      .filter((b) => b.rest > 0)
      .sort((x, y) => y.rest - x.rest);
  }, [bans, players]);

  // Läuft gerade ein Abend? Die Ereignisse liegen lokal; "heute" endet erst
  // morgens um sechs, sonst wäre ein Abend um halb zwei schon Geschichte.
  const abend = useMemo(() => {
    try {
      const ereignisse = ladeLokal();
      const heute = logischesDatum();
      const vonHeute = ereignisse.filter((e) => e.datum === heute);
      if (!vonHeute.length) return null;
      const bier = bierStand(vonHeute);
      const schnaps = schnapsStand(vonHeute);
      return {
        glaeser: (bier.alexander || 0) + (bier.philip || 0),
        schnaps: (schnaps.alex || 0) + (schnaps.philip || 0),
        anzahl: vonHeute.length,
      };
    } catch { return null; }
  }, []);

  if (mLoading || fLoading) return <LoadingSpinner message="Lade Übersicht…" />;

  const aekFin = (finances || []).find((f) => f.team === 'AEK') || {};
  const realFin = (finances || []).find((f) => f.team === 'Real') || {};
  const rechnung = offeneRechnung(aekFin.debt, realFin.debt);

  const { aek, real, remis, gesamt, letztes, tore, schnitt } = bilanz;

  const anteilAek = gesamt > 0 ? (aek / (aek + real || 1)) * 100 : 50;
  const fuehrt = aek > real ? 'AEK' : real > aek ? 'Real' : null;

  const letztesErgebnis = letztes
    ? `${letztes.goalsa ?? 0} : ${letztes.goalsb ?? 0}`
    : null;
  const letzterSieger = letztes
    ? ((letztes.goalsa || 0) > (letztes.goalsb || 0) ? 'AEK'
      : (letztes.goalsb || 0) > (letztes.goalsa || 0) ? 'Real' : null)
    : null;

  return (
    <div className="p-4 pb-24 mobile-safe-bottom space-y-4">
      {/* Erst wenn feststeht, WER da ist. Ohne diese Bedingung stand hier
          waehrend des Ladens "Guten Abend, Alexander" — auch vor Philip. */}
      {ichHeisse && (
        <h1 className="text-title2 font-bold text-text-primary px-0.5">
          {tageszeit()}, {ichHeisse}
        </h1>
      )}
      {/* Der Stand als geteilte Fläche — dieselbe Sprache wie im Duell,
          nur größer: hier ist es die eine Aussage der Seite. */}
      <div className="modern-card p-5">
        {gesamt === 0 ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-system-orange/12 text-system-orange flex items-center justify-center">
              <Icon name="football" size={26} strokeWidth={1.8} />
            </div>
            <p className="text-text-primary font-semibold">Noch kein Spiel erfasst</p>
            <p className="text-footnote text-text-tertiary mt-1">
              Sobald ihr spielt, steht hier, wer vorn liegt.
            </p>
          </div>
        ) : (
          <>
            <div className="text-caption2 text-text-tertiary text-center mb-3">Diese Saison</div>
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <TeamLogo team="aek" size="xs" />
                  <span className="text-caption2 text-text-tertiary truncate">{name('AEK')}</span>
                </div>
                <div className={`text-[44px] leading-none font-black tracking-tight num-tabular ${
                  fuehrt === 'AEK' ? 'text-system-blue' : 'text-text-tertiary'}`}>{aek}</div>
              </div>
              <div className="text-center pb-1.5 flex-shrink-0">
                <div className="text-caption2 text-text-tertiary">Siege</div>
                {/* Ohne die Remis behauptete die Karte "12 Spiele" und zeigte
                    darunter 5 : 4 — die drei fehlenden erklärte nichts. */}
                {remis > 0 && (
                  <div className="text-caption2 text-text-tertiary num-tabular mt-0.5 whitespace-nowrap">
                    {remis} Remis
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <span className="text-caption2 text-text-tertiary truncate">{name('Real')}</span>
                  <TeamLogo team="real" size="xs" />
                </div>
                <div className={`text-[44px] leading-none font-black tracking-tight num-tabular ${
                  fuehrt === 'Real' ? 'text-system-red' : 'text-text-tertiary'}`}>{real}</div>
              </div>
            </div>

            <div className="relative mt-3 h-2.5 rounded-full overflow-hidden bg-bg-tertiary flex">
              <div className="bg-system-blue h-full transition-all duration-500" style={{ width: `${anteilAek}%` }} />
              <div className="bg-system-red h-full transition-all duration-500" style={{ width: `${100 - anteilAek}%` }} />
              <div className="absolute inset-y-0 left-1/2 w-px bg-bg-secondary/70" />
            </div>

            <p className="mt-3 text-center text-footnote text-text-secondary">
              {fuehrt
                ? <>
                    <span className={fuehrt === 'AEK' ? 'text-system-blue font-semibold' : 'text-system-red font-semibold'}>
                      {name(fuehrt)}
                    </span>
                    {' führt mit '}
                    <span className="num-tabular font-semibold">{Math.abs(aek - real)}</span>
                    {Math.abs(aek - real) === 1 ? ' Sieg' : ' Siegen'}
                  </>
                : 'Gleichstand — es steht auf Messers Schneide.'}
            </p>

            {/* Die drei Zahlen, die man sonst in der Statistik nachschlagen
                muesste. Der Schnitt kommt aus denselben Spielen wie die Tore,
                hier gibt es keine gezaehlten Altsaisons ohne Torangabe. */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                ['Spiele', gesamt],
                ['Tore', tore],
                ['Ø je Spiel', dez(schnitt, 1)],
              ].map(([label, wert]) => (
                <div key={label} className="panel-gray rounded-xl p-2.5 text-center">
                  <div className="stat-display text-[17px] num-tabular text-text-primary">{wert}</div>
                  <div className="text-caption2 text-text-tertiary truncate">{label}</div>
                </div>
              ))}
            </div>

            {form.length > 1 && (
              <button onClick={() => onNavigate?.('spielbetrieb')}
                      className="w-full mt-4 pt-3 border-t border-border-light text-left">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-caption2 text-text-tertiary">
                    {form.length === 5 ? 'Letzte fünf' : `Letzte ${form.length}`}
                  </span>
                  <span className="text-caption2 text-text-tertiary">neueste rechts</span>
                </div>
                <div className="flex gap-1.5">
                  {form.map((f) => (
                    <span key={f.id}
                          className={`flex-1 min-w-0 h-9 rounded-lg flex items-center justify-center
                                      text-caption2 font-bold num-tabular ${
                            // Die Farbe liegt im Hintergrund, nicht in der
                            // Schrift. Andersherum — blau auf Blaustich, rot
                            // auf Rotstich — kam im Hellmodus auf 3,2:1 und
                            // 2,5:1; die Kachel sagt ohnehin schon über die
                            // Fläche, wer gewonnen hat, und der Text muss nur
                            // die Zahl liefern. So sind es 13:1.
                            f.sieger === 'AEK' ? 'bg-system-blue/20 text-text-primary'
                            : f.sieger === 'Real' ? 'bg-system-red/20 text-text-primary'
                            : 'bg-bg-tertiary text-text-secondary'}`}>
                      {f.a}:{f.b}
                    </span>
                  ))}
                </div>
                {/* Erst ab zwei — bei einer "Serie" von einem Spiel waere das
                    nur das letzte Ergebnis in Worten. */}
                {serie && (
                  <div className="mt-2 text-caption2 text-text-secondary">
                    <span className={serie.wer === 'AEK'
                      ? 'text-system-blue font-semibold' : 'text-system-red font-semibold'}>
                      {name(serie.wer)}
                    </span>
                    {` hat die letzten ${serie.laenge} gewonnen`}
                  </div>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Schnellaktionen — bewusst nur das EINTRAGEN.
          Die sechs Bereiche sind über die untere Leiste schon einen Tipp
          entfernt; ein Knopf, der auch nur dorthin führt, waere ein zweiter
          Weg zum selben Ort. Was hier fehlte, war der Weg zum Formular:
          ein Spiel einzutragen hiess Verwaltung aufmachen, Getränke hiessen
          Abend und dann Alkohol. */}
      <div className={`grid gap-2 ${darfEintragen ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {darfEintragen && (
          <button onClick={() => onNavigate?.('admin')}
                  className="modern-card p-3 flex items-center gap-2.5 text-left active:bg-bg-tertiary/50 transition-colors">
            <span className="w-9 h-9 rounded-xl bg-system-green/12 text-system-green flex items-center justify-center flex-shrink-0">
              <Icon name="plus" size={18} strokeWidth={2.4} />
            </span>
            <span className="text-footnote font-semibold text-text-primary leading-tight">
              Spiel<br />eintragen
            </span>
          </button>
        )}
        <button onClick={() => onNavigate?.('alcohol')}
                className="modern-card p-3 flex items-center gap-2.5 text-left active:bg-bg-tertiary/50 transition-colors">
          <span className="w-9 h-9 rounded-xl bg-system-yellow/12 text-system-yellow flex items-center justify-center flex-shrink-0">
            <Icon name="beer" size={18} strokeWidth={2.1} />
          </span>
          <span className="text-footnote font-semibold text-text-primary leading-tight">
            Getränk<br />eintragen
          </span>
        </button>
      </div>

      {/* Was gerade ansteht. Jede Zeile führt dorthin, wo es weitergeht. */}
      <div className="modern-card divide-y divide-border-light">
        {letztes && (
          <Zeile
            icon="football" farbe="bg-system-green/12 text-system-green"
            titel="Zuletzt gespielt"
            wert={`${letztesErgebnis}${letzterSieger ? ` · ${name(letzterSieger)}` : ' · Remis'}`}
            hinweis={seit(letztes.date)}
            onClick={() => onNavigate?.('spielbetrieb')}
          />
        )}

        {letzterWechsel && (
          <Zeile
            icon="swap" farbe="bg-system-purple/12 text-system-purple"
            titel="Zuletzt gewechselt"
            wert={letzterWechsel.name}
            hinweis={`${letzterWechsel.von === 'AEK' || letzterWechsel.von === 'Real'
              ? name(letzterWechsel.von) : letzterWechsel.von}`
              + ' → '
              + `${letzterWechsel.nach === 'AEK' || letzterWechsel.nach === 'Real'
              ? name(letzterWechsel.nach) : letzterWechsel.nach}`
              + `${seit(letzterWechsel.datum) ? ` · ${seit(letzterWechsel.datum)}` : ''}`}
            onClick={() => onNavigate?.('transfers')}
          />
        )}

        {/* Nur wenn wirklich jemand fehlt. "Niemand gesperrt" ist der
            Normalfall und braucht keine eigene Zeile — diese Seite soll
            zeigen, was gerade anders ist. */}
        {gesperrt.length > 0 && (
          <Zeile
            icon="ban" farbe="bg-system-red/12 text-system-red"
            titel={gesperrt.length === 1 ? 'Gesperrt' : `${gesperrt.length} gesperrt`}
            wert={gesperrt.length === 1
              ? gesperrt[0].name
              : gesperrt.slice(0, 2).map((g) => g.name).join(', ')
                + (gesperrt.length > 2 ? ` +${gesperrt.length - 2}` : '')}
            hinweis={gesperrt.length === 1
              ? `noch ${gesperrt[0].rest} ${gesperrt[0].rest === 1 ? 'Spiel' : 'Spiele'}`
              : `längste Sperre: noch ${gesperrt[0].rest} ${gesperrt[0].rest === 1 ? 'Spiel' : 'Spiele'}`}
            onClick={() => onNavigate?.('spielbetrieb')}
          />
        )}

        <Zeile
          icon={rechnung.betrag === 0 ? 'check' : 'swap'}
          farbe={rechnung.betrag === 0
            ? 'bg-system-green/12 text-system-green'
            : 'bg-system-orange/12 text-system-orange'}
          titel="Echtgeld"
          wert={rechnung.betrag === 0
            ? 'Ihr seid quitt'
            : `${name(rechnung.schuldner)} schuldet ${euroGanz(rechnung.betrag)}`}
          hinweis={rechnung.betrag === 0 ? null : `an ${name(rechnung.glaeubiger)}`}
          onClick={() => onNavigate?.('finanzen')}
        />

        {abend ? (
          <Zeile
            icon="beer" farbe="bg-system-yellow/12 text-system-yellow"
            titel="Heute Abend"
            wert={[
              abend.glaeser > 0 ? `${abend.glaeser} ${abend.glaeser === 1 ? 'Bier' : 'Biere'}` : null,
              abend.schnaps > 0 ? `${abend.schnaps} Schnaps` : null,
            ].filter(Boolean).join(' · ') || `${abend.anzahl} Einträge`}
            hinweis="läuft"
            onClick={() => onNavigate?.('abend')}
          />
        ) : (
          <Zeile
            icon="beer" farbe="bg-bg-tertiary text-text-tertiary"
            titel="Heute Abend"
            wert="Noch nichts eingetragen"
            onClick={() => onNavigate?.('abend')}
          />
        )}

        <Zeile
          icon="chart" farbe="bg-system-blue/12 text-system-blue"
          titel="Kontostand"
          wert={`${dez(aekFin.balance || 0, 0)} € : ${dez(realFin.balance || 0, 0)} €`}
          hinweis={`${name('AEK')} zu ${name('Real')}`}
          onClick={() => onNavigate?.('finanzen')}
        />
      </div>
    </div>
  );
}
