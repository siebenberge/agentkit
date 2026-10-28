import type { StorageAdapter, Where } from './adapter';
import { type BankPayment, mentionsNumber, normalizeReference } from './camt';
import {
  defaultOrderNumber,
  generateGiftCardCode,
  generateToken,
  normalizeDiscountCode,
  normalizeGiftCardCode,
} from './codes';
import { ShopError, errorCode } from './errors';
import { getMessages, interpolate, resolveLocale } from './i18n';
import {
  type PricingLineInput,
  type PricingResult,
  type TaxSettings,
  priceOrder,
  shippingAmount,
  shipsTo,
} from './pricing';
import type { PaymentProvider, ProviderEvent } from './provider';
import type {
  Address,
  AppliedGiftCard,
  Cart,
  CartItem,
  Discount,
  DiscountType,
  FulfillmentSchedule,
  GiftCard,
  Locale,
  ModelMap,
  Order,
  OrderPaymentMethod,
  OrderRefund,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductKind,
  ProductStatus,
  ProductTranslations,
  ShippingRate,
  ShopEvent,
  Variant,
  Weekday,
} from './types';

export type Logger = {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
};

/** Answer of an app-supplied rate limit. */
export type RateLimitDecision = {
  allowed: boolean;
  /** Sent as `Retry-After` when the request is refused. */
  retryAfterSeconds?: number;
};

/** `Retry-After` of a 429 response (none when unknown). */
export function retryAfterHeader(
  seconds: number | undefined,
): Record<string, string> {
  return seconds && seconds > 0
    ? { 'retry-after': String(Math.ceil(seconds)) }
    : {};
}

/** Payment methods the customer chooses from (`none` is automatic). */
export type CheckoutPaymentMethod = Exclude<OrderPaymentMethod, 'none'>;

export type InvoiceEligibility = {
  cart: Cart;
  total: number;
  /** Signed-in customer (`null` → guest). */
  customerExternalId: string | null;
};

export type ShopOptions = {
  database: StorageAdapter;
  /** Online payments (TWINT, card); without one only invoice is offered. */
  provider?: PaymentProvider | null;
  /** Currency of all prices (default `CHF`). */
  currency?: string;
  tax?: TaxSettings;
  /** Round totals to 5 Rappen like cash (default `false`). */
  roundToFiveRappen?: boolean;
  shipping?: { rates: ShippingRate[] };
  /** Offered payment methods (default: `online` with a provider, plus `invoice`). */
  paymentMethods?: CheckoutPaymentMethod[];
  invoice?: {
    /** Payment term (default 30 days). */
    dueDays?: number;
    /** Reminders after the due date (default [10, 20] days). */
    reminderDays?: number[];
    /**
     * Who may buy on invoice (e.g. signed-in customers up to CHF 500).
     * Default: everyone.
     */
    allow?: (context: InvoiceEligibility) => boolean | Promise<boolean>;
  };
  checkout?: {
    /** Unpaid online orders release their stock after this many hours (default 24). */
    expiresInHours?: number;
  };
  cart?: {
    /** Guest carts are abandoned after this many days (default 30). */
    expiresInDays?: number;
    /** Most units of one variant in a cart (default 99). */
    maxQuantity?: number;
    /** Most different variants in a cart (default 100). */
    maxItems?: number;
  };
  /** `stock.low` fires when tracked stock falls to this (default 3). */
  lowStockThreshold?: number;
  /**
   * Further limits the pickup / delivery days of rates with a `schedule`,
   * e.g. to the days the products of the cart are made
   * (`hssoft.allowFulfillmentDate` of `/hssoft`). Called per day offered;
   * cache what you look up.
   */
  allowFulfillmentDate?: (
    context: FulfillmentDateContext,
  ) => boolean | Promise<boolean>;
  giftCards?: {
    /** Validity of issued gift cards in days (default: no expiry). */
    validityDays?: number | null;
  };
  orders?: {
    /** Order number (default `YYMMDD-XXXXX`). Use a DB sequence for gapless numbers. */
    generateNumber?: (ctx: {
      now: Date;
      orderId: string;
    }) => string | Promise<string>;
  };
  /** Called after state changes were persisted. Errors are logged, not thrown. */
  onEvent?: (event: ShopEvent) => void | Promise<void>;
  logger?: Logger;
  now?: () => Date;
  generateId?: () => string;
};

export type RedirectUrls = {
  successUrl: string;
  cancelUrl: string;
  /** Defaults to `cancelUrl`. */
  failedUrl?: string;
};

/** Redirect URLs, or a function of the order (its id is new at checkout). */
export type OrderRedirectUrls =
  RedirectUrls | ((order: Order) => RedirectUrls | Promise<RedirectUrls>);

export type VariantInput = {
  sku: string;
  name?: string;
  options?: Record<string, string>;
  price: number;
  compareAtPrice?: number | null;
  weightGrams?: number;
  trackStock?: boolean;
  stock?: number;
  allowBackorder?: boolean;
  status?: Variant['status'];
  sortOrder?: number;
};

