import { ShopDemo, SubDemo } from '~/components/client-only';
import { COPY } from '~/lib/copy';

// shop.agentkit.ch and sub.agentkit.ch are the same build with another kit
const kit = process.env.NEXT_PUBLIC_DEMO_KIT;

export default function Page() {
  if (kit === 'shop') return <ShopDemo />;
  if (kit === 'sub') return <SubDemo />;

  const t = COPY.de.index;

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-2 text-muted">{t.lead}</p>
      <ul className="mt-6 flex flex-col gap-2">
        <li>
          <a className="underline" href="/shop">
            {t.shop}
          </a>
        </li>
        <li>
          <a className="underline" href="/sub">
            {t.sub}
          </a>
        </li>
      </ul>
    </main>
  );
}
