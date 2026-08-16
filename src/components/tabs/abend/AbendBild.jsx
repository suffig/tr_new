import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import { boersenStatistik, bestenListe, rechnung } from '../../../utils/bierboerse';

/**
 * Der Abend als Bild — zum Verschicken.
 *
 * WARUM ZUSÄTZLICH ZUM TEXT
 * Den Textexport gibt es schon, und der ist gut zum Nachlesen. Verschickt
 * wird aber ein Bild: es lässt sich in einen Chat werfen, ohne dass jemand
 * eine Wand aus Zeilen liest, und es überlebt das Weiterleiten.
 *
 * HOCHFORMAT 1080×1350
 * Dasselbe Maß wie der Saison-Rückblick. Das ist das Format, das Messenger
 * und Bildergalerien ohne Beschnitt anzeigen.
 *
 * WAS DRAUFKOMMT UND WAS NICHT
 * Die Kennzahlen des Abends, die Biere mit ihren Noten, und wer wem was
 * schuldet — also genau das, worüber am Ende geredet wird. NICHT drauf
 * kommen die Einzelnoten je Kategorie: das sind bei zwei Personen und sechs
 * Kategorien 12 Zahlen je Bier, die auf einem Handybildschirm niemand liest.
 */

const B = 1080, H = 1350;

// Feste Farben statt CSS-Variablen: das Bild wird einmal gezeichnet und
// danach verschickt — es kann nicht auf das Thema des Empfängers reagieren.
const FARBE = {
  grund: '#0A1119',
  karte: '#141F2C',
  text: '#F2F6F4',
  leise: '#8FA3AF',
  gold: '#FFC857',
  aek: '#4A9BFF',
  real: '#FF5A5A',
  linie: '#22313F',
};