export type ProductInput = {
  slug: string;
  name: string;
  description?: string | null;
  kind?: ProductKind;
  status?: ProductStatus;
  taxRateBps?: number | null;
  images?: string[];
  translations?: ProductTranslations;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type DiscountInput = {
  code: string;
  type: DiscountType;
  value?: number;
  minSubtotal?: number | null;
  productIds?: string[] | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  active?: boolean;
};

export type ProductWithVariants = Product & { variants: Variant[] };

export type CartLineIssue = 'NOT_FOR_SALE' | 'OUT_OF_STOCK';

export type CartLineView = {
  variantId: string;
  productId: string;
  slug: string;
  kind: ProductKind;
  productName: string;
  variantName: string;
  sku: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  compareAtPrice: number | null;
  subtotal: number;
  discount: number;
  total: number;
  taxRateBps: number;
  /** Units for sale (`null` → unlimited). */
  available: number | null;
  issue: CartLineIssue | null;
};

export type FulfillmentDateContext = {
  /** `YYYY-MM-DD`. */
  date: string;
  weekday: Weekday;
  rate: ShippingRate;
  /** Products of the cart (gift cards and digital products included). */
  products: Product[];
  /** The cart's lines with product and variant. */
  lines: { product: Product; variant: Variant; quantity: number }[];
};

export type ShippingOption = {
  id: string;
  name: string;
  description: string | null;
  pickup: boolean;
  amount: number;
  /** Days (`YYYY-MM-DD`) and time windows to choose from (rates with a `schedule`). */
  schedule: {
    dates: string[];
    timeWindows: string[];
    required: boolean;
  } | null;
};

export type CartRequirement =
  | 'items'
  | 'email'
  | 'shipping_address'
  | 'shipping_rate'
  /** Missing, or no longer offered (past the cutoff, closed day). */
  | 'fulfillment_date';

export type CartSummary = {
  cart: Cart;
  currency: string;
  lines: CartLineView[];
  pricing: PricingResult;
  shippingOptions: ShippingOption[];
  paymentMethods: CheckoutPaymentMethod[];
  /** What is still missing before `checkout` can succeed. */
  missing: CartRequirement[];
};

export type CheckoutResult =
  | { type: 'redirect'; url: string; order: Order }
  | { type: 'placed'; order: Order };

/** What `reconcileBankPayments()` did with each payment of a bank file. */
export type BankReconciliation = {
  /** Marked paid now; `overpaidBy` > 0 → refund the difference. */
  paid: { payment: BankPayment; order: Order; overpaidBy: number }[];
  /** The order was paid before (paid twice, or the file imported again). */
  alreadyPaid: { payment: BankPayment; order: Order }[];
  /** Less than the amount due: not marked paid – book it by hand. */
  underpaid: { payment: BankPayment; order: Order; missing: number }[];
  unmatched: {
    payment: BankPayment;
    reason: 'no_reference' | 'unknown_reference' | 'currency';
  }[];
};

export type RunDueSummary = {
  expiredOrders: number;
  reminders: number;
  abandonedCarts: number;
  /** A batch hit `limit` – more work is waiting, run again sooner. */
  saturated: boolean;
};

export type OrderQuery = {
  customerExternalId?: string;
  email?: string;
  number?: string;
  status?: OrderStatus | OrderStatus[];
  paymentStatus?: PaymentStatus | PaymentStatus[];
  fulfillmentStatus?: Order['fulfillmentStatus'] | Order['fulfillmentStatus'][];
  /** Only orders created at or after this time. */
  createdAfter?: Date;
  /** Pickup / delivery day (`YYYY-MM-DD`). */
  fulfillmentDate?: string;
  limit?: number;
  offset?: number;
};

const ORDER_PREFIX = 'so_';

/** `so_<orderId>_<attempt>` → orderId (ids may contain `_`). */
function orderIdFromReference(referenceId: string) {
  if (!referenceId.startsWith(ORDER_PREFIX)) return '';

  const rest = referenceId.slice(ORDER_PREFIX.length);
  const end = rest.lastIndexOf('_');

  return end > 0 ? rest.slice(0, end) : '';
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const CAS_ATTEMPTS = 10;

type Pending = ShopEvent[];

export function createShop(options: ShopOptions) {
  const db = options.database;
  const provider = options.provider ?? null;
  const currency = (options.currency ?? 'CHF').toUpperCase();
  const tax: TaxSettings = {
    inclusive: options.tax?.inclusive !== false,
    defaultRateBps: options.tax?.defaultRateBps ?? 810,
  };
  const rates = options.shipping?.rates ?? [];
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const dueDays = options.invoice?.dueDays ?? 30;
  const reminderDays = options.invoice?.reminderDays ?? [10, 20];
  const checkoutHours = options.checkout?.expiresInHours ?? 24;
  const cartDays = options.cart?.expiresInDays ?? 30;
  const maxQuantity = options.cart?.maxQuantity ?? 99;
  const maxItems = options.cart?.maxItems ?? 100;
  const lowStock = options.lowStockThreshold ?? 3;
  const giftCardDays = options.giftCards?.validityDays ?? null;
  const logger: Logger = options.logger ?? {
    info: () => undefined,
    error: (obj, msg) => console.error(msg, obj),
  };

  if (!db.transaction) {
    // stock, discount usage, gift cards and the order are written together
    throw new Error('shopkit needs a database adapter with transaction()');
  }

  const rateIds = new Set<string>();

  for (const rate of rates) {
    if (rateIds.has(rate.id)) {
      throw new Error(`shipping rate "${rate.id}" is defined twice`);
    }
    rateIds.add(rate.id);
    if (rate.schedule) checkSchedule(rate.id, rate.schedule);
  }

  const configuredMethods: CheckoutPaymentMethod[] = (
    options.paymentMethods ?? ['online', 'invoice']
  ).filter((method) => method !== 'online' || provider !== null);

  const generateNumber =
    options.orders?.generateNumber ??
    (({ now: date }: { now: Date }) => defaultOrderNumber(date));

  // ------------------------------------------------------------ helpers

  function transaction<R>(fn: (d: StorageAdapter) => Promise<R>) {
    return db.transaction!(fn);
  }

  async function emit(events: Pending) {
    if (!options.onEvent) return;

    for (const event of events) {
      try {
        await options.onEvent(event);
      } catch (error) {
        logger.error({ error, type: event.type }, 'shop: onEvent failed');
      }
    }
  }

  function invalid(message: string): never {
    throw new ShopError('INVALID_INPUT', message);
  }

  function checkAmount(value: number, name: string) {
    if (!Number.isSafeInteger(value) || value < 0) {
      invalid(`${name} must be a non-negative integer (minor units)`);
    }
  }

  function checkRate(value: number | null | undefined) {
    if (value === null || value === undefined) return;
    if (!Number.isInteger(value) || value < 0 || value > 10_000) {
      invalid('taxRateBps must be an integer between 0 and 10000');
    }
  }

  /** Create that maps a unique violation to `DUPLICATE`. */
  async function insert<M extends keyof ModelMap>(
    d: StorageAdapter,
    model: M,
    data: ModelMap[M],
    what: string,
  ) {
    try {
      return await d.create(model, data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ShopError('DUPLICATE', `${what} already exists`);
      }

      throw error;
    }
  }

  function rateOf(product: Product) {
    return product.kind === 'gift_card'
      ? 0
      : (product.taxRateBps ?? tax.defaultRateBps ?? 810);
  }

  function localizedName(product: Product, locale: Locale) {
    return product.translations[locale]?.name ?? product.name;
  }

  function rateName(rate: ShippingRate, locale: Locale) {
    return rate.translations?.[locale] ?? rate.name;
  }

  function isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
  }

  function cleanAddress(address: Address | null | undefined): Address | null {
    if (!address) return null;

    const field = (value: unknown, max: number) =>
      typeof value === 'string' && value.trim()
        ? value.trim().slice(0, max)
        : null;

    return {
      name: field(address.name, 70) ?? '',
      company: field(address.company, 70),
      line1: field(address.line1, 70) ?? '',
      line2: field(address.line2, 70),
      postalCode: field(address.postalCode, 16) ?? '',
      city: field(address.city, 35) ?? '',
      country: (field(address.country, 2) ?? 'CH').toUpperCase(),
      phone: field(address.phone, 30),
    };
  }

  function addressComplete(address: Address | null) {
    return Boolean(
      address?.name &&
      address.line1 &&
      address.postalCode &&
      address.city &&
      address.country,
    );
  }

  function inList<T>(value: T | T[] | undefined) {
    return value === undefined
      ? undefined
      : Array.isArray(value)
        ? value
        : [value];
  }

  // ------------------------------------------------------------ catalog

  async function createProduct(
    input: ProductInput & { variants?: VariantInput[] },
  ): Promise<ProductWithVariants> {
    const slug = input.slug.trim().toLowerCase();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
      invalid('slug must be lower case letters, digits and dashes');
    }
    if (!input.name.trim()) invalid('name is required');
    checkRate(input.taxRateBps);

    const date = now();
    const product: Product = {
      id: generateId(),
      slug,
      name: input.name.trim(),
      description: input.description ?? null,
      kind: input.kind ?? 'physical',
      status: input.status ?? 'active',
      taxRateBps: input.taxRateBps ?? null,
      images: input.images ?? [],
      translations: input.translations ?? {},
      sortOrder: input.sortOrder ?? 0,
      metadata: input.metadata ?? {},
      createdAt: date,
      updatedAt: date,
    };

    return transaction(async (d) => {
      await insert(d, 'product', product, `Product "${slug}"`);

      const variants: Variant[] = [];

      for (const variant of input.variants ?? []) {
        variants.push(await insertVariant(d, product, variant));
      }

      return { ...product, variants };
    });
  }

  async function insertVariant(
    d: StorageAdapter,
    product: Product,
    input: VariantInput,
  ) {
    const sku = input.sku.trim();

    if (!sku || sku.length > 64) invalid('sku is required (max. 64)');
    checkAmount(input.price, 'price');
    if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
      checkAmount(input.compareAtPrice, 'compareAtPrice');
    }
    if (input.stock !== undefined && !Number.isSafeInteger(input.stock)) {
      invalid('stock must be an integer');
    }

    const date = now();
    const variant: Variant = {
      id: generateId(),
      productId: product.id,
      sku,
      name: input.name?.trim() ?? '',
      options: input.options ?? {},
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      weightGrams: input.weightGrams ?? 0,
      // digital goods and gift cards are not counted by default
      trackStock: input.trackStock ?? product.kind === 'physical',
      stock: input.stock ?? 0,
      allowBackorder: input.allowBackorder ?? false,
      status: input.status ?? 'active',
      sortOrder: input.sortOrder ?? 0,
      createdAt: date,
      updatedAt: date,
    };

    return insert(d, 'variant', variant, `SKU "${sku}"`);
  }

  async function createVariant(productId: string, input: VariantInput) {
    const product = await db.findOne('product', [
      { field: 'id', value: productId },
    ]);

    if (!product) throw new ShopError('PRODUCT_NOT_FOUND', 'Unknown product');

    return insertVariant(db, product, input);
  }

  async function updateProduct(
    productId: string,
    patch: Partial<Omit<ProductInput, 'slug'>> & { slug?: string },
  ) {
    checkRate(patch.taxRateBps);

    const fields: Partial<Product> = { updatedAt: now() };

    if (patch.slug !== undefined) {
      const slug = patch.slug.trim().toLowerCase();

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) invalid('invalid slug');
      fields.slug = slug;
    }
    if (patch.name !== undefined) fields.name = patch.name.trim();
    if (patch.description !== undefined) fields.description = patch.description;
    if (patch.kind !== undefined) fields.kind = patch.kind;
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.taxRateBps !== undefined) fields.taxRateBps = patch.taxRateBps;
    if (patch.images !== undefined) fields.images = patch.images;
    if (patch.translations !== undefined)
      fields.translations = patch.translations;
    if (patch.sortOrder !== undefined) fields.sortOrder = patch.sortOrder;
    if (patch.metadata !== undefined) fields.metadata = patch.metadata;

    if (fields.slug) {
      const other = await db.findOne('product', [
        { field: 'slug', value: fields.slug },
        { field: 'id', operator: 'ne', value: productId },
      ]);

      if (other)
        throw new ShopError(
          'DUPLICATE',
          `Product "${fields.slug}" already exists`,
        );
    }

    const product = await db.update(
      'product',
      [{ field: 'id', value: productId }],
      fields,
    );

    if (!product) throw new ShopError('PRODUCT_NOT_FOUND', 'Unknown product');

    return product;
  }

  /** Changes everything but the stock (`adjustStock` / `setStock`). */
  async function updateVariant(
    variantId: string,
    patch: Partial<Omit<VariantInput, 'stock'>>,
  ) {
    const fields: Partial<Variant> = { updatedAt: now() };

    if (patch.sku !== undefined) {
      const sku = patch.sku.trim();
      const other = await db.findOne('variant', [
        { field: 'sku', value: sku },
        { field: 'id', operator: 'ne', value: variantId },
      ]);

      if (other)
        throw new ShopError('DUPLICATE', `SKU "${sku}" already exists`);
      fields.sku = sku;
    }
    if (patch.price !== undefined) {
      checkAmount(patch.price, 'price');
      fields.price = patch.price;
    }
    if (patch.compareAtPrice !== undefined) {
      if (patch.compareAtPrice !== null)
        checkAmount(patch.compareAtPrice, 'compareAtPrice');
      fields.compareAtPrice = patch.compareAtPrice;
    }
    if (patch.name !== undefined) fields.name = patch.name.trim();
    if (patch.options !== undefined) fields.options = patch.options;
    if (patch.weightGrams !== undefined) fields.weightGrams = patch.weightGrams;
    if (patch.trackStock !== undefined) fields.trackStock = patch.trackStock;
    if (patch.allowBackorder !== undefined)
      fields.allowBackorder = patch.allowBackorder;
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.sortOrder !== undefined) fields.sortOrder = patch.sortOrder;

    const variant = await db.update(
      'variant',
      [{ field: 'id', value: variantId }],
      fields,
    );

    if (!variant) throw new ShopError('VARIANT_NOT_FOUND', 'Unknown variant');

    return variant;
  }

  async function withVariants(products: Product[], includeArchived: boolean) {
    if (products.length === 0) return [];

    const variants = await db.findMany('variant', {
      where: [
        {
          field: 'productId',
          operator: 'in',
          value: products.map((p) => p.id),
        },
        ...(includeArchived
          ? []
          : [{ field: 'status' as const, value: 'active' as const }]),
      ],
      sortBy: { field: 'sortOrder', direction: 'asc' },
    });

    return products.map((product) => ({
      ...product,
      variants: variants.filter((variant) => variant.productId === product.id),
    }));
  }

  /** Products with their variants, ordered by `sortOrder`, then name. */
  async function listProducts(
    params: {
      status?: ProductStatus | ProductStatus[];
      includeArchivedVariants?: boolean;
    } = {},
  ): Promise<ProductWithVariants[]> {
    const statuses = inList(params.status);
    const products = await db.findMany('product', {
      where: statuses
        ? [{ field: 'status', operator: 'in', value: statuses }]
        : [],
      sortBy: { field: 'sortOrder', direction: 'asc' },
    });

    products.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );

    return withVariants(products, params.includeArchivedVariants ?? false);
  }

  /** By id or slug. */
  async function getProduct(
    idOrSlug: string,
    params: { includeArchivedVariants?: boolean } = {},
  ): Promise<ProductWithVariants | null> {
    const product =
      (await db.findOne('product', [
        { field: 'slug', value: idOrSlug.toLowerCase() },
      ])) ?? (await db.findOne('product', [{ field: 'id', value: idOrSlug }]));

    if (!product) return null;

    const [result] = await withVariants(
      [product],
      params.includeArchivedVariants ?? false,
    );

    return result ?? null;
  }

  /**
   * Adds `delta` to the stock with compare-and-set (no lost updates under
   * concurrency). Taking more than available fails with `OUT_OF_STOCK`
   * unless the variant allows backorders or `force` is set.
   */
  async function changeStock(
    d: StorageAdapter,
    variantId: string,
    delta: number,
    params: { force?: boolean } = {},
  ) {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const variant = await d.findOne('variant', [
        { field: 'id', value: variantId },
      ]);

      if (!variant) throw new ShopError('VARIANT_NOT_FOUND', 'Unknown variant');
      if (!variant.trackStock || delta === 0)
        return { variant, before: variant.stock };

      const next = variant.stock + delta;

      if (delta < 0 && next < 0 && !variant.allowBackorder && !params.force) {
        throw new ShopError(
          'OUT_OF_STOCK',
          `Only ${Math.max(0, variant.stock)} of ${variant.sku} left`,
        );
      }

      const updated = await d.update(
        'variant',
        [
          { field: 'id', value: variantId },
          { field: 'stock', value: variant.stock },
        ],
        { stock: next, updatedAt: now() },
      );

      if (updated) return { variant: updated, before: variant.stock };
    }

    throw new ShopError('BUSY', 'Stock is changing, try again');
  }

  async function lowStockEvents(
    d: StorageAdapter,
    changes: { variant: Variant; before: number }[],
  ): Promise<Pending> {
    const events: Pending = [];

    for (const { variant, before } of changes) {
      if (
        variant.trackStock &&
        before > lowStock &&
        variant.stock <= lowStock
      ) {
        const product = await d.findOne('product', [
          { field: 'id', value: variant.productId },
        ]);

        if (product) events.push({ type: 'stock.low', variant, product });
      }
    }

    return events;
  }

  /** Stock correction (inventory count, goods received: positive). */
  async function adjustStock(params: { variantId: string; delta: number }) {
    if (!Number.isSafeInteger(params.delta))
      invalid('delta must be an integer');

    const change = await changeStock(db, params.variantId, params.delta, {
      force: true,
    });

    await emit(await lowStockEvents(db, [change]));

    return change.variant;
  }

  async function setStock(params: { variantId: string; stock: number }) {
    if (!Number.isSafeInteger(params.stock))
      invalid('stock must be an integer');

    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const variant = await db.findOne('variant', [
        { field: 'id', value: params.variantId },
      ]);

      if (!variant) throw new ShopError('VARIANT_NOT_FOUND', 'Unknown variant');

      const change = await changeStock(
        db,
        params.variantId,
        params.stock - variant.stock,
        {
          force: true,
        },
      ).catch((error: unknown) => {
        if (errorCode(error) === 'BUSY') return null;
        throw error;
      });

      if (change?.variant.stock === params.stock) {
        await emit(await lowStockEvents(db, [change]));
        return change.variant;
      }
    }

    throw new ShopError('BUSY', 'Stock is changing, try again');
  }

  // ------------------------------------------------------------ discounts

  function checkDiscountInput(input: Partial<DiscountInput>) {
    if (input.type === 'percent' && (input.value ?? 0) > 10_000) {
      invalid('percent discounts are basis points (max. 10000)');
    }
    if (input.value !== undefined) checkAmount(input.value, 'value');
    if (input.minSubtotal !== undefined && input.minSubtotal !== null) {
      checkAmount(input.minSubtotal, 'minSubtotal');
    }
  }

  async function createDiscount(input: DiscountInput) {
    const code = normalizeDiscountCode(input.code);

    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
      invalid('code: 2–40 letters, digits, - or _');
    }
    checkDiscountInput(input);

    if ((input.type === 'percent' || input.type === 'fixed') && !input.value) {
      invalid('value is required');
    }

    const date = now();

    return insert(
      db,
      'discount',
      {
        id: generateId(),
        code,
        type: input.type,
        value: input.type === 'free_shipping' ? 0 : (input.value ?? 0),
        minSubtotal: input.minSubtotal ?? null,
        productIds: input.productIds ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        usageLimit: input.usageLimit ?? null,
        usageCount: 0,
        active: input.active ?? true,
        createdAt: date,
        updatedAt: date,
      },
      `Discount code "${code}"`,
    );
  }

  async function updateDiscount(
    discountId: string,
    patch: Partial<Omit<DiscountInput, 'code' | 'type'>>,
  ) {
    const current = await db.findOne('discount', [
      { field: 'id', value: discountId },
    ]);

    if (!current) throw new ShopError('DISCOUNT_INVALID', 'Unknown discount');

    checkDiscountInput({ ...patch, type: current.type });

    const fields: Partial<Discount> = { updatedAt: now() };

    if (patch.value !== undefined) fields.value = patch.value;
    if (patch.minSubtotal !== undefined) fields.minSubtotal = patch.minSubtotal;
    if (patch.productIds !== undefined) fields.productIds = patch.productIds;
    if (patch.startsAt !== undefined) fields.startsAt = patch.startsAt;
    if (patch.endsAt !== undefined) fields.endsAt = patch.endsAt;
    if (patch.usageLimit !== undefined) fields.usageLimit = patch.usageLimit;
    if (patch.active !== undefined) fields.active = patch.active;

    return (await db.update(
      'discount',
      [{ field: 'id', value: discountId }],
      fields,
    ))!;
  }

  function listDiscounts() {
    return db.findMany('discount', {
      sortBy: { field: 'createdAt', direction: 'desc' },
    });
  }

  /** The discount behind a code if it can be used right now. */
  async function usableDiscount(d: StorageAdapter, rawCode: string) {
    const discount = await d.findOne('discount', [
      { field: 'code', value: normalizeDiscountCode(rawCode) },
    ]);
    const date = now().getTime();

    if (
      !discount ||
      !discount.active ||
      (discount.startsAt && discount.startsAt.getTime() > date) ||
      (discount.endsAt && discount.endsAt.getTime() <= date) ||
      (discount.usageLimit !== null &&
        discount.usageCount >= discount.usageLimit)
    ) {
      return null;
    }

    return discount;
  }

  async function changeDiscountUsage(
    d: StorageAdapter,
    code: string,
    delta: 1 | -1,
  ) {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const discount = await d.findOne('discount', [
        { field: 'code', value: code },
      ]);

      if (!discount) return;

      if (
        delta > 0 &&
        discount.usageLimit !== null &&
        discount.usageCount >= discount.usageLimit
      ) {
        throw new ShopError('DISCOUNT_INVALID', `Code ${code} is used up`);
      }

      const updated = await d.update(
        'discount',
        [
          { field: 'id', value: discount.id },
          { field: 'usageCount', value: discount.usageCount },
        ],
        {
          usageCount: Math.max(0, discount.usageCount + delta),
          updatedAt: now(),
        },
      );

      if (updated) return;
    }

    throw new ShopError('BUSY', 'Discount is changing, try again');
  }

  // ------------------------------------------------------------ gift cards

  async function createGiftCard(
    d: StorageAdapter,
    input: {
      amount: number;
      id?: string;
      expiresAt?: Date | null;
      recipientEmail?: string | null;
      note?: string | null;
      orderId?: string | null;
    },
  ) {
    checkAmount(input.amount, 'amount');
    if (input.amount === 0) invalid('amount must be positive');

    const date = now();

    // deterministic id (order gift cards): issued already → nothing to do
    if (
      input.id &&
      (await d.findOne('giftCard', [{ field: 'id', value: input.id }]))
    ) {
      return null;
    }

    {
      const card: GiftCard = {
        id: input.id ?? generateId(),
        code: generateGiftCardCode(),
        currency,
        initialAmount: input.amount,
        balance: input.amount,
        status: 'active',
        expiresAt:
          input.expiresAt !== undefined
            ? input.expiresAt
            : giftCardDays
              ? new Date(date.getTime() + giftCardDays * DAY)
              : null,
        orderId: input.orderId ?? null,
        recipientEmail: input.recipientEmail ?? null,
        note: input.note ?? null,
        createdAt: date,
        updatedAt: date,
      };

      // a code collision (1 in 2^79) fails like any database error
      return d.create('giftCard', card);
    }
  }

  /** Gift card issued by hand (goodwill, sold at the counter). */
  async function issueGiftCard(input: {
    amount: number;
    expiresAt?: Date | null;
    recipientEmail?: string | null;
    note?: string | null;
  }) {
    const card = await createGiftCard(db, input);

    if (card)
      await emit([{ type: 'gift_card.issued', giftCard: card, order: null }]);

    return card!;
  }

  /** Balance check for customers (rate limit it: codes are secrets). */
  async function getGiftCardBalance(rawCode: string) {
    const card = await usableGiftCard(db, rawCode);

    return card
      ? {
          balance: card.balance,
          currency: card.currency,
          expiresAt: card.expiresAt,
        }
      : null;
  }

  async function usableGiftCard(d: StorageAdapter, rawCode: string) {
    const code = normalizeGiftCardCode(rawCode);

    if (code.length < 8) return null;

    const card = await d.findOne('giftCard', [{ field: 'code', value: code }]);

    if (
      card?.status !== 'active' ||
      card.currency !== currency ||
      card.balance <= 0 ||
      (card.expiresAt && card.expiresAt.getTime() <= now().getTime())
    ) {
      return null;
    }

    return card;
  }

  async function changeGiftCardBalance(
    d: StorageAdapter,
    giftCardId: string,
    delta: number,
  ) {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const card = await d.findOne('giftCard', [
        { field: 'id', value: giftCardId },
      ]);

      if (!card) throw new ShopError('GIFT_CARD_INVALID', 'Unknown gift card');

      const next = card.balance + delta;

      if (next < 0) throw new ShopError('GIFT_CARD_INVALID', 'Balance too low');

      const updated = await d.update(
        'giftCard',
        [
          { field: 'id', value: giftCardId },
          { field: 'balance', value: card.balance },
        ],
        { balance: next, updatedAt: now() },
      );

      if (updated) return updated;
    }

    throw new ShopError('BUSY', 'Gift card is changing, try again');
  }

  async function disableGiftCard(giftCardId: string) {
    const card = await db.update(
      'giftCard',
      [{ field: 'id', value: giftCardId }],
      { status: 'disabled', updatedAt: now() },
    );

    if (!card) throw new ShopError('GIFT_CARD_INVALID', 'Unknown gift card');

    return card;
  }

  function listGiftCards(
    params: { orderId?: string; limit?: number; offset?: number } = {},
  ) {
    return db.findMany('giftCard', {
      where: params.orderId
        ? [{ field: 'orderId', value: params.orderId }]
        : [],
      sortBy: { field: 'createdAt', direction: 'desc' },
      limit: params.limit,
      offset: params.offset,
    });
  }

  // ------------------------------------------------------------ carts

  async function createCart(
    params: { customerExternalId?: string | null; locale?: string | null } = {},
  ) {
    const date = now();

    return db.create('cart', {
      id: generateId(),
      token: generateToken(),
      customerExternalId: params.customerExternalId ?? null,
      status: 'active',
      items: [],
      discountCode: null,
      email: null,
      shippingAddress: null,
      billingAddress: null,
      shippingRateId: null,
      fulfillmentDate: null,
      fulfillmentWindow: null,
      note: null,
      locale: resolveLocale(params.locale),
      orderId: null,
      expiresAt: new Date(date.getTime() + cartDays * DAY),
      createdAt: date,
      updatedAt: date,
    });
  }

  function getCart(token: string) {
    if (!token) return Promise.resolve(null);

    return db.findOne('cart', [{ field: 'token', value: token }]);
  }

  /** The signed-in customer's open cart, if any. */
  async function findCustomerCart(customerExternalId: string) {
    const [cart] = await db.findMany('cart', {
      where: [
        { field: 'customerExternalId', value: customerExternalId },
        { field: 'status', value: 'active' },
      ],
      sortBy: { field: 'updatedAt', direction: 'desc' },
      limit: 1,
    });

    return cart ?? null;
  }

  /** Read-modify-write of an active cart with compare-and-set. */
  async function mutateCart(
    token: string,
    change: (cart: Cart) => Partial<Cart> | Promise<Partial<Cart>>,
  ) {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const cart = await getCart(token);

      if (!cart) throw new ShopError('CART_NOT_FOUND', 'Unknown cart');
      if (cart.status !== 'active')
        throw new ShopError('CART_CLOSED', 'Cart was checked out');

      const patch = await change(cart);
      const date = now();
      const updated = await db.update(
        'cart',
        [
          { field: 'id', value: cart.id },
          { field: 'status', value: 'active' },
          { field: 'updatedAt', value: cart.updatedAt },
        ],
        {
          ...patch,
          // a guest cart lives on while it is used
          expiresAt: new Date(date.getTime() + cartDays * DAY),
          updatedAt: new Date(
            Math.max(date.getTime(), cart.updatedAt.getTime() + 1),
          ),
        },
      );

      if (updated) return updated;
    }

    throw new ShopError('BUSY', 'Cart is changing, try again');
  }

  async function sellableVariant(variantId: string) {
    const variant = await db.findOne('variant', [
      { field: 'id', value: variantId },
    ]);

    if (!variant) throw new ShopError('VARIANT_NOT_FOUND', 'Unknown variant');

    const product = await db.findOne('product', [
      { field: 'id', value: variant.productId },
    ]);

    if (product?.status !== 'active' || variant.status !== 'active') {
      throw new ShopError('NOT_FOR_SALE', `${variant.sku} is not for sale`);
    }

    return variant;
  }

  function checkQuantity(quantity: number, allowZero: boolean) {
    if (
      !Number.isInteger(quantity) ||
      quantity < (allowZero ? 0 : 1) ||
      quantity > maxQuantity
    ) {
      throw new ShopError(
        'INVALID_QUANTITY',
        `Quantity must be 1–${maxQuantity}`,
      );
    }
  }

  function checkAvailable(variant: Variant, quantity: number) {
    if (
      variant.trackStock &&
      !variant.allowBackorder &&
      quantity > variant.stock
    ) {
      throw new ShopError(
        'OUT_OF_STOCK',
        `Only ${Math.max(0, variant.stock)} of ${variant.sku} left`,
      );
    }
  }

  async function addToCart(token: string, input: CartItem) {
    checkQuantity(input.quantity, false);

    const variant = await sellableVariant(input.variantId);

    return mutateCart(token, (cart) => {
      const existing = cart.items.find((item) => item.variantId === variant.id);
      const quantity = Math.min(
        maxQuantity,
        (existing?.quantity ?? 0) + input.quantity,
      );

      checkAvailable(variant, quantity);

      if (!existing && cart.items.length >= maxItems) {
        throw new ShopError('INVALID_QUANTITY', `At most ${maxItems} items`);
      }

      return {
        items: existing
          ? cart.items.map((item) =>
              item.variantId === variant.id ? { ...item, quantity } : item,
            )
          : [...cart.items, { variantId: variant.id, quantity }],
      };
    });
  }

  /** Sets the quantity of a variant; 0 removes it. */
  async function setCartQuantity(token: string, input: CartItem) {
    checkQuantity(input.quantity, true);

    if (input.quantity === 0) {
      return mutateCart(token, (cart) => ({
        items: cart.items.filter((item) => item.variantId !== input.variantId),
      }));
    }

    const variant = await sellableVariant(input.variantId);

    checkAvailable(variant, input.quantity);

    return mutateCart(token, (cart) => {
      const exists = cart.items.some((item) => item.variantId === variant.id);

      if (!exists && cart.items.length >= maxItems) {
        throw new ShopError('INVALID_QUANTITY', `At most ${maxItems} items`);
      }

      return {
        items: exists
          ? cart.items.map((item) =>
              item.variantId === variant.id
                ? { ...item, quantity: input.quantity }
                : item,
            )
          : [
              ...cart.items,
              { variantId: variant.id, quantity: input.quantity },
            ],
      };
    });
  }

  async function applyDiscountCode(token: string, rawCode: string) {
    const discount = await usableDiscount(db, rawCode);

    if (!discount)
      throw new ShopError('DISCOUNT_INVALID', 'Unknown or expired code');

    const cart = await getCart(token);

    if (!cart) throw new ShopError('CART_NOT_FOUND', 'Unknown cart');

    const { pricing } = await summarize({
      ...cart,
      discountCode: discount.code,
    });

    if (pricing.discount.status === 'not_applicable') {
      throw new ShopError(
        'DISCOUNT_NOT_APPLICABLE',
        pricing.discount.reason === 'minimum'
          ? `Code needs an order value of ${pricing.discount.minSubtotal}`
          : 'Code does not apply to these items',
      );
    }

    return mutateCart(token, () => ({ discountCode: discount.code }));
  }

  function removeDiscountCode(token: string) {
    return mutateCart(token, () => ({ discountCode: null }));
  }

  async function updateCartDetails(
    token: string,
    details: {
      email?: string | null;
      shippingAddress?: Address | null;
      billingAddress?: Address | null;
      shippingRateId?: string | null;
      /** `YYYY-MM-DD`, one of the `schedule.dates` of the shipping option. */
      fulfillmentDate?: string | null;
      /** One of its `schedule.timeWindows`. */
      fulfillmentWindow?: string | null;
      note?: string | null;
      locale?: string | null;
    },
  ) {
    const patch: Partial<Cart> = {};

    if (details.email !== undefined) {
      const email = details.email?.trim().toLowerCase() ?? null;

      if (email && !isEmail(email)) invalid('invalid email');
      patch.email = email ? email : null;
    }
    if (details.shippingAddress !== undefined) {
      patch.shippingAddress = cleanAddress(details.shippingAddress);
    }
    if (details.billingAddress !== undefined) {
      patch.billingAddress = cleanAddress(details.billingAddress);
    }
    if (details.shippingRateId !== undefined) {
      if (
        details.shippingRateId !== null &&
        !rateIds.has(details.shippingRateId)
      ) {
        throw new ShopError(
          'SHIPPING_RATE_UNAVAILABLE',
          'Unknown shipping rate',
        );
      }
      patch.shippingRateId = details.shippingRateId;
    }
    if (details.fulfillmentDate !== undefined) {
      if (details.fulfillmentDate !== null && !isDay(details.fulfillmentDate)) {
        invalid('fulfillmentDate must be a date YYYY-MM-DD');
      }
      patch.fulfillmentDate = details.fulfillmentDate;
    }
    if (details.fulfillmentWindow !== undefined) {
      const window = details.fulfillmentWindow?.trim().slice(0, 40);

      patch.fulfillmentWindow = window ? window : null;
    }
    if (details.note !== undefined) {
      const note = details.note?.trim().slice(0, 1000);

      patch.note = note ? note : null;
    }
    if (details.locale !== undefined && details.locale !== null) {
      patch.locale = resolveLocale(details.locale);
    }

    // a day the chosen rate does not offer is refused right away
    if (patch.fulfillmentDate || patch.fulfillmentWindow) {
      const cart = await getCart(token);

      if (!cart) throw new ShopError('CART_NOT_FOUND', 'Unknown cart');

      const next = { ...cart, ...patch };
      const { shippingOptions } = await summarize(next);
      const schedule = shippingOptions.find(
        (option) => option.id === next.shippingRateId,
      )?.schedule;
      const date = next.fulfillmentDate ?? null;
      const window = next.fulfillmentWindow ?? null;

      if (
        schedule &&
        ((date !== null && !schedule.dates.includes(date)) ||
          (window !== null && !schedule.timeWindows.includes(window)))
      ) {
        throw new ShopError(
          'FULFILLMENT_DATE_UNAVAILABLE',
          `${date ?? ''} ${window ?? ''}`.trim() + ' is not offered',
        );
      }
    }

    return mutateCart(token, () => patch);
  }

  /**
   * Hands a guest cart to the signed-in customer. An open cart they had
   * before is merged into it (quantities add up) and closed.
   */
  async function claimCart(token: string, customerExternalId: string) {
    const previous = await findCustomerCart(customerExternalId);

    if (previous && previous.token !== token) {
      const merged = await mutateCart(token, (cart) => {
        const items = [...cart.items];

        for (const item of previous.items) {
          const existing = items.find(
            (other) => other.variantId === item.variantId,
          );

          if (existing) {
            existing.quantity = Math.min(
              maxQuantity,
              existing.quantity + item.quantity,
            );
          } else if (items.length < maxItems) {
            items.push({ ...item });
          }
        }

        return {
          items,
          customerExternalId,
          email: cart.email ?? previous.email,
          shippingAddress: cart.shippingAddress ?? previous.shippingAddress,
          billingAddress: cart.billingAddress ?? previous.billingAddress,
          discountCode: cart.discountCode ?? previous.discountCode,
        };
      });

      await db.update(
        'cart',
        [
          { field: 'id', value: previous.id },
          { field: 'status', value: 'active' },
        ],
        { status: 'abandoned', updatedAt: now() },
      );

      return merged;
    }

    return mutateCart(token, () => ({ customerExternalId }));
  }

  /** Prices, availability, shipping options and what is missing. */
  async function getCartSummary(token: string) {
    const cart = await getCart(token);

    if (!cart) throw new ShopError('CART_NOT_FOUND', 'Unknown cart');

    return summarize(cart);
  }

  async function loadLines(
    d: StorageAdapter,
    items: CartItem[],
    locale: Locale,
  ) {
    if (items.length === 0) return [];

    const variants = await d.findMany('variant', {
      where: [
        {
          field: 'id',
          operator: 'in',
          value: items.map((item) => item.variantId),
        },
      ],
    });
    const products = variants.length
      ? await d.findMany('product', {
          where: [
            {
              field: 'id',
              operator: 'in',
              value: [...new Set(variants.map((variant) => variant.productId))],
            },
          ],
        })
      : [];

    return items.flatMap((item) => {
      const variant = variants.find(
        (candidate) => candidate.id === item.variantId,
      );
      const product = variant
        ? products.find((candidate) => candidate.id === variant.productId)
        : undefined;

      if (!variant || !product) return [];

      const forSale =
        product.status === 'active' && variant.status === 'active';
      const available =
        variant.trackStock && !variant.allowBackorder
          ? Math.max(0, variant.stock)
          : null;
      const issue: CartLineIssue | null = !forSale
        ? 'NOT_FOR_SALE'
        : available !== null && item.quantity > available
          ? 'OUT_OF_STOCK'
          : null;

      const input: PricingLineInput = {
        variantId: variant.id,
        productId: product.id,
        kind: product.kind,
        sku: variant.sku,
        productName: localizedName(product, locale),
        variantName: variant.name,
        quantity: item.quantity,
        unitPrice: variant.price,
        taxRateBps: rateOf(product),
        weightGrams: variant.weightGrams,
      };

      return [{ input, product, variant, available, issue }];
    });
  }

  /** Days (and time windows) a rate offers for these products from now on. */
  async function scheduleOf(
    rate: ShippingRate,
    lines: FulfillmentDateContext['lines'],
  ): Promise<ShippingOption['schedule']> {
    const schedule = rate.schedule;

    if (!schedule) return null;

    const date = now();
    let first = addDays(zurichDay(date), schedule.leadDays ?? 0);

    if (schedule.cutoff && zurichTime(date) >= schedule.cutoff) {
      first = addDays(first, 1);
    }

    const closed = new Set(schedule.closedDates ?? []);
    const dates: string[] = [];
    const products = [...new Set(lines.map((line) => line.product))];

    for (let offset = 0; offset < (schedule.maxDays ?? 14); offset++) {
      const day = addDays(first, offset);
      const weekday = weekdayOf(day);

      if (schedule.weekdays && !schedule.weekdays.includes(weekday)) continue;
      if (closed.has(day)) continue;
      if (
        options.allowFulfillmentDate &&
        !(await options.allowFulfillmentDate({
          date: day,
          weekday,
          rate,
          products,
          lines,
        }))
      ) {
        continue;
      }

      dates.push(day);
    }

    return {
      dates,
      timeWindows: schedule.timeWindows ?? [],
      required: schedule.required !== false,
    };
  }

  /** The chosen day / window does not fit the schedule (or is missing). */
  function fulfillmentInvalid(
    cart: Cart,
    schedule: NonNullable<ShippingOption['schedule']>,
  ) {
    const date = cart.fulfillmentDate ?? null;
    const window = cart.fulfillmentWindow ?? null;

    if (date === null) return schedule.required;
    if (!schedule.dates.includes(date)) return true;

    return (
      schedule.timeWindows.length > 0 &&
      (window === null || !schedule.timeWindows.includes(window))
    );
  }

  async function shippingOptionsFor(
    pricing: PricingResult,
    country: string | null,
    locale: Locale,
    lines: FulfillmentDateContext['lines'],
  ): Promise<ShippingOption[]> {
    if (!pricing.requiresShipping) return [];

    const goodsValue = pricing.lines.reduce(
      (acc, line) => acc + (line.kind === 'gift_card' ? 0 : line.total),
      0,
    );

    const offered: ShippingOption[] = [];

    for (const rate of rates) {
      if (!shipsTo(rate, country)) continue;

      const amount = shippingAmount(rate, pricing.weightGrams, goodsValue);

      if (amount === null) continue;

      offered.push({
        id: rate.id,
        name: rateName(rate, locale),
        description: rate.description ?? null,
        pickup: rate.pickup ?? false,
        amount,
        schedule: await scheduleOf(rate, lines),
      });
    }

    return offered;
  }

  async function paymentMethodsFor(
    cart: Cart,
    total: number,
    customerExternalId: string | null = cart.customerExternalId,
  ) {
    const methods: CheckoutPaymentMethod[] = [];

    for (const method of configuredMethods) {
      if (method === 'invoice' && options.invoice?.allow) {
        const allowed = await options.invoice.allow({
          cart,
          total,
          customerExternalId,
        });

        if (!allowed) continue;
      }

      methods.push(method);
    }

    return methods;
  }

  async function summarize(
    cart: Cart,
    d: StorageAdapter = db,
  ): Promise<CartSummary> {
    const loaded = await loadLines(d, cart.items, cart.locale);
    const priced = loaded.filter((line) => line.issue !== 'NOT_FOR_SALE');
    const discount = cart.discountCode
      ? await usableDiscount(d, cart.discountCode)
      : null;
    const country = cart.shippingAddress?.country ?? null;

    // shipping options depend on the weight and the discounted value
    const base = priceOrder({
      lines: priced.map((line) => line.input),
      discount,
      tax,
      roundToFiveRappen: options.roundToFiveRappen,
    });
    const shippingOptions = await shippingOptionsFor(
      base,
      country,
      cart.locale,
      loaded.map((line) => ({
        product: line.product,
        variant: line.variant,
        quantity: line.input.quantity,
      })),
    );
    const selected = shippingOptions.find(
      (option) => option.id === cart.shippingRateId,
    );
    const rate = selected
      ? rates.find((candidate) => candidate.id === selected.id)
      : null;
    const pricing = rate
      ? priceOrder({
          lines: priced.map((line) => line.input),
          discount,
          shippingRate: rate,
          tax,
          roundToFiveRappen: options.roundToFiveRappen,
        })
      : base;

    const lines: CartLineView[] = loaded.map((line) => {
      const priceLine = pricing.lines.find(
        (candidate) => candidate.variantId === line.variant.id,
      );

      return {
        variantId: line.variant.id,
        productId: line.product.id,
        slug: line.product.slug,
        kind: line.product.kind,
        productName: line.input.productName,
        variantName: line.variant.name,
        sku: line.variant.sku,
        image: line.product.images[0] ?? null,
        quantity: line.input.quantity,
        unitPrice: line.variant.price,
        compareAtPrice: line.variant.compareAtPrice,
        subtotal: priceLine?.subtotal ?? 0,
        discount: priceLine?.discount ?? 0,
        total: priceLine?.total ?? 0,
        taxRateBps: line.input.taxRateBps,
        available: line.available,
        issue: line.issue,
      };
    });

    const missing: CartRequirement[] = [];
    const pickup = rate?.pickup ?? false;

    if (priced.length === 0) missing.push('items');
    if (!cart.email) missing.push('email');
    if (pricing.requiresShipping && !rate) missing.push('shipping_rate');
    if (
      pricing.requiresShipping &&
      !pickup &&
      !addressComplete(cart.shippingAddress)
    ) {
      missing.push('shipping_address');
    }
    if (selected?.schedule && fulfillmentInvalid(cart, selected.schedule)) {
      missing.push('fulfillment_date');
    }

    return {
      cart,
      currency,
      lines,
      pricing,
      shippingOptions,
      paymentMethods: await paymentMethodsFor(cart, pricing.total),
      missing,
    };
  }

  // ------------------------------------------------------------ checkout

  /**
   * Turns the cart into an order: reserves the stock, uses the discount
   * code, takes the gift card balances – all or nothing. Online payment →
   * redirect to the provider; invoice or nothing left to pay → placed.
   */
  async function checkout(params: {
    token: string;
    paymentMethod: CheckoutPaymentMethod;
    giftCardCodes?: string[];
    /** Where the payment page returns to; a function gets the new order. */
    urls?: OrderRedirectUrls;
    /** Signed-in customer placing the order (overrides the cart's). */
    customerExternalId?: string | null;
  }): Promise<CheckoutResult> {
    const cart = await getCart(params.token);

    if (!cart) throw new ShopError('CART_NOT_FOUND', 'Unknown cart');
    if (cart.status !== 'active')
      throw new ShopError('CART_CLOSED', 'Cart was checked out');

    const summary = await summarize(cart);
    const { pricing } = summary;

    for (const line of summary.lines) {
      if (line.issue === 'NOT_FOR_SALE') {
        throw new ShopError('NOT_FOR_SALE', `${line.sku} is not for sale`);
      }
    }
    if (summary.missing.includes('items'))
      throw new ShopError('CART_EMPTY', 'Cart is empty');
    if (summary.missing.includes('email'))
      throw new ShopError('EMAIL_REQUIRED', 'Email missing');
    if (summary.missing.includes('shipping_rate')) {
      throw new ShopError(
        cart.shippingRateId
          ? 'SHIPPING_RATE_UNAVAILABLE'
          : 'SHIPPING_RATE_REQUIRED',
        'Choose a shipping method',
      );
    }
    if (summary.missing.includes('shipping_address')) {
      throw new ShopError('ADDRESS_REQUIRED', 'Shipping address missing');
    }
    if (summary.missing.includes('fulfillment_date')) {
      throw cart.fulfillmentDate
        ? new ShopError(
            'FULFILLMENT_DATE_UNAVAILABLE',
            `${cart.fulfillmentDate} is no longer offered, choose another day`,
          )
        : new ShopError(
            'FULFILLMENT_DATE_REQUIRED',
            'Choose the day of the pickup / delivery',
          );
    }

    const schedule =
      summary.shippingOptions.find(
        (option) => option.id === cart.shippingRateId,
      )?.schedule ?? null;
    if (cart.discountCode && pricing.discount.status !== 'applied') {
      throw new ShopError(
        pricing.discount.status === 'none'
          ? 'DISCOUNT_INVALID'
          : 'DISCOUNT_NOT_APPLICABLE',
        'The discount code cannot be used any more',
      );
    }

    const codes = [
      ...new Set((params.giftCardCodes ?? []).map(normalizeGiftCardCode)),
    ].filter(Boolean);

    if (codes.length > 5) invalid('At most 5 gift cards');

    // nothing to pay after gift cards → no method needed; otherwise the
    // chosen one must be offered (checked again below with the real amount)
    const method = params.paymentMethod;

    if (!configuredMethods.includes(method)) {
      throw new ShopError(
        'PAYMENT_METHOD_UNAVAILABLE',
        `${method} is not offered`,
      );
    }
    if (method === 'online' && !params.urls)
      invalid('urls are required for online payment');

    const customerExternalId =
      params.customerExternalId !== undefined
        ? params.customerExternalId
        : cart.customerExternalId;
    const orderId = generateId();
    const date = now();
    const number = await generateNumber({ now: date, orderId });

    const { order, events } = await transaction(async (d) => {
      const events: Pending = [];

      // 1. close the cart (a second checkout of the same cart stops here;
      //    a change in another tab since the summary as well)
      const closed = await d.update(
        'cart',
        [
          { field: 'id', value: cart.id },
          { field: 'status', value: 'active' },
          { field: 'updatedAt', value: cart.updatedAt },
        ],
        { status: 'converted', orderId, updatedAt: date },
      );

      if (!closed) {
        const current = await d.findOne('cart', [
          { field: 'id', value: cart.id },
        ]);

        throw current?.status === 'active'
          ? new ShopError('BUSY', 'The cart changed, check it again')
          : new ShopError('CART_CLOSED', 'Cart was checked out');
      }

      // 2. stock
      const changes: { variant: Variant; before: number }[] = [];

      for (const line of pricing.lines) {
        changes.push(await changeStock(d, line.variantId, -line.quantity));
      }

      events.push(...(await lowStockEvents(d, changes)));

      // 3. discount usage
      if (pricing.discount.status === 'applied') {
        await changeDiscountUsage(d, pricing.discount.code, 1);
      }

      // 4. gift cards
      const applied: AppliedGiftCard[] = [];
      let remaining = pricing.total;

      for (const code of codes) {
        if (remaining <= 0) break;

        const card = await usableGiftCard(d, code);

        if (!card)
          throw new ShopError('GIFT_CARD_INVALID', 'Gift card not valid');

        const amount = Math.min(card.balance, remaining);

        await changeGiftCardBalance(d, card.id, -amount);
        applied.push({
          giftCardId: card.id,
          last4: card.code.slice(-4),
          amount,
        });
        remaining -= amount;
      }

      const giftCardTotal = pricing.total - remaining;
      const amountDue = remaining;
      const paymentMethod: OrderPaymentMethod =
        amountDue === 0 ? 'none' : method;

      if (paymentMethod !== 'none') {
        const allowed = await paymentMethodsFor(
          cart,
          amountDue,
          customerExternalId,
        );

        if (!allowed.includes(paymentMethod)) {
          throw new ShopError(
            'PAYMENT_METHOD_UNAVAILABLE',
            `${paymentMethod} is not offered`,
          );
        }
      }

      const placedNow = paymentMethod !== 'online';
      const paidNow = paymentMethod === 'none';
      const shippingAddress = pricing.shipping?.pickup
        ? null
        : cart.shippingAddress;
      const firstReminder = reminderDays[0];
      const dueAt =
        paymentMethod === 'invoice'
          ? new Date(date.getTime() + dueDays * DAY)
          : null;

      const order: Order = {
        id: orderId,
        number,
        accessToken: generateToken(),
        cartId: cart.id,
        customerExternalId,
        email: cart.email ?? '',
        locale: cart.locale,
        status: placedNow ? 'confirmed' : 'pending',
        paymentStatus: paidNow ? 'paid' : 'unpaid',
        fulfillmentStatus: pricing.requiresShipping
          ? 'unfulfilled'
          : 'not_required',
        paymentMethod,
        currency,
        taxInclusive: pricing.taxInclusive,
        lines: pricing.lines,
        shipping: pricing.shipping,
        shippingAddress,
        billingAddress: cart.billingAddress ?? shippingAddress,
        discountCode:
          pricing.discount.status === 'applied' ? pricing.discount.code : null,
        itemsSubtotal: pricing.itemsSubtotal,
        discountTotal:
          pricing.discountTotal + (pricing.shipping?.discount ?? 0),
        shippingTotal: pricing.shippingTotal,
        taxLines: pricing.taxLines,
        taxTotal: pricing.taxTotal,
        rounding: pricing.rounding,
        total: pricing.total,
        giftCards: applied,
        giftCardTotal,
        giftCardsReleased: false,
        amountDue,
        refunds: [],
        refundedTotal: 0,
        fulfillmentDate: schedule ? (cart.fulfillmentDate ?? null) : null,
        fulfillmentWindow:
          schedule && schedule.timeWindows.length > 0
            ? (cart.fulfillmentWindow ?? null)
            : null,
        note: cart.note,
        reserved: true,
        paymentAttempts: 0,
        paymentUrl: null,
        paidVia: null,
        providerTransactionId: null,
        paymentReference: null,
        expiresAt: placedNow
          ? null
          : new Date(date.getTime() + checkoutHours * HOUR),
        dueAt,
        remindersSent: 0,
        nextReminderAt:
          dueAt && firstReminder !== undefined
            ? new Date(dueAt.getTime() + firstReminder * DAY)
            : null,
        paidAt: paidNow ? date : null,
        canceledAt: null,
        cancelReason: null,
        shippedAt: null,
        deliveredAt: null,
        carrier: null,
        trackingNumber: null,
        trackingUrl: null,
        metadata: {},
        createdAt: date,
        updatedAt: date,
      };

      await insert(d, 'order', order, `Order ${number}`);

      if (placedNow) events.push({ type: 'order.placed', order });

      if (paidNow) {
        events.push({ type: 'order.paid', order });
        events.push(...(await issueOrderGiftCards(d, order)));
      }

      return { order, events };
    });

    if (order.paymentMethod !== 'online') {
      await emit(events);
      return { type: 'placed', order };
    }

    try {
      const { url, order: updated } = await startPayment(order, params.urls!);

      await emit(events);

      return { type: 'redirect', url, order: updated };
    } catch (error) {
      // no payment page: undo the order and give the cart back
      await releaseOrder(order.id, 'expired', 'payment page failed');
      await db.update(
        'cart',
        [
          { field: 'id', value: cart.id },
          { field: 'orderId', value: order.id },
        ],
        { status: 'active', orderId: null, updatedAt: now() },
      );

      throw error;
    }
  }

  async function startPayment(order: Order, orderUrls: OrderRedirectUrls) {
    if (!provider)
      throw new ShopError('PAYMENT_METHOD_UNAVAILABLE', 'No payment provider');

    // claim an attempt number (two tabs paying the same order get two pages)
    let claimed: Order | null = null;

    for (let attempt = 0; attempt < CAS_ATTEMPTS && !claimed; attempt++) {
      const current = await db.findOne('order', [
        { field: 'id', value: order.id },
      ]);

      if (!current) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');
      if (
        current.paymentStatus !== 'unpaid' ||
        (current.status !== 'pending' && current.status !== 'confirmed')
      ) {
        throw new ShopError('INVALID_STATE', 'Order cannot be paid');
      }

      // the status is part of the compare-and-set: an order that expires
      // meanwhile gets no payment page (its gift cards were given back)
      claimed = await db.update(
        'order',
        [
          { field: 'id', value: order.id },
          { field: 'paymentAttempts', value: current.paymentAttempts },
          { field: 'paymentStatus', value: 'unpaid' },
          { field: 'status', value: current.status },
        ],
        {
          paymentAttempts: current.paymentAttempts + 1,
          // a new payment page gets the full time again
          ...(current.status === 'pending'
            ? { expiresAt: new Date(now().getTime() + checkoutHours * HOUR) }
            : {}),
          updatedAt: now(),
        },
      );
    }

    if (!claimed) throw new ShopError('BUSY', 'Order is changing, try again');

    const urls =
      typeof orderUrls === 'function' ? await orderUrls(claimed) : orderUrls;
    const m = getMessages(claimed.locale);
    const billing = claimed.billingAddress ?? claimed.shippingAddress;
    let page: { url: string; reference: string };

    try {
      page = await provider.createHostedPayment({
        mode: 'charge',
        referenceId: `${ORDER_PREFIX}${claimed.id}_${claimed.paymentAttempts}`,
        amount: claimed.amountDue,
        currency: claimed.currency,
        purpose: interpolate(m.payment.purpose, { number: claimed.number }),
        customer: {
          email: claimed.email,
          name: billing?.name ?? claimed.email,
        },
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
        failedUrl: urls.failedUrl ?? urls.cancelUrl,
      });
    } catch (error) {
      logger.error({ error, orderId: claimed.id }, 'shop: payment page failed');
      throw new ShopError(
        'PROVIDER_UNAVAILABLE',
        'Payment provider unavailable',
      );
    }

    const updated = await db.update(
      'order',
      [{ field: 'id', value: claimed.id }],
      { paymentUrl: page.url, updatedAt: now() },
    );

    return { url: page.url, order: updated ?? claimed };
  }

  /**
   * New payment page for an unpaid order: a pending online order (payment
   * canceled / failed) or an invoice order paid online instead.
   */
  async function payOrder(params: {
    orderId: string;
    urls: OrderRedirectUrls;
  }) {
    const order = await db.findOne('order', [
      { field: 'id', value: params.orderId },
    ]);

    if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');
    if (
      order.paymentStatus !== 'unpaid' ||
      (order.status !== 'pending' && order.status !== 'confirmed') ||
      order.amountDue <= 0
    ) {
      throw new ShopError('INVALID_STATE', 'Order cannot be paid');
    }
    if (!configuredMethods.includes('online')) {
      throw new ShopError(
        'PAYMENT_METHOD_UNAVAILABLE',
        'Online payment is not offered',
      );
    }

    const { url } = await startPayment(order, params.urls);

    return { url };
  }

  // ------------------------------------------------------------ payment

  async function issueOrderGiftCards(
    d: StorageAdapter,
    order: Order,
  ): Promise<Pending> {
    const events: Pending = [];

    for (const [index, line] of order.lines.entries()) {
      if (line.kind !== 'gift_card') continue;

      const unitValue = Math.floor(line.total / line.quantity);

      for (let unit = 0; unit < line.quantity; unit++) {
        // deterministic id: issuing twice for the same order is a no-op
        const card = await createGiftCard(d, {
          id: `gc_${order.id}_${index}_${unit}`,
          amount: unitValue,
          orderId: order.id,
          recipientEmail: order.email,
        });

        if (card)
          events.push({ type: 'gift_card.issued', giftCard: card, order });
      }
    }

    return events;
  }

  /** Marks an unpaid order paid (webhook, bank transfer, cash). */
  async function settle(
    orderId: string,
    params:
      | { via: 'provider'; transactionId: string; paidAt?: Date }
      | { via: 'manual'; reference: string | null; paidAt?: Date },
  ): Promise<Order | null> {
    const result = await transaction(async (d) => {
      // compare-and-set on the status read: an expiry or cancel committing
      // in between must turn this into a late payment, not revive the order
      for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
        const order = await d.findOne('order', [
          { field: 'id', value: orderId },
        ]);

        if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');
        if (order.paymentStatus !== 'unpaid') return null;

        const late = order.status === 'expired' || order.status === 'canceled';
        const paid = await d.update(
          'order',
          [
            { field: 'id', value: orderId },
            { field: 'paymentStatus', value: 'unpaid' },
            { field: 'status', value: order.status },
          ],
          {
            paymentStatus: 'paid',
            status: order.status === 'pending' ? 'confirmed' : order.status,
            paidAt: params.paidAt ?? now(),
            paidVia: params.via,
            ...(params.via === 'provider'
              ? { providerTransactionId: params.transactionId }
              : { paymentReference: params.reference }),
            expiresAt: null,
            nextReminderAt: null,
            updatedAt: now(),
          },
        );

        if (!paid) continue;

        const events: Pending = [];

        if (late) {
          events.push({ type: 'order.late_payment', order: paid });
        } else {
          if (order.status === 'pending') {
            events.push({ type: 'order.placed', order: paid });
          }
          events.push({ type: 'order.paid', order: paid });
          events.push(...(await issueOrderGiftCards(d, paid)));
        }

        return { order: paid, events };
      }

      throw new ShopError('BUSY', 'Order is changing, try again');
    });

    if (!result) return null;

    await emit(result.events);

    return result.order;
  }

  /** Invoice paid by bank transfer (or cash at pickup). */
  async function markPaid(params: {
    orderId: string;
    paidAt?: Date;
    /** Your reference (bank booking, receipt number). */
    reference?: string;
  }) {
    const order = await settle(params.orderId, {
      via: 'manual',
      reference: params.reference ?? null,
      paidAt: params.paidAt,
    });

    if (!order) throw new ShopError('INVALID_STATE', 'Order is paid already');

    return order;
  }

  /**
   * Bank payments (from `parseCamt()`) against unpaid invoice orders: matched
   * by the structured reference of the payment slip, else by the order
   * number in the payer's message. A full payment marks the order paid (like
   * `markPaid`); everything else is reported for a look by hand. Importing
   * the same file again changes nothing.
   */
  async function reconcileBankPayments(params: {
    payments: BankPayment[];
    /** Reference on the order's payment slip – `paymentSlip.reference`. */
    reference: (order: Order) => string;
  }): Promise<BankReconciliation> {
    const result: BankReconciliation = {
      paid: [],
      alreadyPaid: [],
      underpaid: [],
      unmatched: [],
    };
    const credits = params.payments.filter((payment) => payment.amount > 0);

    if (credits.length === 0) return result;

    const [open, settled] = await Promise.all([
      db.findMany('order', {
        where: [
          { field: 'paymentMethod', value: 'invoice' },
          { field: 'paymentStatus', value: 'unpaid' },
        ],
        limit: 10_000,
      }),
      // a payment for an order paid already (twice, or the file again)
      db.findMany('order', {
        where: [
          { field: 'paymentMethod', value: 'invoice' },
          {
            field: 'paymentStatus',
            operator: 'in',
            value: ['paid', 'partially_refunded', 'refunded'],
          },
        ],
        sortBy: { field: 'updatedAt', direction: 'desc' },
        limit: 1_000,
      }),
    ]);
    const referenceOf = new Map<string, string | null>();
    const refOf = (order: Order) => {
      if (!referenceOf.has(order.id)) {
        let reference: string | null = null;

        try {
          reference = normalizeReference(params.reference(order));
        } catch {
          // no reference for this order (e.g. a currency the slip lacks)
        }

        referenceOf.set(order.id, reference);
      }

      return referenceOf.get(order.id) ?? null;
    };
    const find = (orders: Order[], payment: BankPayment) =>
      payment.reference
        ? orders.find((order) => refOf(order) === payment.reference)
        : orders.find((order) => mentionsNumber(payment.message, order.number));

    for (const payment of credits) {
      const order = find(open, payment);

      if (!order) {
        const paidBefore = find(settled, payment);

        if (paidBefore) {
          result.alreadyPaid.push({ payment, order: paidBefore });
        } else {
          result.unmatched.push({
            payment,
            reason: payment.reference ? 'unknown_reference' : 'no_reference',
          });
        }
        continue;
      }

      if (order.currency !== payment.currency) {
        result.unmatched.push({ payment, reason: 'currency' });
        continue;
      }

      if (payment.amount < order.amountDue) {
        result.underpaid.push({
          payment,
          order,
          missing: order.amountDue - payment.amount,
        });
        continue;
      }

      const paid = await settle(order.id, {
        via: 'manual',
        reference: `bank:${payment.id}`,
        paidAt: payment.bookedAt ?? undefined,
      });

      if (!paid) {
        // paid in between (back office, a second tab)
        const current = await getOrder(order.id);

        result.alreadyPaid.push({ payment, order: current ?? order });
      } else {
        result.paid.push({
          payment,
          order: paid,
          overpaidBy: payment.amount - order.amountDue,
        });
        // a second payment of the same order in this file
        settled.unshift(paid);
        open.splice(open.indexOf(order), 1);
      }
    }

    return result;
  }

  function isPaymentEvent(
    event: ProviderEvent,
  ): event is Extract<
    ProviderEvent,
    { type: 'payment.succeeded' | 'payment.failed' }
  > {
    return (
      event.type === 'payment.succeeded' || event.type === 'payment.failed'
    );
  }

  async function applyProviderEvent(event: ProviderEvent) {
    if (!isPaymentEvent(event)) return;

    const orderId = orderIdFromReference(event.referenceId);
    const order = orderId
      ? await db.findOne('order', [{ field: 'id', value: orderId }])
      : null;

    if (!order) return;

    if (event.type === 'payment.failed') {
      logger.info({ orderId, error: event.error }, 'shop: payment failed');
      return;
    }

    const success = event;

    if (
      success.currency.toUpperCase() !== order.currency ||
      success.amount < order.amountDue
    ) {
      logger.error(
        { orderId, amount: success.amount, currency: success.currency },
        'shop: payment does not match the order',
      );
      return;
    }

    await settle(order.id, {
      via: 'provider',
      transactionId: success.transactionId,
    });
  }

  /**
   * Webhook endpoint. 200 = processed or irrelevant, 400 = rejected,
   * 429 = rate limited, 500 = retry later.
   */
  async function handleWebhook(
    request: Request,
    params: {
      /** Rate limit per order before the provider's API verifies it. */
      beforeVerify?: (
        orderId: string,
      ) => RateLimitDecision | Promise<RateLimitDecision>;
    } = {},
  ): Promise<Response> {
    try {
      if (!provider) return Response.json({ received: true, events: 0 });

      const events = await provider.parseWebhook(request, {
        isKnownReference: async (referenceId) => {
          const orderId = orderIdFromReference(referenceId);

          if (!orderId) return false;

          const order = await db.findOne('order', [
            { field: 'id', value: orderId },
          ]);

          if (!order) return false;

          const decision = await params.beforeVerify?.(orderId);

          if (decision && !decision.allowed) {
            throw new ShopError(
              'RATE_LIMITED',
              `Too many webhooks for order ${orderId}`,
              decision.retryAfterSeconds,
            );
          }

          return true;
        },
      });

      for (const event of events) await applyProviderEvent(event);

      return Response.json({ received: true, events: events.length });
    } catch (error) {
      const code = errorCode(error);

      if (code === 'WEBHOOK_INVALID') {
        logger.error(
          { error: (error as Error).message },
          'shop: webhook rejected',
        );
        return Response.json({ error: 'WEBHOOK_INVALID' }, { status: 400 });
      }

      if (code === 'RATE_LIMITED') {
        return Response.json(
          { error: 'RATE_LIMITED' },
          {
            status: 429,
            headers: retryAfterHeader((error as ShopError).retryAfterSeconds),
          },
        );
      }

      logger.error({ error }, 'shop: webhook failed');
      return Response.json(
        { error: 'Webhook processing failed' },
        { status: 500 },
      );
    }
  }

  // ------------------------------------------------------------ orders

  async function getOrder(orderId: string) {
    return db.findOne('order', [{ field: 'id', value: orderId }]);
  }

  /** Order of a guest link (`accessToken` compared in constant time). */
  async function getOrderWithToken(orderId: string, accessToken: string) {
    const order = await getOrder(orderId);

    if (!order || !safeEqual(order.accessToken, accessToken)) return null;

    return order;
  }

  function listOrders(query: OrderQuery = {}) {
    const where: Where<'order'>[] = [];
    const status = inList(query.status);
    const paymentStatus = inList(query.paymentStatus);
    const fulfillmentStatus = inList(query.fulfillmentStatus);

    if (query.customerExternalId !== undefined) {
      where.push({
        field: 'customerExternalId',
        value: query.customerExternalId,
      });
    }
    if (query.email)
      where.push({ field: 'email', value: query.email.toLowerCase() });
    if (query.number) where.push({ field: 'number', value: query.number });
    if (status) where.push({ field: 'status', operator: 'in', value: status });
    if (paymentStatus) {
      where.push({
        field: 'paymentStatus',
        operator: 'in',
        value: paymentStatus,
      });
    }
    if (fulfillmentStatus) {
      where.push({
        field: 'fulfillmentStatus',
        operator: 'in',
        value: fulfillmentStatus,
      });
    }
    if (query.createdAfter) {
      where.push({
        field: 'createdAt',
        operator: 'gte',
        value: query.createdAfter,
      });
    }
    if (query.fulfillmentDate) {
      where.push({ field: 'fulfillmentDate', value: query.fulfillmentDate });
    }

    return db.findMany('order', {
      where,
      sortBy: { field: 'createdAt', direction: 'desc' },
      limit: query.limit ?? 50,
      offset: query.offset,
    });
  }

  /**
   * Changes `order.metadata` with compare-and-set on `updatedAt`, so
   * concurrent changes are not lost: `change` gets the current metadata and
   * returns the new one, or `null` to leave the order as it is (→ `null`).
   * Integrations keep their sync state here.
   */
  async function updateOrderMetadata(
    orderId: string,
    change: (
      metadata: Record<string, unknown>,
      order: Order,
    ) => Record<string, unknown> | null,
  ): Promise<Order | null> {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const order = await getOrder(orderId);

      if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');

      const metadata = change(order.metadata, order);

      if (metadata === null) return null;

      const updated = await db.update(
        'order',
        [
          { field: 'id', value: order.id },
          { field: 'updatedAt', value: order.updatedAt },
        ],
        {
          metadata,
          // two changes within one millisecond must not share a CAS token
          updatedAt: new Date(
            Math.max(now().getTime(), order.updatedAt.getTime() + 1),
          ),
        },
      );

      if (updated) return updated;
    }

    throw new ShopError('BUSY', 'Order is changing, try again');
  }

  async function updateOrderWhere(
    orderId: string,
    where: Where<'order'>[],
    patch: Partial<Order>,
    message: string,
  ) {
    const order = await db.update(
      'order',
      [{ field: 'id', value: orderId }, ...where],
      { ...patch, updatedAt: now() },
    );

    if (!order) {
      const exists = await getOrder(orderId);

      throw new ShopError(
        exists ? 'INVALID_STATE' : 'ORDER_NOT_FOUND',
        message,
      );
    }

    return order;
  }

  async function markShipped(params: {
    orderId: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  }) {
    const order = await updateOrderWhere(
      params.orderId,
      [
        { field: 'status', value: 'confirmed' },
        {
          field: 'fulfillmentStatus',
          operator: 'in',
          value: ['unfulfilled', 'shipped'],
        },
      ],
      {
        fulfillmentStatus: 'shipped',
        shippedAt: now(),
        carrier: params.carrier ?? null,
        trackingNumber: params.trackingNumber ?? null,
        trackingUrl: params.trackingUrl ?? null,
      },
      'Only confirmed orders that are not delivered can be shipped',
    );

    await emit([{ type: 'order.shipped', order }]);

    return order;
  }

  /** Delivered / picked up. */
  async function markDelivered(params: { orderId: string }) {
    const order = await updateOrderWhere(
      params.orderId,
      [
        { field: 'status', value: 'confirmed' },
        {
          field: 'fulfillmentStatus',
          operator: 'in',
          value: ['unfulfilled', 'shipped'],
        },
      ],
      { fulfillmentStatus: 'delivered', deliveredAt: now() },
      'Only confirmed orders can be delivered',
    );

    await emit([{ type: 'order.delivered', order }]);

    return order;
  }

  /**
   * Gives back what the order holds: stock (if still reserved), discount
   * usage and – while unpaid – the gift card amounts.
   */
  async function releaseHoldings(d: StorageAdapter, order: Order) {
    if (order.reserved) {
      for (const line of order.lines) {
        await changeStock(d, line.variantId, line.quantity).catch(
          (error: unknown) => {
            // variant deleted meanwhile: nothing to give back
            if (errorCode(error) !== 'VARIANT_NOT_FOUND') throw error;
          },
        );
      }
    }

    if (order.discountCode)
      await changeDiscountUsage(d, order.discountCode, -1);

    if (order.paymentStatus === 'unpaid') {
      for (const card of order.giftCards) {
        await changeGiftCardBalance(d, card.giftCardId, card.amount);
      }
    }
  }

  async function releaseOrder(
    orderId: string,
    status: 'canceled' | 'expired',
    reason: string | null,
    from: OrderStatus[] = ['pending'],
  ) {
    return transaction(async (d) => {
      // compare-and-set on everything the release depends on: a payment,
      // refund or restock committing in between means read again
      for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
        const order = await d.findOne('order', [
          { field: 'id', value: orderId },
        ]);

        if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');
        if (
          !from.includes(order.status) ||
          (order.fulfillmentStatus !== 'unfulfilled' &&
            order.fulfillmentStatus !== 'not_required')
        ) {
          return null;
        }

        const released = await d.update(
          'order',
          [
            { field: 'id', value: orderId },
            { field: 'status', value: order.status },
            { field: 'paymentStatus', value: order.paymentStatus },
            { field: 'reserved', value: order.reserved },
            { field: 'refundedTotal', value: order.refundedTotal },
            {
              field: 'fulfillmentStatus',
              operator: 'in',
              value: ['unfulfilled', 'not_required'],
            },
          ],
          {
            status,
            reserved: false,
            giftCardsReleased:
              order.paymentStatus === 'unpaid' && order.giftCards.length > 0,
            expiresAt: null,
            nextReminderAt: null,
            canceledAt: now(),
            cancelReason: reason,
            updatedAt: now(),
          },
        );

        if (!released) continue;

        await releaseHoldings(d, order);

        return released;
      }

      throw new ShopError('BUSY', 'Order is changing, try again');
    });
  }

  /**
   * Cancels an order that was not shipped yet. Stock and discount usage
   * come back; a paid order still needs `refundOrder` for the money.
   */
  async function cancelOrder(params: {
    orderId: string;
    reason?: string | null;
  }) {
    const order = await releaseOrder(
      params.orderId,
      'canceled',
      params.reason ?? null,
      ['pending', 'confirmed'],
    );

    if (!order) {
      const exists = await getOrder(params.orderId);

      throw new ShopError(
        exists ? 'INVALID_STATE' : 'ORDER_NOT_FOUND',
        'Only orders that were not shipped can be canceled',
      );
    }

    await emit([{ type: 'order.canceled', order }]);

    return order;
  }

  /**
   * Gift cards of an order released while unpaid (expired, canceled) were
   * credited back then – a late payment covers `amountDue` only.
   */
  function giftCardsReturned(order: Order) {
    return order.giftCardsReleased;
  }

  /** Value of the gift card lines whose cards were issued (paid orders). */
  async function issuedGiftCards(d: StorageAdapter, order: Order) {
    const cards = await d.findMany('giftCard', {
      where: [{ field: 'orderId', value: order.id }],
      sortBy: { field: 'createdAt', direction: 'asc' },
    });
    const value =
      cards.length > 0
        ? order.lines.reduce(
            (acc, line) => acc + (line.kind === 'gift_card' ? line.total : 0),
            0,
          )
        : 0;

    return { cards, value };
  }

  /**
   * Pays money back: first to the customer's payment (by the provider when
   * it was paid there and the provider supports refunds, else recorded as
   * done by hand), the rest to the gift cards used. Goods are refunded
   * before vouchers the order bought; refunding those takes their unspent
   * balance back. `restock` puts the units back on sale.
   */
  async function refundOrder(params: {
    orderId: string;
    /** Default: everything not refunded yet. */
    amount?: number;
    reason?: string | null;
    restock?: boolean;
  }) {
    if (params.amount !== undefined) {
      checkAmount(params.amount, 'amount');
      if (params.amount === 0) invalid('amount must be positive');
    }

    // 1. record the refund together with its effects on gift cards and
    //    stock – compare-and-set on the refunded total and the stock flag
    const recorded = await transaction(async (d) => {
      for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
        const order = await d.findOne('order', [
          { field: 'id', value: params.orderId },
        ]);

        if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');
        if (
          order.paymentStatus !== 'paid' &&
          order.paymentStatus !== 'partially_refunded'
        ) {
          throw new ShopError(
            'INVALID_STATE',
            'Only paid orders can be refunded',
          );
        }

        const sum = (
          key: 'toPayment' | 'toGiftCards' | 'fromIssuedGiftCards',
        ) => order.refunds.reduce((acc, refund) => acc + refund[key], 0);
        const cardTotal = giftCardsReturned(order) ? 0 : order.giftCardTotal;
        const paidTotal =
          order.total - (giftCardsReturned(order) ? order.giftCardTotal : 0);
        const refundable = paidTotal - order.refundedTotal;
        const amount = params.amount ?? refundable;

        if (amount <= 0 || amount > refundable) {
          throw new ShopError('REFUND_TOO_HIGH', `At most ${refundable}`);
        }

        // vouchers bought with the order are refunded last, and only with
        // the balance that is still on them
        const issued = await issuedGiftCards(d, order);
        const goodsTotal = paidTotal - issued.value;
        const voucherShare = (refunded: number) =>
          Math.max(0, refunded - goodsTotal);
        const fromIssued =
          voucherShare(order.refundedTotal + amount) -
          voucherShare(order.refundedTotal);
        const unspent = issued.cards.reduce(
          (acc, card) => acc + (card.status === 'active' ? card.balance : 0),
          0,
        );

        if (fromIssued > unspent) {
          throw new ShopError(
            'REFUND_TOO_HIGH',
            'The gift cards of this order were used already',
          );
        }

        const toPayment = Math.min(amount, order.amountDue - sum('toPayment'));
        const toGiftCards = Math.min(
          amount - toPayment,
          cardTotal - sum('toGiftCards'),
        );
        const viaProvider =
          toPayment > 0 &&
          order.paidVia === 'provider' &&
          order.providerTransactionId !== null &&
          provider?.refund !== undefined;
        const restock = params.restock === true && order.reserved;
        const refund: OrderRefund = {
          id: generateId(),
          amount: toPayment + toGiftCards,
          toPayment,
          toGiftCards,
          fromIssuedGiftCards: fromIssued,
          method: viaProvider
            ? 'provider'
            : toPayment > 0
              ? 'manual'
              : 'gift_card',
          providerRefundId: null,
          reason: params.reason?.slice(0, 500) ?? null,
          createdAt: now().toISOString(),
        };
        const refundedTotal = order.refundedTotal + refund.amount;

        const updated = await d.update(
          'order',
          [
            { field: 'id', value: order.id },
            { field: 'refundedTotal', value: order.refundedTotal },
            { field: 'reserved', value: order.reserved },
          ],
          {
            refunds: [...order.refunds, refund],
            refundedTotal,
            paymentStatus:
              refundedTotal >= paidTotal ? 'refunded' : 'partially_refunded',
            ...(restock ? { reserved: false } : {}),
            updatedAt: now(),
          },
        );

        if (!updated) continue;

        await applyRefundEffects(d, order, refund, restock, 1);

        return { order: updated, refund, restock, viaProvider, before: order };
      }

      throw new ShopError('BUSY', 'Order is changing, try again');
    });

    let { order: result } = recorded;
    const { refund, restock, before } = recorded;

    // 2. the money
    if (recorded.viaProvider && provider?.refund) {
      try {
        const { refundId } = await provider.refund({
          transactionId: before.providerTransactionId!,
          amount: refund.toPayment,
          currency: before.currency,
          reason: refund.reason,
        });

        refund.providerRefundId = refundId;
        result = await rewriteRefunds(before.id, (refunds) =>
          refunds.map((entry) => (entry.id === refund.id ? refund : entry)),
        );
      } catch (error) {
        if (error instanceof ShopError) throw error;

        logger.error(
          { error, orderId: before.id },
          'shop: provider refund failed',
        );

        // nothing moved: take the record and its effects back
        await transaction(async (d) => {
          for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
            const current = await d.findOne('order', [
              { field: 'id', value: before.id },
            ]);

            if (!current) return;

            const refundedTotal = current.refundedTotal - refund.amount;
            const undone = await d.update(
              'order',
              [
                { field: 'id', value: before.id },
                { field: 'refundedTotal', value: current.refundedTotal },
                { field: 'reserved', value: current.reserved },
              ],
              {
                refunds: current.refunds.filter(
                  (entry) => entry.id !== refund.id,
                ),
                refundedTotal,
                paymentStatus:
                  refundedTotal > 0 ? 'partially_refunded' : 'paid',
                ...(restock ? { reserved: true } : {}),
                updatedAt: now(),
              },
            );

            if (!undone) continue;

            await applyRefundEffects(d, current, refund, restock, -1);
            return;
          }

          throw new ShopError('BUSY', 'Order is changing, try again');
        });

        throw new ShopError(
          'PROVIDER_UNAVAILABLE',
          'The provider refused the refund',
        );
      }
    }

    await emit([{ type: 'order.refunded', order: result, refund }]);

    return { order: result, refund };
  }

  /** Gift cards and stock of a refund (`direction` -1 undoes them). */
  async function applyRefundEffects(
    d: StorageAdapter,
    order: Order,
    refund: OrderRefund,
    restock: boolean,
    direction: 1 | -1,
  ) {
    // gift cards used to pay: credited in the order they were used, after
    // what earlier refunds credited
    let alreadyCredited = order.refunds
      .filter((entry) => entry.id !== refund.id)
      .reduce((acc, entry) => acc + entry.toGiftCards, 0);
    let rest = refund.toGiftCards;

    for (const card of order.giftCards) {
      const done = Math.min(alreadyCredited, card.amount);
      const share = Math.min(rest, card.amount - done);

      alreadyCredited -= done;

      if (share > 0) {
        await changeGiftCardBalance(d, card.giftCardId, direction * share);
        rest -= share;
      }
    }

    // gift cards bought with the order: their balance goes back
    let take = refund.fromIssuedGiftCards;

    if (take > 0) {
      const { cards } = await issuedGiftCards(d, order);

      for (const card of cards) {
        if (take <= 0) break;

        const share = direction === 1 ? Math.min(take, card.balance) : take;

        if (share > 0 && (direction === -1 || card.status === 'active')) {
          await changeGiftCardBalance(d, card.id, -direction * share);
          take -= share;
        }
      }
    }

    if (restock) {
      for (const line of order.lines) {
        await changeStock(d, line.variantId, direction * line.quantity, {
          force: true,
        }).catch((error: unknown) => {
          if (errorCode(error) !== 'VARIANT_NOT_FOUND') throw error;
        });
      }
    }
  }

  /** Read-modify-write of an order's refund list (compare-and-set). */
  async function rewriteRefunds(
    orderId: string,
    change: (refunds: OrderRefund[]) => OrderRefund[],
  ) {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const current = await db.findOne('order', [
        { field: 'id', value: orderId },
      ]);

      if (!current) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');

      const updated = await db.update(
        'order',
        [
          { field: 'id', value: orderId },
          { field: 'refundedTotal', value: current.refundedTotal },
        ],
        { refunds: change(current.refunds), updatedAt: now() },
      );

      if (updated) return updated;
    }

    throw new ShopError('BUSY', 'Order is changing, try again');
  }

  // ------------------------------------------------------------ runDue

  /**
   * Call regularly (every few minutes) from a cron job. Safe to run
   * concurrently: every step claims its row with a compare-and-set first.
   */
  async function runDue(
    params: { limit?: number } = {},
  ): Promise<RunDueSummary> {
    const limit = params.limit ?? 100;
    const summary: RunDueSummary = {
      expiredOrders: 0,
      reminders: 0,
      abandonedCarts: 0,
      saturated: false,
    };
    const date = now();

    // 1. unpaid online orders: stock back, cart back
    const stale = await db.findMany('order', {
      where: [
        { field: 'status', value: 'pending' },
        { field: 'paymentStatus', value: 'unpaid' },
        { field: 'expiresAt', operator: 'lte', value: date },
      ],
      limit,
    });

    if (stale.length >= limit) summary.saturated = true;

    for (const order of stale) {
      try {
        const expired = await releaseOrder(order.id, 'expired', null);

        if (!expired) continue;

        summary.expiredOrders += 1;

        if (order.cartId) {
          await db.update(
            'cart',
            [
              { field: 'id', value: order.cartId },
              { field: 'orderId', value: order.id },
              { field: 'status', value: 'converted' },
            ],
            { status: 'active', orderId: null, updatedAt: now() },
          );
        }

        await emit([{ type: 'order.expired', order: expired }]);
      } catch (error) {
        logger.error(
          { error, orderId: order.id },
          'shop: expiring order failed',
        );
      }
    }

    // 2. payment reminders of invoice orders
    const overdue = await db.findMany('order', {
      where: [
        { field: 'status', value: 'confirmed' },
        { field: 'paymentStatus', value: 'unpaid' },
        { field: 'nextReminderAt', operator: 'lte', value: date },
      ],
      limit,
    });

    if (overdue.length >= limit) summary.saturated = true;

    for (const order of overdue) {
      const level = order.remindersSent + 1;
      const nextDays = reminderDays[level];
      const reminded = await db.update(
        'order',
        [
          { field: 'id', value: order.id },
          { field: 'remindersSent', value: order.remindersSent },
          { field: 'paymentStatus', value: 'unpaid' },
        ],
        {
          remindersSent: level,
          nextReminderAt:
            nextDays !== undefined && order.dueAt
              ? new Date(order.dueAt.getTime() + nextDays * DAY)
              : null,
          updatedAt: now(),
        },
      );

      if (!reminded) continue;

      summary.reminders += 1;
      await emit([{ type: 'order.payment_reminder', order: reminded, level }]);
    }

    // 3. abandoned carts
    const carts = await db.findMany('cart', {
      where: [
        { field: 'status', value: 'active' },
        { field: 'expiresAt', operator: 'lte', value: date },
      ],
      limit,
    });

    if (carts.length >= limit) summary.saturated = true;

    for (const cart of carts) {
      const abandoned = await db.update(
        'cart',
        [
          { field: 'id', value: cart.id },
          { field: 'status', value: 'active' },
          { field: 'expiresAt', operator: 'lte', value: date },
        ],
        { status: 'abandoned', updatedAt: now() },
      );

      if (abandoned) summary.abandonedCarts += 1;
    }

    return summary;
  }

  return {
    settings: {
      currency,
      tax: {
        inclusive: tax.inclusive !== false,
        defaultRateBps: tax.defaultRateBps ?? 810,
      },
      paymentMethods: configuredMethods,
      shippingRates: rates,
      invoiceDueDays: dueDays,
      roundToFiveRappen: options.roundToFiveRappen ?? false,
    },
    // catalog
    createProduct,
    updateProduct,
    createVariant,
    updateVariant,
    listProducts,
    getProduct,
    adjustStock,
    setStock,
    // discounts & gift cards
    createDiscount,
    updateDiscount,
    listDiscounts,
    issueGiftCard,
    getGiftCardBalance,
    disableGiftCard,
    listGiftCards,
    // cart & checkout
    createCart,
    getCart,
    findCustomerCart,
    addToCart,
    setCartQuantity,
    applyDiscountCode,
    removeDiscountCode,
    updateCartDetails,
    claimCart,
    getCartSummary,
    checkout,
    payOrder,
    // orders
    getOrder,
    getOrderWithToken,
    listOrders,
    updateOrderMetadata,
    markPaid,
    reconcileBankPayments,
    markShipped,
    markDelivered,
    cancelOrder,
    refundOrder,
    // payments & jobs
    handleWebhook,
    applyProviderEvent,
    runDue,
  };
}

