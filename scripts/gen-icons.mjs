// Rasterises the Pulse brand mark into the PNG sizes a PWA needs.
// Run with: npm run icons
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(out, { recursive: true });

const wave = 'M70 286 h66 l40 -128 l72 224 l52 -158 l34 56 h84';

// Rounded mark on transparent corners — for "any" icons + favicon.
const rounded = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F5C865"/><stop offset="0.55" stop-color="#F0AE38"/><stop offset="1" stop-color="#CB7A09"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="116" fill="url(#g)"/>
  <path d="${wave}" fill="none" stroke="#FFFBF5" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Full-bleed square — for maskable + Apple touch (no transparent corners).
const square = rounded.replace('rx="116" ', '');

const jobs = [
  ['icon-192.png', rounded, 192],
  ['icon-512.png', rounded, 512],
  ['icon-512-maskable.png', square, 512],
  ['apple-touch-icon.png', square, 180],
];

await Promise.all(jobs.map(([name, svg, size]) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(out, name))
    .then(() => console.log('✓', name))
));
console.log('Icons written to public/');
