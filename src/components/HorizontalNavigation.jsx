import { useRef, useEffect } from 'react';
import Icon from './icons/Icon';

/**
 * Segmentierte Navigation.
 *
 * Bis zu vier Einträge stehen nebeneinander. Ab fünf bricht die Leiste auf
 * dem Handy in zwei Reihen um, statt seitlich zu scrollen.
 *
 * Der Grund: als Scrollstreifen ragte der letzte Eintrag ueber den Rand —
 * in Finanzen war von "Analyse" nur die Haelfte zu sehen, in der Statistik
 * fehlte "Historie" ganz. Ein abgeschnittener Eintrag sieht nicht nach "hier
 * kann man wischen" aus, sondern nach einem Anzeigefehler, und auf einem
 * Telefon findet man ihn schlicht nicht.
 *
 * Ab sm ist wieder genug Platz fuer eine Reihe.
 */
export default function HorizontalNavigation({ views, selectedView, onViewChange, className = '' }) {
  const activeRef = useRef(null);

  // Nur scrollen, wenn die Leiste tatsaechlich scrollt (breite Schirme mit
  // vielen Eintraegen). Bei umgebrochener Leiste ist ohnehin alles sichtbar,
  // und ein scrollIntoView wuerde die ganze Seite verschieben.
  useEffect(() => {
    const el = activeRef.current;
    const streifen = el?.parentElement;
    if (el && streifen && streifen.scrollWidth > streifen.clientWidth + 2) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedView]);

  // Drei je Reihe halten die Beschriftungen lesbar; bei genau vier Eintraegen
  // passt eine Reihe noch.
  const umbrechen = views.length > 4;

  return (
    <div className={`mb-4 sm:mb-6 animate-mobile-slide-in ${className}`}>
      <div
        className={`flex gap-1 p-1 bg-bg-tertiary rounded-2xl ${
          umbrechen ? 'flex-wrap sm:flex-nowrap' : 'overflow-x-auto scrollbar-hide snap-x'
        }`}
      >
        {views.map((view) => {
          const isActive = selectedView === view.id;
          return (
            <button
              key={view.id}
              ref={isActive ? activeRef : null}
              onClick={() => onViewChange(view.id)}
              className={`snap-start flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 min-h-[48px] ${
                umbrechen
                  ? 'basis-[calc(33.333%-0.25rem)] sm:basis-auto sm:flex-1 min-w-0'
                  : 'shrink-0 sm:flex-1 min-w-[64px]'
              } ${
                isActive
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary active:scale-95'
              }`}
              title={view.label}
              aria-label={view.label}
              aria-pressed={isActive}
            >
              <span className="flex items-center justify-center h-[18px]">
                {view.logoComponent || (view.iconName
                  ? <Icon name={view.iconName} size={18} strokeWidth={2.1} />
                  : <span className="text-base leading-none">{view.icon}</span>)}
              </span>
              <span className="text-[11px] font-semibold truncate max-w-full">{view.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
