import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import LoadingSpinner from '../../LoadingSpinner';
import SpielerWappen from '../../SpielerWappen';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { saisonNummern } from '../../../utils/saisonNummern';
import { kaderWerte, spielerVerlauf, wertFundstuecke, mio } from '../../../utils/marktwertVerlauf';

/**
 * Marktwerte über alle Saisons.
 *
 * Die Zahlen lagen längst in der Datenbank — je Saison eine Spielerzeile mit
 * eigenem Wert — wurden aber nur als Momentaufnahme der laufenden Saison
 * gezeigt. Hier steht, was daraus über die Jahre folgt.
 */
export default function MarktwertVerlauf() {
  // Ohne Saisonfilter: die ganze Frage ist ja gerade der Vergleich über Saisons.
  const { data: spieler, loading } = useSupabaseQuery('players', '*', { skipFifaFilter: true });
  const { data: matches } = useSupabaseQuery('matches', '*', { skipFifaFilter: true });
  const [ansicht, setAnsicht] = useState('kader');   // kader | spieler
  const [offen, setOffen] = useState(null);          // aufgeklappter Spielername

  const nummern = useMemo(() => saisonNummern(matches, spieler, null), [matches, spieler]);
  const kader = useMemo(() => kaderWerte(spieler, nummern), [spieler, nummern]);
  const verlauf = useMemo(() => spielerVerlauf(spieler, nummern), [spieler, nummern]);
  const funde = useMemo(() => wertFundstuecke(verlauf, kader), [verlauf, kader]);

  if (loading) return <LoadingSpinner message="Lade Marktwerte…" />;

  if (!spieler?.length) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="euro" size={28} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Spieler erfasst.</p>
      </div>
    );
  }

  const maxKader = Math.max(...kader.map((k) => Math.max(k.aek.wert, k.real.wert)), 1);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {[['kader', 'Kaderwert'], ['spieler', 'Einzelne Spieler']].map(([id, label]) => (
          <button key={id} onClick={() => setAnsicht(id)}
            className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
              ansicht === id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {ansicht === 'kader' ? (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-3">
            Kaderwert je Saison
          </div>
          <div className="space-y-3">
            {kader.map((k) => (
              <div key={k.version}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-caption1 font-semibold text-text-primary">{k.version}</span>
                  {k.nummer && (
                    <span className="text-caption2 text-text-tertiary">Saison {k.nummer}</span>
                  )}
                  <span className="ml-auto num-tabular text-caption1 text-text-secondary">
                    {mio(k.gesamt)}
                  </span>
                </div>
                {[['aek', k.aek], ['real', k.real]].map(([wer, seite]) => (
                  <div key={wer} className="flex items-center gap-2 mb-1">
                    <TeamLogo team={wer} size="xs" />
                    <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className={`h-full rounded-full ${wer === 'aek' ? 'bg-system-blue' : 'bg-system-red'}`}
                           style={{ width: `${(seite.wert / maxKader) * 100}%` }} />
                    </div>
                    <span className="num-tabular text-caption2 text-text-secondary w-20 text-right flex-shrink-0">
                      {mio(seite.wert)}
                    </span>
                  </div>
                ))}
                {k.teuerster && (
                  <div className="text-caption2 text-text-tertiary mt-0.5">
                    Teuerster: {k.teuerster.name} ({mio(Number(k.teuerster.value) || 0)})
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-caption2 text-text-tertiary mt-3">
            Summe aller Spielerwerte je Saison. Ehemalige zählen nicht mit — sie
            stehen für abgegebene Spieler.
          </p>
        </div>
      ) : (
        <div className="modern-card divide-y divide-border-light">
          {verlauf.slice(0, 60).map((v) => {
            const auf = offen === v.name;
            return (
              <div key={v.name}>
                <button type="button" onClick={() => setOffen(auf ? null : v.name)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                  <SpielerWappen team={v.teamZuletzt} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-text-primary truncate">{v.name}</span>
                      <span className="ml-auto num-tabular text-sm font-bold text-text-primary flex-shrink-0">
                        {mio(v.hoechster)}
                      </span>
                    </div>
                    <div className="text-caption2 text-text-tertiary">
                      {v.anzahlSaisons} {v.anzahlSaisons === 1 ? 'Saison' : 'Saisons'}
                      {v.veraenderung != null && v.veraenderung !== 0 && (
                        <span className={v.veraenderung > 0 ? 'text-system-green' : 'text-system-red'}>
                          {' · '}{v.veraenderung > 0 ? '+' : '−'}{mio(Math.abs(v.veraenderung))}
                        </span>
                      )}
                    </div>
                  </div>
                  <Icon name={auf ? 'chevronUp' : 'chevronDown'} size={15} strokeWidth={2.4}
                        className="text-text-tertiary flex-shrink-0" />
                </button>
                {auf && (
                  <div className="px-3 pb-3 space-y-1">
                    {v.saisons.map((s) => (
                      <div key={s.version} className="flex items-baseline gap-2 text-caption1">
                        <span className="text-text-secondary w-12 flex-shrink-0">{s.version}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                          <div className="h-full rounded-full bg-system-teal"
                               style={{ width: `${v.hoechster ? (s.wert / v.hoechster) * 100 : 0}%` }} />
                        </div>
                        <span className="num-tabular text-text-primary w-20 text-right flex-shrink-0">
                          {mio(s.wert)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {funde.length > 0 && (
        <div className="modern-card p-4">
          <div className="text-footnote font-semibold text-text-muted mb-2.5">Fundstücke</div>
          <div className="space-y-2.5">
            {funde.map((f) => (
              <div key={f.id} className="flex items-start gap-2.5">
                <Icon name={f.icon} size={16} strokeWidth={2.2} className={`${f.farbe} flex-shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <div className="text-caption1 font-semibold text-text-primary">{f.titel}</div>
                  <div className="text-caption1 text-text-secondary">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
