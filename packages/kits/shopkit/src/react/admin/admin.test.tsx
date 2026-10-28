// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { memoryAdapter } from '../../adapters/memory';
import { createCamt054 } from '../../camt';
import { formatGiftCardCode } from '../../codes';
import { type Shop, createShop } from '../../engine';
import type { HsSoftSync } from '../../hssoft';
import { createShopAdminHandler } from '../../http/admin';
import { swissQrBill } from '../../receipt/swiss-qr-bill';
import {
  type SwissPost,
  type SwissPostServiceId,
  createSwissPost,
} from '../../swisspost';
import { createShopAdminClient } from './client';
import { ShopAdminProvider } from './provider';
import { ShopAdmin } from './shop-admin';

const address = {
  name: 'Anna Muster',
  line1: 'Bahnhofstrasse 1',
  postalCode: '8001',
  city: 'Zürich',
  country: 'CH',
};

const slip = swissQrBill({
  name: 'Rösterei AG',
  street: 'Weg',
  buildingNumber: '1',
  postalCode: '3000',
  city: 'Bern',
  iban: 'CH44 3199 9123 0008 8901 2',
});

async function setup(
  options: {
    admin?: boolean;
    /** The HS-Soft plugin (a stand-in for `createHsSoftSync()`). */
    hssoft?: (
      shop: Shop,
      database: ReturnType<typeof memoryAdapter>,
    ) => HsSoftSync;
    /** The Swiss Post plugin (with a stand-in for the API). */
    swisspost?: (shop: Shop) => SwissPost;
    /** `<ShopAdminProvider swisspost={{ services }}>`. */
    swisspostServices?: SwissPostServiceId[];
  } = {},
) {
  const database = memoryAdapter();
  const shop = createShop({
    database,
    // Thursday 10:00 in Zurich
    now: () => new Date('2026-10-15T08:00:00Z'),
    shipping: {
      rates: [
        { id: 'post', name: 'PostPac Economy', amount: 900 },
        { id: 'pickup', name: 'Abholung', amount: 0, pickup: true },
        {
          id: 'laden',
          name: 'Abholung im Laden',
          amount: 0,
          pickup: true,
          schedule: { leadDays: 1, timeWindows: ['07:00–09:00'] },
        },
      ],
    },
  });

  const coffee = await shop.createProduct({
    slug: 'kaffee',
    name: 'Kaffee',
    taxRateBps: 260,
    variants: [
      { sku: 'KAF-500', name: '500 g', price: 1_890, stock: 5 },
      { sku: 'KAF-1000', name: '1 kg', price: 3_490, stock: 2 },
    ],
  });

  await shop.createDiscount({ code: 'ZEHN', type: 'percent', value: 1000 });

  const handler = createShopAdminHandler({
    shop,
    basePath: '/api/shop-admin',
    authorize: () => options.admin !== false,
    receipts: { seller: { name: 'Rösterei AG' }, paymentSlip: slip },
    hssoft: options.hssoft?.(shop, database),
    swisspost: options.swisspost?.(shop),
  });

  const client = createShopAdminClient({
    baseUrl: '/api/shop-admin',
    fetch: (input, init) =>
      handler(
        new Request(
          new URL(
            typeof input === 'string'
              ? input
              : input instanceof URL
                ? input.href
                : input.url,
            'https://shop.example',
          ),
          init,
        ),
      ),
  });

  /** An invoice order of Anna (shipped by post, or picked up). */
  async function placeOrder(
    rate: 'post' | 'pickup' | 'laden' = 'post',
    day?: { fulfillmentDate: string; fulfillmentWindow: string },
  ) {
    const cart = await shop.createCart({ locale: 'de' });

    await shop.addToCart(cart.token, {
      variantId: coffee.variants[0]!.id,
      quantity: 2,
    });
    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingAddress: address,
      shippingRateId: rate,
      ...day,
    });

    const result = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    return result.order;
  }

  const ui = (children: React.ReactNode) =>
    render(
      <ShopAdminProvider
        client={client}
        locale="de"
        hssoft={options.hssoft !== undefined}
        swisspost={
          options.swisspostServices
            ? { services: options.swisspostServices }
            : options.swisspost !== undefined
        }
      >
        {children}
      </ShopAdminProvider>,
    );

  return { shop, database, client, coffee, placeOrder, ui };
}

