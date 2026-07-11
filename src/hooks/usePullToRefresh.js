import { useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh bound to an EXISTING scroll container (the app's <main>),
 * instead of creating its own nested scroller. Touch-only — on desktop the
 * pull state never changes, so the indicator stays hidden.
 *
 * Returns { pull, refreshing, threshold } for a caller-rendered indicator.
 */
export function usePullToRefresh(scrollRef, onRefresh, { threshold = 80, enabled = true } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Mirror render state into refs so the listeners never need re-subscribing.
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const startY = useRef(0);
  const active = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPullBoth = (v) => { pullRef.current = v; setPull(v); };
  const setRefreshingBoth = (v) => { refreshingRef.current = v; setRefreshing(v); };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    if (!('ontouchstart' in window)) return; // touch devices only

    const onStart = (e) => {
      if (refreshingRef.current) return;
      // Only arm a pull when already scrolled to the very top.
      if (el.scrollTop > 0) { active.current = false; return; }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onMove = (e) => {
      if (!active.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      // Cancel if the user scrolled down in the meantime or pulls upward.
      if (dy <= 0 || el.scrollTop > 0) { active.current = false; setPullBoth(0); return; }
      // iOS-like resistance curve.
      const d = Math.min(dy * 0.5, threshold * 1.6);
      // Suppress the native rubber-band only once a pull is clearly intended.
      if (d > 6 && e.cancelable) e.preventDefault();
      setPullBoth(d);
    };

    const onEnd = async () => {
      if (!active.current) return;
      active.current = false;
      if (pullRef.current >= threshold && !refreshingRef.current) {
        setRefreshingBoth(true);
        setPullBoth(threshold);
        try {
          await onRefreshRef.current?.();
        } finally {
          setRefreshingBoth(false);
          setPullBoth(0);
        }
      } else {
        setPullBoth(0);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [scrollRef, enabled, threshold]);

  return { pull, refreshing, threshold };
}
