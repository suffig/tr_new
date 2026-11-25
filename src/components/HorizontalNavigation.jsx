import Icon from './icons/Icon';

/**
 * Segmentierte Navigation, eine Reihe.
 *
 * Jeder Eintrag nimmt sich die Breite seines Textes und teilt sich den Rest.
 * Reicht der Platz nicht — großer Text am Telefon —, bricht die Leiste um,
 * statt seitlich zu scrollen: ein abgeschnittener Eintrag sieht nach einem
 * Anzeigefehler aus, und man findet ihn nicht.
 *
 * Vorher brach sie ab fünf Einträgen IMMER in zwei Reihen um (3 + 2). Das
 * kostete auf jeder Seite von Abend und Spiele eine ganze Zeile, obwohl fünf
 * kurze Wörter nebeneinander passen.
 *
 * @param kompakt Nur Text, flacher — für die zweite Ebene unter einer ersten.
 * @param views   {id, label, iconName?, logoComponent?, abzeichen?}
 */
export default function HorizontalNavigation({ views, selectedView, onViewChange, kompakt = false, className = '' }) {
  return (
    <div className={`mb-4 animate-mobile-slide-in ${className}`}>
      <div className={`flex flex-wrap gap-1 p-1 rounded-2xl ${kompakt ? 'border border-border-light' : 'bg-bg-tertiary'}`}>
        {views.map((view) => {
          const isActive = selectedView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={`flex flex-auto items-center justify-center rounded-xl transition-all duration-200 ${
                kompakt
                  ? 'btn-compact gap-1.5 px-1.5 py-2 min-h-[40px]'
                  : 'flex-col gap-1 px-1 py-2 min-h-[48px]'
              } ${
                isActive
                  ? `${kompakt ? 'bg-bg-tertiary' : 'bg-bg-secondary'} text-text-primary shadow-sm`
                  : 'text-text-tertiary hover:text-text-secondary active:scale-95'
              }`}
              title={view.label}
              aria-label={view.label}
              aria-pressed={isActive}
            >
              {!kompakt && (
                <span className="flex items-center justify-center h-[18px]">
                  {view.logoComponent || (view.iconName
                    ? <Icon name={view.iconName} size={18} strokeWidth={2.1} />
                    : <span className="text-base leading-none">{view.icon}</span>)}
                </span>
              )}
              <span className={`${kompakt ? 'text-caption1' : 'text-[11px]'} font-semibold whitespace-nowrap`}>
                {view.label}
              </span>
              {view.abzeichen}
            </button>
          );
        })}
      </div>
    </div>
  );
}