afterEach(() => {
  cleanup();
});

describe('back office components', () => {
  it('lists, filters and works through an order', async () => {
    const { shop, placeOrder, ui } = await setup();
    const order = await placeOrder();

    ui(<ShopAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: order.number }));

    expect(await screen.findByText(`Bestellung ${order.number}`)).toBeTruthy();
    expect(screen.getAllByText('Bahnhofstrasse 1').length).toBeGreaterThan(0);
    expect(screen.getByText('KAF-500')).toBeTruthy();

    // record the bank payment by hand
    fireEvent.click(screen.getByRole('button', { name: 'Zahlung erfassen' }));
    fireEvent.change(screen.getByLabelText(/Referenz/), {
      target: { value: 'Bank 12.10.' },
    });
    fireEvent.click(
      within(document.querySelector('form.sk-form')!).getByRole('button', {
        name: 'Zahlung erfassen',
      }),
    );

    expect(await screen.findByText('Zahlung erfasst.')).toBeTruthy();
    expect(screen.getByText('Bank 12.10.')).toBeTruthy();

    // ship with a tracking number
    fireEvent.click(screen.getByRole('button', { name: 'Versenden' }));
    fireEvent.change(screen.getByLabelText(/Sendungsnummer/), {
      target: { value: '99.00.123456.00000001' },
    });
    fireEvent.click(
      within(document.querySelector('form.sk-form')!).getByRole('button', {
        name: 'Versenden',
      }),
    );

    expect(await screen.findByText('Als versandt markiert.')).toBeTruthy();

    // refund one bag and put it back in stock
    fireEvent.click(screen.getByRole('button', { name: 'Rückerstatten' }));
    fireEvent.change(screen.getByLabelText(/Betrag/), {
      target: { value: '18.90' },
    });
    fireEvent.click(screen.getByLabelText('Ware wieder an Lager nehmen'));
    fireEvent.click(
      within(document.querySelector('form.sk-form')!).getByRole('button', {
        name: 'Rückerstatten',
      }),
    );

    expect(await screen.findByText('CHF 18.90 rückerstattet.')).toBeTruthy();

    const stored = await shop.getOrder(order.id);

    expect(stored).toMatchObject({
      paymentStatus: 'partially_refunded',
      paymentReference: 'Bank 12.10.',
      fulfillmentStatus: 'shipped',
      trackingNumber: '99.00.123456.00000001',
      refundedTotal: 1_890,
    });

    // back to the list: the filter "to ship" no longer shows it
    fireEvent.click(screen.getByRole('button', { name: '← Zurück' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Zu versenden' }),
    );

    expect(
      await screen.findByText('Keine Bestellungen gefunden.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Unterwegs' }));

    expect(
      await screen.findByRole('button', { name: order.number }),
    ).toBeTruthy();
  });

  it('cancels an order and marks a pickup as ready', async () => {
    const { shop, placeOrder, ui } = await setup();
    const pickup = await placeOrder('pickup');
    const other = await placeOrder();

    ui(<ShopAdmin initialOrderId={pickup.id} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Bereit zur Abholung' }),
    );

    expect(
      await screen.findByText('Als bereit zur Abholung markiert.'),
    ).toBeTruthy();
    expect((await shop.getOrder(pickup.id))!.fulfillmentStatus).toBe('shipped');

    fireEvent.click(screen.getByRole('button', { name: 'Abgeholt' }));

    expect(await screen.findByText('Als zugestellt markiert.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '← Zurück' }));
    fireEvent.click(await screen.findByRole('button', { name: other.number }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stornieren' }));
    fireEvent.change(screen.getByLabelText(/Grund/), {
      target: { value: 'Doppelt bestellt' },
    });
    fireEvent.click(
      within(document.querySelector('form.sk-form')!).getByRole('button', {
        name: 'Stornieren',
      }),
    );

    expect(await screen.findByText('Bestellung storniert.')).toBeTruthy();
    expect(await shop.getOrder(other.id)).toMatchObject({
      status: 'canceled',
      cancelReason: 'Doppelt bestellt',
    });
  });

  it('shows the pickup day and filters the orders of a day', async () => {
    const { placeOrder, ui } = await setup();
    const order = await placeOrder('laden', {
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '07:00–09:00',
    });

    await placeOrder();
    ui(<ShopAdmin />);

    expect(await screen.findByText('20.10.2026, 07:00–09:00')).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(3);

    fireEvent.change(screen.getByLabelText('Abhol-/Liefertag'), {
      target: { value: '2026-10-21' },
    });

    expect(
      await screen.findByText('Keine Bestellungen gefunden.'),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Abhol-/Liefertag'), {
      target: { value: '2026-10-20' },
    });

    fireEvent.click(await screen.findByRole('button', { name: order.number }));

    expect(await screen.findByText('Abhol-/Liefertag')).toBeTruthy();
    expect(screen.getByText('20.10.2026, 07:00–09:00')).toBeTruthy();
  });

  it('creates a product and edits price and stock of a variant', async () => {
    const { shop, coffee, ui } = await setup();

    ui(<ShopAdmin initialSection="products" />);

    // edit: counted stock typed, then a new price saved – the typed stock stays
    fireEvent.click(await screen.findByRole('button', { name: 'Kaffee' }));

    const prices = await screen.findAllByLabelText('Preis (CHF)');
    const stock = screen.getByLabelText<HTMLInputElement>('Lager KAF-500');

    fireEvent.change(stock, { target: { value: '12' } });
    fireEvent.change(prices[0]!, { target: { value: '19.50' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Speichern' })[1]!);

    expect(await screen.findByText('Gespeichert.')).toBeTruthy();
    await waitFor(async () => {
      const product = await shop.getProduct(coffee.id);

      expect(product!.variants[0]).toMatchObject({ price: 1_950, stock: 5 });
    });

    const setStock = screen.getAllByRole<HTMLButtonElement>('button', {
      name: 'Lager setzen',
    })[0]!;

    await waitFor(() => expect(setStock.disabled).toBe(false));
    expect(stock.value).toBe('12');

    fireEvent.click(setStock);

    await waitFor(async () => {
      const product = await shop.getProduct(coffee.id);

      expect(product!.variants[0]).toMatchObject({ price: 1_950, stock: 12 });
    });

    // new product with one variant; the slug follows the name
    fireEvent.click(screen.getByRole('button', { name: '← Zurück' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Neues Produkt' }),
    );
    fireEvent.change(screen.getAllByLabelText('Name')[0]!, {
      target: { value: 'Röstbuch Zürich' },
    });

    expect(
      screen.getByLabelText<HTMLInputElement>('URL-Name (Slug)').value,
    ).toBe('roestbuch-zuerich');

    fireEvent.change(screen.getByLabelText('MWST-Satz'), {
      target: { value: '810' },
    });
    fireEvent.change(screen.getByLabelText('Art.-Nr. (SKU)'), {
      target: { value: 'BUCH' },
    });
    fireEvent.change(screen.getByLabelText('Preis (CHF)'), {
      target: { value: '32.–' },
    });
    fireEvent.change(screen.getByLabelText('Lager'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(await screen.findByText('Produkt erstellt.')).toBeTruthy();

    const book = await shop.getProduct('roestbuch-zuerich');

    expect(book).toMatchObject({ name: 'Röstbuch Zürich', taxRateBps: 810 });
    expect(book!.variants[0]).toMatchObject({
      sku: 'BUCH',
      price: 3_200,
      stock: 7,
    });
  });

  it('creates and deactivates discount codes', async () => {
    const { shop, ui } = await setup();

    ui(<ShopAdmin initialSection="discounts" />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Neuer Rabattcode' }),
    );
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'kaffee5' },
    });
    fireEvent.change(screen.getByLabelText('Art'), {
      target: { value: 'fixed' },
    });
    fireEvent.change(screen.getByLabelText('Rabatt in CHF'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText(/Mindestbestellwert/), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(await screen.findByRole('button', { name: 'KAFFEE5' })).toBeTruthy();

    const discounts = await shop.listDiscounts();

    expect(discounts.find((entry) => entry.code === 'KAFFEE5')).toMatchObject({
      type: 'fixed',
      value: 500,
      minSubtotal: 3_000,
      active: true,
    });

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Deaktivieren' })[0]!,
    );

    await waitFor(async () => {
      const list = await shop.listDiscounts();

      expect(list.filter((entry) => !entry.active)).toHaveLength(1);
    });
  });

  it('issues and disables gift cards', async () => {
    const { shop, ui } = await setup();

    ui(<ShopAdmin initialSection="giftCards" />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Gutschein ausstellen' }),
    );
    fireEvent.change(screen.getByLabelText('Betrag (CHF)'), {
      target: { value: '50' },
    });
    fireEvent.click(
      within(document.querySelector('form.sk-form')!).getByRole('button', {
        name: 'Gutschein ausstellen',
      }),
    );

    expect(await screen.findByText(/Gutschein ausgestellt:/)).toBeTruthy();

    const [card] = await shop.listGiftCards();

    expect(card).toMatchObject({ initialAmount: 5_000, balance: 5_000 });
    // in the notice and in the list
    await waitFor(() =>
      expect(screen.getAllByText(formatGiftCardCode(card!.code))).toHaveLength(
        2,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sperren' }));
    fireEvent.click(
      within(document.querySelector('.sk-confirm')!).getByRole('button', {
        name: 'Sperren',
      }),
    );

    expect(await screen.findByText('Gesperrt')).toBeTruthy();
    expect((await shop.listGiftCards())[0]!.status).toBe('disabled');
  });

  it('imports a camt.054 file', async () => {
    const { shop, placeOrder, ui } = await setup();
    const order = await placeOrder();

    ui(<ShopAdmin initialSection="bank" />);

    const camt = createCamt054({
      accountIban: 'CH44 3199 9123 0008 8901 2',
      payments: [
        {
          id: 'BANK-1',
          amount: order.amountDue,
          currency: 'CHF',
          reference: slip.reference(order),
        },
        { id: 'BANK-2', amount: 1_000, currency: 'CHF', reference: null },
      ],
    });
    const file = new File([camt], 'camt054.xml', { type: 'application/xml' });

    // jsdom has no Blob.text()
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(camt) });

    fireEvent.change(screen.getByLabelText('Bankdatei wählen'), {
      target: { files: [file] },
    });

    expect(await screen.findByText('2 Zahlungen eingelesen.')).toBeTruthy();
    expect(screen.getByText('Als bezahlt markiert (1)')).toBeTruthy();
    expect(screen.getByText('Nicht zugeordnet (1)')).toBeTruthy();
    expect((await shop.getOrder(order.id))!.paymentStatus).toBe('paid');
  });

  it('shows the error of the API when the session is no admin', async () => {
    const { ui } = await setup({ admin: false });

    ui(<ShopAdmin />);

    expect(
      await screen.findByText(
        'Kein Zugriff – bitte melde dich mit einem Admin-Konto an.',
      ),
    ).toBeTruthy();
  });
});

describe('HS-Soft plugin in the back office', () => {
  /** Records the calls; orders "go" to WaWiAssist as number 4711. */
  function fakeHsSoft(calls: string[]) {
    return (shop: Shop, database: ReturnType<typeof memoryAdapter>) =>
      ({
        importProducts: (params: { force?: boolean }) => {
          calls.push(`import force=${params.force === true}`);

          return Promise.resolve({
            loaded: 3,
            created: 1,
            updated: 1,
            unchanged: 1,
            deactivated: 0,
            skipped: [{ articleId: 9, articleNumber: 'A9', reason: 'dough' }],
            failed: [],
          });
        },
        syncOrders: () => {
          calls.push('sync');

          return Promise.resolve({
            synced: 2,
            retry: 0,
            failed: 0,
            uncertain: 0,
            skipped: 0,
            deleted: 0,
            saturated: false,
          });
        },
        syncOrder: async (orderId: string, params: { force?: boolean }) => {
          calls.push(`order force=${params.force === true}`);

          const order = (await shop.getOrder(orderId))!;
          const sync = {
            state: 'synced',
            orderId: 1,
            orderNumber: 4711,
            attempts: 2,
            warnings: [],
            error: null,
            nextAttemptAt: null,
            syncedAt: '2026-10-15T08:00:00.000Z',
            updatedAt: '2026-10-15T08:00:00.000Z',
          };

          await database.update('order', [{ field: 'id', value: orderId }], {
            metadata: { ...order.metadata, hssoft: sync },
          });

          return sync;
        },
        setAvailabilityPeriod: async (
          productId: string,
          period: { from: string; to: string; recurring?: boolean } | null,
        ) => {
          const product = (await shop.getProduct(productId))!;
          const { hssoftAvailability: _old, ...metadata } = product.metadata;

          return shop.updateProduct(productId, {
            metadata: period
              ? { ...metadata, hssoftAvailability: period }
              : metadata,
          });
        },
      }) as unknown as HsSoftSync;
  }

  it('shows nothing of HS-Soft without the plugin', async () => {
    const { placeOrder, ui } = await setup();
    const order = await placeOrder();

    ui(<ShopAdmin initialOrderId={order.id} />);

    expect(await screen.findByText(`Bestellung ${order.number}`)).toBeTruthy();
    expect(screen.queryByText('WaWiAssist')).toBeNull();
    expect(screen.queryByRole('tab', { name: 'WaWiAssist' })).toBeNull();
  });

  it('imports products and sends due orders by hand', async () => {
    const calls: string[] = [];
    const { ui } = await setup({ hssoft: fakeHsSoft(calls) });

    ui(<ShopAdmin initialSection="hssoft" />);

    fireEvent.click(
      screen.getByLabelText('Auch unveränderte Artikel neu schreiben'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt importieren' }));

    expect(
      await screen.findByText(
        '3 Artikel geladen: 1 neu, 1 geändert, 1 unverändert, 0 deaktiviert.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Übersprungen (1)')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Fällige Bestellungen senden' }),
    );

    expect(await screen.findByText(/^2 gesendet/)).toBeTruthy();
    expect(calls).toEqual(['import force=true', 'sync']);
  });

  it('sends an order that is not in WaWiAssist yet', async () => {
    const calls: string[] = [];
    const { placeOrder, ui } = await setup({ hssoft: fakeHsSoft(calls) });
    const order = await placeOrder();

    ui(<ShopAdmin />);

    // the list points at it
    expect(await screen.findByText('Noch nicht gesendet')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: order.number }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'An WaWiAssist senden' }),
    );

    expect(await screen.findByText('An WaWiAssist gesendet.')).toBeTruthy();
    expect(screen.getByText('4711')).toBeTruthy();
    expect(screen.getByText('Übertragen')).toBeTruthy();
    expect(calls).toEqual(['order force=false']);
  });

  it('sends a refused order again with force and keeps a period on a product', async () => {
    const calls: string[] = [];
    const { shop, database, coffee, placeOrder, ui } = await setup({
      hssoft: fakeHsSoft(calls),
    });
    const order = await placeOrder();

    await database.update('order', [{ field: 'id', value: order.id }], {
      metadata: {
        hssoft: {
          state: 'failed',
          orderId: null,
          orderNumber: null,
          attempts: 1,
          warnings: [],
          error: {
            code: 'HSSOFT_REJECTED',
            message: 'Das Lieferdatum ist gesperrt',
            status: 400,
            type: 'VALIDATION_ERROR',
          },
          nextAttemptAt: null,
          syncedAt: null,
          updatedAt: '2026-10-15T08:00:00.000Z',
        },
      },
    });

    ui(<ShopAdmin initialOrderId={order.id} />);

    expect(
      await screen.findByText('Das Lieferdatum ist gesperrt'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Erneut senden' }));

    expect(await screen.findByText('An WaWiAssist gesendet.')).toBeTruthy();
    expect(calls).toEqual(['order force=true']);

    // availability period of a product
    fireEvent.click(screen.getByRole('tab', { name: 'Produkte' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Kaffee' }));
    fireEvent.change(await screen.findByLabelText('Von'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Bis'), {
      target: { value: '2026-12-06' },
    });
    fireEvent.click(screen.getByLabelText('Jedes Jahr'));
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum speichern' }));

    expect(await screen.findByText('Zeitraum gespeichert.')).toBeTruthy();
    expect((await shop.getProduct(coffee.id))!.metadata).toMatchObject({
      hssoftAvailability: {
        from: '2026-11-01',
        to: '2026-12-06',
        recurring: true,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum entfernen' }));

    expect(await screen.findByText('Zeitraum entfernt.')).toBeTruthy();
    expect(
      (await shop.getProduct(coffee.id))!.metadata.hssoftAvailability,
    ).toBeUndefined();
  });
});

describe('Swiss Post plugin in the back office', () => {
  it('creates the Swiss Post label from the order', async () => {
    const sent: { przl: string[]; weight?: number }[] = [];
    const swisspost = (shop: Shop) =>
      createSwissPost({
        shop,
        clientId: 'client',
        clientSecret: 'secret',
        frankingLicense: '60048724',
        sender: {
          name: 'Rösterei AG',
          street: 'Weg 1',
          postalCode: '3000',
          city: 'Bern',
        },
        fetch: (input, init) => {
          if (
            (input instanceof Request ? input.url : input.toString()).includes(
              'OAuth',
            )
          ) {
            return Promise.resolve(
              Response.json({ access_token: 'token', expires_in: 300 }),
            );
          }

          const body = JSON.parse(init?.body as string) as {
            item: { attributes: { przl: string[]; weight?: number } };
          };

          sent.push(body.item.attributes);

          return Promise.resolve(
            Response.json({
              labelDefinition: {
                labelLayout: 'A6',
                imageFileType: 'pdf',
                imageResolution: 300,
              },
              item: {
                identCode: `99600487240000000${sent.length}`,
                label: [btoa('%PDF-')],
              },
            }),
          );
        },
      });
    const { shop, placeOrder, ui } = await setup({ swisspost });
    const order = await placeOrder();

    ui(<ShopAdmin initialOrderId={order.id} />);

    fireEvent.change(await screen.findByLabelText('Versandart'), {
      target: { value: 'PRI' },
    });
    fireEvent.click(screen.getByLabelText('Unterschrift'));
    fireEvent.click(screen.getByLabelText('Samstagszustellung'));
    fireEvent.change(screen.getByLabelText(/^Gewicht in Gramm/), {
      target: { value: '1500' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Etikett erstellen' }));

    expect(
      await screen.findByText('Etikett 99.60.048724.00000001 erstellt.'),
    ).toBeTruthy();
    expect(sent).toEqual([{ przl: ['PRI', 'SI', 'SA'], weight: 1_500 }]);
    // the order reloads: shipped with the tracking number
    await waitFor(() =>
      expect(screen.getAllByText('99.60.048724.00000001').length).toBe(2),
    );
    expect((await shop.getOrder(order.id))!.fulfillmentStatus).toBe('shipped');

    // another label only on purpose, as the rate's shipment (ECO)
    fireEvent.click(
      screen.getByRole('button', { name: 'Neues Etikett erstellen' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Etikett erstellen' }));

    expect(
      await screen.findByText('Etikett 99.60.048724.00000002 erstellt.'),
    ).toBeTruthy();
    expect(sent[1]!.przl).toEqual(['ECO']);
  });

  it('offers only the chosen services', async () => {
    const { placeOrder, ui } = await setup({
      swisspost: (shop) =>
        createSwissPost({
          shop,
          clientId: 'client',
          clientSecret: 'secret',
          frankingLicense: '60048724',
          sender: {
            name: 'R',
            street: 'Weg 1',
            postalCode: '3000',
            city: 'Bern',
          },
        }),
      swisspostServices: ['ECO', 'PRI', 'APLUS'],
    });
    const order = await placeOrder();

    ui(<ShopAdmin initialOrderId={order.id} />);

    const select =
      await screen.findByLabelText<HTMLSelectElement>('Versandart');

    expect([...select.options].map((option) => option.value)).toEqual([
      '',
      'ECO',
      'PRI',
      'APLUS',
    ]);
  });

  it('shows no label part for pickups', async () => {
    const { placeOrder, ui } = await setup({
      swisspost: (shop) =>
        createSwissPost({
          shop,
          clientId: 'client',
          clientSecret: 'secret',
          frankingLicense: '60048724',
          sender: {
            name: 'R',
            street: 'Weg 1',
            postalCode: '3000',
            city: 'Bern',
          },
        }),
    });
    const order = await placeOrder('pickup');

    ui(<ShopAdmin initialOrderId={order.id} />);

    expect(await screen.findByText(`Bestellung ${order.number}`)).toBeTruthy();
    expect(screen.queryByText('Post-Etikett')).toBeNull();
  });
});
