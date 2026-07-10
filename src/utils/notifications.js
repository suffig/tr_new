// Push/OS notification helpers (iOS-friendly).
// On iOS, real notifications only work when the app is installed to the Home
// Screen (iOS 16.4+) and shown via the service worker registration.

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const getNotificationPermission = () =>
  isPushSupported() ? Notification.permission : 'unsupported';

/** True when the user enabled push AND the browser granted permission. */
export const getPushEnabled = () => {
  try {
    return localStorage.getItem('fusta_push_enabled') === 'true' &&
      isPushSupported() && Notification.permission === 'granted';
  } catch {
    return false;
  }
};

/** Ask for permission and remember the choice. Returns true when granted. */
export async function enablePush() {
  if (!isPushSupported()) return false;
  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; }
  }
  const ok = perm === 'granted';
  try { localStorage.setItem('fusta_push_enabled', ok ? 'true' : 'false'); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('fusta-push-changed', { detail: { enabled: ok } }));
  return ok;
}

export function disablePush() {
  try { localStorage.setItem('fusta_push_enabled', 'false'); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('fusta-push-changed', { detail: { enabled: false } }));
}
