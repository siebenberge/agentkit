import type { FulfillmentDateContext, Logger, Shop } from '../engine';
import { ShopError, isShopError } from '../errors';
import { formatFulfillmentDate } from '../i18n';
import type {
  Address,
  Locale,
  Order,
  OrderLine,
  Product,
  ProductStatus,
  ShopEvent,
  Variant,
  Weekday,
} from '../types';
import {
  type HsSoftArticle,
  type HsSoftClient,
  type HsSoftCreationOptions,
  type HsSoftOneTimeCustomer,
  type HsSoftOrderBody,
  type HsSoftOrderPosition,
  type HsSoftOrderType,
  type HsSoftSaleUnit,
  type HsSoftVatRate,
  type HsSoftWarning,
  hsSoftClient,
  isHsSoftError,
} from './client';

export * from './client';

type MaybePromise<T> = T | Promise<T>;

export type { Weekday };

/**
 * What the import keeps of an article in `product.metadata.hssoft` (read it
 * with `hsSoftProductData(product)`): declaration, allergens, nutrition and
 * delivery days for the product page.
 */
export type HsSoftProductData = {
  articleId: number;
  articleNumber: string;
  /** Marketing groups the article was loaded from (WaWiAssist categories). */
  marketingGroupIds: number[];
  saleUnit: HsSoftSaleUnit | null;
  quantityPerLot: number | null;
  /** Weekdays WaWiAssist delivers the article on. */
  deliveryDays: Weekday[];
  storagePlace: string | null;
  /** Ingredients declaration. */
  declaration: string | null;
  consumersInformation: string | null;
  consumersStorageInfo: string | null;
  allergens: string[];
  nutritionalValues: { label: string; amount: number; unit: string }[];
  attributes: {
    alcohol: boolean | null;
    gluten: boolean | null;
    glutenFree: boolean | null;
    bio: boolean | null;
    lactoseFree: boolean | null;
    spelt: boolean | null;
    vegan: boolean | null;
    vegetarian: boolean | null;
  };
  weightInGrams: number | null;
  daysShelfLife: number | null;
  daysToSell: number | null;
  daysToConsume: number | null;
  /** Of the imported data: an unchanged article is not written again. */
  hash: string;
  imageHash: string | null;
  importedAt: string;
};

/** Product fields the import sets only when it creates the product. */
export type HsSoftImportField =
  'name' | 'description' | 'price' | 'weight' | 'images' | 'status' | 'tax';

export type HsSoftImage = {
  articleId: number;
  articleNumber: string;
  /** JPEG, at most 400 × 400 px. */
  jpeg: Uint8Array;
  width: number;
  height: number;
};

export type HsSoftProductOptions = {
  /**
   * Import only these marketing groups (as in WooHS); default every active
   * article.
   */
  marketingGroupIds?: number[];
  /** Further check per article (`false` → skipped). */
  filter?: (article: HsSoftArticle) => boolean;
  /** Price category used as the shop price, 1–10 (default 1 = K1). */
  priceCategory?: number;
  /** A current special price becomes the price, the normal one the struck-through price (default `true`). */
  specialPrices?: boolean;
  /** `article`: selling weight (K1, default); `recipe`: weight of the recipe (K2). */
  weight?: 'article' | 'recipe';
  /** Skip articles without an image in WaWiAssist (default `false`). */
  requireImage?: boolean;
  /**
   * Store an article image and return its URL (your bucket / CDN). Without
   * it no images are imported. A failed upload fails the article.
   */
  images?: { save: (image: HsSoftImage) => Promise<string> };
  /** VAT rate of the product (the API has none; default the shop's rate). */
  taxRateBps?: (article: HsSoftArticle) => number | null;
  name?: (article: HsSoftArticle) => string;
  /** Default: the recipe's consumer information. */
  description?: (article: HsSoftArticle) => string | null;
  /** URL key of new products (default from the name). */
  slug?: (article: HsSoftArticle) => string;
  /** Fields you maintain in the shop after the first import. */
  keep?: HsSoftImportField[];
  /**
   * Products of earlier imports whose article is gone, inactive or skipped
   * (default `draft`; `keep` leaves them).
   */
  missing?: Extract<ProductStatus, 'draft' | 'archived'> | 'keep';
  /** Articles loaded at the same time (default 4). */
  concurrency?: number;
};

export type HsSoftOrderSyncState =
  /** A request is running (or crashed – after 10 minutes: `uncertain`). */
  | 'sending'
  | 'synced'
  /** HS-Soft was unavailable; `syncOrders()` tries again. */
  | 'retry'
  /** Rejected (key, channel, locked date, unmapped article) – fix, then force. */
  | 'failed'
  /** No answer: check WaWiAssist before you force a second send. */
  | 'uncertain'
  /** Nothing to send (gift cards only). */
  | 'skipped'
  /** The order was canceled in the shop and deleted in WaWiAssist. */
  | 'deleted'
  /** Canceled in the shop, but WaWiAssist refused the deletion (invoiced). */
  | 'delete_failed';

/** Sync state of an order, kept in `order.metadata.hssoft`. */
export type HsSoftOrderSync = {
  state: HsSoftOrderSyncState;
  /** Internal id and number of the order in WaWiAssist. */
  orderId: number | null;
  orderNumber: number | null;
  attempts: number;
  /** Positions HS-Soft dropped or changed (min/max, lot size, days). */
  warnings: HsSoftWarning[];
  error: {
    code: string;
    message: string;
    status: number | null;
    type: string | null;
  } | null;
  nextAttemptAt: string | null;
  syncedAt: string | null;
  updatedAt: string;
};

