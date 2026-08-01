import Icon from './icons/Icon';

/**
 * Seitenkopf im Stil der iOS-Systemapps: grosser Titel, darunter eine Zeile
 * Erklaerung, rechts eine farbige Icon-Kachel.
 *
 * Warum das noetig war: die Klassen .page-header/.page-title/.page-icon lagen
 * im Stylesheet, wurden aber von KEINER Komponente mehr benutzt — irgendwann
 * beim Verschlanken sind die Koepfe verschwunden. Dadurch begann jeder Bereich
 * unvermittelt mit seinem Inhalt und man erkannte nur an der unteren Leiste,
 * wo man gerade ist. Diese Komponente ist die eine Stelle, an der der Kopf
 * jetzt definiert ist.
 *
 * @param {string} title    Name des Bereichs
 * @param {string} subtitle Eine Zeile, was man hier tut
 * @param {string} icon     Name aus Icon.jsx
 * @param {string} tile     Kachelfarbe: tile-orange | tile-blue | tile-purple |
 *                          tile-red | tile-indigo | tile-green
 * @param {React.ReactNode} action Optional: Knopf o. Ae. unter dem Titel
 */
export default function PageHeader({ title, subtitle, icon, tile = 'tile-orange', action }) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <div className="min-w-0">
          <h1 className="page-title truncate">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {icon && (
          <span className={`page-icon ${tile}`} aria-hidden="true">
            <Icon name={icon} size={22} strokeWidth={2.2} />
          </span>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </header>
  );
}
