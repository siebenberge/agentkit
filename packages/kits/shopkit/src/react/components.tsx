'use client';

import { useEffect, useState } from 'react';

import { isDomesticAddress, splitStreet } from '../address';
import type { ShippingOption } from '../engine';
import type {
  AddressCheckDto,
  CartDto,
  OrderDto,
  TotalsDto,
} from '../http/types';
import { formatDate, formatFulfillmentDate, interpolate } from '../i18n';
import type { Address } from '../types';
import { useShop } from './shop-provider';
import { useOrder, useOrders } from './use-cart';

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function percent(bps: number) {
  return (bps / 100).toFixed(1);
}

// ------------------------------------------------------------ AddToCartButton

export type AddToCartButtonProps = {
  variantId: string;
  quantity?: number;
  /** Sold out → disabled (`available` of the variant, `null` = unlimited). */
  available?: number | null;
  className?: string;
  children?: React.ReactNode;
  onAdded?: (cart: CartDto) => void;
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const { cart, m, errorText, notify } = useShop();
  const [error, setError] = useState<string | null>(null);
  const soldOut = props.available === 0;
  const busy = cart.pending === `add:${props.variantId}`;

  const add = async () => {
    setError(null);

    try {
      const next = await cart.add(props.variantId, props.quantity ?? 1);

      notify('success', m.ui.cart.added);
      props.onAdded?.(next);
    } catch (cause) {
      const message = errorText(cause);

      setError(message);
      notify('error', message);
    }
  };

  return (
    <span className="sk-add">
      <button
        type="button"
        className={cx('sk-button sk-button-primary', props.className)}
        disabled={soldOut || busy}
        onClick={() => void add()}
      >
        {soldOut ? m.ui.cart.soldOut : (props.children ?? m.ui.cart.addToCart)}
      </button>
      {error ? (
        <span className="sk-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

// ------------------------------------------------------------ Totals

export function Totals(props: {
  totals: TotalsDto;
  currency: string;
  requiresShipping?: boolean;
  /** Shipping not chosen yet. */
  shippingPending?: boolean;
  giftCardTotal?: number;
  amountDue?: number;
}) {
  const { m, money } = useShop();
  const t = m.ui.totals;
  const { totals } = props;
  const format = (amount: number) => money(amount, props.currency);
  const taxed = totals.taxLines.filter((line) => line.tax > 0);
  const row = (
    key: string,
    label: string,
    value: string,
    className?: string,
  ) => (
    <div key={key} className={cx('sk-totals-row', className)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );

  return (
    <dl className="sk-totals">
      {row('subtotal', t.subtotal, format(totals.itemsSubtotal))}
      {totals.discountTotal > 0
        ? row('discount', t.discount, `– ${format(totals.discountTotal)}`)
        : null}
      {props.requiresShipping
        ? row(
            'shipping',
            t.shipping,
            props.shippingPending
              ? t.shippingLater
              : totals.shippingTotal === 0
                ? t.shippingFree
                : format(totals.shippingTotal),
            props.shippingPending ? 'sk-muted' : undefined,
          )
        : null}
      {!totals.taxInclusive
        ? taxed.map((line) =>
            row(
              `vat-${line.rateBps}`,
              interpolate(t.vat, { rate: percent(line.rateBps) }),
              format(line.tax),
            ),
          )
        : null}
      {totals.rounding !== 0
        ? row('rounding', t.rounding, format(totals.rounding))
        : null}
      {row('total', t.total, format(totals.total), 'sk-total')}
      {totals.taxInclusive
        ? taxed.map((line) =>
            row(
              `vat-${line.rateBps}`,
              interpolate(t.vatIncluded, { rate: percent(line.rateBps) }),
              format(line.tax),
              'sk-muted',
            ),
          )
        : null}
      {props.giftCardTotal
        ? [
            row('gift-cards', t.giftCards, `– ${format(props.giftCardTotal)}`),
            row('due', t.amountDue, format(props.amountDue ?? 0), 'sk-total'),
          ]
        : null}
    </dl>
  );
}

// ------------------------------------------------------------ Cart

export type CartProps = {
  /** Link of the checkout button (or `onCheckout`). */
  checkoutHref?: string;
  onCheckout?: () => void;
  /** Product page of a line (makes names links). */
  productHref?: (slug: string) => string;
  className?: string;
};

/** Cart page / drawer: lines, quantities, discount code, totals. */
export function Cart(props: CartProps) {
  const { cart: state, m, money, errorText } = useShop();
  const { cart } = state;
  const t = m.ui.cart;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const attempt = async (action: () => Promise<unknown>) => {
    setError(null);

    try {
      await action();
    } catch (cause) {
      setError(errorText(cause));
    }
  };

  if (state.loading) {
    return <div className={cx('sk-root', props.className)}>{m.ui.loading}</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={cx('sk-root', props.className)}>
        <p className="sk-muted">{t.empty}</p>
      </div>
    );
  }

  const blocked = cart.items.some((item) => item.issue !== null);

  return (
    <div className={cx('sk-root sk-cart', props.className)}>
      <ul className="sk-lines">
        {cart.items.map((item) => (
          <li key={item.variantId} className="sk-line">
            {item.image ? (
              <img className="sk-line-image" src={item.image} alt="" />
            ) : null}
            <div className="sk-line-main">
              <div className="sk-line-name">
                {props.productHref ? (
                  <a href={props.productHref(item.slug)}>{item.productName}</a>
                ) : (
                  item.productName
                )}
              </div>
              {item.variantName ? (
                <div className="sk-muted">{item.variantName}</div>
              ) : null}
              {item.issue ? (
                <div className="sk-error">
                  {item.issue === 'NOT_FOR_SALE'
                    ? t.notForSale
                    : interpolate(t.onlyLeft, { count: item.available ?? 0 })}
                </div>
              ) : null}
            </div>
            <label className="sk-quantity">
              <span className="sk-sr-only">{t.quantity}</span>
              <input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                value={item.quantity}
                disabled={state.pending !== null}
                onChange={(event) => {
                  const quantity = Number(event.target.value);

                  if (Number.isInteger(quantity) && quantity >= 0) {
                    void attempt(() =>
                      state.setQuantity(item.variantId, quantity),
                    );
                  }
                }}
              />
            </label>
            <div className="sk-line-total">
              {item.discount > 0 && item.issue === null ? (
                <s className="sk-muted">
                  {money(item.subtotal, cart.currency)}
                </s>
              ) : null}
              <span>
                {money(
                  item.issue === 'NOT_FOR_SALE' ? 0 : item.total,
                  cart.currency,
                )}
              </span>
            </div>
            <button
              type="button"
              className="sk-button sk-button-ghost sk-button-small"
              disabled={state.pending !== null}
              onClick={() => void attempt(() => state.remove(item.variantId))}
            >
              {t.remove}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="sk-discount"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) {
            void attempt(async () => {
              await state.applyDiscount(code.trim());
              setCode('');
            });
          }
        }}
      >
        {cart.discountCode ? (
          <span className="sk-chip">
            {cart.discountCode}
            <button
              type="button"
              aria-label={t.remove}
              onClick={() => void attempt(() => state.applyDiscount(null))}
            >
              ×
            </button>
          </span>
        ) : (
          <>
            <input
              className="sk-input"
              placeholder={t.discountCode}
              aria-label={t.discountCode}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button
              type="submit"
              className="sk-button"
              disabled={state.pending !== null}
            >
              {t.apply}
            </button>
          </>
        )}
      </form>

      {error ? (
        <p className="sk-error" role="alert">
          {error}
        </p>
      ) : null}

      <Totals
        totals={cart.totals}
        currency={cart.currency}
        requiresShipping={cart.requiresShipping}
        shippingPending={cart.requiresShipping && cart.shippingRateId === null}
      />

      {props.checkoutHref ? (
        <a
          className={cx(
            'sk-button sk-button-primary sk-button-block',
            blocked && 'sk-disabled',
          )}
          href={blocked ? undefined : props.checkoutHref}
          aria-disabled={blocked}
        >
          {t.checkout}
        </a>
      ) : props.onCheckout ? (
        <button
          type="button"
          className="sk-button sk-button-primary sk-button-block"
          disabled={blocked}
          onClick={props.onCheckout}
        >
          {t.checkout}
        </button>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------ Checkout

const EMPTY_ADDRESS: Address = {
  name: '',
  company: '',
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  country: 'CH',
  phone: '',
};

export type CheckoutProps = {
  /** Countries offered in the address form (default CH, LI). */
  countries?: string[];
  /** Where to go once the order is placed (invoice / fully paid by gift card). */
  orderHref: (order: { orderId: string; accessToken: string }) => string;
  /** Link back to the cart. */
  cartHref?: string;
  /** Terms the customer accepts (e.g. a link to your AGB). */
  terms?: React.ReactNode;
  /**
   * With the handler's `addressLookup`: suggest postcode, locality, street
   * and number (default `true`).
   */
  addressSuggestions?: boolean;
  /**
   * With the handler's `addressLookup`: check the shipping address before
   * the order (default `true`).
   */
  addressCheck?: boolean;
  className?: string;
};

/**
 * Suggestions of the handler's `addressLookup`, 300 ms after the last
 * keystroke; answers of earlier keystrokes are dropped.
 */
function useSuggestions(key: string | null, load: () => Promise<string[]>) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (key === null) {
      setItems([]);
      return;
    }

    let live = true;
    const timer = setTimeout(() => {
      load().then(
        (next) => {
          if (live) setItems(next);
        },
        () => {
          if (live) setItems([]);
        },
      );
    }, 300);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return items;
}

function AddressFields(props: {
  value: Address;
  onChange: (address: Address) => void;
  onCountryChange?: (country: string) => void;
  countries: string[];
  prefix: string;
  /** Suggest postcodes, localities, streets and numbers (CH, LI). */
  lookup?: boolean;
}) {
  const { m, locale, client } = useShop();
  const t = m.ui.checkout;
  const [focus, setFocus] = useState<keyof Address | null>(null);
  const lookup = props.lookup === true && isDomesticAddress(props.value);
  const postalCode = props.value.postalCode.trim();
  const { street, houseNumber } = splitStreet(props.value.line1);
  const localityQuery =
    focus === 'postalCode' || focus === 'city'
      ? (props.value[focus] ?? '').trim()
      : '';
  const localities = useSuggestions(
    lookup && localityQuery.length >= 2 ? `l:${localityQuery}` : null,
    async () =>
      (await client.localities(localityQuery)).localities.map(
        (locality) => `${locality.postalCode} ${locality.city}`,
      ),
  );
  // a number typed after the street → its house numbers (needs the postcode)
  const numbers = lookup && focus === 'line1' && houseNumber !== null;
  const streets = useSuggestions(
    lookup && focus === 'line1' && street.length >= 2
      ? numbers && /^\d{4}$/.test(postalCode)
        ? `h:${postalCode}:${street}:${houseNumber}`
        : numbers
          ? null
          : `s:${postalCode}:${street}`
      : null,
    async () =>
      numbers
        ? (
            await client.houseNumbers(postalCode, street, houseNumber)
          ).houseNumbers.map((number) => `${street} ${number}`)
        : (
            await client.streets(
              street,
              /^\d{4}$/.test(postalCode) ? postalCode : null,
            )
          ).streets,
  );
  const listId = (name: string) => `${props.prefix}-${name}-suggestions`;
  const change = (key: keyof Address, value: string) => {
    // a chosen locality fills postcode and city
    if (
      (key === 'postalCode' || key === 'city') &&
      localities.includes(value)
    ) {
      const [code, ...city] = value.split(' ');

      props.onChange({
        ...props.value,
        postalCode: code!,
        city: city.join(' '),
      });
      return;
    }

    props.onChange({ ...props.value, [key]: value });
  };
  const names = (() => {
    try {
      return new Intl.DisplayNames([locale ?? 'de'], { type: 'region' });
    } catch {
      return null;
    }
  })();
  const field = (
    key: keyof Address,
    label: string,
    options: {
      required?: boolean;
      autoComplete?: string;
      className?: string;
      /** Datalist with suggestions. */
      list?: string;
    } = {},
  ) => (
    <label className={cx('sk-field', options.className)}>
      <span>{label}</span>
      <input
        className="sk-input"
        name={`${props.prefix}-${key}`}
        required={options.required}
        autoComplete={options.autoComplete}
        list={options.list}
        value={props.value[key] ?? ''}
        onFocus={() => setFocus(key)}
        onBlur={() => setFocus((current) => (current === key ? null : current))}
        onChange={(event) => change(key, event.target.value)}
      />
    </label>
  );

  return (
    <div className="sk-address">
      {lookup ? (
        <>
          <datalist id={listId('localities')}>
            {localities.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <datalist id={listId('streets')}>
            {streets.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </>
      ) : null}
      {field('name', t.name, {
        required: true,
        autoComplete: 'name',
        className: 'sk-span-2',
      })}
      {field('company', t.company, {
        autoComplete: 'organization',
        className: 'sk-span-2',
      })}
      {field('line1', t.line1, {
        required: true,
        autoComplete: 'address-line1',
        className: 'sk-span-2',
        list: lookup ? listId('streets') : undefined,
      })}
      {field('line2', t.line2, {
        autoComplete: 'address-line2',
        className: 'sk-span-2',
      })}
      {field('postalCode', t.postalCode, {
        required: true,
        autoComplete: 'postal-code',
        list: lookup ? listId('localities') : undefined,
      })}
      {field('city', t.city, {
        required: true,
        autoComplete: 'address-level2',
        list: lookup ? listId('localities') : undefined,
      })}
      <label className="sk-field">
        <span>{t.country}</span>
        <select
          className="sk-input"
          autoComplete="country"
          value={props.value.country ?? 'CH'}
          onChange={(event) => {
            props.onChange({ ...props.value, country: event.target.value });
            props.onCountryChange?.(event.target.value);
          }}
        >
          {props.countries.map((country) => (
            <option key={country} value={country}>
              {names?.of(country) ?? country}
            </option>
          ))}
        </select>
      </label>
      {field('phone', t.phone, { autoComplete: 'tel' })}
    </div>
  );
}

/**
 * Checkout form: contact, shipping address and method, billing address,
 * payment (TWINT / card or invoice), gift cards, note. Online payment
 * redirects to the provider; invoice orders go to `orderHref`.
 */
export function Checkout(props: CheckoutProps) {
  const { cart: state, client, m, money, errorText, navigate } = useShop();
  const { cart } = state;
  const t = m.ui.checkout;
  const countries = props.countries ?? ['CH', 'LI'];

  const [email, setEmail] = useState('');
  const [shipping, setShipping] = useState<Address>(EMPTY_ADDRESS);
  const [billing, setBilling] = useState<Address>(EMPTY_ADDRESS);
  const [sameBilling, setSameBilling] = useState(true);
  // pickup: the name is enough – an address only for an invoice
  const [withAddress, setWithAddress] = useState(false);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'online' | 'invoice' | null>(null);
  const [giftCode, setGiftCode] = useState('');
  const [giftCards, setGiftCards] = useState<
    { code: string; balance: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // address check: the answer shown, the address the customer kept
  const [addressCheck, setAddressCheck] = useState<AddressCheckDto | null>(
    null,
  );
  const [keptAddress, setKeptAddress] = useState<string | null>(null);

  // fill the form once from the cart (details saved earlier)
  useEffect(() => {
    if (!cart || loaded) return;

    setLoaded(true);
    // what the customer already typed wins over the saved details
    setEmail((current) => current || (cart.email ?? ''));
    if (cart.shippingAddress) {
      const saved = { ...EMPTY_ADDRESS, ...cart.shippingAddress };

      setShipping((current) => (current === EMPTY_ADDRESS ? saved : current));
    } else if (cart.billingAddress?.name) {
      const name = cart.billingAddress.name;

      setShipping((current) =>
        current === EMPTY_ADDRESS ? { ...EMPTY_ADDRESS, name } : current,
      );
    }
    if (cart.billingAddress) {
      const saved = { ...EMPTY_ADDRESS, ...cart.billingAddress };

      setBilling((current) => (current === EMPTY_ADDRESS ? saved : current));
      // a name alone (pickup paid online, or filled in for a signed-in
      // customer) is no billing address of its own
      if (cart.billingAddress.line1) {
        setSameBilling(false);
        setWithAddress(true);
      }
    }
    setNote((current) => current || (cart.note ?? ''));
  }, [cart, loaded]);

  useEffect(() => {
    if (cart && (method === null || !cart.paymentMethods.includes(method))) {
      setMethod(cart.paymentMethods[0] ?? null);
    }
  }, [cart, method]);

  // a single way to ship needs no choice
  const onlyRate =
    cart?.requiresShipping &&
    cart.shippingRateId === null &&
    cart.shippingOptions.length === 1
      ? cart.shippingOptions[0]!.id
      : null;

  useEffect(() => {
    if (!onlyRate) return;

    void state
      .updateDetails({ shippingRateId: onlyRate })
      .catch((cause: unknown) => setError(errorText(cause)));
  }, [onlyRate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading)
    return <div className={cx('sk-root', props.className)}>{m.ui.loading}</div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className={cx('sk-root', props.className)}>
        <p className="sk-muted">{m.ui.cart.empty}</p>
      </div>
    );
  }

  const selectedRate = cart.shippingOptions.find(
    (option) => option.id === cart.shippingRateId,
  );
  const needsAddress = cart.requiresShipping && !selectedRate?.pickup;
  const showBillingFields = needsAddress
    ? !sameBilling
    : method === 'invoice' || withAddress;
  const giftCardTotal = Math.min(
    cart.totals.total,
    giftCards.reduce((acc, card) => acc + card.balance, 0),
  );
  const amountDue = cart.totals.total - giftCardTotal;

  const fail = (cause: unknown) => setError(errorText(cause));

  const addGiftCard = async () => {
    const code = giftCode.trim();

    if (!code || giftCards.some((card) => card.code === code)) return;

    setError(null);

    try {
      const balance = await client.giftCardBalance(code);

      setGiftCards([...giftCards, { code, balance: balance.balance }]);
      setGiftCode('');
    } catch (cause) {
      fail(cause);
    }
  };

  const changeShipping = (address: Address) => {
    setShipping(address);
    setAddressCheck(null);
  };

  /** `false`: the customer should look at the address first. */
  const addressConfirmed = async () => {
    if (
      !needsAddress ||
      !cart.addressLookup ||
      props.addressCheck === false ||
      !isDomesticAddress(shipping)
    ) {
      return true;
    }

    const key = JSON.stringify(shipping);

    if (key === keptAddress) return true;

    const check = await client.checkAddress(shipping).catch(() => null);

    if (check?.status === 'corrected' || check?.status === 'invalid') {
      setAddressCheck(check);
      return false;
    }

    return true;
  };

  const submit = async () => {
    setError(null);
    setBusy(true);

    try {
      if (!(await addressConfirmed())) {
        setBusy(false);
        return;
      }

      await state.updateDetails({
        email,
        shippingAddress: needsAddress ? shipping : null,
        billingAddress: needsAddress
          ? sameBilling
            ? null
            : billing
          : withAddress || method === 'invoice'
            ? billing
            : { ...EMPTY_ADDRESS, name: billing.name },
        note,
      });

      const result = await state.checkout({
        paymentMethod: method ?? 'invoice',
        giftCardCodes: giftCards.map((card) => card.code),
      });

      navigate(
        result.type === 'redirect'
          ? result.url
          : props.orderHref({
              orderId: result.orderId,
              accessToken: result.accessToken,
            }),
      );
    } catch (cause) {
      fail(cause);
      setBusy(false);
    }
  };

  return (
    <form
      className={cx('sk-root sk-checkout', props.className)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <section className="sk-section">
        <h3 className="sk-heading">{t.contact}</h3>
        <label className="sk-field">
          <span>{t.email}</span>
          <input
            className="sk-input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
      </section>

      {cart.requiresShipping ? (
        <section className="sk-section">
          <h3 className="sk-heading">{t.shippingMethod}</h3>
          {cart.shippingOptions.length === 0 ? (
            <p className="sk-error">{t.noShippingMethod}</p>
          ) : (
            <div className="sk-options">
              {cart.shippingOptions.map((option) => (
                <label key={option.id} className="sk-option">
                  <input
                    type="radio"
                    name="sk-shipping"
                    checked={cart.shippingRateId === option.id}
                    onChange={() =>
                      void state
                        .updateDetails({ shippingRateId: option.id })
                        .catch(fail)
                    }
                  />
                  <span className="sk-option-main">
                    <span>{option.name}</span>
                    {option.description ? (
                      <span className="sk-muted">{option.description}</span>
                    ) : null}
                  </span>
                  <span>
                    {option.amount === 0
                      ? m.ui.totals.shippingFree
                      : money(option.amount, cart.currency)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {selectedRate?.schedule ? (
        <FulfillmentDateFields
          schedule={selectedRate.schedule}
          pickup={selectedRate.pickup}
          date={cart.fulfillmentDate}
          window={cart.fulfillmentWindow}
          onChange={(details) => void state.updateDetails(details).catch(fail)}
        />
      ) : null}

      {needsAddress ? (
        <section className="sk-section">
          <h3 className="sk-heading">{t.shippingAddress}</h3>
          <AddressFields
            prefix="shipping"
            value={shipping}
            onChange={changeShipping}
            countries={countries}
            lookup={cart.addressLookup && props.addressSuggestions !== false}
            // shipping options depend on the country
            onCountryChange={(country) =>
              void state
                .updateDetails({ shippingAddress: { ...shipping, country } })
                .catch(fail)
            }
          />
          {addressCheck ? (
            <div className="sk-notice sk-address-check" role="alert">
              <p>
                {addressCheck.address
                  ? addressCheck.status === 'invalid'
                    ? `${t.addressNotFound} ${t.addressSuggestion}`
                    : t.addressSuggestion
                  : t.addressNotFound}
              </p>
              {addressCheck.address ? (
                <p className="sk-address-suggestion">
                  {addressCheck.address.line1}
                  <br />
                  {addressCheck.address.postalCode} {addressCheck.address.city}
                </p>
              ) : null}
              <div className="sk-inline">
                {addressCheck.address ? (
                  <button
                    type="button"
                    className="sk-button sk-button-primary"
                    onClick={() => {
                      const suggestion = {
                        ...shipping,
                        line1: addressCheck.address!.line1,
                        postalCode: addressCheck.address!.postalCode,
                        city: addressCheck.address!.city,
                      };

                      setShipping(suggestion);
                      setKeptAddress(JSON.stringify(suggestion));
                      setAddressCheck(null);
                    }}
                  >
                    {t.useSuggestion}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="sk-button"
                  onClick={() => {
                    setKeptAddress(JSON.stringify(shipping));
                    setAddressCheck(null);
                  }}
                >
                  {t.keepAddress}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="sk-section">
        {needsAddress ? (
          <label className="sk-check">
            <input
              type="checkbox"
              checked={sameBilling}
              onChange={(event) => setSameBilling(event.target.checked)}
            />
            <span>{t.sameAsShipping}</span>
          </label>
        ) : null}
        {!needsAddress && method !== 'invoice' ? (
          // pickup paid online: the name for the pickup, the receipt is
          // in the bag – an address only when the customer needs an invoice
          <>
            {withAddress ? null : (
              <label className="sk-field">
                <span>{t.name}</span>
                <input
                  className="sk-input"
                  name="billing-name"
                  required
                  autoComplete="name"
                  value={billing.name}
                  onChange={(event) =>
                    setBilling({ ...billing, name: event.target.value })
                  }
                />
              </label>
            )}
            <label className="sk-check">
              <input
                type="checkbox"
                checked={withAddress}
                onChange={(event) => setWithAddress(event.target.checked)}
              />
              <span>{t.invoiceAddress}</span>
            </label>
          </>
        ) : null}
        {showBillingFields ? (
          <>
            <h3 className="sk-heading">{t.billingAddress}</h3>
            <AddressFields
              prefix="billing"
              value={billing}
              onChange={(address) => {
                setBilling(address);
                if (!needsAddress) setSameBilling(false);
              }}
              countries={countries}
            />
          </>
        ) : null}
      </section>

      {amountDue > 0 ? (
        <section className="sk-section">
          <h3 className="sk-heading">{t.payment}</h3>
          <div className="sk-options">
            {cart.paymentMethods.map((option) => (
              <label key={option} className="sk-option">
                <input
                  type="radio"
                  name="sk-payment"
                  checked={method === option}
                  onChange={() => setMethod(option)}
                />
                <span className="sk-option-main">
                  <span>{option === 'online' ? t.online : t.invoice}</span>
                  <span className="sk-muted">
                    {option === 'online'
                      ? t.onlineDescription
                      : interpolate(t.invoiceDescription, {
                          days: cart.invoiceDueDays,
                        })}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sk-section">
        <h3 className="sk-heading">{t.giftCard}</h3>
        {giftCards.map((card) => (
          <span key={card.code} className="sk-chip">
            {card.code} ·{' '}
            {interpolate(t.giftCardBalance, {
              amount: money(card.balance, cart.currency),
            })}
            <button
              type="button"
              aria-label={m.ui.cart.remove}
              onClick={() =>
                setGiftCards(giftCards.filter((other) => other !== card))
              }
            >
              ×
            </button>
          </span>
        ))}
        <div className="sk-inline">
          <input
            className="sk-input"
            placeholder={t.giftCardPlaceholder}
            aria-label={t.giftCard}
            value={giftCode}
            onChange={(event) => setGiftCode(event.target.value)}
          />
          <button
            type="button"
            className="sk-button"
            onClick={() => void addGiftCard()}
          >
            {m.ui.cart.apply}
          </button>
        </div>
      </section>

      <section className="sk-section">
        <label className="sk-field">
          <span>{t.note}</span>
          <textarea
            className="sk-input"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </section>

      <Totals
        totals={cart.totals}
        currency={cart.currency}
        requiresShipping={cart.requiresShipping}
        shippingPending={cart.requiresShipping && !selectedRate}
        giftCardTotal={giftCardTotal}
        amountDue={amountDue}
      />

      {props.terms ? <div className="sk-muted">{props.terms}</div> : null}

      {error ? (
        <p className="sk-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sk-actions">
        {props.cartHref ? (
          <a className="sk-button sk-button-ghost" href={props.cartHref}>
            {t.back}
          </a>
        ) : null}
        <button
          type="submit"
          className="sk-button sk-button-primary"
          disabled={
            busy ||
            (cart.requiresShipping && !selectedRate) ||
            cart.missing.includes('fulfillment_date')
          }
        >
          {amountDue > 0 && method === 'online' ? t.payNow : t.placeOrder}
        </button>
      </div>
    </form>
  );
}

/** Day (and time window) of a shipping option with a `schedule`. */
function FulfillmentDateFields(props: {
  schedule: NonNullable<ShippingOption['schedule']>;
  pickup: boolean;
  date: string | null;
  window: string | null;
  onChange: (details: {
    fulfillmentDate?: string | null;
    fulfillmentWindow?: string | null;
  }) => void;
}) {
  const { m, locale } = useShop();
  const t = m.ui.checkout;
  const { dates, timeWindows } = props.schedule;
  const label = props.pickup ? t.pickupDate : t.deliveryDate;
  const date = props.date && dates.includes(props.date) ? props.date : '';

  return (
    <section className="sk-section">
      <h3 className="sk-heading">{label}</h3>
      {dates.length === 0 ? (
        <p className="sk-error">{t.noDates}</p>
      ) : (
        <label className="sk-field">
          <select
            className="sk-input"
            aria-label={label}
            required={props.schedule.required}
            value={date}
            onChange={(event) =>
              props.onChange({
                fulfillmentDate: event.target.value || null,
                // a single window needs no choice
                ...(timeWindows.length === 1 && event.target.value
                  ? { fulfillmentWindow: timeWindows[0] }
                  : {}),
              })
            }
          >
            <option value="">{t.chooseDate}</option>
            {dates.map((day) => (
              <option key={day} value={day}>
                {formatFulfillmentDate(day, null, locale)}
              </option>
            ))}
          </select>
        </label>
      )}
      {date &&
      (timeWindows.length > 1 ||
        (timeWindows.length === 1 && props.window !== timeWindows[0])) ? (
        <div className="sk-options" role="radiogroup" aria-label={t.timeWindow}>
          {timeWindows.map((window) => (
            <label key={window} className="sk-option">
              <input
                type="radio"
                name="sk-window"
                checked={props.window === window}
                onChange={() => props.onChange({ fulfillmentWindow: window })}
              />
              <span className="sk-option-main">
                <span>{window}</span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------ Orders

function StatusBadge(props: { order: OrderDto }) {
  const { m } = useShop();
  const { order } = props;
  const label =
    order.status !== 'confirmed'
      ? m.ui.orderStatus[order.status]
      : order.paymentStatus !== 'paid'
        ? m.ui.paymentStatus[order.paymentStatus]
        : m.ui.fulfillmentStatus[order.fulfillmentStatus];
  const tone =
    order.status === 'canceled' || order.status === 'expired'
      ? 'neutral'
      : order.paymentStatus === 'unpaid'
        ? 'warning'
        : 'success';

  return <span className={`sk-badge sk-badge-${tone}`}>{label}</span>;
}

export type OrderStatusProps = {
  orderId: string;
  /** Access token from the order link (guests). */
  token?: string | null;
  className?: string;
};

/**
 * Thank-you / order page. Back from the payment page (`?checkout=success`)
 * it waits for the payment confirmation.
 */
export function OrderStatus(props: OrderStatusProps) {
  const { client, m, money, errorText, locale, navigate } = useShop();
  const [checkoutState, setCheckoutState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCheckoutState(
      new URLSearchParams(window.location.search).get('checkout'),
    );
  }, []);

  const { order, error: loadError } = useOrder(client, props.orderId, {
    token: props.token,
    awaitPayment: checkoutState === 'success',
  });
  const t = m.ui.order;

  if (!order) {
    return (
      <div className={cx('sk-root', props.className)}>
        {loadError ? (
          <p className="sk-error">{errorText(loadError)}</p>
        ) : (
          m.ui.loading
        )}
      </div>
    );
  }

  const pay = async () => {
    setError(null);

    try {
      const { url } = await client.payOrder(order.id, props.token);

      navigate(url);
    } catch (cause) {
      setError(errorText(cause));
    }
  };

  return (
    <div className={cx('sk-root sk-order', props.className)}>
      <div className="sk-card-header">
        <h2 className="sk-title">
          {interpolate(t.title, { number: order.number })}
        </h2>
        <StatusBadge order={order} />
      </div>

      {order.status === 'confirmed' ? <p>{t.thanks}</p> : null}
      {order.status === 'pending' && checkoutState === 'success' ? (
        <p className="sk-notice">{t.pendingPayment}</p>
      ) : null}
      {order.status === 'pending' &&
      (checkoutState === 'cancel' || checkoutState === 'failed') ? (
        <p className="sk-notice">{t.paymentCanceled}</p>
      ) : null}
      {order.paymentMethod === 'invoice' &&
      order.paymentStatus === 'unpaid' &&
      order.dueAt ? (
        <p className="sk-notice">
          {interpolate(t.invoiceNote, {
            date: formatDate(order.dueAt, locale),
          })}
        </p>
      ) : null}

      <p className="sk-muted">
        {interpolate(t.placedOn, { date: formatDate(order.createdAt, locale) })}
      </p>
      {order.fulfillmentDate ? (
        <p>
          {interpolate(order.shipping?.pickup ? t.pickupOn : t.deliveryOn, {
            date: formatFulfillmentDate(
              order.fulfillmentDate,
              order.fulfillmentWindow,
              locale,
            ),
          })}
        </p>
      ) : null}

      <ul className="sk-lines">
        {order.lines.map((line) => (
          <li key={line.sku} className="sk-line">
            <div className="sk-line-main">
              <div className="sk-line-name">
                {line.quantity} × {line.productName}
              </div>
              {line.variantName ? (
                <div className="sk-muted">{line.variantName}</div>
              ) : null}
            </div>
            <div className="sk-line-total">
              {money(line.total, order.currency)}
            </div>
          </li>
        ))}
      </ul>

      <Totals
        totals={order.totals}
        currency={order.currency}
        requiresShipping={order.shipping !== null}
        giftCardTotal={order.giftCardTotal}
        amountDue={order.amountDue}
      />

      {error ? (
        <p className="sk-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sk-actions">
        {order.trackingUrl ? (
          <a
            className="sk-button"
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t.tracking}
          </a>
        ) : null}
        <a
          className="sk-button"
          href={order.receiptUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t.receipt}
        </a>
        {order.payable ? (
          <button
            type="button"
            className="sk-button sk-button-primary"
            onClick={() => void pay()}
          >
            {m.ui.checkout.payNow}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type OrderHistoryProps = {
  /** Order page of the signed-in customer. */
  orderHref?: (orderId: string) => string;
  className?: string;
};

/** The signed-in customer's orders. */
export function OrderHistory(props: OrderHistoryProps) {
  const { client, m, money, errorText, locale } = useShop();
  const { orders, error } = useOrders(client);
  const t = m.ui.order;

  if (!orders) {
    return (
      <div className={cx('sk-root', props.className)}>
        {error ? <p className="sk-error">{errorText(error)}</p> : m.ui.loading}
      </div>
    );
  }

  return (
    <div className={cx('sk-root', props.className)}>
      <h2 className="sk-title">{t.history}</h2>
      {orders.length === 0 ? (
        <p className="sk-muted">{t.noOrders}</p>
      ) : (
        <ul className="sk-lines">
          {orders.map((order) => (
            <li key={order.id} className="sk-line">
              <div className="sk-line-main">
                <div className="sk-line-name">
                  {props.orderHref ? (
                    <a href={props.orderHref(order.id)}>{order.number}</a>
                  ) : (
                    order.number
                  )}
                </div>
                <div className="sk-muted">
                  {formatDate(order.createdAt, locale)} ·{' '}
                  {interpolate(t.items, {
                    count: order.lines.reduce(
                      (acc, line) => acc + line.quantity,
                      0,
                    ),
                  })}
                </div>
              </div>
              <StatusBadge order={order} />
              <div className="sk-line-total">
                {money(order.totals.total, order.currency)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
