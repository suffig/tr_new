import { useMemo } from 'react';
import Icon from '../../icons/Icon';
import { abendRekorde } from '../../../utils/abendRekorde';

const datum = (d) => (d
  ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  : '');

/**
 * Bestmarken der Abende.
 *
 * Für die Spiele gibt es Rekorde, für die Abende bisher nicht — dabei ist
 * das die andere Hälfte der App.
 *
 * JEDER REKORD NENNT SEINEN ABEND
 * „Meiste Biere: 9" allein ist eine Zahl. Mit dem Abend dahinter wird es
 * eine Erinnerung.
 */
export default function AbendRekorde({ boersen, verkostungen, katalog }) {
  const marken = useMemo(
    () => abendRekorde(boersen, verkostungen, katalog),
    [boersen, verkostungen, katalog]);

  if (!marken.length) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="trophy" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Bestmarken.</p>
        <p className="text-footnote text-text-tertiary mt-1">
          Sobald ein Abend Gläser hat, entsteht hier die erste.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="modern-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="karten-titel">Bestmarken</span>
          <span className="text-caption2 text-text-tertiary">
            {marken.length} {marken.length === 1 ? 'Marke' : 'Marken'}
          </span>
        </div>
        <p className="text-caption2 text-text-tertiary mt-0.5">
          Über alle Abende. Was keinen Wert hat, steht hier nicht — eine
          Bestmarke mit Strich ist keine.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {marken.map((m) => (
          <div key={m.id} className="modern-card p-3 flex flex-col items-center text-center gap-1.5">
            <span className="w-11 h-11 rounded-xl bg-bg-tertiary text-system-yellow flex items-center justify-center flex-shrink-0">
              <Icon name={m.icon} size={21} strokeWidth={2.1} />
            </span>
            <div className="text-caption2 text-text-tertiary leading-tight w-full">{m.titel}</div>
            <div className="text-callout font-bold text-text-primary num-tabular">{m.wert}</div>
            <div className="text-caption2 text-text-secondary truncate w-full">
              {m.abend?.name || 'ohne Namen'}
            </div>
            <div className="text-caption2 text-text-tertiary">
              {datum(m.abend?.datum)}
            </div>
            {m.zusatz && (
              <div className="text-caption2 text-text-tertiary leading-tight">{m.zusatz}</div>
            )}
            {/* Gleichstand nicht verschweigen — sonst sieht es aus, als
                stünde der Abend allein da. */}
            {m.gleichauf > 1 && (
              <div className="text-caption2 text-system-yellow leading-tight">
                {m.gleichauf} Abende gleichauf
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
