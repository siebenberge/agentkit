// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import type { AddressLookup } from '../address';
import { createShop } from '../engine';
import { createShopHandler } from '../http/handler';
import type { PaymentProvider } from '../provider';
import type { ShippingRate } from '../types';
import { createShopClient } from './client';
import {
  AddToCartButton,
  Cart,
  Checkout,
  OrderHistory,
  OrderStatus,
} from './components';
import { ShopProvider } from './shop-provider';

async function setup(
  rates: ShippingRate[] = [
    { id: 'post', name: 'PostPac Economy', amount: 900 },
    { id: 'pickup', name: 'Abholung im Laden', amount: 0, pickup: true },
  ],
  addressLookup?: AddressLookup,
) {
  const visits: string[] = [];
  const state = { customer: null as { externalId: string } | null };

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment: () =>
      Promise.resolve({ url: 'https://pay.example/1', reference: 'gw' }),
    parseWebhook: () => Promise.resolve([]),
  };

  const shop = createShop({
    database: memoryAdapter(),
    provider,
    shipping: { rates },
  });

  const product = await shop.createProduct({
    slug: 'kaffee',
    name: 'Kaffee',
    variants: [
      { sku: 'KAF', name: '500 g', price: 1_890, stock: 5, weightGrams: 500 },
    ],
  });

  await shop.createDiscount({ code: 'ZEHN', type: 'percent', value: 1000 });

  const handler = createShopHandler({
    shop,
    basePath: '/api/shop',
    identify: () => state.customer,
    orderUrl: (_request, order) => `https://shop.example/o/${order.id}`,
    addressLookup,
  });

  const client = createShopClient({
    baseUrl: '/api/shop',
    fetch: (input, init) =>
      handler(
        new Request(new URL(requestUrl(input), 'https://shop.example'), init),
      ),
  });

  const ui = (children: React.ReactNode) =>
    render(
      <ShopProvider
        client={client}
        locale="de"
        navigate={(url) => visits.push(url)}
      >
        {children}
      </ShopProvider>,
    );

  return {
    shop,
    client,
    ui,
    visits,
    state,
    variantId: product.variants[0]!.id,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('shop components', () => {
  it('adds to the cart, changes quantities and applies a code', async () => {
    const { ui, variantId } = await setup();

    ui(
      <>
        <AddToCartButton variantId={variantId} />
        <Cart checkoutHref="/kasse" />
      </>,
    );

    expect(await screen.findByText('Dein Warenkorb ist leer.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'In den Warenkorb' }));

    expect(await screen.findByText('Kaffee')).toBeTruthy();
    expect(window.localStorage.getItem('shopkit-cart')).toHaveLength(32);

    fireEvent.change(screen.getByLabelText('Menge'), {
      target: { value: '2' },
    });

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling?.textContent).toMatch(
        /37\.80/,
      ),
    );

    fireEvent.change(screen.getByLabelText('Rabattcode'), {
      target: { value: 'zehn' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Einlösen' }));

    expect(await screen.findByText('ZEHN')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling?.textContent).toMatch(
        /34\.02/,
      ),
    );

    expect(
      screen.getByRole('link', { name: 'Zur Kasse' }).getAttribute('href'),
    ).toBe('/kasse');
  });

  it('shows why a code does not work', async () => {
    const { ui, client, variantId } = await setup();
    const cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Cart />);

    fireEvent.change(await screen.findByLabelText('Rabattcode'), {
      target: { value: 'FALSCH' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Einlösen' }));

    expect(
      await screen.findByText('Dieser Code ist ungültig oder abgelaufen.'),
    ).toBeTruthy();
  });

  it('checks out with pickup on invoice and goes to the order page', async () => {
    const { ui, client, variantId, visits, shop } = await setup();
    const cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Checkout orderHref={({ orderId }) => `/bestellung/${orderId}`} />);

    fireEvent.change(await screen.findByLabelText('E-Mail'), {
      target: { value: 'anna@example.ch' },
    });
    fireEvent.click(screen.getByLabelText(/Abholung im Laden/));

    // pickup: no shipping address, the billing address is asked instead
    await waitFor(() => expect(screen.queryByText('Lieferadresse')).toBeNull());
    fireEvent.click(screen.getByLabelText(/^Rechnung/));

    // on invoice the billing address is complete
    const fill = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });

    fill('Vor- und Nachname', 'Anna Muster');
    fill('Strasse und Nr.', 'Weg 1');
    fill('PLZ', '3000');
    fill('Ort', 'Bern');
    fireEvent.click(
      screen.getByRole('button', { name: 'Kostenpflichtig bestellen' }),
    );

    await waitFor(() => expect(visits).toHaveLength(1));

    const orderId = visits[0]!.replace('/bestellung/', '');
    const order = await shop.getOrder(orderId);

    expect(order).toMatchObject({
      email: 'anna@example.ch',
      paymentMethod: 'invoice',
      shipping: { rateId: 'pickup', pickup: true },
      shippingAddress: null,
      billingAddress: expect.objectContaining({ name: 'Anna Muster' }),
    });
    expect(window.localStorage.getItem('shopkit-cart')).toBeNull();
  });

  it('asks only for the name on a pickup paid online', async () => {
    const { ui, client, variantId, visits } = await setup();
    let cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    cart = await client.updateDetails(cart.token, { shippingRateId: 'pickup' });
    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Checkout orderHref={() => '/unused'} />);

    fireEvent.change(await screen.findByLabelText('E-Mail'), {
      target: { value: 'anna@example.ch' },
    });
    fireEvent.change(screen.getByLabelText('Vor- und Nachname'), {
      target: { value: 'Anna Muster' },
    });

    // the receipt is in the bag: no address unless an invoice is needed
    expect(screen.queryByLabelText('Strasse und Nr.')).toBeNull();
    fireEvent.click(
      screen.getByLabelText('Ich brauche eine Rechnung mit Adresse'),
    );
    expect(screen.getByLabelText('Strasse und Nr.')).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLInputElement>('Vor- und Nachname').value,
    ).toBe('Anna Muster');
    fireEvent.click(
      screen.getByLabelText('Ich brauche eine Rechnung mit Adresse'),
    );
    expect(screen.queryByLabelText('Strasse und Nr.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt bezahlen' }));

    await waitFor(() => expect(visits).toEqual(['https://pay.example/1']), {
      timeout: 5_000,
    });
    expect((await client.cart(cart.token)).billingAddress).toMatchObject({
      name: 'Anna Muster',
      line1: '',
    });
  });

  it('asks for the pickup day and time window', async () => {
    const { ui, client, variantId, visits, shop } = await setup([
      {
        id: 'laden',
        name: 'Abholung im Laden',
        amount: 0,
        pickup: true,
        schedule: { leadDays: 1, timeWindows: ['07:00–09:00', '16:00–18:00'] },
      },
    ]);
    const cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Checkout orderHref={({ orderId }) => `/bestellung/${orderId}`} />);

    fireEvent.change(await screen.findByLabelText('E-Mail'), {
      target: { value: 'anna@example.ch' },
    });

    // the only rate is chosen by itself, then the day is asked
    const select = await screen.findByLabelText<HTMLSelectElement>('Abholtag');
    const submit = screen.getByRole<HTMLButtonElement>('button', {
      name: /bestellen|bezahlen/,
    });

    expect(submit.disabled).toBe(true);

    const day = select.options[2]!.value;

    expect(select.options[2]!.textContent).toMatch(
      /^\w+, \d{2}\.\d{2}\.\d{4}$/,
    );
    fireEvent.change(select, { target: { value: day } });
    fireEvent.click(await screen.findByLabelText('16:00–18:00'));
    await waitFor(() => expect(submit.disabled).toBe(false));

    fireEvent.click(screen.getByLabelText(/^Rechnung/));

    const fill = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });

    fill('Vor- und Nachname', 'Anna Muster');
    fill('Strasse und Nr.', 'Weg 1');
    fill('PLZ', '3000');
    fill('Ort', 'Bern');
    fireEvent.click(submit);

    await waitFor(() => expect(visits).toHaveLength(1));
    expect(
      await shop.getOrder(visits[0]!.replace('/bestellung/', '')),
    ).toMatchObject({ fulfillmentDate: day, fulfillmentWindow: '16:00–18:00' });
  });

  it('selects the only shipping rate by itself', async () => {
    const { ui, client, variantId } = await setup([
      { id: 'pickup', name: 'Abholung im Laden', amount: 0, pickup: true },
    ]);
    const cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Checkout orderHref={() => '/unused'} />);

    await waitFor(() =>
      expect(
        screen.getByLabelText<HTMLInputElement>(/Abholung im Laden/).checked,
      ).toBe(true),
    );
    expect((await client.cart(cart.token)).shippingRateId).toBe('pickup');
  });

  it('sends online payments to the payment page', async () => {
    const { ui, client, variantId, visits } = await setup();
    let cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    cart = await client.updateDetails(cart.token, { shippingRateId: 'post' });
    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Checkout orderHref={() => '/unused'} />);

    fireEvent.change(await screen.findByLabelText('E-Mail'), {
      target: { value: 'anna@example.ch' },
    });

    const fill = (label: string, value: string) =>
      fireEvent.change(screen.getAllByLabelText(label)[0]!, {
        target: { value },
      });

    fill('Vor- und Nachname', 'Anna Muster');
    fill('Strasse und Nr.', 'Weg 1');
    fill('PLZ', '3000');
    fill('Ort', 'Bern');
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt bezahlen' }));

    // checkout + payment start run through the whole handler: slow CI
    await waitFor(() => expect(visits).toEqual(['https://pay.example/1']), {
      timeout: 5_000,
    });
  });

  it('suggests and checks the shipping address', async () => {
    const checked: string[] = [];
    const lookup: AddressLookup = {
      localities: (query) =>
        Promise.resolve(
          query.startsWith('80')
            ? [{ postalCode: '8001', city: 'Zürich' }]
            : [],
        ),
      streets: () => Promise.resolve(['Bahnhofstrasse', 'Bahnhofplatz']),
      houseNumbers: () => Promise.resolve(['1', '12']),
      check: (address) => {
        checked.push(address.line1);

        return Promise.resolve(
          address.line1 === 'Bahnhofstrasse 12'
            ? { status: 'valid', address: null }
            : {
                status: 'corrected',
                address: { ...address, line1: 'Bahnhofstrasse 12' },
              },
        );
      },
    };
    const { ui, client, variantId, visits } = await setup(undefined, lookup);
    let cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    cart = await client.updateDetails(cart.token, { shippingRateId: 'post' });
    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(<Checkout orderHref={() => '/unused'} />);

    fireEvent.change(await screen.findByLabelText('E-Mail'), {
      target: { value: 'anna@example.ch' },
    });

    const input = (label: string) =>
      screen.getAllByLabelText(label)[0] as HTMLInputElement;
    const options = (field: HTMLInputElement) =>
      [
        ...(document.getElementById(field.getAttribute('list')!)?.children ??
          []),
      ].map((option) => (option as HTMLOptionElement).value);

    fireEvent.change(input('Vor- und Nachname'), {
      target: { value: 'Anna Muster' },
    });

    // postcode → localities; choosing one fills postcode and city
    fireEvent.focus(input('PLZ'));
    fireEvent.change(input('PLZ'), { target: { value: '80' } });
    await waitFor(() => expect(options(input('PLZ'))).toEqual(['8001 Zürich']));
    fireEvent.change(input('PLZ'), { target: { value: '8001 Zürich' } });
    expect(input('PLZ').value).toBe('8001');
    expect(input('Ort').value).toBe('Zürich');

    // street, then its house numbers
    fireEvent.focus(input('Strasse und Nr.'));
    fireEvent.change(input('Strasse und Nr.'), {
      target: { value: 'Bahnhofst' },
    });
    await waitFor(() =>
      expect(options(input('Strasse und Nr.'))).toEqual([
        'Bahnhofstrasse',
        'Bahnhofplatz',
      ]),
    );
    fireEvent.change(input('Strasse und Nr.'), {
      target: { value: 'Bahnhofstrasse 1' },
    });
    await waitFor(() =>
      expect(options(input('Strasse und Nr.'))).toEqual([
        'Bahnhofstrasse 1',
        'Bahnhofstrasse 12',
      ]),
    );

    // the check suggests the official address before the order
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt bezahlen' }));
    expect(await screen.findByText('Meintest du diese Adresse?')).toBeTruthy();
    expect(visits).toEqual([]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Vorschlag übernehmen' }),
    );
    expect(input('Strasse und Nr.').value).toBe('Bahnhofstrasse 12');

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt bezahlen' }));
    await waitFor(() => expect(visits).toEqual(['https://pay.example/1']), {
      timeout: 5_000,
    });
    // the accepted suggestion is not checked again
    expect(checked).toEqual(['Bahnhofstrasse 1']);
  });

  it('turns suggestions and the address check off one by one', async () => {
    const calls: string[] = [];
    const lookup: AddressLookup = {
      localities: () => {
        calls.push('localities');
        return Promise.resolve([{ postalCode: '8001', city: 'Zürich' }]);
      },
      streets: () => Promise.resolve([]),
      houseNumbers: () => Promise.resolve([]),
      check: () => {
        calls.push('check');
        return Promise.resolve({ status: 'invalid', address: null });
      },
    };
    const { ui, client, variantId, visits } = await setup(undefined, lookup);
    let cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    cart = await client.updateDetails(cart.token, { shippingRateId: 'post' });
    window.localStorage.setItem('shopkit-cart', cart.token);
    ui(
      <Checkout
        orderHref={() => '/unused'}
        addressSuggestions={false}
        addressCheck={false}
      />,
    );

    fireEvent.change(await screen.findByLabelText('E-Mail'), {
      target: { value: 'anna@example.ch' },
    });

    const fill = (label: string, value: string) =>
      fireEvent.change(screen.getAllByLabelText(label)[0]!, {
        target: { value },
      });

    fill('Vor- und Nachname', 'Anna Muster');
    fill('Strasse und Nr.', 'Weg 1');
    fireEvent.focus(screen.getAllByLabelText('PLZ')[0]!);
    fill('PLZ', '80');
    expect(screen.getAllByLabelText('PLZ')[0]!.getAttribute('list')).toBeNull();
    fill('PLZ', '8001');
    fill('Ort', 'Zürich');
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt bezahlen' }));

    await waitFor(() => expect(visits).toEqual(['https://pay.example/1']), {
      timeout: 5_000,
    });
    expect(calls).toEqual([]);
  });

  it('shows an order and the customer’s history', async () => {
    const { ui, client, variantId, state } = await setup();

    state.customer = { externalId: 'user_1' };

    let cart = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'pickup',
    });

    const placed = await client.checkout(cart.token, {
      paymentMethod: 'invoice',
    });
    const order = await client.order(placed.orderId, placed.accessToken);

    ui(
      <>
        <OrderStatus orderId={placed.orderId} token={placed.accessToken} />
        <OrderHistory orderHref={(id) => `/konto/bestellungen/${id}`} />
      </>,
    );

    expect(await screen.findByText(`Bestellung ${order.number}`)).toBeTruthy();
    expect(
      await screen.findByText('Vielen Dank für deine Bestellung!'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Jetzt bezahlen' })).toBeTruthy();
    expect(
      (await screen.findByRole('link', { name: order.number })).getAttribute(
        'href',
      ),
    ).toBe(`/konto/bestellungen/${placed.orderId}`);
  });
});

function requestUrl(input: RequestInfo | URL) {
  return typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}
