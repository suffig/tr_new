import { useEffect, useState } from 'react';

/**
 * Zählt hoch, sobald sich am Abend-Protokoll oder an den Abschlüssen etwas
 * ändert. Als Abhängigkeit benutzen, wo aus ladeLokal() gerechnet wird.
 */
export function useAbendProtokoll() {
  const [stand, setStand] = useState(0);
  useEffect(() => {
    const neu = () => setStand((n) => n + 1);
    window.addEventListener('abend-log-geaendert', neu);
    window.addEventListener('abend-abschluss-geaendert', neu);
    return () => {
      window.removeEventListener('abend-log-geaendert', neu);
      window.removeEventListener('abend-abschluss-geaendert', neu);
    };
  }, []);
  return stand;
}
