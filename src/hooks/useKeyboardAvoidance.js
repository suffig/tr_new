import { useEffect } from 'react';

/**
 * iOS keyboard avoidance.
 *
 * When a text field inside a scrollable modal is focused, iOS Safari slides the
 * on-screen keyboard over the lower half of the screen but does NOT reliably
 * scroll a `position: fixed` modal's field into view. The result: you tap the
 * bottom input of a form and the keyboard covers it.
 *
 * This mounts a single global `focusin` listener (instead of touching every
 * input) and, once the keyboard has finished animating in, scrolls the focused
 * field to the centre of the *visible* area. Only active on touch devices so it
 * never fights the mouse on desktop.
 */
export function useKeyboardAvoidance() {
  useEffect(() => {
    // Coarse pointer ≈ touch screen. Skip on desktop where there is no keyboard overlay.
    const isTouch = window.matchMedia?.('(pointer: coarse)')?.matches;
    if (!isTouch) return;

    let timer = null;

    const onFocusIn = (e) => {
      const el = e.target;
      if (!el || !el.matches?.('input, select, textarea')) return;
      // Native pickers (date/select) manage their own scrolling.
      if (el.type === 'checkbox' || el.type === 'radio') return;

      // Wait for the keyboard to finish sliding in before measuring.
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Only scroll if the field is actually hidden behind the keyboard.
        const vv = window.visualViewport;
        const rect = el.getBoundingClientRect();
        const visibleBottom = vv ? vv.height : window.innerHeight;
        if (rect.bottom > visibleBottom - 8 || rect.top < 8) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 300);
    };

    document.addEventListener('focusin', onFocusIn);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);
}
