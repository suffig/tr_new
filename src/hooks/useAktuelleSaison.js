import { useEffect, useState } from 'react';
import { getCurrentFifaVersion } from '../utils/fifaVersionManager';

/**
 * Die laufende Saison als React-Zustand.
 *
 * getCurrentFifaVersion() liest localStorage — synchron und ohne Abo. Ohne
 * dieses Abo bliebe eine Anzeige nach dem Saisonwechsel auf der alten Version
 * stehen, bis die Komponente aus einem anderen Grund neu rendert.
 */
export function useAktuelleSaison() {
  const [version, setVersion] = useState(() => getCurrentFifaVersion());
  useEffect(() => {
    const auffrischen = () => setVersion(getCurrentFifaVersion());
    window.addEventListener('fifaVersionChanged', auffrischen);
    window.addEventListener('fifaVersionsHydrated', auffrischen);
    return () => {
      window.removeEventListener('fifaVersionChanged', auffrischen);
      window.removeEventListener('fifaVersionsHydrated', auffrischen);
    };
  }, []);
  return version;
}
