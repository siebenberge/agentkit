// Illustration of a Swiss QR-bill payment part (receipt + payment part).
// Sample data from the SIX implementation guidelines; the QR pattern is
// decorative, not a scannable code.

const SIZE = 33;

function qrModules() {
  const cells: [number, number][] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= SIZE - 8 && y < 8) || (x < 8 && y >= SIZE - 8);
  const mid = (SIZE - 1) / 2;
  const inCross = (x: number, y: number) =>
    Math.abs(x - mid) <= 4 && Math.abs(y - mid) <= 4;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (inFinder(x, y) || inCross(x, y)) continue;
      if (rand() > 0.52) cells.push([x, y]);
    }
  }
  return cells;
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={7} height={7} fill="#000" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#000" />
    </g>
  );
}

export function FakeQr() {
  const mid = SIZE / 2;
  return (
    <svg
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      className="size-full"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x={-1} y={-1} width={SIZE + 2} height={SIZE + 2} fill="#fff" />
      {qrModules().map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
      {/* The Swiss cross in the centre is mandatory on every QR-bill */}
      <rect x={mid - 3.6} y={mid - 3.6} width={7.2} height={7.2} fill="#fff" />
      <rect x={mid - 3} y={mid - 3} width={6} height={6} fill="#000" />
      <rect x={mid - 0.6} y={mid - 2} width={1.2} height={4} fill="#fff" />
      <rect x={mid - 2} y={mid - 0.6} width={4} height={1.2} fill="#fff" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="text-[7px] font-bold leading-tight sm:text-[8px]">
        {label}
      </p>
      <div className="text-[8px] leading-snug sm:text-[9.5px]">{children}</div>
    </div>
  );
}

export type QrLabels = {
  receipt: string;
  paymentPart: string;
  account: string;
  reference: string;
  additional: string;
  payableBy: string;
  currency: string;
  amount: string;
  info1: string;
  info2: string;
  caption: string;
};

export function QrBill({
  labels,
  captionClassName = 'mt-3 font-mono text-[11px] text-faint',
  className = '',
}: {
  labels: QrLabels;
  captionClassName?: string;
  className?: string;
}) {
  const l = labels;
  return (
    <figure className={`w-full ${className}`}>
      <div className="relative grid bg-white sm:grid-cols-[0.95fr_2fr] font-sans text-black shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.35)]">
        {/* perforation line */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-neutral-400" />

        {/* Receipt */}
        <div className="hidden border-r border-dashed border-neutral-400 p-4 sm:block">
          <p className="mb-3 text-[10px] font-bold sm:text-[11px]">
            {l.receipt}
          </p>
          <Field label={l.account}>
            CH44 3199 9123 0008 8901 2
            <br />
            Acme AG
            <br />
            Bahnhofstrasse 1
            <br />
            8001 Zürich
          </Field>
          <Field label={l.reference}>21 00000 00003 13947 14300 09017</Field>
          <Field label={l.payableBy}>
            FC Seebach
            <br />
            Dorfstrasse 12
            <br />
            8052 Zürich
          </Field>
          <div className="mt-3 flex gap-4">
            <Field label={l.currency}>CHF</Field>
            <Field label={l.amount}>228.00</Field>
          </div>
        </div>

        {/* Payment part */}
        <div className="grid grid-cols-[1fr_1.35fr] gap-3 p-3 sm:p-4">
          <div>
            <p className="mb-3 text-[10px] font-bold sm:text-[11px]">
              {l.paymentPart}
            </p>
            <div className="aspect-square w-full max-w-[150px]">
              <FakeQr />
            </div>
            <div className="mt-3 flex gap-4">
              <Field label={l.currency}>CHF</Field>
              <Field label={l.amount}>228.00</Field>
            </div>
          </div>
          <div className="pt-6">
            <Field label={l.account}>
              CH44 3199 9123 0008 8901 2
              <br />
              Acme AG
              <br />
              Bahnhofstrasse 1
              <br />
              8001 Zürich
            </Field>
            <Field label={l.reference}>21 00000 00003 13947 14300 09017</Field>
            <Field label={l.additional}>
              {l.info1}
              <br />
              {l.info2}
            </Field>
            <Field label={l.payableBy}>
              FC Seebach
              <br />
              Dorfstrasse 12
              <br />
              8052 Zürich
            </Field>
          </div>
        </div>
      </div>
      <figcaption className={captionClassName}>{l.caption}</figcaption>
    </figure>
  );
}