export type HsSoftOrderOptions = {
  /** `placed` (default): invoice orders at once, online ones once paid; `paid`: after the payment. */
  when?: 'placed' | 'paid';
  /** Which orders go to WaWiAssist (default all). */
  filter?: (order: Order) => boolean;
  /**
   * WaWiAssist customer of the order (e.g. your B2B customers); `null`
   * (default) creates a one-time customer from the order's address.
   */
  customerId?: (order: Order) => MaybePromise<number | null>;
  /** Settings of the one-time customers. */
  oneTimeCustomer?: Pick<
    HsSoftOneTimeCustomer,
    | 'invoicingIntervalId'
    | 'orderReportId'
    | 'paymentPeriod'
    | 'subCompanyId'
    | 'salutation'
  >;
  /**
   * HS-Soft article of an order line. `undefined` → the article the product
   * was imported from; `null` → none (gift cards are left out, other lines
   * fail the order).
   */
  articleId?: (
    line: OrderLine,
    order: Order,
  ) => MaybePromise<number | null | undefined>;
  /** HS-Soft article for the shipping costs: one for all, per rate id, or a function. */
  shippingArticleId?:
    number | Record<string, number> | ((order: Order) => number | null);
  /** VAT codes per rate (default 810 → NORMAL, 260 → REDUCED, 0 → ZERO; others: the article's). */
  vatRates?: Record<number, HsSoftVatRate>;
  /** Default `ORDER`. */
  orderType?: HsSoftOrderType;
  /** Label of the order in WaWiAssist lists (max. 40 characters, e.g. `Onlineshop`). */
  caOrderName?: string;
  /**
   * Order (delivery) date: a `Date` (its day in Zurich) or `YYYY-MM-DD`.
   * Default: the pickup / delivery day the customer chose
   * (`order.fulfillmentDate`), else the day of the payment or of the order.
   */
  date?: (order: Order) => Date | string;
  /** `HH:mm` (default: the start of the chosen time window `07:00–09:00`). */
  deliveryTime?: (order: Order) => string | null | undefined;
  tourplanId?: (order: Order) => number | null | undefined;
  /** Order note in WaWiAssist (default: number, payment, shipping, contact, customer note). */
  comment?: (order: Order) => string | null;
  /**
   * The customer has paid: by default HS-Soft keeps positions that break the
   * min/max, lot size, splitting or days-to-produce rules (all `true`) and
   * reports them as warnings.
   */
  creationOptions?: HsSoftCreationOptions;
  /** Delete the WaWiAssist order when the order is canceled (default `true`). */
  deleteCanceled?: boolean;
  /** Attempts while HS-Soft is unavailable (default 5). */
  maxAttempts?: number;
  /** Wait before the next attempt (default 5 minutes). */
  retryMinutes?: number;
  /** How far back `syncOrders()` looks (default 7 days). */
  lookbackDays?: number;
  /** An order ended `failed`, `uncertain` or `delete_failed` – e.g. email the shop. */
  onFailure?: (failure: {
    order: Order;
    sync: HsSoftOrderSync;
  }) => void | Promise<void>;
};

export type HsSoftSyncOptions = {
  shop: Shop;
  /** API key of WaWiAssist, or pass a `client`. */
  apiKey?: string;
  client?: HsSoftClient;
  products?: HsSoftProductOptions;
  orders?: HsSoftOrderOptions;
  logger?: Logger;
  now?: () => Date;
};

export type HsSoftImportSummary = {
  /** Articles loaded from HS-Soft. */
  loaded: number;
  created: number;
  updated: number;
  unchanged: number;
  /** Earlier imports set to draft / archived (`missing`). */
  deactivated: number;
  skipped: {
    articleId: number;
    articleNumber: string;
    reason: 'inactive' | 'filtered' | 'sale_unit' | 'no_price' | 'no_image';
  }[];
  failed: {
    articleId: number;
    articleNumber: string;
    error: { code: string; message: string };
  }[];
};

export type HsSoftOrdersSummary = {
  synced: number;
  retry: number;
  failed: number;
  uncertain: number;
  skipped: number;
  deleted: number;
  /** More orders were due than `limit`: run again. */
  saturated: boolean;
};

const KEY = 'hssoft';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const STALE_SENDING = 10 * MINUTE;
const DEFAULT_VAT: Record<number, HsSoftVatRate> = {
  810: 'NORMAL',
  260: 'REDUCED',
  0: 'ZERO',
};
const PIECE_UNITS: (HsSoftSaleUnit | null)[] = [
  'PIECE',
  'PIECE_AND_WEIGTH',
  null,
];
const LANGUAGE: Record<
  Locale,
  NonNullable<HsSoftOneTimeCustomer['correspondenceLanguage']>
> = { de: 'GERMAN', fr: 'FRENCH', it: 'ITALIAN', en: 'ENGLISH' };
const WEEKDAYS: [Weekday, keyof HsSoftArticle][] = [
  ['mon', 'isDeliveredMon'],
  ['tue', 'isDeliveredTue'],
  ['wed', 'isDeliveredWed'],
  ['thu', 'isDeliveredThu'],
  ['fri', 'isDeliveredFri'],
  ['sat', 'isDeliveredSat'],
  ['sun', 'isDeliveredSun'],
];

/** HS-Soft data of an imported product, `null` for other products. */
export function hsSoftProductData(product: Product): HsSoftProductData | null {
  const data = product.metadata[KEY] as HsSoftProductData | undefined;

  return data && typeof data.articleId === 'number' ? data : null;
}

