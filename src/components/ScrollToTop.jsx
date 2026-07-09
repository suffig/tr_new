import { useEffect, useState } from 'react';
import Icon from './icons/Icon';

/**
 * Floating "scroll to top" button. Appears once the user has scrolled down
 * a bit and smoothly returns to the top. Watches the given scroll container
 * if it actually scrolls, otherwise falls back to the window (the app scrolls
 * the window on most tabs). Sits just above the bottom navigation.
 */
export default function ScrollToTop({ scrollRef, threshold = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef?.current;
    const usesContainer = el && el.scrollHeight > el.clientHeight + 4;
    const target = usesContainer ? el : window;

    const getTop = () => (usesContainer ? el.scrollTop : window.scrollY || document.documentElement.scrollTop);
    const onScroll = () => setVisible(getTop() > threshold);

    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [scrollRef, threshold]);

  const scrollUp = () => {
    const el = scrollRef?.current;
    if (el && el.scrollHeight > el.clientHeight + 4) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={scrollUp}
      aria-label="Nach oben scrollen"
      className={`fixed right-4 z-40 w-11 h-11 rounded-full bg-bg-elevated/90 backdrop-blur-md border border-border-light shadow-ios-floating text-text-secondary flex items-center justify-center transition-all duration-300 press-scale ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 148px)' }}
    >
      <Icon name="chevronUp" size={22} strokeWidth={2.2} />
    </button>
  );
}
