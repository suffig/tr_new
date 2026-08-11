import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './icons/Icon';
import SpielerWappen from './SpielerWappen';
import { getTeamDisplay } from '../constants/teams';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { getCurrentFifaVersion } from '../utils/fifaVersionManager';
import {
  SEITEN, ladeWechsel, wechselVon, abschnitte, kaderSpiele,
  wechselEintragen, wechselLoeschen, heute,
} from '../utils/spielerWechsel';

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
  const [alleWechsel, setAlleWechsel] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [formularOffen, setFormularOffen] = useState(false);
  const [ziel, setZiel] = useState('');
  const [datum, setDatum] = useState(heute());
  const [notiz, setNotiz] = useState('');
  const [speichert, setSpeichert] = useState(false);

  // Alle Spiele über alle Saisons: der Kader-Zeitraum kann eine Saisongrenze
  // überschreiten, deshalb ohne Saisonfilter.
  const { data: matches } = useSupabaseQuery('matches', 'id,date,fifa_version', { skipFifaFilter: true });

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
  const aktuelleSeite = verlauf.length ? verlauf[verlauf.length - 1].seite : null;

  if (laedt || alleWechsel == null) return null;

  const speichern = async () => {
    if (!ziel) { toast.error('Wohin soll der Wechsel gehen?'); return; }
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
    setSpeichert(false);
    if (fehler) { toast.error(fehler.message); return; }
    toast.success(`${player.name} → ${getTeamDisplay(ziel) || ziel}`);
    setFormularOffen(false);
    setZiel(''); setNotiz(''); setDatum(heute());
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
        <button
          onClick={() => setFormularOffen((o) => !o)}
          className="chip chip-sm chip-gray inline-flex items-center gap-1"
        >
          <Icon name={formularOffen ? 'x' : 'plus'} size={12} strokeWidth={2.4} />
          {formularOffen ? 'Abbrechen' : 'Wechsel'}
        </button>
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
                <button onClick={() => entfernen(a.id, a.seite)}
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
            {SEITEN.filter((s) => s !== aktuelleSeite).map((s) => (
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
          <button onClick={speichern} disabled={speichert || !ziel}
                  className="w-full py-2.5 rounded-xl bg-system-green text-white font-semibold text-sm disabled:opacity-50">
            {speichert ? 'Speichert…' : 'Wechsel festhalten'}
          </button>
        </div>
      )}

      {/* Spiele im Kader. Bewusst so beschriftet — die App erfasst keine
          Aufstellung, "Einsätze" wäre gelogen. */}
      {(spiele.gesamt > 0 || spiele.ohneZuordnung > 0) && (
        <div className="mt-3 pt-3 border-t border-border-light">
          <div className="text-caption2 text-text-tertiary mb-1.5">Spiele im Kader</div>
          <div className="flex gap-2">
            {['AEK', 'Real'].map((s) => (
              <div key={s} className="flex-1 min-w-0">
                <div className={`text-callout font-bold num-tabular ${
                  s === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>{spiele[s]}</div>
                <div className="text-caption2 text-text-tertiary truncate">{getTeamDisplay(s) || s}</div>
              </div>
            ))}
          </div>
          {spiele.ohneZuordnung > 0 && (
            <p className="text-caption2 text-text-tertiary mt-2">
              {spiele.ohneZuordnung} {spiele.ohneZuordnung === 1 ? 'Spiel liegt' : 'Spiele liegen'} vor
              dem Beginn der Erfassung und lassen sich keiner Seite zuordnen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
