import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import SpielerWechselKarte from '../../SpielerWechselKarte';
import { getTeamDisplay } from '../../../constants/teams';
import { istLegacySaison } from '../../../utils/legacySaison';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { spielerStatistik, MASSE } from '../../../utils/spielerStatistik';
import { formkurve } from '../../../utils/spielerBilanz';
import Verlaufsgrafik from '../../Verlaufsgrafik';
import { nameKey } from '../../../utils/playerIdentity';
import { dez } from '../../../utils/zahlen';

/**
 * Ein Spieler über alle Saisons hinweg.
 *
 * Zeigt, was tatsächlich vorliegt: Tore je Saison, Team, Marktwert,
 * Auszeichnungen und Sperren. Aus den Altsaisons gibt es keine Einzelspiele,
 * deshalb steht dort auch keine Quote „Tore pro Spiel" — die liesse sich nur
 * für FC25/FC26 rechnen und wäre daneben irreführend.
 *
 * Als Portal an document.body: der Tab-Inhalt steckt in `.tab-transition`,
 * und deren `will-change: opacity` erzeugt einen Stapelkontext, aus dem ein
 * z-index allein nicht herauskommt.
 */
export default function SpielerVerlauf({ spieler: uebergeben, player, onSchliessen, mass }) {
  // Der Umschalter gehoert IN die Ansicht.
  //
  // Vorher kam das Mass nur von aussen — im Kader gab es die Liste mit dem
  // Umschalter gar nicht, dort waeren Auszeichnungen und Sperren also nie
  // erreichbar gewesen. Startwert ist, was der Aufrufer gerade betrachtet.
  const [massId, setMassId] = useState(mass?.id || 'tore');
  const aktuellesMass = MASSE.find((m) => m.id === massId) || MASSE[0];

  // Die Laufbahn selbst besorgen, wenn sie nicht mitgegeben wurde.
  //
  // So laesst sich die Ansicht ueberall oeffnen, wo eine Spielerzeile
  // vorliegt — der Kader laedt nur die LAUFENDE Saison und koennte die
  // Laufbahn sonst gar nicht zeigen. Immer ueber alle Saisons.
  const brauchtDaten = !uebergeben;
  const opt = { skipFifaFilter: true };
  const { data: alleSpieler } = useSupabaseQuery('players', '*', opt);
  const { data: alleSds } = useSupabaseQuery('spieler_des_spiels', '*', opt);
  const { data: alleSperren } = useSupabaseQuery('bans', '*', opt);
  const { data: alleSpiele } = useSupabaseQuery('matches', '*', opt);

  const selbstGebaut = useMemo(() => {
    if (!brauchtDaten || !player?.name || !alleSpieler) return null;
    // Ein Objekt, keine drei Argumente — die Signatur ist
    // spielerStatistik({ players, sds, bans }). Falsch aufgerufen liefert sie
    // stillschweigend eine leere Liste, und die Ansicht faellt auf den
    // Ersatz mit nur einer Saison zurueck, ohne dass irgendwo ein Fehler
    // auftaucht. Genau so ist es mir hier passiert.
    const liste = spielerStatistik({ players: alleSpieler, sds: alleSds || [], bans: alleSperren || [] });
    const k = nameKey(player.name);
    return liste.find((x) => x.key === k)
      || liste.find((x) => (x.spellings || []).some((n) => nameKey(n) === k))
      || null;
  }, [brauchtDaten, player?.name, alleSpieler, alleSds, alleSperren]);

  const [kurvenArt, setKurvenArt] = useState('je');

  const kurve = useMemo(
    () => formkurve(alleSpiele || [], player?.name || uebergeben?.name),
    [alleSpiele, player?.name, uebergeben?.name]);

  /**
   * Die Punkte fuer die Grafik.
   *
   * "Je Spiel" zeigt die Schwankung, "Aufsummiert" die Gesamtentwicklung.
   * Beide aus derselben Quelle, damit sie nicht auseinanderlaufen koennen.
   */
  const kurvenPunkte = useMemo(() => {
    let summe = 0;
    return kurve.map((x, i) => {
      summe += x.tore;
      const datum = x.datum
        ? new Date(x.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        : `Spiel ${i + 1}`;
      return {
        label: datum,
        wert: kurvenArt === 'summe' ? summe : x.tore,
        zusatz: kurvenArt === 'summe' ? `${x.tore} in diesem Spiel` : null,
      };
    });
  }, [kurve, kurvenArt]);

  // Ersatz aus der Spielerzeile, falls die Laufbahn (noch) nicht steht.
  //
  // `if (!spieler) return null` weiter unten heisst: kein Fenster. Aus dem
  // Kader waere das ein Tipp ins Leere — waehrend die Abfragen laufen, und
  // dauerhaft, wenn der Name in spielerStatistik unter einer anderen
  // Schreibweise steckt. Lieber die eine Saison zeigen, die man sicher hat.
  const ersatz = useMemo(() => {
    if (!player?.name) return null;
    return {
      key: nameKey(player.name),
      name: player.name,
      currentTeam: player.team,
      spellings: [player.name],
      seasons: [{
        id: player.id, version: player.fifa_version || '—', team: player.team,
        goals: Number(player.goals) || 0, value: Number(player.value) || 0,
        sds: 0, sperren: 0, sperrSpiele: 0, sperrArten: {},
      }],
    };
  }, [player]);

  const spieler = uebergeben || selbstGebaut || ersatz;
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onSchliessen(); };
    document.addEventListener('keydown', esc);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = vorher;
    };
  }, [onSchliessen]);

  // Die Saisonzeilen bringen Tore, Auszeichnungen und Sperren schon mit
  // (spielerStatistik). Hier nur noch sortieren — zweimal dieselbe Zuordnung
  // zu bauen hiesse, sie zweimal unterschiedlich falsch zu machen.
  const zeilen = useMemo(() => {
    if (!spieler) return [];
    return [...spieler.seasons].sort(
      (a, b) => (parseInt(String(b.version).replace(/\D/g, ''), 10) || 0)
              - (parseInt(String(a.version).replace(/\D/g, ''), 10) || 0)
    );
  }, [spieler]);

  if (!spieler) return null;

  const gesamtTore = zeilen.reduce((s, z) => s + z.goals, 0);
  const gesamtSds = zeilen.reduce((s, z) => s + (z.sds || 0), 0);
  const gesamtSperren = zeilen.reduce((s, z) => s + (z.sperren || 0), 0);
  const gesamtSperrSpiele = zeilen.reduce((s, z) => s + (z.sperrSpiele || 0), 0);
  // Zahl und Balken je Saison folgen dem Mass, das in der Liste gewaehlt
  // wurde. Vorher zeigten sie IMMER die Tore — wer auf "Sperren" sortiert
  // hatte und dann jemanden aufmachte, bekam wieder Tore vorgesetzt und
  // musste die Sperren aus der Kleinschrift darunter zusammensuchen.
  const feld = aktuellesMass.feld;
  const wert = (z) => z[feld] || 0;
  const beste = Math.max(...zeilen.map(wert), 1);
  const gesamtMass = zeilen.reduce((s, z) => s + wert(z), 0);
  const besteSaison = zeilen.reduce((a, b) => (wert(b) > (a ? wert(a) : -1) ? b : a), null);
  // Vereinsnamen je Saison aufloesen, nicht ueber die laufende Saison: FC25
  // hiess Real Madrid, FC26 heisst Schalke — sonst steht im Kopf ein anderer
  // Verein als in der Zeile darunter.
  const stationen = [];
  for (const z of [...zeilen].reverse()) {
    if (!z.team) continue;
    const name = getTeamDisplay(z.team, z.version);
    if (stationen[stationen.length - 1] !== name) stationen.push(name);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
         onClick={onSchliessen} role="dialog" aria-modal="true" aria-label={`Laufbahn von ${spieler.name}`}>
      <div className="bg-bg-secondary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88dvh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg-secondary px-4 py-3 border-b border-border-light flex items-center gap-2.5 z-10">
          <SpielerWappen team={spieler.currentTeam} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="karten-titel truncate">{spieler.name}</h3>
            <p className="text-caption2 text-text-tertiary truncate">
              {zeilen.length} {zeilen.length === 1 ? 'Saison' : 'Saisons'}
              {stationen.length > 0 ? ` · ${stationen.join(' → ')}` : ''}
            </p>
          </div>
          <button onClick={onSchliessen}
                  className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                  aria-label="Schließen">
            <Icon name="x" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-4">
          {/* Kennzahlen — zugleich der Umschalter.
              Die drei Zahlen standen ohnehin schon nebeneinander; sie
              anklickbar zu machen erspart eine zweite Bedienleiste fuer
              dieselbe Entscheidung. Die gewaehlte ist hervorgehoben. */}
          <div className="grid grid-cols-3 gap-2">
            {MASSE.map((m) => {
              const zahl = m.id === 'tore' ? gesamtTore : m.id === 'sds' ? gesamtSds : gesamtSperren;
              const an = m.id === massId;
              return (
                <button key={m.id} type="button" onClick={() => setMassId(m.id)}
                        aria-pressed={an}
                        className={`rounded-xl p-3 text-center transition-colors ${
                          an ? 'bg-bg-elevated ring-2 ring-current ' + m.farbe : 'panel-gray'}`}>
                  <Icon name={m.icon} size={15} strokeWidth={2.2} className={`${m.farbe} mx-auto mb-1`} />
                  <div className="stat-display text-lg num-tabular text-text-primary">{zahl}</div>
                  <div className="text-caption2 text-text-tertiary leading-tight">{m.label}</div>
                </button>
              );
            })}
          </div>

          {/* Stammdaten und Wechsel-Verlauf — nur wenn die Ansicht aus dem
              Kader kommt und damit eine konkrete Spielerzeile kennt. Aus dem
              Duell heraus gibt es die nicht, dort ist der Mensch ueber alle
              Saisons gemeint und nicht eine bestimmte Zeile. */}
          {player && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Position', player.position || '—'],
                  ['Marktwert', Number(player.value) > 0 ? `${dez(Number(player.value), 1)} Mio` : '—'],
                  ['Team', getTeamDisplay(player.team) || player.team || '—'],
                ].map(([label, wertText]) => (
                  <div key={label} className="panel-gray rounded-xl p-2.5">
                    <div className="text-caption2 text-text-tertiary">{label}</div>
                    <div className="text-footnote font-semibold text-text-primary truncate">{wertText}</div>
                  </div>
                ))}
              </div>
              <SpielerWechselKarte player={player} />
            </>
          )}

          {gesamtSperrSpiele > 0 && (
            <p className="text-caption1 text-text-secondary">
              Wegen Sperren {gesamtSperrSpiele} {gesamtSperrSpiele === 1 ? 'Spiel' : 'Spiele'} verpasst.
            </p>
          )}

          {besteSaison && zeilen.length > 1 && (
            <p className="text-caption1 text-text-secondary">
              Stärkste Saison: <span className="font-semibold text-text-primary">{besteSaison.version}</span>
              {/* sortLabel ist die gebeugte Form ("Toren"), label die nackte
                  ("Tore") — kleingeschrieben ergab das "mit 12 tore". */}
              {' '}mit {wert(besteSaison)} {aktuellesMass.sortLabel}.
            </p>
          )}

          {/* FORMKURVE als Grafik.
              Zwei Linien uebereinander waeren hier falsch: die Tore je Spiel
              schwanken zwischen 1 und 3, die aufsummierten laufen in die
              Dutzende. Auf einer gemeinsamen Achse waere die untere Linie
              platt. Deshalb umschaltbar. */}
          {kurve.length >= 2 && (
            <div className="panel-gray rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-footnote font-semibold text-text-muted">Formkurve</span>
                <div className="flex gap-1 p-0.5 bg-bg-tertiary rounded-lg">
                  {[['je', 'Je Spiel'], ['summe', 'Aufsummiert']].map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setKurvenArt(k)}
                            aria-pressed={kurvenArt === k}
                            className={`px-2 py-0.5 rounded-md text-caption2 font-semibold transition-colors ${
                              kurvenArt === k ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Verlaufsgrafik
                punkte={kurvenPunkte}
                farbe="var(--system-orange)"
                hoehe={116}
                formatWert={(n) => `${n} ${n === 1 ? 'Tor' : 'Tore'}`}
              />

              <div className="flex items-baseline gap-3 mt-1.5 pt-1.5 border-t border-border-light">
                <span className="text-caption2 text-text-tertiary">
                  {kurve.reduce((n, x) => n + x.tore, 0)} Tore in {kurve.length} Spielen
                </span>
                <span className="text-caption2 text-text-secondary num-tabular ml-auto">
                  Ø {(kurve.reduce((n, x) => n + x.tore, 0) / kurve.length)
                       .toLocaleString('de-DE', { maximumFractionDigits: 2 })} je Spiel
                </span>
              </div>

              <p className="text-caption2 text-text-tertiary mt-1">
                Nur Spiele mit Toren von {spieler.name.split(' ')[0]} — ob er in den
                anderen dabei war, steht nirgends.
              </p>
            </div>
          )}

          {/* Saison für Saison */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-footnote font-semibold text-text-muted">Saison für Saison</span>
              <span className="text-caption2 text-text-tertiary">
                {aktuellesMass.label} · {gesamtMass} insgesamt
              </span>
            </div>
            <div className="divide-y divide-border-light">
              {zeilen.map((z) => (
                <div key={z.version} className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-12 text-footnote font-bold num-tabular text-text-primary flex-shrink-0">
                      {z.version}
                    </span>
                    <SpielerWappen team={z.team} version={z.version} size="xs" />
                    <span className="text-caption1 text-text-secondary truncate min-w-0 flex-1">
                      {z.team ? getTeamDisplay(z.team, z.version) : '—'}
                    </span>
                    <span className="stat-display text-[15px] num-tabular text-text-primary w-8 text-right flex-shrink-0">
                      {wert(z)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1.5">
                    <div className={`h-full ${aktuellesMass.balken}`}
                         style={{ width: `${(wert(z) / beste) * 100}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-caption2 text-text-tertiary mt-1">
                    {z.value > 0 && <span className="num-tabular">Marktwert {z.value} Mio</span>}
                    {z.sds > 0 && <span className="num-tabular">{z.sds}× Spieler des Spiels</span>}
                    {z.sperren > 0 && (
                      <span className="num-tabular">
                        {z.sperren} {z.sperren === 1 ? 'Sperre' : 'Sperren'}
                      </span>
                    )}
                    {istLegacySaison(z.version) && <span>nur Gesamtzahlen</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {spieler.spellings.length > 1 && (
            <p className="text-caption2 text-text-tertiary">
              {/* Ohne diesen Hinweis wirkt es wie ein Fehler, wenn oben ein
                  anderer Name steht als in einer alten Saison. */}
              Auch erfasst als: {spieler.spellings.filter((n) => n !== spieler.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
