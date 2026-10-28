// Open Graph images (1200 × 630), rendered at build time by the
// `opengraph-image.tsx` of each page: a background of the page, the headline
// on the left, a small card of the product on the right. Satori renders them:
// flexbox only, every element with more than one child needs `display: flex`.
import { ImageResponse } from 'next/og';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MOCK } from '~/lib/content';
import type { Dict, KitId, Locale } from '~/lib/i18n';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = 'image/jpeg';

/** JPEG copies of public/bg/<scene>.webp – Satori reads no WebP. */
type OgScene = 'alpine' | 'meadow' | 'lake' | 'dusk';

const INK = '#0a0a0a';
const SIGNAL = '#ff4b3e';
const OK = '#12a150';

// Read at build time (the images are prerendered per locale), paths scoped
// to their folders so tracing stays small.
const FONTS = path.join(process.cwd(), 'node_modules/geist/dist/fonts');
const SCENES = path.join(process.cwd(), 'lib/og');

async function fonts() {
  const [regular, medium, semibold, mono] = await Promise.all([
    readFile(path.join(FONTS, 'geist-sans/Geist-Regular.ttf')),
    readFile(path.join(FONTS, 'geist-sans/Geist-Medium.ttf')),
    readFile(path.join(FONTS, 'geist-sans/Geist-SemiBold.ttf')),
    readFile(path.join(FONTS, 'geist-mono/GeistMono-Medium.ttf')),
  ]);
  return [
    { name: 'Geist', data: regular, weight: 400 as const },
    { name: 'Geist', data: medium, weight: 500 as const },
    { name: 'Geist', data: semibold, weight: 600 as const },
    { name: 'Geist Mono', data: mono, weight: 500 as const },
  ];
}

async function background(scene: OgScene) {
  const jpeg = await readFile(path.join(SCENES, `${scene}.jpg`));
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

/** Headline left, `card` right, on a photo of the page. */
export async function ogImage({
  locale,
  path: pagePath,
  scene,
  eyebrow,
  title,
  lead,
  card,
}: {
  locale: Locale;
  /** Path after the locale, shown as the URL top right. */
  path: string;
  scene: OgScene;
  eyebrow: React.ReactNode;
  title: string;
  lead?: string;
  card: React.ReactNode;
}) {
  const size = title.length > 40 ? 60 : title.length > 30 ? 66 : 74;
  const words = title.split(' ');
  const last = words.pop()!;
  const full = { position: 'absolute', left: 0, top: 0, ...OG_SIZE } as const;

  const png = await new ImageResponse(
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: 'Geist',
        color: 'white',
        background: '#0b1e44',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={await background(scene)}
        width={OG_SIZE.width}
        height={OG_SIZE.height}
        alt=""
        style={{ ...full, objectFit: 'cover' }}
      />
      <div
        style={{
          ...full,
          backgroundImage:
            'linear-gradient(90deg, rgba(8,22,52,0.92) 0%, rgba(8,22,52,0.78) 40%, rgba(8,22,52,0.25) 72%, rgba(8,22,52,0.1) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 60,
          bottom: 60,
          width: 640,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MarkSvg size={44} />
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1.2 }}>
            agentkit
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flexGrow: 1,
          }}
        >
          <div style={{ display: 'flex' }}>{eyebrow}</div>
          {/* word by word, so the red full stop stays on the last line */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              columnGap: size * 0.22,
              marginTop: 28,
              fontSize: size,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -size * 0.045,
            }}
          >
            {words.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
            <span style={{ display: 'flex' }}>
              {last}
              <span style={{ color: SIGNAL }}>.</span>
            </span>
          </div>
          {lead && (
            <div
              style={{
                display: 'flex',
                maxWidth: 540,
                marginTop: 22,
                fontSize: 25,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {lead}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {['TWINT', ...CHIPS[locale]].map((c) => (
            <span
              key={c}
              style={{
                display: 'flex',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.14)',
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 64,
          top: 68,
          display: 'flex',
          fontFamily: 'Geist Mono',
          fontSize: 20,
          color: 'rgba(255,255,255,0.9)',
          textShadow: '0 1px 12px rgba(5,20,60,0.6)',
        }}
      >
        agentkit.ch/{locale}
        {pagePath}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 64,
          top: 40,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {card}
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  ).arrayBuffer();

  // A photo as PNG is 1.5 MB; WhatsApp and others want it far smaller.
  const jpeg = await sharp(Buffer.from(png))
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': OG_TYPE },
  });
}

/** QR-bill, VAT and the languages in each language (TWINT comes first). */
const CHIPS: Record<Locale, string[]> = {
  de: ['QR-Rechnung', 'MWST', 'de · fr · it · en'],
  fr: ['Facture QR', 'TVA', 'de · fr · it · en'],
  it: ['Fattura QR', 'IVA', 'de · fr · it · en'],
  en: ['QR-bill', 'VAT', 'de · fr · it · en'],
};

/* ---------- Pieces ---------- */

/** The agentkit mark in white with the red dot (app/icon.svg). */
function MarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7.5" height="18" rx="3.75" fill="white" />
      <circle cx="17.25" cy="6.75" r="3.75" fill={SIGNAL} />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" fill="white" />
    </svg>
  );
}

const ICON_PATHS: Record<KitId, string[]> = {
  subkit: [
    'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  ],
  shopkit: [
    'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2',
    'M8 20a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0',
    'M16 20a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0',
  ],
};

function KitIcon({
  kit,
  size,
  color,
}: {
  kit: KitId;
  size: number;
  color: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[kit].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** White pill: kit name in a dark badge, then its tagline. */
export function KitEyebrow({ kit, label }: { kit: KitId; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 22px 8px 8px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.35)',
        background: 'rgba(255,255,255,0.16)',
        fontSize: 24,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 16px 6px 10px',
          borderRadius: 999,
          background: 'white',
          color: INK,
          fontFamily: 'Geist Mono',
          fontSize: 23,
        }}
      >
        <KitIcon kit={kit} size={24} color={INK} />
        {kit}
      </span>
      {label}
    </div>
  );
}

/** Plain pill for pages that are not about one kit. */
export function TextEyebrow({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 20px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.35)',
        background: 'rgba(255,255,255,0.16)',
        fontSize: 22,
      }}
    >
      <span
        style={{ width: 10, height: 10, borderRadius: 99, background: SIGNAL }}
      />
      {label}
    </div>
  );
}

