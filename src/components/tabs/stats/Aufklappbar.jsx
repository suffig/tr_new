import { useState } from 'react';
import Icon from '../../icons/Icon';

/**
 * Eine Zeile, die auf Tipp ihren Inhalt zeigt.
 *
 * WOZU
 * Die Statistik-Ansichten waren lang: gemessen auf 375px brachte „Kurven"
 * 1855px und „Spieler" 2253px, also 2,3 bzw. 2,8 Bildschirme. Das Wichtigste
 * stand oben, der Rest darunter — und man musste erst scrollen, um überhaupt
 * zu sehen, dass da noch etwas ist. Hiermit steht es als eine Zeile da und
 * klappt bei Bedarf auf.
 *
 * OHNE EIGENEN KARTENRAHMEN
 * Die Inhalte, die hier hineinkommen, bringen ihre eigenen `modern-card` mit.
 * Ein Rahmen hier ergäbe eine Karte in der Karte. Deshalb ist die Zeile selbst
 * nur eine getönte Fläche (`panel-gray`), und der Inhalt erscheint darunter
 * so, wie er ohnehin aussieht.
 *
 * Für Abschnitte, die ihren Rahmen NICHT selbst mitbringen, ist die `Section`
 * in InsightsView.jsx die passende Form — die klappt innerhalb einer Karte
 * auf. Zwei Formen, weil es zwei Fälle sind; eine Komponente mit einem
 * `rahmenlos`-Schalter hätte an jeder Aufrufstelle die Frage aufgeworfen,
 * welcher Fall gerade gilt.
 *
 * @param {object} props
 * @param {string} props.titel Was aufklappt — als Gegenstand benannt, nicht
 *   als „Mehr anzeigen": zugeklappt ist dieser Text die einzige Auskunft.
 * @param {string} [props.icon] Name eines Icons aus Icon.jsx.
 * @param {string} [props.iconKlasse] Farbklasse für das Icon.
 * @param {string} [props.hinweis] Eine Zeile, was drinsteht. Erscheint nur
 *   zugeklappt — offen sieht man es ja.
 * @param {boolean} [props.offenVorgabe] Beim ersten Rendern schon offen.
 */
export default function Aufklappbar({ titel, icon, iconKlasse = 'text-text-tertiary',
                                      hinweis, offenVorgabe = false, children }) {
  const [offen, setOffen] = useState(offenVorgabe);

  return (
    <div>
      <button type="button" onClick={() => setOffen((o) => !o)} aria-expanded={offen}
              className="w-full panel-gray rounded-xl px-4 py-3 flex items-center gap-2.5 text-left">
        {icon && (
          <Icon name={icon} size={17} strokeWidth={2.2} className={`${iconKlasse} flex-shrink-0`} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-callout font-semibold text-text-primary truncate">{titel}</span>
          {/* Der Hinweis nur zugeklappt: offen steht der Inhalt darunter und
              sagt dasselbe genauer. */}
          {!offen && hinweis && (
            <span className="block text-caption2 text-text-tertiary truncate">{hinweis}</span>
          )}
        </span>
        <span className={`text-text-tertiary flex-shrink-0 transition-transform duration-200 ${
          offen ? 'rotate-90' : ''}`}>
          <Icon name="chevronRight" size={18} strokeWidth={2.2} />
        </span>
      </button>

      {offen && <div className="mt-2">{children}</div>}
    </div>
  );
}
