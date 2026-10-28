'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatGiftCardCode } from '@agentkit.ch/shopkit';
import {
  AddToCartButton,
  Cart,
  Checkout,
  OrderStatus,
  type ProductDto,
  ShopProvider,
  createShopClient,
  useShop,
} from '@agentkit.ch/shopkit/react';
import {
  ShopAdmin,
  ShopAdminProvider,
  createShopAdminClient,
} from '@agentkit.ch/shopkit/react/admin';
import '@agentkit.ch/shopkit/react/styles.css';
import { SHOP_SECTIONS, shopCode, themeCss } from '~/lib/config';
import { COPY, type Lang, detectLang, storeLang } from '~/lib/copy';
import { interceptApiLinks } from '~/lib/sandbox';
import {
  SHOP_ADMIN_API,
  SHOP_API,
  type ShopRuntime,
  getShopRuntime,
  reloadShopRuntime,
} from '~/lib/shop-runtime';

import { BankImport } from './bank-import';
import { Button, DemoLayout, useSandbox } from './chrome';
import { ConfigPanel, useDemoConfig } from './config-panel';

type View = 'catalog' | 'cart' | 'checkout' | 'order' | 'admin';

export function ShopDemo() {
  const [runtime, setRuntime] = useState<ShopRuntime | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const config = useDemoConfig('shop', reloadShopRuntime, setRuntime);

  useEffect(() => {
    setLang(detectLang());

    const params = new URLSearchParams(window.location.search);
    const receipt = params.get('receipt');

    void getShopRuntime(window.location.pathname).then(async (loaded) => {
      // links from the emails: the receipt replaces the page
      if (receipt) {
        const response = await loaded.fetchApi(
          `${SHOP_API}/orders/${encodeURIComponent(receipt)}/receipt?token=${encodeURIComponent(params.get('token') ?? '')}`,
        );

        document.open();
        document.write(await response.text());
        document.close();
        return;
      }

      setRuntime(loaded);
    });
  }, []);

  useEffect(() => {
    if (!runtime) return;

    return interceptApiLinks(SHOP_API, (url) => runtime.fetchApi(url));
  }, [runtime]);

  if (!runtime) return <div className="p-8 text-muted">…</div>;

  return (
    <ShopApp
      runtime={runtime}
      config={config}
      lang={lang}
      onLang={(next) => {
        setLang(next);
        storeLang(next);
      }}
    />
  );
}

type Config = ReturnType<typeof useDemoConfig<ShopRuntime>>;

function ShopApp(props: {
  runtime: ShopRuntime;
  config: Config;
  lang: Lang;
  onLang: (lang: Lang) => void;
}) {
  const { runtime, lang } = props;
  const client = useMemo(
    () => createShopClient({ baseUrl: SHOP_API, fetch: runtime.fetchApi }),
    [runtime],
  );

  return (
    // `key`: a new language reloads names and texts of the kit
    <ShopProvider key={lang} client={client} locale={lang}>
      <ShopPage {...props} />
    </ShopProvider>
  );
}

function ShopPage(props: {
  runtime: ShopRuntime;
  config: Config;
  lang: Lang;
  onLang: (lang: Lang) => void;
}) {
  const { runtime, lang, config } = props;
  const t = COPY[lang];
  const shop = useShop();

  const [view, setView] = useState<View>('catalog');
  const [order, setOrder] = useState<{
    id: string;
    token: string | null;
  } | null>(null);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  // `?admin=<order>`: the link in the merchant email
  const [adminOrder, setAdminOrder] = useState<string | null>(null);
  // bumped by back office actions and time travel: views load again
  const [epoch, setEpoch] = useState(0);
  const bump = () => {
    // the "thank you" of a past checkout is not news any more
    const url = new URL(window.location.href);

    if (url.searchParams.has('checkout')) {
      url.searchParams.delete('checkout');
      window.history.replaceState(null, '', url.toString());
    }

    setEpoch((current) => current + 1);
  };
  // a new config: views load again from the new runtime
  const reload = `${epoch}-${config.generation}`;

  useSandbox(runtime.sandbox);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');

    if (orderId) {
      setOrder({ id: orderId, token: params.get('token') });
      setView('order');
    }

    const adminOrderId = params.get('admin');

    if (adminOrderId) {
      setAdminOrder(adminOrderId);
      setView('admin');
    }

    void runtime.demoGiftCardCode().then(setGiftCode);
  }, [runtime]);

  const go = (next: View) => {
    if ((next !== 'order' && order) || (next !== 'admin' && adminOrder)) {
      setOrder(null);
      setAdminOrder(null);
      window.history.replaceState(null, '', window.location.pathname);
    }
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const tips = [
    ...t.shop.tips,
    giftCode ? (
      <>
        {t.shop.giftCardTip}{' '}
        <code className="font-mono">{formatGiftCardCode(giftCode)}</code>
      </>
    ) : null,
  ].filter(Boolean);

  return (
    <DemoLayout
      kit="shopkit"
      lang={lang}
      onLang={props.onLang}
      sandbox={runtime.sandbox}
      title={t.shop.title}
      lead={t.shop.lead}
      tips={tips}
      appActions={
        <>
          <Button tone="ghost" onClick={() => go('catalog')}>
            {t.shop.products}
          </Button>
          <Button
            tone={view === 'admin' ? 'primary' : 'ghost'}
            onClick={() => go('admin')}
          >
            {t.shop.backoffice.open}
          </Button>
          <Button
            tone={view === 'cart' ? 'primary' : undefined}
            onClick={() => go('cart')}
          >
            {t.shop.cart}
            {shop.cart.itemCount > 0 ? (
              <span className="rounded-full bg-signal px-1.5 text-[11px] text-white">
                {shop.cart.itemCount}
              </span>
            ) : null}
          </Button>
        </>
      }
      config={
        <ConfigPanel
          kit="shop"
          lang={lang}
          sections={SHOP_SECTIONS}
          config={config.config}
          code={shopCode(config.config)}
          appliedAt={config.appliedAt}
          onChange={config.change}
          onRestore={config.restore}
        />
      }
      main={
        <>
          <style>{themeCss(config.config)}</style>
          {view === 'catalog' ? (
            <Catalog key={reload} lang={lang} onCart={() => go('cart')} />
          ) : view === 'cart' ? (
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-lg font-semibold">{t.shop.cart}</h2>
              <Cart onCheckout={() => go('checkout')} productHref={() => '#'} />
              <Button
                tone="ghost"
                className="mt-4"
                onClick={() => go('catalog')}
              >
                ← {t.shop.continue}
              </Button>
            </div>
          ) : view === 'checkout' ? (
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-lg font-semibold">{t.shop.checkout}</h2>
              <Checkout
                key={reload}
                countries={['CH', 'LI', 'DE', 'AT', 'FR', 'IT']}
                orderHref={({ orderId, accessToken }) =>
                  `${window.location.pathname}?order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(accessToken)}`
                }
              />
            </div>
          ) : view === 'admin' ? (
            <ShopBackoffice
              // a new config builds a new runtime: load from it
              key={config.generation}
              runtime={runtime}
              lang={lang}
              orderId={adminOrder}
              onChange={bump}
            />
          ) : order ? (
            <div className="mx-auto max-w-2xl">
              <OrderStatus
                key={reload}
                orderId={order.id}
                token={order.token}
              />
              <Button
                tone="ghost"
                className="mt-4"
                onClick={() => go('catalog')}
              >
                ← {t.shop.continue}
              </Button>
            </div>
          ) : null}
        </>
      }
      backoffice={
        <BackofficeTab
          runtime={runtime}
          lang={lang}
          onOpen={() => go('admin')}
          onChange={bump}
        />
      }
      tables={runtime.tables as unknown as () => Record<string, unknown[]>}
      advance={(ms) => runtime.advance(ms).finally(bump)}
      onReset={() => {
        runtime.reset();
        window.location.assign(window.location.pathname);
      }}
    />
  );
}

