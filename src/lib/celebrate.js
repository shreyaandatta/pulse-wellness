// Confetti burst — pure DOM + Web Animations API, no dependencies.
// Bursts outward from the centre of `originEl` (or upper-centre of screen).

const COLORS = [
  '#F0AE38', '#E89414', '#F6C544', // amber & honey
  '#D9774A', '#7DA37A', '#3FA7C4', '#E0879B', // clay, sage, water, rose
];

export function celebrate(originEl, count = 28) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = originEl?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;

  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.className = 'confetti-bit';
    const size = 6 + Math.random() * 7;
    bit.style.cssText = [
      `left:${cx}px`, `top:${cy}px`,
      `width:${size}px`, `height:${Math.random() > 0.5 ? size : size * 0.45}px`,
      `background:${COLORS[i % COLORS.length]}`,
      `border-radius:${Math.random() > 0.6 ? '50%' : '2px'}`,
    ].join(';');
    layer.appendChild(bit);

    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 150;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 90; // bias upward, then gravity below
    const rot = (Math.random() - 0.5) * 540;

    bit.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 170}px)) rotate(${rot}deg) scale(0.7)`, opacity: 0 },
      ],
      { duration: 750 + Math.random() * 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );
  }

  setTimeout(() => layer.remove(), 1600);
}
