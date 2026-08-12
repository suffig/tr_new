import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './icons/Icon';
import SpielerWappen from './SpielerWappen';
import { getTeamDisplay } from '../constants/teams';
import Kraefteverhaeltnis from './Kraefteverhaeltnis';
import ZahlFeld from './ZahlFeld';
import { dez, zahl } from '../utils/zahlen';
import { toreJeSeite, sperrenJeSeite } from '../utils/spielerBilanz';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { getCurrentFifaVersion } from '../utils/fifaVersionManager';
import {
  SEITEN, ladeWechsel, wechselVon, abschnitte, kaderSpiele, seiteAmDatum,
  wechselEintragen, wechselLoeschen, wechselBuchen, heute,
} from '../utils/spielerWechsel';
import { useIchBin } from '../hooks/useIchBin';

/**
 * Wo ein Spieler wann war — und wie man einen Wechsel festhält.
 *
 * Spieler wechseln zwischen Alexander, Philip und "Ehemalige", auch mitten in
 * der Saison. In players.team steht nur ein einziger Wert; ein Wechsel hat den
 * alten überschrieben. Diese Karte zeigt den Verlauf aus spieler_wechsel und
 * trägt neue Wechsel ein.
 *
 * "Spiele" heisst hier: Spiele, in denen der Mensch zum Kader einer Seite
 * gehörte — nicht Spiele, in denen er gespielt hat. Die App erfasst keine
 * Aufstellung. Die Beschriftung sagt das, statt eine Zahl zu zeigen, die man
 * für etwas anderes halten könnte.
 */

