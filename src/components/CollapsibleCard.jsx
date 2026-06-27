import { useState } from 'react';
import Icon from './icons/Icon';

/**
 * Self-explanatory disclosure card: a tappable header with an icon, title and
 * chevron that expands to reveal its content. Used to keep secondary actions
 * (management, filters, …) tucked away until needed.
 */
export default function CollapsibleCard({
  title,
  icon,
  iconClass = 'text-system-green',
  subtitle,
  defaultOpen = false,
  badge,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`modern-card overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 text-left -m-1 p-1 rounded-xl"
      >
        {icon && (
          <span className={`flex-shrink-0 w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center ${iconClass}`}>
            <Icon name={icon} size={18} strokeWidth={2.1} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-bold text-base text-text-primary">{title}</span>
            {badge != null && (
              <span className="text-xs font-medium bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full">{badge}</span>
            )}
          </span>
          {subtitle && <span className="block text-xs text-text-muted mt-0.5">{subtitle}</span>}
        </span>
        <span className={`flex-shrink-0 text-text-tertiary transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
          <Icon name="chevronRight" size={20} strokeWidth={2.2} />
        </span>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