const PANEL = {
  display: 'flex',
  flexDirection: 'column' as const,
  background: 'white',
  color: INK,
  borderRadius: 26,
  boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
};

const ROW = { display: 'flex', alignItems: 'center' } as const;

function Toast({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        ...PANEL,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px 14px 14px',
        borderRadius: 20,
        marginTop: -26,
        marginLeft: -48,
        alignSelf: 'flex-start',
      }}
    >
      <span
        style={{
          ...ROW,
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(18,161,80,0.14)',
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 16 16"
          fill="none"
          stroke={OK}
          strokeWidth="2.2"
        >
          <path
            d="m3.5 8.5 3 3 6-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 19, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 16, color: '#5c5c5c' }}>{text}</span>
      </div>
    </div>
  );
}

/** subkit: the plan card of the home page, with the payment toast. */
export function SubCard({ t }: { t: Dict }) {
  const s = t.home.bento.sub;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 380 }}>
      <div style={{ ...PANEL, padding: 26 }}>
        <div
          style={{
            ...ROW,
            padding: 5,
            borderRadius: 12,
            background: '#f4f4f4',
            fontSize: 17,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              ...ROW,
              justifyContent: 'center',
              flex: 1,
              padding: '8px 0',
              borderRadius: 9,
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            {s.monthly}
          </span>
          <span
            style={{
              ...ROW,
              justifyContent: 'center',
              flex: 1,
              color: '#8a8a8a',
            }}
          >
            {s.yearly}
          </span>
        </div>
        <div style={{ ...ROW, justifyContent: 'space-between', marginTop: 24 }}>
          <span style={{ fontSize: 22, fontWeight: 500 }}>Pro</span>
          <span
            style={{
              display: 'flex',
              padding: '5px 12px',
              borderRadius: 99,
              background: 'rgba(43,108,240,0.12)',
              color: '#2b6cf0',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {s.trial}
          </span>
        </div>
        <div style={{ ...ROW, alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#5c5c5c',
              marginBottom: 7,
            }}
          >
            CHF
          </span>
          <span style={{ fontSize: 52, fontWeight: 600, letterSpacing: -2 }}>
            19.00
          </span>
          <span style={{ fontSize: 18, color: '#8a8a8a', marginBottom: 9 }}>
            {t.home.mock.perMonth}
          </span>
        </div>
        <div
          style={{
            ...ROW,
            justifyContent: 'center',
            height: 52,
            marginTop: 18,
            borderRadius: 14,
            background: INK,
            color: 'white',
            fontSize: 19,
            fontWeight: 500,
          }}
        >
          {s.choose}
        </div>
        <div
          style={{ ...ROW, justifyContent: 'center', gap: 8, marginTop: 16 }}
        >
          {['TWINT', 'VISA', 'MASTERCARD', 'QR'].map((m) => (
            <span
              key={m}
              style={{
                display: 'flex',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid rgba(10,10,10,0.12)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.6,
                color: '#8a8a8a',
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      <Toast
        title={t.home.mock.toastTitle}
        text={`CHF 19.00 · TWINT · ${MOCK.customer}`}
      />
    </div>
  );
}

/** shopkit: the cart of the home page, paid. */
export function ShopCard({ t }: { t: Dict }) {
  const s = t.home.bento.shop;
  const { prices, shipping, total, order } = MOCK.cart;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 380 }}>
      <div style={{ ...PANEL, padding: 26 }}>
        <span style={{ fontSize: 22, fontWeight: 500 }}>{s.cart}</span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginTop: 18,
          }}
        >
          {s.items.map((item, i) => (
            <div key={item} style={{ ...ROW, gap: 14, fontSize: 19 }}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background:
                    i === 0 ? 'rgba(218,41,28,0.16)' : 'rgba(43,108,240,0.16)',
                }}
              />
              <span style={{ display: 'flex', flex: 1 }}>{item}</span>
              <span style={{ color: '#5c5c5c' }}>{prices[i]}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid rgba(10,10,10,0.08)',
          }}
        >
          <div
            style={{
              ...ROW,
              justifyContent: 'space-between',
              fontSize: 16,
              color: '#5c5c5c',
            }}
          >
            <span>{s.shipping}</span>
            <span>{shipping}</span>
          </div>
          <div
            style={{
              ...ROW,
              justifyContent: 'space-between',
              fontSize: 21,
              fontWeight: 600,
            }}
          >
            <span>{s.total}</span>
            <span>CHF {total}</span>
          </div>
        </div>
        <div
          style={{
            ...ROW,
            justifyContent: 'center',
            height: 52,
            marginTop: 18,
            borderRadius: 14,
            background: INK,
            color: 'white',
            fontSize: 19,
            fontWeight: 500,
          }}
        >
          {s.pay}
        </div>
      </div>
      <Toast title={s.paid} text={`${order} · CHF ${total} · TWINT`} />
    </div>
  );
}

/** Home page: the two kits as tiles. */
export function KitsCard({ t }: { t: Dict }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 380 }}
    >
      {(['subkit', 'shopkit'] as const).map((kit) => (
        <div
          key={kit}
          style={{ ...PANEL, flexDirection: 'row', gap: 18, padding: 22 }}
        >
          <span
            style={{
              ...ROW,
              justifyContent: 'center',
              width: 58,
              height: 58,
              flexShrink: 0,
              borderRadius: 16,
              background: INK,
            }}
          >
            <KitIcon kit={kit} size={30} color="white" />
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              width: 260,
            }}
          >
            <span style={{ fontFamily: 'Geist Mono', fontSize: 26 }}>
              {kit}
            </span>
            <span style={{ fontSize: 18, fontWeight: 500 }}>
              {t.kits.items[kit].tagline}
            </span>
            <span style={{ fontSize: 15, color: '#5c5c5c', lineHeight: 1.3 }}>
              {t.kits.items[kit].audience}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Error reference: an error response of a kit. */
export function ErrorCard() {
  const key = (name: string) => (
    <span style={{ color: '#a594ff' }}>&quot;{name}&quot;:&nbsp;</span>
  );
  const value = (text: string) => (
    <span style={{ color: '#3dd68c' }}>&quot;{text}&quot;</span>
  );
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 460,
        padding: 26,
        borderRadius: 26,
        background: 'rgba(10,10,11,0.88)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)',
        fontFamily: 'Geist Mono',
        fontSize: 19,
        lineHeight: 1.6,
        color: 'white',
      }}
    >
      <div style={{ ...ROW, gap: 10, marginBottom: 14, fontSize: 16 }}>
        <span
          style={{
            display: 'flex',
            padding: '2px 10px',
            borderRadius: 6,
            background: 'rgba(255,75,62,0.18)',
            color: SIGNAL,
          }}
        >
          404
        </span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>
          POST /api/billing/subscribe
        </span>
      </div>
      <span>{'{'}</span>
      <div style={{ display: 'flex', paddingLeft: 24 }}>
        {key('error')}
        {value('PLAN_NOT_FOUND')},
      </div>
      <div style={{ display: 'flex', paddingLeft: 24 }}>{key('docs')}</div>
      <div style={{ display: 'flex', paddingLeft: 24 }}>
        {value('…#subkit-PLAN_NOT_FOUND')}
      </div>
      <span>{'}'}</span>
    </div>
  );
}
