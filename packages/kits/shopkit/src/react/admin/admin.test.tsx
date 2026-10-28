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
import { createShop } from '../../engine';
import { createShopAdminHandler } from '../../http/admin';
import { swissQrBill } from '../../receipt/swiss-qr-bill';
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

async function setup(options: { admin?: boolean } = {}) {
  const shop = createShop({
    database: memoryAdapter(),
    shipping: {
      rates: [
        { id: 'post', name: 'PostPac Economy', amount: 900 },
        { id: 'pickup', name: 'Abholung', amount: 0, pickup: true },
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
  async function placeOrder(rate: 'post' | 'pickup' = 'post') {
    const cart = await shop.createCart({ locale: 'de' });

    await shop.addToCart(cart.token, {
      variantId: coffee.variants[0]!.id,
      quantity: 2,
    });
    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingAddress: address,
      shippingRateId: rate,
    });

    const result = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    return result.order;
  }

  const ui = (children: React.ReactNode) =>
    render(
      <ShopAdminProvider client={client} locale="de">
        {children}
      </ShopAdminProvider>,
    );

  return { shop, client, coffee, placeOrder, ui };
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

  it('creates a product and edits price and stock of a variant', async () => {
    const { shop, coffee, ui } = await setup();

    ui(<ShopAdmin initialSection="products" />);

    // edit: new price and counted stock
    fireEvent.click(await screen.findByRole('button', { name: 'Kaffee' }));

    const prices = await screen.findAllByLabelText('Preis (CHF)');

    fireEvent.change(prices[0]!, { target: { value: '19.50' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Speichern' })[1]!);

    expect(await screen.findByText('Gespeichert.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Lager KAF-500'), {
      target: { value: '12' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Lager setzen' })[0]!,
    );

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