export default function AbendBild({ boerse, verkostungen, katalog, onSchliessen }) {
  const canvasRef = useRef(null);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = B; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const stat = boersenStatistik(verkostungen, katalog);
    const beste = bestenListe(verkostungen, katalog);
    const kasse = rechnung(verkostungen);

    const euro = (n) => `${(Number(n) || 0).toLocaleString('de-DE',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const eins = (n) => Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 });

    ctx.fillStyle = FARBE.grund;
    ctx.fillRect(0, 0, B, H);

    // Kopf
    ctx.fillStyle = FARBE.gold;
    ctx.font = 'bold 34px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FUSTA · BIERBÖRSE', 70, 96);

    ctx.fillStyle = FARBE.text;
    ctx.font = 'bold 76px Inter, system-ui, sans-serif';
    // Lange Namen kürzen, statt sie über den Rand laufen zu lassen.
    let titel = String(boerse?.name || 'Abend');
    while (ctx.measureText(titel).width > B - 140 && titel.length > 4) {
      titel = titel.slice(0, -2);
    }
    if (titel !== boerse?.name) titel += '…';
    ctx.fillText(titel, 70, 186);

    const datum = boerse?.datum
      ? new Date(boerse.datum).toLocaleDateString('de-DE',
          { day: '2-digit', month: 'long', year: 'numeric' })
      : '';
    ctx.fillStyle = FARBE.leise;
    ctx.font = '34px Inter, system-ui, sans-serif';
    ctx.fillText([datum, boerse?.ort].filter(Boolean).join(' · '), 70, 236);

    // Kennzahlen — vier Kacheln
    const kacheln = [
      [String(stat.biere), stat.biere === 1 ? 'Bier' : 'Biere'],
      [String(stat.glaeser), stat.glaeser === 1 ? 'Glas' : 'Gläser'],
      [eins(stat.liter), 'Liter'],
      [euro(stat.ausgaben), 'Ausgaben'],
    ];
    const kb = (B - 140 - 3 * 18) / 4;
    kacheln.forEach(([wert, label], i) => {
      const x = 70 + i * (kb + 18);
      ctx.fillStyle = FARBE.karte;
      ctx.beginPath();
      ctx.roundRect(x, 286, kb, 130, 20);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = FARBE.text;
      // Der Eurobetrag ist der laengste Wert — der bekommt kleinere Schrift,
      // sonst stoesst er an die Kachelraender.
      ctx.font = `bold ${wert.length > 6 ? 34 : 44}px Inter, system-ui, sans-serif`;
      ctx.fillText(wert, x + kb / 2, 350);
      ctx.fillStyle = FARBE.leise;
      ctx.font = '24px Inter, system-ui, sans-serif';
      ctx.fillText(label, x + kb / 2, 388);
    });

    // Die Biere
    ctx.textAlign = 'left';
    ctx.fillStyle = FARBE.leise;
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.fillText('DIE BIERE', 70, 480);

    // Wie viele draufpassen, haengt am Platz bis zur Rechnung. Lieber
    // weniger zeigen als uebereinander schreiben.
    const maxBiere = 7;
    const zeigt = beste.slice(0, maxBiere);
    let y = 524;
    zeigt.forEach((v, i) => {
      ctx.fillStyle = FARBE.karte;
      ctx.beginPath();
      ctx.roundRect(70, y, B - 140, 76, 16);
      ctx.fill();

      ctx.fillStyle = i === 0 ? FARBE.gold : FARBE.leise;
      ctx.font = 'bold 30px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 108, y + 48);

      ctx.textAlign = 'left';
      ctx.fillStyle = FARBE.text;
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      let nm = String(v.bier?.name || '—');
      while (ctx.measureText(nm).width > 560 && nm.length > 4) nm = nm.slice(0, -2);
      if (nm !== v.bier?.name) nm += '…';
      ctx.fillText(nm, 140, y + 36);

      ctx.fillStyle = FARBE.leise;
      ctx.font = '24px Inter, system-ui, sans-serif';
      const unten = [v.bier?.brauerei, v.groesse_ml ? `${v.groesse_ml} ml` : null,
        v.preis != null ? euro(v.preis) : null].filter(Boolean).join(' · ');
      ctx.fillText(unten, 140, y + 62);

      // Die Note rechts, gross — sie ist der Grund fuer die Reihenfolge.
      ctx.textAlign = 'right';
      ctx.fillStyle = v.note == null ? FARBE.leise : FARBE.text;
      ctx.font = 'bold 40px Inter, system-ui, sans-serif';
      ctx.fillText(v.note == null ? '—' : eins(v.note), B - 100, y + 50);

      ctx.textAlign = 'left';
      y += 86;
    });

    if (beste.length > maxBiere) {
      ctx.fillStyle = FARBE.leise;
      ctx.font = '24px Inter, system-ui, sans-serif';
      ctx.fillText(`… und ${beste.length - maxBiere} weitere`, 70, y + 24);
    }

    // Die Rechnung ganz unten — der Teil, um den es beim Verschicken geht.
    const kasseY = H - 240;
    ctx.fillStyle = FARBE.karte;
    ctx.beginPath();
    ctx.roundRect(70, kasseY, B - 140, 150, 20);
    ctx.fill();

    ctx.fillStyle = FARBE.leise;
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText('RECHNUNG', 108, kasseY + 46);

    ctx.font = 'bold 40px Inter, system-ui, sans-serif';
    if (kasse.zugeordnet === 0) {
      ctx.fillStyle = FARBE.leise;
      ctx.fillText('Kein Zahler eingetragen', 108, kasseY + 104);
    } else if (Math.abs(kasse.ausgleich) < 0.01) {
      ctx.fillStyle = FARBE.text;
      ctx.fillText('Ausgeglichen', 108, kasseY + 104);
    } else {
      const schuldet = kasse.ausgleich > 0 ? 'Alexander' : 'Philip';
      const bekommt = kasse.ausgleich > 0 ? 'Philip' : 'Alexander';
      ctx.fillStyle = kasse.ausgleich > 0 ? FARBE.aek : FARBE.real;
      ctx.fillText(schuldet, 108, kasseY + 104);
      const breite = ctx.measureText(schuldet).width;
      ctx.fillStyle = FARBE.text;
      ctx.font = '34px Inter, system-ui, sans-serif';
      ctx.fillText(` → ${bekommt}`, 108 + breite, kasseY + 104);
      ctx.textAlign = 'right';
      ctx.fillStyle = FARBE.gold;
      ctx.font = 'bold 46px Inter, system-ui, sans-serif';
      ctx.fillText(euro(Math.abs(kasse.ausgleich)), B - 108, kasseY + 104);
      ctx.textAlign = 'left';
    }

    // Offene Runden nicht verschweigen — sonst wirkt der Ausgleich
    // vollstaendig, obwohl Biere fehlen.
    if (kasse.offeneRunden > 0) {
      ctx.fillStyle = FARBE.leise;
      ctx.font = '22px Inter, system-ui, sans-serif';
      ctx.fillText(
        `${kasse.offeneRunden} ${kasse.offeneRunden === 1 ? 'Bier' : 'Biere'} ohne Zahler `
        + `(${euro(kasse.offen)}) — nicht mitgerechnet.`, 70, H - 56);
    }

    setBereit(true);
  }, [boerse, verkostungen, katalog]);

  const dateiname = `fusta-${String(boerse?.name || 'abend')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;

  const sichern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = dateiname;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const teilen = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const datei = new File([blob], dateiname, { type: 'image/png' });
      // canShare mit der Datei fragen, nicht nur navigator.share: Desktop-
      // Browser haben share, koennen aber keine Dateien — dann landet man in
      // einem Fehler statt beim Sichern.
      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: boerse?.name || 'Bierbörse' });
      } else {
        sichern();
        toast.success('Als Bild gesichert.');
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;   // Abbrechen ist kein Fehler
      toast.error('Konnte nicht geteilt werden.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
         onClick={onSchliessen} role="dialog" aria-modal="true" aria-label="Abend als Bild">
      <div className="bg-bg-secondary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg-secondary px-4 py-3 border-b border-border-light flex items-center gap-2.5 z-10">
          <h3 className="karten-titel flex-1 truncate">Abend als Bild</h3>
          <button onClick={onSchliessen} aria-label="Schließen"
                  className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0">
            <Icon name="x" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-3">
          <canvas ref={canvasRef} className="w-full h-auto rounded-xl"
                  style={{ aspectRatio: '1080 / 1350' }} />
          <div className="flex gap-2">
            <button onClick={teilen} disabled={!bereit} className="btn-primary flex-1">
              <Icon name="share" size={16} strokeWidth={2.4} className="mr-1.5" />
              Teilen
            </button>
            <button onClick={sichern} disabled={!bereit} className="btn-secondary flex-1">
              Sichern
            </button>
          </div>
          <p className="text-caption2 text-text-tertiary">
            Hochformat 1080 × 1350 — das Maß, das Messenger ohne Beschnitt zeigen.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