/**
 * For `createShop({ allowFulfillmentDate })`: only days on which WaWiAssist
 * delivers every imported product of the cart (WooHS «Availability»).
 * Products that are not from HS-Soft do not limit the days.
 */
export function hsSoftDeliveryDays(context: FulfillmentDateContext) {
  return context.products.every((product) => {
    const data = hsSoftProductData(product);

    return !data || data.deliveryDays.includes(context.weekday);
  });
}

/** Sync state of an order, `null` before its first sync. */
export function hsSoftOrderSync(order: Order): HsSoftOrderSync | null {
  const sync = order.metadata[KEY] as HsSoftOrderSync | undefined;

  return sync && typeof sync.state === 'string' ? sync : null;
}

/**
 * HS-Soft (WaWiAssist) for the shop, like the WooHS plugin for WooCommerce:
 *
 * - `importProducts()`: articles → products (price category, special
 *   prices, weight, image, declaration, allergens, nutrition). Run it daily
 *   from a cron job; unchanged articles are not written again, products of
 *   articles that are gone become drafts.
 * - Orders → WaWiAssist: pass `onEvent` to the shop (sends placed orders,
 *   deletes canceled ones) and run `syncOrders()` every few minutes (tries
 *   again while HS-Soft is unavailable). Each order is sent once; the state
 *   (WaWiAssist order number, errors) is in `order.metadata.hssoft`.
 * - `syncOrder(id, { force: true })`: send an order again by hand.
 */