export type Shop = ReturnType<typeof createShop>;

const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const zurichParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function zurich(date: Date) {
  const parts = Object.fromEntries(
    zurichParts.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** Calendar day in Zurich (`YYYY-MM-DD`). */
function zurichDay(date: Date) {
  return zurich(date).day;
}

/** Time of day in Zurich (`HH:mm`). */
function zurichTime(date: Date) {
  return zurich(date).time;
}

function isDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function weekdayOf(day: string): Weekday {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]!;
}

function checkSchedule(rateId: string, schedule: FulfillmentSchedule) {
  const fail = (message: string): never => {
    throw new Error(`shipping rate "${rateId}": schedule.${message}`);
  };
  const days = (value: number | undefined, name: string, min: number) => {
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < min || value > 366)
    ) {
      fail(`${name} must be an integer from ${min} to 366`);
    }
  };

  days(schedule.leadDays, 'leadDays', 0);
  days(schedule.maxDays, 'maxDays', 1);
  if (
    schedule.cutoff !== undefined &&
    schedule.cutoff !== null &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.cutoff)
  ) {
    fail('cutoff must be HH:mm');
  }
  for (const weekday of schedule.weekdays ?? []) {
    if (!WEEKDAYS.includes(weekday)) fail(`weekdays: unknown "${weekday}"`);
  }
  for (const day of schedule.closedDates ?? []) {
    if (!isDay(day)) fail(`closedDates: "${day}" is not YYYY-MM-DD`);
  }
  for (const window of schedule.timeWindows ?? []) {
    if (!window.trim() || window.length > 40) {
      fail('timeWindows: 1–40 characters each');
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const { code, message, cause } = error as {
    code?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  return (
    code === '23505' ||
    (typeof message === 'string' && /unique|duplicate/i.test(message)) ||
    (cause !== undefined && cause !== error && isUniqueViolation(cause))
  );
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let diff = 0;

  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}
