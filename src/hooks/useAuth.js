/**
 * Der Haken wohnt jetzt im Kontext — siehe contexts/AuthContext.jsx.
 *
 * Diese Datei bleibt bestehen, damit die bestehenden Importpfade weiter
 * stimmen. Vorher stand hier eine eigene useState-Fassung, und weil jeder
 * Aufrufer davon eine eigene Kopie bekam, hatte jede Komponente ihren
 * eigenen Ladezustand.
 */
export { useAuth } from '../contexts/AuthContext';
export default undefined;