export function createHsSoftSync(options: HsSoftSyncOptions) {
  const { shop } = options;

  if (!options.client && !options.apiKey) {
    throw new Error('hssoft: pass apiKey or client');
  }

  const client = options.client ?? hsSoftClient({ apiKey: options.apiKey! });
  const now = options.now ?? (() => new Date());
  const logger: Logger = options.logger ?? {
    info: () => undefined,
    error: (obj, msg) => console.error(msg, obj),
  };
  const products = options.products ?? {};
  const orders = options.orders ?? {};
  const priceCategory = products.priceCategory ?? 1;
  const keep = new Set(products.keep ?? []);
  const missing = products.missing ?? 'draft';
  const concurrency = Math.max(1, products.concurrency ?? 4);
  const when = orders.when ?? 'placed';
  const maxAttempts = Math.max(1, orders.maxAttempts ?? 5);
  const retryMs = (orders.retryMinutes ?? 5) * MINUTE;
  const lookbackMs = (orders.lookbackDays ?? 7) * DAY;
  const deleteCanceled = orders.deleteCanceled ?? true;
  const vatRates = orders.vatRates ?? DEFAULT_VAT;

  if (
    !Number.isInteger(priceCategory) ||
    priceCategory < 1 ||
    priceCategory > 10
  ) {
    throw new Error('hssoft: priceCategory must be 1 to 10');
  }

  // ------------------------------------------------------------ products

  function mapArticle(article: HsSoftArticle, groups: number[]) {
    const recipe = article.recipe;
    const regular = rappen(article.priceCategories?.[priceCategory - 1]);
    const special =
      products.specialPrices === false
        ? null
        : (article.specialPrices ?? [])
            .filter((entry) => entry.isActual)
            .map((entry) => rappen(entry.priceCategories?.[priceCategory - 1]))
            .find(
              (price) => price !== null && regular !== null && price < regular,
            );
    const weight =
      products.weight === 'recipe'
        ? recipe?.weightInGrams
        : article.sellingWeight;
    const name = clean(products.name?.(article) ?? article.description);

    const data: Omit<HsSoftProductData, 'hash' | 'imageHash' | 'importedAt'> = {
      articleId: article.id,
      articleNumber: article.articleNumber,
      marketingGroupIds: groups,
      saleUnit: article.saleUnit ?? null,
      quantityPerLot: article.quantityPerLot ?? null,
      deliveryDays: WEEKDAYS.filter(([, field]) => article[field] === true).map(
        ([day]) => day,
      ),
      storagePlace: article.storagePlace ?? null,
      declaration: recipe?.declaration ?? null,
      consumersInformation: recipe?.consumersInformation ?? null,
      consumersStorageInfo: recipe?.consumersStorageInfo ?? null,
      allergens: (recipe?.allergens ?? []).map((allergen) => allergen.name),
      nutritionalValues: (recipe?.nutritionalValues ?? []).map((value) => ({
        label: value.label,
        amount: value.amount,
        unit: value.unit,
      })),
      attributes: {
        alcohol: recipe?.hasAlcohol ?? null,
        gluten: recipe?.hasGluten ?? null,
        glutenFree: recipe?.hasNoGluten ?? null,
        bio: recipe?.isBio ?? null,
        lactoseFree: recipe?.isLactoseFree ?? null,
        spelt: recipe?.isSpelt ?? null,
        vegan: recipe?.isVegan ?? null,
        vegetarian: recipe?.isVegetarian ?? null,
      },
      weightInGrams: recipe?.weightInGrams ?? null,
      daysShelfLife: recipe?.daysShelfLife ?? null,
      daysToSell: recipe?.daysToSell ?? null,
      daysToConsume: recipe?.daysToConsume ?? null,
    };

    const fields = {
      name: name || article.articleNumber,
      description: products.description
        ? products.description(article)
        : (recipe?.consumersInformation ?? null),
      taxRateBps: products.taxRateBps?.(article) ?? null,
      price: special ?? regular,
      compareAtPrice:
        special !== null && special !== undefined ? regular : null,
      weightGrams:
        typeof weight === 'number' && weight > 0 ? Math.round(weight) : 0,
    };

    return { data, fields, hash: hash(JSON.stringify({ data, fields })) };
  }

  async function loadImage(article: HsSoftArticle) {
    const image = await client.getArticleImage(article.id);

    if (!image.image) return null;

    return {
      base64: image.image,
      width: image.width ?? 0,
      height: image.height ?? 0,
    };
  }

  async function importProducts(
    params: {
      /** Write every article, also unchanged ones, and load the images again. */
      force?: boolean;
      /** Only these articles (no products are deactivated). */
      articleIds?: number[];
    } = {},
  ): Promise<HsSoftImportSummary> {
    const summary: HsSoftImportSummary = {
      loaded: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      deactivated: 0,
      skipped: [],
      failed: [],
    };

    const existing = await shop.listProducts({ includeArchivedVariants: true });
    const byArticle = new Map<number, (typeof existing)[number]>();
    const bySku = new Map<string, (typeof existing)[number]>();

    for (const product of existing) {
      const data = hsSoftProductData(product);

      if (data) byArticle.set(data.articleId, product);
      for (const variant of product.variants) bySku.set(variant.sku, product);
    }

    // article id → marketing groups it was listed in
    const listed = new Map<number, number[]>();

    if (params.articleIds) {
      for (const id of params.articleIds) {
        listed.set(
          id,
          byArticle.get(id)
            ? hsSoftProductData(byArticle.get(id)!)!.marketingGroupIds
            : [],
        );
      }
    } else if (products.marketingGroupIds?.length) {
      for (const group of products.marketingGroupIds) {
        for (const article of await client.listAllArticles({
          isActive: true,
          marketingGroupId: group,
        })) {
          listed.set(article.id, [...(listed.get(article.id) ?? []), group]);
        }
      }
    } else {
      for (const article of await client.listAllArticles({ isActive: true })) {
        listed.set(article.id, []);
      }
    }

    summary.loaded = listed.size;

    // products that keep their status: imported, unchanged or failed
    const present = new Set<number>();

    await eachLimited([...listed], concurrency, async ([id, groups]) => {
      let articleNumber = String(id);

      try {
        const article = await client.getArticle(id);

        articleNumber = article.articleNumber;

        const skip = (
          reason: HsSoftImportSummary['skipped'][number]['reason'],
        ) => {
          summary.skipped.push({ articleId: id, articleNumber, reason });
        };

        if (!article.isActive) return skip('inactive');
        if (products.filter && !products.filter(article))
          return skip('filtered');
        if (!PIECE_UNITS.includes(article.saleUnit ?? null))
          return skip('sale_unit');

        const mapped = mapArticle(article, groups);

        if (mapped.fields.price === null) return skip('no_price');
        if (products.requireImage && article.hasImage === false)
          return skip('no_image');

        const product = byArticle.get(id) ?? bySku.get(article.articleNumber);
        const previous = product ? hsSoftProductData(product) : null;
        const changed = params.force === true || previous?.hash !== mapped.hash;
        const wantsImage =
          Boolean(products.images) &&
          article.hasImage !== false &&
          !(product && keep.has('images')) &&
          (changed || !product?.images.length);

        if (
          product &&
          !changed &&
          !wantsImage &&
          (keep.has('status') || product.status === 'active')
        ) {
          present.add(id);
          summary.unchanged += 1;
          return;
        }

        let images: string[] | undefined;
        let imageHash = previous?.imageHash ?? null;

        if (wantsImage) {
          const image = await loadImage(article);

          if (image) {
            const digest = hash(image.base64);

            if (digest !== imageHash || !product?.images.length) {
              const url = await products.images!.save({
                articleId: article.id,
                articleNumber: article.articleNumber,
                jpeg: decodeBase64(image.base64),
                width: image.width,
                height: image.height,
              });

              images = [url, ...(product?.images.slice(1) ?? [])];
              imageHash = digest;
            }
          } else if (products.requireImage) {
            return skip('no_image');
          }
        }

        const data: HsSoftProductData = {
          ...mapped.data,
          hash: mapped.hash,
          imageHash,
          importedAt: now().toISOString(),
        };
        const { fields } = mapped;
        const variantFields = {
          price: fields.price,
          compareAtPrice: fields.compareAtPrice,
          weightGrams: fields.weightGrams,
        };

        if (!product) {
          await createProduct(
            article,
            fields,
            variantFields,
            data,
            images ?? [],
          );
          present.add(id);
          summary.created += 1;
          return;
        }

        await shop.updateProduct(product.id, {
          ...(keep.has('name') ? {} : { name: fields.name }),
          ...(keep.has('description')
            ? {}
            : { description: fields.description }),
          ...(keep.has('tax') ? {} : { taxRateBps: fields.taxRateBps }),
          ...(keep.has('status') ? {} : { status: 'active' as const }),
          ...(images ? { images } : {}),
          metadata: { ...product.metadata, [KEY]: data },
        });

        const variant = product.variants.find(
          (entry: Variant) => entry.sku === article.articleNumber,
        );
        const patch = {
          ...(keep.has('price')
            ? {}
            : {
                price: variantFields.price!,
                compareAtPrice: variantFields.compareAtPrice,
              }),
          ...(keep.has('weight')
            ? {}
            : { weightGrams: variantFields.weightGrams }),
          ...(keep.has('status') ? {} : { status: 'active' as const }),
        };

        if (variant) await shop.updateVariant(variant.id, patch);
        else {
          await shop.createVariant(product.id, {
            sku: article.articleNumber,
            price: variantFields.price!,
            compareAtPrice: variantFields.compareAtPrice,
            weightGrams: variantFields.weightGrams,
            trackStock: false,
          });
        }

        present.add(id);
        summary.updated += 1;
      } catch (error) {
        present.add(id);
        summary.failed.push({
          articleId: id,
          articleNumber,
          error: describe(error),
        });
        logger.error(
          { error, articleId: id },
          'hssoft: importing article failed',
        );
      }
    });

    if (!params.articleIds && missing !== 'keep' && !keep.has('status')) {
      for (const [articleId, product] of byArticle) {
        if (present.has(articleId) || product.status !== 'active') continue;

        await shop.updateProduct(product.id, { status: missing });
        summary.deactivated += 1;
      }
    }

    logger.info(
      {
        loaded: summary.loaded,
        created: summary.created,
        updated: summary.updated,
        failed: summary.failed.length,
      },
      'hssoft: products imported',
    );

    return summary;
  }

  async function createProduct(
    article: HsSoftArticle,
    fields: ReturnType<typeof mapArticle>['fields'],
    variant: {
      price: number | null;
      compareAtPrice: number | null;
      weightGrams: number;
    },
    data: HsSoftProductData,
    images: string[],
  ) {
    const base =
      products.slug?.(article) ??
      (slugify(fields.name) || `artikel-${slugify(article.articleNumber)}`);
    const input = {
      name: fields.name,
      description: fields.description,
      taxRateBps: fields.taxRateBps,
      kind: 'physical' as const,
      status: 'active' as const,
      images,
      metadata: { [KEY]: data },
      variants: [
        {
          sku: article.articleNumber,
          price: variant.price!,
          compareAtPrice: variant.compareAtPrice,
          weightGrams: variant.weightGrams,
          // made to order: WaWiAssist has no stock for the shop
          trackStock: false,
        },
      ],
    };

    try {
      return await shop.createProduct({ ...input, slug: base });
    } catch (error) {
      if (!isShopError(error) || error.code !== 'DUPLICATE') throw error;

      // same name as another product: the article number makes it unique
      return shop.createProduct({
        ...input,
        slug: `${base}-${slugify(article.articleNumber)}`.slice(0, 120),
      });
    }
  }

  // ------------------------------------------------------------ orders

  function eligible(order: Order) {
    if (order.status !== 'confirmed') return false;
    if (
      when === 'paid' &&
      order.paymentStatus === 'unpaid' &&
      order.paymentMethod !== 'none'
    ) {
      return false;
    }

    return orders.filter ? orders.filter(order) : true;
  }

  async function articleOf(line: OrderLine, order: Order) {
    const chosen = await orders.articleId?.(line, order);

    if (chosen !== undefined) return chosen;

    const product = await shop.getProduct(line.productId, {
      includeArchivedVariants: true,
    });

    return (product && hsSoftProductData(product)?.articleId) ?? null;
  }

  function shippingArticle(order: Order) {
    const option = orders.shippingArticleId;

    if (option === undefined || !order.shipping) return null;
    if (typeof option === 'number') return option;
    if (typeof option === 'function') return option(order);

    return option[order.shipping.rateId] ?? null;
  }

  function vatOf(rateBps: number): HsSoftVatRate | undefined {
    return vatRates[rateBps];
  }

  async function orderPayload(order: Order) {
    const positions: HsSoftOrderPosition[] = [];

    for (const line of order.lines) {
      const articleId = await articleOf(line, order);

      if (articleId === null) {
        if (line.kind === 'gift_card') continue;

        throw new ShopError(
          'HSSOFT_UNMAPPED',
          `hssoft: ${line.sku} (${line.productName}) has no HS-Soft article`,
        );
      }

      positions.push({
        articleId,
        quantity: line.quantity,
        price: chf(line.unitPrice),
        // 0, not omitted: WaWiAssist would add the customer's discount
        discount: percent(line.discount, line.subtotal),
        ...withVat(vatOf(line.taxRateBps)),
      });
    }

    if (order.shipping && order.shipping.amount > 0) {
      const articleId = shippingArticle(order);

      if (articleId !== null) {
        positions.push({
          articleId,
          quantity: 1,
          price: chf(order.shipping.amount),
          discount: percent(order.shipping.discount, order.shipping.amount),
        });
      } else if (positions.length > 0) {
        throw new ShopError(
          'HSSOFT_UNMAPPED',
          `hssoft: shipping "${order.shipping.rateId}" has no HS-Soft article (orders.shippingArticleId)`,
        );
      }
    }

    if (positions.length === 0) return null;

    const comment = orders.comment
      ? orders.comment(order)
      : defaultComment(order);
    const deliveryTime = orders.deliveryTime
      ? orders.deliveryTime(order)
      : windowStart(order.fulfillmentWindow);
    const tourplanId = orders.tourplanId?.(order);
    const body: HsSoftOrderBody = {
      date: orderDate(
        orders.date?.(order) ??
          order.fulfillmentDate ??
          order.paidAt ??
          order.createdAt,
      ),
      orderType: orders.orderType ?? 'ORDER',
      positions,
      referenceOrderNo: order.number,
      ...(orders.caOrderName
        ? { caOrderName: clean(orders.caOrderName).slice(0, 40) }
        : {}),
      ...(comment ? { notePlainText: clean(comment, true) } : {}),
      ...(deliveryTime ? { deliveryTime } : {}),
      ...(tourplanId ? { tourplanId } : {}),
      creationOptions: {
        ignoreDaysToProduce: true,
        ignoreMinMaxProblems: true,
        ignoreQuantityPerLotProblems: true,
        ignoreSplittingProblems: true,
        ...orders.creationOptions,
      },
    };
    const customerId = (await orders.customerId?.(order)) ?? null;

    if (customerId !== null) {
      return {
        customerId,
        body: {
          ...body,
          ...(order.shippingAddress
            ? {
                specialAddress: clean(
                  formatAddress(order.shippingAddress),
                  true,
                ),
              }
            : {}),
        },
      };
    }

    return { customerId: null, body, customer: oneTimeCustomer(order) };
  }

  function oneTimeCustomer(order: Order): HsSoftOneTimeCustomer {
    const address = order.billingAddress ?? order.shippingAddress;
    const delivery =
      order.billingAddress &&
      order.shippingAddress &&
      formatAddress(order.billingAddress) !==
        formatAddress(order.shippingAddress)
        ? order.shippingAddress
        : null;
    const [first = '', ...rest] = (address?.name ?? '').trim().split(/\s+/);
    const company = address?.company?.trim();
    const customer: HsSoftOneTimeCustomer = {
      ...(company
        ? {
            name: company,
            contactPerson: address!.name,
            customerAddressKindId: delivery
              ? 'COMPANY_WITH_DELIVERY_ADDRESS'
              : 'COMPANY',
          }
        : {
            name: first === '' ? order.email : first,
            surname: rest.length > 0 ? rest.join(' ') : undefined,
            customerAddressKindId: 'PRIVATE_PERSON',
          }),
      ...(address
        ? {
            street: address.line1,
            addition: address.line2 ?? undefined,
            zipCode: address.postalCode,
            city: address.city,
            country: countryName(address.country),
            phoneBusiness: address.phone ?? undefined,
          }
        : {}),
      ...(delivery
        ? {
            deliveryAddressName: [delivery.company, delivery.name]
              .filter(Boolean)
              .join(', '),
            deliveryAddressStreet: delivery.line1,
            deliveryAddressAddition: delivery.line2 ?? undefined,
            deliveryAddressZipCode: delivery.postalCode,
            deliveryAddressCity: delivery.city,
            deliveryAddressCountry: countryName(delivery.country),
          }
        : {}),
      email: order.email,
      correspondenceLanguage: LANGUAGE[order.locale],
      // the shop collects the money (online or its own QR-bill)
      invoicingIntervalId: 'DIRECT_CASH',
      ...orders.oneTimeCustomer,
    };

    return Object.fromEntries(
      Object.entries(customer)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? clean(value) : value,
        ]),
    ) as HsSoftOneTimeCustomer;
  }

  function nextSync(
    previous: HsSoftOrderSync | null,
    patch: Partial<HsSoftOrderSync> & { state: HsSoftOrderSyncState },
  ): HsSoftOrderSync {
    return {
      orderId: null,
      orderNumber: null,
      attempts: 0,
      warnings: [],
      error: null,
      nextAttemptAt: null,
      syncedAt: null,
      ...previous,
      ...patch,
      updatedAt: now().toISOString(),
    };
  }

  async function write(orderId: string, sync: HsSoftOrderSync) {
    const order = await shop.updateOrderMetadata(orderId, (metadata) => ({
      ...metadata,
      [KEY]: sync,
    }));

    return order!;
  }

  async function failed(order: Order, sync: HsSoftOrderSync) {
    logger.error(
      { orderId: order.id, number: order.number, error: sync.error },
      `hssoft: order ${sync.state}`,
    );

    try {
      await orders.onFailure?.({ order, sync });
    } catch (error) {
      logger.error({ error, orderId: order.id }, 'hssoft: onFailure failed');
    }
  }

  function isStale(sync: HsSoftOrderSync) {
    return (
      sync.state === 'sending' &&
      now().getTime() - Date.parse(sync.updatedAt) > STALE_SENDING
    );
  }

  /**
   * Sends one order to WaWiAssist. Without `force` only orders that were not
   * sent yet (or wait for a retry); with `force` also again (a second order
   * in WaWiAssist if the first one arrived – check `uncertain` ones first).
   */
  async function syncOrder(
    orderId: string,
    params: { force?: boolean } = {},
  ): Promise<HsSoftOrderSync> {
    const order = await shop.getOrder(orderId);

    if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');
    if (order.status !== 'confirmed') {
      throw new ShopError(
        'INVALID_STATE',
        `Order ${order.number} is ${order.status}, only confirmed orders go to HS-Soft`,
      );
    }

    return send(order, params.force ?? false);
  }

  async function send(order: Order, force: boolean): Promise<HsSoftOrderSync> {
    const previous = hsSoftOrderSync(order);

    if (previous) {
      if (previous.state === 'sending' && !isStale(previous)) return previous;
      if (!force && isStale(previous)) {
        const sync = nextSync(previous, {
          state: 'uncertain',
          error: {
            code: 'HSSOFT_UNAVAILABLE',
            message: 'The send did not finish: check WaWiAssist for the order',
            status: null,
            type: null,
          },
        });

        await failed(await write(order.id, sync), sync);
        return sync;
      }
      if (!force && previous.state !== 'retry') return previous;
    }

    let payload: Awaited<ReturnType<typeof orderPayload>>;

    try {
      payload = await orderPayload(order);
    } catch (error) {
      const sync = nextSync(previous, {
        state: 'failed',
        error: { ...describe(error), status: null, type: null },
        nextAttemptAt: null,
      });

      await failed(await write(order.id, sync), sync);
      return sync;
    }

    if (!payload) {
      const sync = nextSync(previous, { state: 'skipped', error: null });

      await write(order.id, sync);
      return sync;
    }

    // claim: a webhook and the cron job must not both send the order
    const sending = nextSync(previous, {
      state: 'sending',
      attempts: (previous?.attempts ?? 0) + 1,
    });
    const claimed = await shop.updateOrderMetadata(order.id, (metadata) => {
      const current = (metadata[KEY] as HsSoftOrderSync | undefined) ?? null;

      if ((current?.updatedAt ?? null) !== (previous?.updatedAt ?? null)) {
        return null;
      }

      return { ...metadata, [KEY]: sending };
    });

    if (!claimed) {
      const current = await shop.getOrder(order.id);

      return hsSoftOrderSync(current!) ?? sending;
    }

    try {
      const created =
        payload.customerId !== null
          ? await client.createOrder({
              ...payload.body,
              customerId: payload.customerId,
            })
          : await client.createOneTimeCustomerOrder({
              ...payload.body,
              customer: payload.customer,
            });
      const sync = nextSync(sending, {
        state: 'synced',
        orderId: created.id,
        orderNumber: created.orderNumber,
        warnings: created.warnings,
        error: null,
        nextAttemptAt: null,
        syncedAt: now().toISOString(),
      });

      await write(order.id, sync);
      logger.info(
        {
          orderId: order.id,
          number: order.number,
          hsSoftOrderNumber: created.orderNumber,
        },
        'hssoft: order sent',
      );

      return sync;
    } catch (error) {
      const uncertain = isHsSoftError(error) && error.details.uncertain;
      const transient =
        !uncertain &&
        (!isHsSoftError(error) || error.code === 'HSSOFT_UNAVAILABLE');
      const retry = transient && sending.attempts < maxAttempts;
      const wait = Math.max(
        retryMs,
        isHsSoftError(error) ? (error.retryAfterSeconds ?? 0) * 1000 : 0,
      );
      const sync = nextSync(sending, {
        state: uncertain ? 'uncertain' : retry ? 'retry' : 'failed',
        error: {
          ...describe(error),
          status: isHsSoftError(error) ? error.details.status : null,
          type: isHsSoftError(error) ? error.details.type : null,
        },
        nextAttemptAt: retry
          ? new Date(now().getTime() + wait).toISOString()
          : null,
      });
      const written = await write(order.id, sync);

      if (!retry) await failed(written, sync);
      else
        logger.error(
          { error, orderId: order.id },
          'hssoft: order will be sent again',
        );

      return sync;
    }
  }

  /** Deletes the WaWiAssist order of a canceled order. */
  async function removeCanceled(order: Order) {
    const previous = hsSoftOrderSync(order);

    if (previous?.state !== 'synced' || previous.orderId === null)
      return previous;

    try {
      await client.deleteOrder(previous.orderId);

      const sync = nextSync(previous, { state: 'deleted', error: null });

      await write(order.id, sync);
      return sync;
    } catch (error) {
      // unavailable: syncOrders() tries again; refused (invoiced): report
      if (
        isHsSoftError(error) &&
        error.code === 'HSSOFT_REJECTED' &&
        error.details.status !== 404
      ) {
        const sync = nextSync(previous, {
          state: 'delete_failed',
          error: {
            ...describe(error),
            status: error.details.status,
            type: error.details.type,
          },
        });

        await failed(await write(order.id, sync), sync);
        return sync;
      }
      if (isHsSoftError(error) && error.details.status === 404) {
        const sync = nextSync(previous, { state: 'deleted', error: null });

        await write(order.id, sync);
        return sync;
      }

      logger.error(
        { error, orderId: order.id },
        'hssoft: deleting the order failed',
      );
      return previous;
    }
  }

  /**
   * For the shop's `onEvent`: sends placed (or paid) orders, deletes
   * canceled ones. Failures are stored on the order, not thrown.
   */
  async function onEvent(event: ShopEvent) {
    try {
      if (
        (event.type === 'order.placed' && when === 'placed') ||
        (event.type === 'order.paid' && when === 'paid')
      ) {
        if (eligible(event.order)) await send(event.order, false);
      } else if (event.type === 'order.canceled' && deleteCanceled) {
        await removeCanceled(event.order);
      }
    } catch (error) {
      logger.error({ error, type: event.type }, 'hssoft: onEvent failed');
    }
  }

  /**
   * Sends what is due (new orders, retries) and deletes canceled orders –
   * run it every few minutes from a cron job.
   */
  async function syncOrders(
    params: { limit?: number } = {},
  ): Promise<HsSoftOrdersSummary> {
    const limit = params.limit ?? 50;
    const summary: HsSoftOrdersSummary = {
      synced: 0,
      retry: 0,
      failed: 0,
      uncertain: 0,
      skipped: 0,
      deleted: 0,
      saturated: false,
    };
    const createdAfter = new Date(now().getTime() - lookbackMs);
    let handled = 0;

    const count = (sync: HsSoftOrderSync | null) => {
      if (!sync) return;
      if (sync.state === 'synced') summary.synced += 1;
      else if (sync.state === 'retry') summary.retry += 1;
      else if (sync.state === 'failed' || sync.state === 'delete_failed')
        summary.failed += 1;
      else if (sync.state === 'uncertain') summary.uncertain += 1;
      else if (sync.state === 'skipped') summary.skipped += 1;
      else if (sync.state === 'deleted') summary.deleted += 1;
    };

    for (const status of ['confirmed', 'canceled'] as const) {
      if (status === 'canceled' && !deleteCanceled) continue;

      for (let offset = 0; ; offset += 100) {
        const page = await shop.listOrders({
          status,
          createdAfter,
          limit: 100,
          offset,
        });

        for (const order of page) {
          const sync = hsSoftOrderSync(order);
          const due =
            status === 'canceled'
              ? sync?.state === 'synced'
              : sync === null
                ? eligible(order)
                : (sync.state === 'retry' &&
                    (!sync.nextAttemptAt ||
                      Date.parse(sync.nextAttemptAt) <= now().getTime())) ||
                  isStale(sync);

          if (!due) continue;
          if (handled >= limit) {
            summary.saturated = true;
            return summary;
          }

          handled += 1;

          try {
            count(
              status === 'canceled'
                ? await removeCanceled(order)
                : await send(order, false),
            );
          } catch (error) {
            logger.error({ error, orderId: order.id }, 'hssoft: sync failed');
          }
        }

        if (page.length < 100) break;
      }
    }

    return summary;
  }

  return {
    client,
    importProducts,
    syncOrder,
    syncOrders,
    onEvent,
  };
}

