import { useEffect, useState } from 'react';

const DISMISS_KEY = 'fusta_a2hs_dismissed';

// True only in iOS Safari (not Chrome/Firefox on iOS, which can't add to home
// screen the same way, and not when already running as an installed PWA).
function isIOSSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS pretends to be Mac
  const isWebkit = /WebKit/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);
  return isIOS && isWebkit && !isOtherBrowser;
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}

/**
 * One-time hint that shows iOS Safari users how to add FUSTA to the home screen.
 * Appears once (until dismissed), a few seconds after load, only when the app is
 * running in the browser rather than as an installed PWA.
 */
export default function AddToHomeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* ignore */ }
    if (dismissed || !isIOSSafari() || isStandalone()) return;

    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 z-[70] flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl bg-bg-secondary border border-border-light shadow-ios-floating p-4"
        style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.23, 1, 0.32, 1) both' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-system-blue/12 text-system-blue flex items-center justify-center flex-shrink-0">
            {/* iOS share glyph */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="M8 8l4-4 4 4" />
              <path d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-callout font-semibold text-text-primary">FUSTA aufs iPhone legen</p>
            <p className="text-footnote text-text-secondary mt-0.5 leading-snug">
              Tippe unten auf <span className="font-medium text-text-primary">Teilen</span> und dann auf
              {' '}<span className="font-medium text-text-primary">{'„Zum Home-Bildschirm"'}</span> – so startet FUSTA
              wie eine echte App (Vollbild, ohne Adressleiste).
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Hinweis schließen"
            className="text-text-muted hover:text-text-primary text-xl leading-none px-1 -mt-1 flex-shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