const datumLang = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? String(d)
    : x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function SpielerWechselKarte({ player }) {
  const { darfEintragen } = useIchBin();
  const [alleWechsel, setAlleWechsel] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [formularOffen, setFormularOffen] = useState(false);
  const [ziel, setZiel] = useState('');
  const [datum, setDatum] = useState(heute());
  const [notiz, setNotiz] = useState('');
  const [speichert, setSpeichert] = useState(false);
  // Geld: vorgeschlagen wird der gespeicherte Marktwert, umgerechnet in Euro.
  // Sichtbar und aenderbar, weil players.value in Mio € steht und ein Konto
  // hier fuenfstellig ist — eine stille Buchung ueber Millionen waere ein
  // boeses Erwachen.
  const [buchen, setBuchen] = useState(true);
  const [betrag, setBetrag] = useState('');

  // Alles über alle Saisons: eine Laufbahn endet nicht an der Saisongrenze.
  // Die Torschützenlisten kommen mit, weil daraus die Tore JE SEITE entstehen.
  const { data: matches } = useSupabaseQuery(
    'matches', 'id,date,fifa_version,goalslista,goalslistb', { skipFifaFilter: true });
  const { data: bans } = useSupabaseQuery('bans', '*', { skipFifaFilter: true });
  const { data: alleSpieler } = useSupabaseQuery('players', 'id,name', { skipFifaFilter: true });

  const holen = useCallback(async () => {
    setLaedt(true);
    const { wechsel, fehler } = await ladeWechsel();
    // Fehlt die Tabelle noch, bleibt die Karte einfach weg — kein Fehler,
    // den der Nutzer sehen müsste, sondern eine noch nicht eingespielte
    // Migration.
    setAlleWechsel(fehler ? null : wechsel);
    setLaedt(false);
  }, []);

  useEffect(() => { holen(); }, [holen]);

  const meine = useMemo(
    () => (alleWechsel ? wechselVon(alleWechsel, player?.name) : []),
    [alleWechsel, player?.name]);

  const verlauf = useMemo(() => abschnitte(meine), [meine]);
  const spiele = useMemo(() => kaderSpiele(meine, matches || []), [meine, matches]);
  const tore = useMemo(() => toreJeSeite(matches || [], player?.name), [matches, player?.name]);
  const sperren = useMemo(
    () => sperrenJeSeite(bans || [], alleSpieler || [], player?.name),
    [bans, alleSpieler, player?.name]);
  // Die Seite AM GEWAEHLTEN TAG, nicht die von heute: wer einen Wechsel auf
  // ein zurueckliegendes Datum eintraegt, soll die Auswahl sehen, die dort
  // gilt. Vorher wurde immer die heutige Seite ausgeblendet — bei einer
  // Rueckdatierung war damit genau das falsche Ziel weggefiltert.
  const seiteAmTag = useMemo(() => seiteAmDatum(meine, datum), [meine, datum]);

  if (laedt || alleWechsel == null) return null;

  const speichern = async () => {
    if (!ziel) { toast.error('Wohin soll der Wechsel gehen?'); return; }
    if (ziel === seiteAmTag) {
      toast.error(`${player.name} ist an diesem Tag bereits dort.`);
      setZiel('');
      return;
    }
    setSpeichert(true);
    const { fehler } = await wechselEintragen({
      name: player.name,
      spielerId: player.id,
      nach: ziel,
      datum,
      fifaVersion: player.fifa_version || getCurrentFifaVersion(),
      notiz: notiz.trim() || null,
      bisherigeWechsel: alleWechsel,
    });
    if (fehler) { setSpeichert(false); toast.error(fehler.message); return; }
    toast.success(`${player.name} → ${getTeamDisplay(ziel) || ziel}`);

    // Erst der Wechsel, dann das Geld: der Wechsel ist hier die Absicht, die
    // Buchung die Folge. Scheitert sie, bleibt der Wechsel stehen — aber der
    // Fehler wird genannt.
    if (buchen && Number(betrag) > 0) {
      const { gekappt, fehler: geldFehler } = await wechselBuchen({
        name: player.name,
        von: seiteAmTag,
        nach: ziel,
        betragEuro: zahl(betrag),
        datum,
        fifaVersion: player.fifa_version || getCurrentFifaVersion(),
      });
      if (geldFehler) toast.error(`Wechsel steht, Buchung fehlgeschlagen: ${geldFehler.message}`);
      // Ein Konto kann in dieser App nicht unter null fallen. Wurde deshalb
      // weniger abgezogen als gebucht, muss das gesagt werden — sonst zeigt
      // die Transaktion einen Betrag, den das Konto nie gesehen hat.
      for (const k of gekappt || []) {
        toast(`${getTeamDisplay(k.team) || k.team}: ${dez(k.betrag, 0)} € konnten nicht abgezogen ` +
              'werden, das Konto steht auf 0.', { duration: 7000 });
      }
      window.dispatchEvent(new CustomEvent('fusta-refresh'));
    }

    setSpeichert(false);
    setFormularOffen(false);
    setZiel(''); setNotiz(''); setDatum(heute()); setBetrag('');
    holen();
  };

  const entfernen = async (id, seite) => {
    if (!window.confirm(`Wechsel zu ${getTeamDisplay(seite) || seite} entfernen?`)) return;
    const { fehler } = await wechselLoeschen(id);
    if (fehler) { toast.error(fehler.message); return; }
    toast.success('Wechsel entfernt');
    holen();
  };

  return (
    <div className="panel-gray rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="karten-titel flex items-center gap-2">
          <Icon name="swap" size={16} strokeWidth={2.2} />
          Wo und seit wann
        </h4>
        {/* Ein Wechsel verschiebt Geld zwischen den beiden Konten — das
            gehoert nicht in jede Hand. Der VERLAUF darunter bleibt fuer
            beide sichtbar, nur das Eintragen nicht. */}
        {darfEintragen && (
          <button
            onClick={() => {
              const auf = !formularOffen;
              setFormularOffen(auf);
              // Marktwert (Mio €) → Euro. Beim Oeffnen frisch vorschlagen.
              if (auf) setBetrag(String(Math.round((Number(player.value) || 0) * 1_000_000)));
            }}
            className="chip chip-sm chip-gray inline-flex items-center gap-1"
          >
            <Icon name={formularOffen ? 'x' : 'plus'} size={12} strokeWidth={2.4} />
            {formularOffen ? 'Abbrechen' : 'Wechsel'}
          </button>
        )}
      </div>

      {verlauf.length === 0 ? (
        <p className="text-caption1 text-text-tertiary">
          Für {player.name} ist noch kein Verlauf erfasst.
        </p>
      ) : (
        <div className="space-y-1.5">
          {verlauf.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5">
              <SpielerWappen team={a.seite} size="xs" />
              <span className="text-caption1 text-text-primary flex-1 min-w-0 truncate">
                {getTeamDisplay(a.seite) || a.seite}
              </span>
              <span className="text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                {datumLang(a.von)}{a.bis ? ` – ${datumLang(a.bis)}` : ''}
              </span>
              {!a.start && (
                <button onClick={() => entfernen(a.id, a.seite)} hidden={!darfEintragen}
                        aria-label="Wechsel entfernen"
                        className="text-text-tertiary hover:text-system-red flex-shrink-0">
                  <Icon name="trash" size={13} strokeWidth={2.2} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {formularOffen && (
        <div className="mt-3 pt-3 border-t border-border-light space-y-2">
          <div className="flex gap-1.5">
            {SEITEN.filter((s) => s !== seiteAmTag).map((s) => (
              <button key={s} onClick={() => setZiel(s)}
                      className={`flex-1 py-2 rounded-xl text-caption1 font-semibold transition-colors ${
                        ziel === s ? 'bg-bg-elevated ring-2 ring-current text-text-primary'
                                   : 'bg-bg-tertiary text-text-secondary'}`}>
                {getTeamDisplay(s) || s}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-caption2 text-text-tertiary">Ab wann</span>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
                   className="form-input w-full mt-0.5" />
          </label>
          <label className="block">
            <span className="text-caption2 text-text-tertiary">Notiz (optional)</span>
            <input value={notiz} onChange={(e) => setNotiz(e.target.value)}
                   placeholder="z. B. Tausch gegen Kanté"
                   className="form-input w-full mt-0.5" />
          </label>
          {/* Geld. Der Vorschlag kommt aus dem gespeicherten Marktwert, steht
              aber als Euro-Betrag da und laesst sich aendern — players.value
              ist in Mio €, und aus 12,0 werden 12.000.000 €. */}
          <div className="rounded-xl bg-bg-tertiary p-3 space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={buchen} onChange={(e) => setBuchen(e.target.checked)} />
              <span className="text-caption1 text-text-primary">Als Kauf und Verkauf buchen</span>
            </label>
            {buchen && (
              <>
                <ZahlFeld ganzzahl wert={betrag} onChange={setBetrag}
                          inputMode="text" className="form-input w-full"
                          placeholder="Betrag in Euro" />
                <p className="text-caption2 text-text-tertiary">
                  Vorschlag aus dem Marktwert: {dez(Number(player.value) || 0, 1)} Mio €.
                  {ziel && ziel !== 'Ehemalige' && ' Die aufnehmende Seite zahlt, die abgebende bekommt.'}
                  {ziel === 'Ehemalige' && ' Nur die abgebende Seite bekommt Geld.'}
                </p>
              </>
            )}
          </div>

          <button onClick={speichern} disabled={speichert || !ziel}
                  className="w-full py-2.5 rounded-xl bg-system-green text-white font-semibold text-sm disabled:opacity-50">
            {speichert ? 'Speichert…' : 'Wechsel festhalten'}
          </button>
        </div>
      )}

      {/* Was er bei welcher Seite gemacht hat.
          Drei Größen mit drei verschiedenen Datenlagen — deshalb steht bei
          jeder, worauf sie sich stützt. Tore und Sperren tragen ihre Seite
          seit jeher in sich (getrennte Torschützenlisten, bans.team) und
          gelten über alle Saisons. Spiele erst ab dem Stichtag, weil vorher
          nicht festgehalten wurde, wer wann bei wem war. Ohne diesen Hinweis
          sähe "Tore 12 : 3" neben "Spiele 0 : 0" nach einem Fehler aus. */}
      <div className="mt-3 pt-3 border-t border-border-light">
        <div className="text-caption2 text-text-tertiary mb-1">Bei welcher Seite</div>
        <div className="divide-y divide-border-light">
          <Kraefteverhaeltnis
            klein label="Tore" zusatz="alle Saisons"
            aek={tore.AEK.tore} real={tore.Real.tore}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          <Kraefteverhaeltnis
            klein label="Spiele mit Tor" zusatz="alle Saisons"
            aek={tore.AEK.spieleMitTor} real={tore.Real.spieleMitTor}
            aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          {(sperren.AEK.anzahl + sperren.Real.anzahl) > 0 && (
            <Kraefteverhaeltnis
              klein label="Sperren"
              zusatz={`${sperren.AEK.spiele + sperren.Real.spiele} Spiele Ausfall · alle Saisons`}
              aek={sperren.AEK.anzahl} real={sperren.Real.anzahl}
              aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          )}
          {spiele.ab && (
            <Kraefteverhaeltnis
              klein label="Spiele im Kader" zusatz={`erst seit ${datumLang(spiele.ab)}`}
              aek={spiele.AEK} real={spiele.Real}
              aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
          )}
        </div>

        {tore.bestesSpiel && (
          <p className="text-caption2 text-text-tertiary mt-2">
            Bestes Spiel: {tore.bestesSpiel.anzahl}{' '}
            {tore.bestesSpiel.anzahl === 1 ? 'Tor' : 'Tore'} für{' '}
            {getTeamDisplay(tore.bestesSpiel.seite) || tore.bestesSpiel.seite}
            {tore.bestesSpiel.datum ? ` am ${datumLang(tore.bestesSpiel.datum)}` : ''}.
          </p>
        )}
        {spiele.ohneZuordnung > 0 && (
          <p className="text-caption2 text-system-orange mt-2">
            {spiele.ohneZuordnung} {spiele.ohneZuordnung === 1 ? 'Spiel liegt' : 'Spiele liegen'} im
            erfassten Zeitraum, lassen sich aber keiner Seite zuordnen — vermutlich ist ein Wechsel
            vor die eigene Startzeile datiert.
          </p>
        )}
        {sperren.ohneSeite > 0 && (
          <p className="text-caption2 text-text-tertiary mt-2">
            {sperren.ohneSeite} {sperren.ohneSeite === 1 ? 'Sperre' : 'Sperren'} ohne
            hinterlegte Seite.
          </p>
        )}
      </div>

    </div>
  );
}