export type HsSoftSync = ReturnType<typeof createHsSoftSync>;

// ------------------------------------------------------------ helpers

function rappen(chf: number | null | undefined) {
  return typeof chf === 'number' && Number.isFinite(chf) && chf >= 0
    ? Math.round(chf * 100)
    : null;
}

function chf(rappen: number) {
  return rappen / 100;
}

function percent(part: number, whole: number) {
  return whole > 0 && part > 0 ? Math.round((part / whole) * 1e6) / 1e4 : 0;
}

/** `07:00–09:00` → `07:00`. */
function windowStart(window: string | null | undefined) {
  return /^([01]\d|2[0-3]):[0-5]\d/.exec(window ?? '')?.[0] ?? null;
}

function withVat(vatRate: HsSoftVatRate | undefined) {
  return vatRate ? { vatRate } : {};
}

/** `YYYY-MM-DDT00:00:00.000Z` of the day in Zurich (WaWiAssist dates). */
function orderDate(value: Date | string) {
  const day =
    typeof value === 'string'
      ? value.slice(0, 10)
      : new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Zurich',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new ShopError(
      'INVALID_INPUT',
      `hssoft: invalid order date ${String(value)}`,
    );
  }

  return `${day}T00:00:00.000Z`;
}

/**
 * The HS-Soft API cannot store emojis and other characters outside the
 * Basic Multilingual Plane (as WooHS, they are removed).
 */
