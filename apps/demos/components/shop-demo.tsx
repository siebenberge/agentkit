'use client';

import { useEffect, useMemo, useState } from 'react';

import { type Order, formatGiftCardCode } from '@agentkit.ch/shopkit';
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
import '@agentkit.ch/shopkit/react/styles.css';
import { SHOP_SECTIONS, shopCode, themeCss } from '~/lib/config';
import { COPY, type Lang, detectLang, storeLang } from '~/lib/copy';
import { interceptApiLinks, openHtml } from '~/lib/sandbox';
import {
  SHOP_API,
  type ShopRuntime,
  getShopRuntime,
  reloadShopRuntime,
} from '~/lib/shop-runtime';

import { BankImport } from './bank-import';
import { Button, DemoLayout, useSandbox } from './chrome';
import { ConfigPanel, useDemoConfig } from './config-panel';

type View = 'catalog' | 'cart' | 'checkout' | 'order';

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

    void runtime.demoGiftCardCode().then(setGiftCode);
  }, [runtime]);

  const go = (next: View) => {
    if (next !== 'order' && order) {
      setOrder(null);
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
        <ShopBackoffice runtime={runtime} lang={lang} onChange={bump} />
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

function ShopBackoffice(props: {
  runtime: ShopRuntime;
  lang: Lang;
  onChange: () => void;
}) {
  const { runtime, lang } = props;
  const t = COPY[lang].shop.backoffice;
  const { money } = useShop();
  const version = runtime.sandbox.getVersion();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useSandbox(runtime.sandbox);

  useEffect(() => {
    void runtime.shop.listOrders({ limit: 20 }).then(setOrders);
  }, [runtime, version]);

  const run = async (action: () => Promise<unknown>) => {
    setNotice(null);

    try {
      await runtime.act(action);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }

    props.onChange();
  };

  const variants = runtime.tables().variant;

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <section>
        <h3 className="mb-1 font-semibold">{t.orders}</h3>
        {orders.length === 0 ? <p className="text-muted">{t.none}</p> : null}
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id} className="rounded-md border border-line p-2">
              <div className="flex justify-between gap-2">
                <span className="font-mono">{order.number}</span>
                <span className="font-medium">{money(order.total)}</span>
              </div>
              <div className="text-[12px] text-muted">
                {order.email} · {order.status} · {order.paymentStatus} ·{' '}
                {order.fulfillmentStatus}
                {order.paymentMethod !== 'none'
                  ? ` · ${order.paymentMethod}`
                  : ''}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Button
                  onClick={() =>
                    openHtml(
                      window.open('', '_blank'),
                      runtime.receiptHtml(order),
                    )
                  }
                >
                  {t.receipt}
                </Button>
                {order.paymentStatus === 'unpaid' &&
                order.status !== 'expired' ? (
                  <Button
                    onClick={() =>
                      void run(() =>
                        runtime.shop.markPaid({
                          orderId: order.id,
                          reference: 'Bank (Demo)',
                        }),
                      )
                    }
                  >
                    {t.markPaid}
                  </Button>
                ) : null}
                {order.status === 'confirmed' &&
                order.fulfillmentStatus === 'unfulfilled' ? (
                  <Button
                    onClick={() =>
                      void run(() =>
                        runtime.shop.markShipped(
                          order.shipping?.pickup
                            ? { orderId: order.id }
                            : {
                                orderId: order.id,
                                carrier: 'Die Post',
                                trackingNumber: `99.00.${order.number.replace(/\D/g, '').slice(-6)}.00000001`,
                              },
                        ),
                      )
                    }
                  >
                    {t.ship}
                  </Button>
                ) : null}
                {order.fulfillmentStatus === 'shipped' ? (
                  <Button
                    onClick={() =>
                      void run(() =>
                        runtime.shop.markDelivered({ orderId: order.id }),
                      )
                    }
                  >
                    {t.deliver}
                  </Button>
                ) : null}
                {(order.status === 'pending' || order.status === 'confirmed') &&
                (order.fulfillmentStatus === 'unfulfilled' ||
                  order.fulfillmentStatus === 'not_required') ? (
                  <Button
                    onClick={() =>
                      void run(() =>
                        runtime.shop.cancelOrder({ orderId: order.id }),
                      )
                    }
                  >
                    {t.cancel}
                  </Button>
                ) : null}
                {order.paymentStatus === 'paid' ||
                order.paymentStatus === 'partially_refunded' ? (
                  <Button
                    onClick={() =>
                      void run(() =>
                        runtime.shop.refundOrder({
                          orderId: order.id,
                          restock: true,
                        }),
                      )
                    }
                  >
                    {t.refund}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <BankImport
        lang={lang}
        money={money}
        demoCamt={() => runtime.demoCamt()}
        importCamt={(xml) => runtime.importCamt(xml)}
        onChange={props.onChange}
      />

      <section>
        <h3 className="mb-1 font-semibold">{t.stock}</h3>
        <ul className="flex flex-col">
          {variants
            .filter((variant) => variant.trackStock)
            .map((variant) => (
              <li
                key={variant.id}
                className="flex items-center justify-between gap-2 py-0.5"
              >
                <span className="font-mono text-[12px]">{variant.sku}</span>
                <span className="ml-auto">{variant.stock}</span>
                <Button
                  className="h-6 px-2"
                  onClick={() =>
                    void run(() =>
                      runtime.shop.adjustStock({
                        variantId: variant.id,
                        delta: 5,
                      }),
                    )
                  }
                >
                  +5
                </Button>
              </li>
            ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1">
        <Button
          className="self-start"
          onClick={() =>
            void run(async () => {
              await runtime.shop.issueGiftCard({
                amount: 5_000,
                recipientEmail: 'anna@example.ch',
              });
              setNotice(t.issued);
            })
          }
        >
          {t.giftCard}
        </Button>
      </section>

      {notice ? <p className="text-muted">{notice}</p> : null}
    </div>
  );
}
