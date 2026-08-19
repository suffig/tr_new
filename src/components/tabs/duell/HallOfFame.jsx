import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import LoadingSpinner from '../../LoadingSpinner';
import { istLegacySaison } from '../../../utils/legacySaison';
import { saisonsMitTiteln, titelDerSaison } from '../../../utils/hallOfFame';

/**
 * Hall of Fame — die Titel einer Saison.
 *
 * WARUM JE SAISON UND NICHT ALL-TIME
 * Über alle Saisons gewinnt immer derselbe: wer neun Jahre dabei ist, hat
 * zwangsläufig die meisten Tore, Sperren und Auszeichnungen. Erst die
 * Saisonsicht macht sichtbar, wer in EINEM Jahr herausragte — und dass das
 * jedes Jahr jemand anderes war.
 *
 * WAS ES JE SAISON GIBT, HÄNGT AN DEN DATEN
 * Die Altsaisons (FC15–FC24) sind als Gesamtzahlen überliefert, ohne
 * Einzelspiele. Titel, die ein einzelnes Spiel brauchen — „meiste Tore in
 * einem Spiel", „bester Schnitt" —, kann es dort nicht geben. Sie fehlen
 * dann, statt als „—" dazustehen: eine leere Auszeichnung ist keine.
 */

export default function HallOfFame({ players, matches, bans, sds, loading }) {
  const saisons = useMemo(() => saisonsMitTiteln(players), [players]);
  const [gewaehlt, setGewaehlt] = useState(null);
  const [offen, setOffen] = useState(null);   // Titel, dessen Rangliste zu sehen ist
  const version = gewaehlt && saisons.includes(gewaehlt) ? gewaehlt : saisons[0];

  const vorsaison = useMemo(() => {
    const i = saisons.indexOf(version);
    return i >= 0 && i + 1 < saisons.length ? saisons[i + 1] : null;
  }, [saisons, version]);

  const ergebnis = useMemo(
    () => (version ? titelDerSaison({ version, players, matches, bans, sds, vorsaison }) : null),
    [version, players, matches, bans, sds, vorsaison]
  );

  // Team je Titelträger, damit das Wappen stimmt. Über die Spielerzeile
  // DIESER Saison — wer später gewechselt ist, trug den Titel trotzdem für
  // die Mannschaft von damals.
  const teamVon = useMemo(() => {
    const m = new Map();
    for (const p of players || []) {
      if (p.fifa_version !== version) continue;
      if (!m.has(p.name)) m.set(p.name, p.team);
    }
    return m;
  }, [players, version]);

  if (loading) return <LoadingSpinner message="Lade Titel…" />;

  if (!saisons.length) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="trophy" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Saison mit Spielern erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saisonwahl. Neueste zuerst — danach sucht man am häufigsten. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {saisons.map((v) => (
          <button key={v} type="button" onClick={() => setGewaehlt(v)}
                  aria-pressed={v === version}
                  className={`px-3 py-1.5 rounded-lg text-footnote font-semibold flex-shrink-0 transition-colors ${
                    v === version
                      ? 'bg-bg-elevated text-text-primary ring-2 ring-system-yellow'
                      : 'bg-bg-tertiary text-text-secondary'}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="modern-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="karten-titel">Hall of Fame {version}</span>
          <span className="text-caption2 text-text-tertiary">
            {ergebnis.titel.length} {ergebnis.titel.length === 1 ? 'Titel' : 'Titel'}
          </span>
        </div>
        <p className="text-caption2 text-text-tertiary mt-0.5">
          {ergebnis.spieler} {ergebnis.spieler === 1 ? 'Spieler' : 'Spieler'}
          {ergebnis.spiele > 0
            ? ` · ${ergebnis.spiele} ${ergebnis.spiele === 1 ? 'Spiel' : 'Spiele'} erfasst`
            : ' · keine Einzelspiele überliefert'}
        </p>
      </div>

      {ergebnis.titel.length === 0 ? (
        <div className="modern-card p-8 text-center">
          <Icon name="trophy" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-text-muted">In {version} gibt es nichts zu vergeben.</p>
          <p className="text-footnote text-text-tertiary mt-1">
            Keine Tore, keine Sperren, keine Auszeichnungen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {/* RASTER STATT LISTE.
              Als Liste war jeder Titel eine breite Zeile, und sechs Titel
              hiessen sechsmal Scrollen. Als Kachelraster passen alle auf
              einen Blick — und darum geht es bei einer Ruhmeshalle: sehen,
              was es zu holen gibt und wer es hat.

              Zwei Spalten, nicht drei: bei drei bliebe fuer den Namen so
              wenig Platz, dass "Max Mül…" dastuende, und ein abgeschnittener
              Name ist keine Auszeichnung. */}
          {ergebnis.titel.map((t) => (
            <button key={t.id} type="button" onClick={() => setOffen(t)}
                    className="modern-card p-3 flex flex-col items-center text-center gap-1.5 active:bg-bg-tertiary/50 transition-colors">
              <span className={`w-11 h-11 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 ${t.farbe}`}>
                <Icon name={t.icon} size={21} strokeWidth={2.1} />
              </span>

              <div className="text-caption2 text-text-tertiary leading-tight w-full">{t.titel}</div>

              <div className="flex items-center justify-center gap-1 min-w-0 w-full">
                <SpielerWappen team={teamVon.get(t.name)} version={version} size="xs" />
                <span className="text-caption1 font-semibold text-text-primary truncate">{t.name}</span>
              </div>

              <div className="text-caption2 text-text-secondary truncate w-full">
                {t.wert}
              </div>

              {/* Gleichstand nicht verschweigen: sonst sieht es aus, als
                  haette einer den Titel allein geholt. */}
              {t.gleichauf > 1 && (
                <div className="text-caption2 text-system-yellow leading-tight">
                  {t.gleichauf} geteilt
                </div>
              )}

              {/* Dass mehr dahintersteckt, muss sichtbar bleiben — in der
                  Liste sagte das der Pfeil rechts, den es im Raster nicht
                  mehr gibt. */}
              {t.rangliste?.length > 1 && (
                <div className="text-caption2 text-system-blue">
                  {t.rangliste.length} in der Wertung
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {offen && (
        <Rangliste titel={offen} version={version} teamVon={teamVon}
                   onSchliessen={() => setOffen(null)} />
      )}

      {istLegacySaison(version) && (
        <p className="text-caption2 text-text-tertiary px-1">
          Aus {version} sind nur Gesamtzahlen überliefert, keine Einzelspiele.
          Titel, die ein einzelnes Spiel brauchen, kann es deshalb nicht geben —
          sie fehlen hier, statt leer dazustehen.
        </p>
      )}
    </div>
  );
}

/**
 * Die ganze Kategorie, nicht nur der Sieger.
 *
 * Die Liste kommt aus derselben Rechnung wie die Kachel — sonst koennten
 * beide auseinanderlaufen. Platzziffern springen bei Gleichstand (zwei
 * Erste, dann Platz 3), weil zwei geteilte Erste keinen Zweiten haben.
 */
function Rangliste({ titel, version, teamVon, onSchliessen }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onSchliessen(); };
    document.addEventListener('keydown', esc);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = vorher; };
  }, [onSchliessen]);

  const liste = titel.rangliste || [];
  const hoechster = liste[0]?.wert || 1;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
         onClick={onSchliessen} role="dialog" aria-modal="true" aria-label={titel.titel}>
      <div className="bg-bg-secondary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88dvh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg-secondary px-4 py-3 border-b border-border-light flex items-center gap-2.5 z-10">
          <span className={`w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 ${titel.farbe}`}>
            <Icon name={titel.icon} size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="karten-titel truncate">{titel.titel}</h3>
            <p className="text-caption2 text-text-tertiary truncate">
              {version} · {liste.length} {liste.length === 1 ? 'Spieler' : 'Spieler'}
            </p>
          </div>
          <button onClick={onSchliessen}
                  className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0"
                  aria-label="Schließen">
            <Icon name="x" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="divide-y divide-border-light">
            {liste.map((x) => (
              <div key={x.name} className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 text-center text-footnote font-bold num-tabular flex-shrink-0 ${
                    x.platz === 1 ? 'text-system-yellow'
                    : x.platz === 2 ? 'text-text-secondary'
                    : x.platz === 3 ? 'text-system-orange' : 'text-text-tertiary'}`}>
                    {x.platz}
                  </span>
                  <SpielerWappen team={teamVon.get(x.name)} version={version} size="xs" />
                  <span className="text-callout text-text-primary truncate min-w-0 flex-1">{x.name}</span>
                  <span className="text-footnote font-semibold num-tabular text-text-primary flex-shrink-0">
                    {titel.einheit ? titel.einheit(x.wert) : x.wert}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1.5">
                  <div className="h-full bg-system-yellow/70"
                       style={{ width: `${Math.max(3, (x.wert / hoechster) * 100)}%` }} />
                </div>
                {x.zusatz && (
                  <div className="text-caption2 text-text-tertiary mt-0.5">{x.zusatz}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
