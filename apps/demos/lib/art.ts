/** Product pictures as inline SVG – no image hosting for the demo. */

const SHAPES: Record<string, string> = {
  bean: '<ellipse cx="200" cy="200" rx="70" ry="100" transform="rotate(25 200 200)" fill="#6b3f1d"/><path d="M175 115 C 225 170, 175 230, 225 285" stroke="#3b200c" stroke-width="10" fill="none" stroke-linecap="round" transform="rotate(25 200 200)"/>',
  cup: '<rect x="120" y="150" width="140" height="120" rx="24" fill="#fafaf9" stroke="#1c1917" stroke-width="10"/><path d="M260 180 h20 a30 30 0 0 1 0 60 h-20" fill="none" stroke="#1c1917" stroke-width="10"/><path d="M150 120 q10 -20 0 -40 M190 120 q10 -20 0 -40 M230 120 q10 -20 0 -40" stroke="#78716c" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="100" y="285" width="200" height="14" rx="7" fill="#1c1917"/>',
  card: '<rect x="90" y="130" width="220" height="140" rx="18" fill="#fafaf9" stroke="#1c1917" stroke-width="8"/><rect x="250" y="130" width="20" height="140" fill="#ca8a04"/><path d="M260 150 c-30 -40 -60 -10 -20 10 M260 150 c30 -40 60 -10 20 10" stroke="#ca8a04" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M120 225 h90 M120 245 h60" stroke="#a8a29e" stroke-width="8" stroke-linecap="round"/>',
  book: '<path d="M200 130 C 160 110, 120 110, 95 120 V 285 C 120 275, 160 275, 200 295 Z" fill="#fafaf9" stroke="#1c1917" stroke-width="8" stroke-linejoin="round"/><path d="M200 130 C 240 110, 280 110, 305 120 V 285 C 280 275, 240 275, 200 295 Z" fill="#fafaf9" stroke="#1c1917" stroke-width="8" stroke-linejoin="round"/>',
  ticket:
    '<path d="M100 140 h200 v40 a20 20 0 0 0 0 40 v40 h-200 v-40 a20 20 0 0 0 0 -40 z" fill="#fafaf9" stroke="#1c1917" stroke-width="8" stroke-linejoin="round"/><path d="M160 150 v100" stroke="#1c1917" stroke-width="6" stroke-dasharray="10 10"/>',
  grinder:
    '<rect x="140" y="170" width="120" height="120" rx="12" fill="#a8a29e" stroke="#1c1917" stroke-width="8"/><path d="M150 170 L170 120 h60 L250 170 Z" fill="#d6d3d1" stroke="#1c1917" stroke-width="8" stroke-linejoin="round"/><path d="M200 120 v-30 h60" stroke="#1c1917" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="262" cy="90" r="12" fill="#1c1917"/>',
};

export function productArt(shape: keyof typeof SHAPES, background: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${background}"/>${SHAPES[shape] ?? ''}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