function clean(value: string, multiline = false) {
  const stripped = value
    .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/\u200D|\uFE0E|\uFE0F|\u20E3/g, '')
    .replace(multiline ? /[^\S\n]+/g : /\s+/g, ' ');

  return multiline
    ? stripped
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .trim()
    : stripped.trim();
}

function formatAddress(address: Address) {
  return [
    address.company,
    address.name,
    address.line1,
    address.line2,
    `${address.postalCode} ${address.city}`,
    address.country && address.country !== 'CH' ? address.country : null,
    address.phone,
  ]
    .filter(Boolean)
    .join('\n');
}

function countryName(code: string | null | undefined) {
  const value = (code ?? 'CH').toUpperCase();

  try {
    return new Intl.DisplayNames(['de'], { type: 'region' }).of(value) ?? value;
  } catch {
    return value;
  }
}

const PAYMENT_LABEL = {
  online: 'online bezahlt',
  invoice: 'Rechnung (QR-Rechnung des Shops)',
  none: 'nichts zu bezahlen',
} as const;

function money(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function defaultComment(order: Order) {
  return [
    `Onlineshop-Bestellung ${order.number}`,
    `Zahlung: ${PAYMENT_LABEL[order.paymentMethod]}${order.paymentStatus === 'paid' ? ' (bezahlt)' : ''}`,
    order.giftCardTotal > 0
      ? `Geschenkkarte: ${money(order.giftCardTotal, order.currency)}`
      : null,
    order.discountCode
      ? `Rabattcode ${order.discountCode}: ${money(order.discountTotal, order.currency)}`
      : null,
    order.shipping
      ? `${order.shipping.pickup ? 'Abholung' : 'Versand'}: ${order.shipping.name}`
      : null,
    order.fulfillmentDate
      ? `${order.shipping?.pickup ? 'Abholtag' : 'Liefertag'}: ${formatFulfillmentDate(order.fulfillmentDate, order.fulfillmentWindow, 'de')}`
      : null,
    `Total: ${money(order.total, order.currency)}`,
    `E-Mail: ${order.email}`,
    (order.shippingAddress?.phone ?? order.billingAddress?.phone)
      ? `Telefon: ${order.shippingAddress?.phone ?? order.billingAddress?.phone}`
      : null,
    order.note ? `Bemerkung: ${order.note}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

/** cyrb53: a short, stable digest to detect changes (not for security). */
function hash(value: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let index = 0; index < value.length; index++) {
    const char = value.charCodeAt(index);

    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function describe(error: unknown) {
  return isShopError(error)
    ? { code: error.code, message: error.message }
    : {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
      };
}

async function eachLimited<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
) {
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        await fn(items[next++]!);
      }
    }),
  );
}
