const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = 'public/assets/splash';
const SRC = 'public/assets/icon-512.png';   // 512px FUSTA icon
const BG = { r: 0x0A, g: 0x11, b: 0x19, alpha: 1 }; // --bg-primary (dark) #0A1119

// [cssWidth, cssHeight, dpr, label] — portrait CSS dimensions
const devices = [
  [320, 568, 2, 'iPhone SE1 / iPod touch'],
  [375, 667, 2, 'iPhone SE2/3, 6/7/8'],
  [414, 736, 3, 'iPhone 6/7/8 Plus'],
  [375, 812, 3, 'iPhone X/XS/11Pro/12-13 mini'],
  [414, 896, 2, 'iPhone XR / 11'],
  [414, 896, 3, 'iPhone XS Max / 11 Pro Max'],
  [390, 844, 3, 'iPhone 12/13/14'],
  [428, 926, 3, 'iPhone 12/13 Pro Max, 14 Plus'],
  [393, 852, 3, 'iPhone 14 Pro/15/15 Pro/16'],
  [430, 932, 3, 'iPhone 14 Pro Max/15 Plus/15 Pro Max'],
  [402, 874, 3, 'iPhone 16 Pro'],
  [440, 956, 3, 'iPhone 16 Pro Max'],
  [744, 1133, 2, 'iPad mini 6'],
  [768, 1024, 2, 'iPad mini/Air/9.7'],
  [810, 1080, 2, 'iPad 10.2'],
  [820, 1180, 2, 'iPad Air 10.9 / iPad 10th'],
  [834, 1194, 2, 'iPad Pro 11'],
  [1024, 1366, 2, 'iPad Pro 12.9'],
];

async function makeSplash(pxW, pxH, file) {
  const logoSize = Math.min(Math.round(Math.min(pxW, pxH) * 0.38), 512);
  const logo = await sharp(SRC).resize(logoSize, logoSize, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).toBuffer();
  await sharp({ create: { width: pxW, height: pxH, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(path.join(OUT, file));
}

(async () => {
  const links = [];
  let total = 0;
  for (const [cw, ch, dpr] of devices) {
    const pw = cw * dpr, ph = ch * dpr;
    const portrait = `splash-${pw}x${ph}.png`;
    const landscape = `splash-${ph}x${pw}.png`;
    await makeSplash(pw, ph, portrait);
    await makeSplash(ph, pw, landscape);
    total += 2;
    const mq = `(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr})`;
    links.push(`    <link rel="apple-touch-startup-image" media="${mq} and (orientation: portrait)" href="/assets/splash/${portrait}">`);
    links.push(`    <link rel="apple-touch-startup-image" media="${mq} and (orientation: landscape)" href="/assets/splash/${landscape}">`);
  }
  fs.writeFileSync('splash_links.html', links.join('\n'));
  console.log(`Generated ${total} splash images for ${devices.length} devices.`);
  console.log('Link tags written to splash_links.html');
})();