function Catalog(props: { lang: Lang; onCart: () => void }) {
  const { client, money } = useShop();
  const [products, setProducts] = useState<ProductDto[] | null>(null);

  useEffect(() => {
    void client
      .products(props.lang)
      .then((catalog) => setProducts(catalog.products));
  }, [client, props.lang]);

  if (!products) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          money={money}
          onAdded={props.onCart}
        />
      ))}
    </div>
  );
}

function ProductCard(props: {
  product: ProductDto;
  money: (amount: number) => string;
  onAdded: () => void;
}) {
  const { product } = props;
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const variant =
    product.variants.find((entry) => entry.id === variantId) ??
    product.variants[0];

  if (!variant) return null;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line">
      {product.images[0] ? (
        <img
          src={product.images[0]}
          alt=""
          className="aspect-[4/3] w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold">{product.name}</h3>
        {product.description ? (
          <p className="text-[13px] text-muted">{product.description}</p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-semibold">{props.money(variant.price)}</span>
          {variant.compareAtPrice ? (
            <s className="text-[13px] text-faint">
              {props.money(variant.compareAtPrice)}
            </s>
          ) : null}
          <span className="ml-auto text-[12px] text-faint">
            {product.taxRateBps
              ? `${(product.taxRateBps / 100).toFixed(1)} %`
              : '0 %'}
            {variant.available !== null ? ` · ${variant.available}×` : ''}
          </span>
        </div>
        {product.variants.length > 1 ? (
          <select
            className="h-9 rounded-md border border-line bg-bg px-2 text-[13px]"
            value={variant.id}
            onChange={(event) => setVariantId(event.target.value)}
          >
            {product.variants.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} – {props.money(entry.price)}
              </option>
            ))}
          </select>
        ) : null}
        <AddToCartButton
          variantId={variant.id}
          available={variant.available}
          className="w-full"
          onAdded={props.onAdded}
        />
      </div>
    </article>
  );
}

/** The kit's back office, as a shop owner sees it. */
function ShopBackoffice(props: {
  runtime: ShopRuntime;
  lang: Lang;
  orderId: string | null;
  onChange: () => void;
}) {
  const client = useMemo(
    () =>
      createShopAdminClient({
        baseUrl: SHOP_ADMIN_API,
        fetch: props.runtime.adminFetch,
      }),
    [props.runtime],
  );

  return (
    <ShopAdminProvider key={props.lang} client={client} locale={props.lang}>
      <ShopAdmin initialOrderId={props.orderId} onChange={props.onChange} />
    </ShopAdminProvider>
  );
}

/** "Behind the scenes": open the back office, simulate the bank. */
function BackofficeTab(props: {
  runtime: ShopRuntime;
  lang: Lang;
  onOpen: () => void;
  onChange: () => void;
}) {
  const { runtime, lang } = props;
  const t = COPY[lang].shop.backoffice;
  const { money } = useShop();

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <section className="flex flex-col gap-2">
        <p className="text-muted">{t.lead}</p>
        <Button tone="primary" className="self-start" onClick={props.onOpen}>
          {t.openButton}
        </Button>
      </section>

      <BankImport
        lang={lang}
        money={money}
        demoCamt={() => runtime.demoCamt()}
        importCamt={(xml) => runtime.importCamt(xml)}
        onChange={props.onChange}
      />
    </div>
  );
}
