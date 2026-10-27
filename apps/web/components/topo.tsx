// Contour lines like on a Swiss topographic map – the one Swiss motif of the
// landing page (Switzerland section, roadmap, footer).

function ring(cx: number, cy: number, r: number, seed: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const k =
      1 +
      0.16 * Math.sin(3 * a + seed) +
      0.09 * Math.sin(5 * a + seed * 1.7) +
      0.05 * Math.sin(9 * a + r * 0.05);
    pts.push(
      `${(cx + Math.cos(a) * r * k * 1.25).toFixed(1)},${(cy + Math.sin(a) * r * k * 0.85).toFixed(1)}`,
    );
  }
  return `M${pts.join('L')}Z`;
}

const PEAKS = [
  { x: 360, y: 230, rings: 11, seed: 1.2 },
  { x: 860, y: 170, rings: 9, seed: 2.6 },
  { x: 1180, y: 300, rings: 7, seed: 4.1 },
];

/** Contour lines like on a Swiss topographic map. */
export function Topo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1400 480"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      fill="none"
      aria-hidden
    >
      {PEAKS.map((p) =>
        Array.from({ length: p.rings }, (_, i) => (
          <path
            key={`${p.x}-${i}`}
            d={ring(p.x, p.y, 18 + i * 26, p.seed)}
            stroke="currentColor"
            strokeWidth={i % 5 === 4 ? 1.2 : 0.7}
            opacity={i % 5 === 4 ? 0.5 : 0.28}
          />
        )),
      )}
    </svg>
  );
}
