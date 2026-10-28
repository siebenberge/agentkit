import { ShopError } from '../errors';

/**
 * Client of the WawiAssist External API of HS-Soft
 * (https://api.hssoft.com/rest/docs): articles, customers and orders of one
 * company, authenticated with its API key (`x-api-key`).
 *
 * Amounts are CHF as decimal numbers (`5.5` = CHF 5.50), dates ISO 8601.
 */

export type HsSoftClientOptions = {
  /** API key of your WaWiAssist (from HS-Soft). */
  apiKey: string;
  /** Default `https://api.hssoft.com/wawi/rest`. */
  baseUrl?: string;
  /** Per request (default 30 s). */
  timeoutMs?: number;
  /**
   * How often a `503` (the only status HS-Soft says is worth retrying) is
   * tried again after its `Retry-After`, at most 10 s each (default 2).
   */
  retries?: number;
  fetch?: typeof fetch;
};

export type HsSoftSaleUnit =
  | 'PIECE'
  | '100G'
  | '1000G'
  | 'PIECE_AND_WEIGTH'
  | 'OPEN_AMOUNT'
  | 'OPEN_AMOUNT_MINUS';

export type HsSoftVatRate = 'NORMAL' | 'REDUCED' | 'ZERO';

export type HsSoftOrderType =
  | 'ORDER'
  | 'ADDITIONAL_ORDER'
  | 'RETURN'
  | 'SPECIAL_ORDER'
  | 'INTERNET_ORDER'
  | 'CATERING';

export type HsSoftInvoicingInterval =
  | 'MONTHLY'
  | 'MONTHLY2'
  | 'MONTHLY3'
  | 'MONTHLY4'
  | 'HALF_MONTHLY'
  | 'HALF_WEEKLY'
  | 'MANUAL'
  | 'DIRECT_CASH'
  | 'DIRECT_DEBITOR'
  | 'NO_INVOICE_INTERNAL';

/** Item of `GET /v1/articles`. */
export type HsSoftArticleSummary = {
  id: number;
  articleNumber: string;
  description: string;
  isFractionArticle: boolean;
  isDough: boolean;
  isActive: boolean;
  quantityPerLot: number | null;
  saleUnit: HsSoftSaleUnit | null;
  sellingWeight: number | null;
  doughArticleId: number | null;
  doughWeightBeforeBaking: number | null;
  /** Price category 1. */
  defaultPrice: number;
  /** The 10 price categories (K1 … K10), `null` when not set. */
  priceCategories: (number | null)[];
  isDeliveredMon: boolean;
  isDeliveredTue: boolean;
  isDeliveredWed: boolean;
  isDeliveredThu: boolean;
  isDeliveredFri: boolean;
  isDeliveredSat: boolean;
  isDeliveredSun: boolean;
  storagePlace: string | null;
};

export type HsSoftRecipe = {
  recipeId: number | null;
  hasAlcohol: boolean | null;
  hasGluten: boolean | null;
  hasNoGluten: boolean | null;
  consumersInformation: string | null;
  consumersStorageInfo: string | null;
  isBio: boolean | null;
  isLactoseFree: boolean | null;
  isSpelt: boolean | null;
  isVegan: boolean | null;
  isVegetarian: boolean | null;
  weightInGrams: number | null;
  daysToConsume: number | null;
  daysToSell: number | null;
  daysShelfLife: number | null;
  nutritionalValues: { amount: number; label: string; unit: string }[] | null;
  allergens: { name: string }[] | null;
  declaration: string | null;
};

/** `GET /v1/article/{id}`. */
export type HsSoftArticle = HsSoftArticleSummary & {
  discountGroupId?: number | null;
  assortmentGroupId?: number[] | null;
  hasImage?: boolean;
  recipe?: HsSoftRecipe;
  specialPrices?: {
    id: number;
    fromDate: string | null;
    toDate: string | null;
    priceCategories: (number | null)[];
    description: string | null;
    isActual: boolean;
  }[];
};

export type HsSoftArticleImage = {
  id: number;
  /** Base64 JPEG (at most 400 × 400), `null` when the article has none. */
  image: string | null;
  width: number | null;
  height: number | null;
};

export type HsSoftArticleQuery = {
  isActive?: boolean;
  discountGroupId?: number;
  articleListId?: number;
  assortimentGroupId?: number;
  marketingGroupId?: number;
  productionGroupId?: number;
  shippingPointId?: number;
  /** 1–100 (default 100). */
  limit?: number;
  offset?: number;
};

export type HsSoftOrderPosition = {
  articleId: number;
  quantity: number;
  vatRate?: HsSoftVatRate;
  /** Unit price; omitted → the customer's price in WaWiAssist. */
  price?: number;
  /** Percent (0–100); omitted → the customer's discount in WaWiAssist. */
  discount?: number;
  indTextDeliveryNote?: string;
  indTextProduction?: string;
  splittingPartsPreset?: string[];
};

export type HsSoftCreationOptions = {
  ignoreDaysToProduce?: boolean;
  ignoreMinMaxProblems?: boolean;
  ignoreQuantityPerLotProblems?: boolean;
  ignoreSplittingProblems?: boolean;
};

/** Fields of `POST /v1/orders` and `POST /v1/one-time-customer-orders`. */
export type HsSoftOrderBody = {
  /** Order (delivery) date, ISO date-time. */
  date: string;
  orderType?: HsSoftOrderType;
  positions: HsSoftOrderPosition[];
  /** Label shown instead of the order type (max. 40 characters). */
  caOrderName?: string | null;
  specialAddress?: string;
  referenceOrderNo?: string;
  /** `HH:mm`. */
  deliveryTime?: string;
  tourplanId?: number;
  note?: string;
  note2?: string;
  notePlainText?: string;
  creationOptions?: HsSoftCreationOptions;
};

export type HsSoftOneTimeCustomer = {
  /** First name or company name. */
  name: string;
  surname?: string;
  salutation?: string;
  addition?: string;
  street?: string;
  postBox?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  customerAddressKindId?:
    'COMPANY' | 'COMPANY_WITH_DELIVERY_ADDRESS' | 'PRIVATE_PERSON';
  deliveryAddressSalutation?: string;
  deliveryAddressName?: string;
  deliveryAddressAddition?: string;
  deliveryAddressStreet?: string;
  deliveryAddressPostBox?: string;
  deliveryAddressZipCode?: string;
  deliveryAddressCity?: string;
  deliveryAddressCountry?: string;
  email?: string;
  emailForInvoice?: string;
  phoneBusiness?: string;
  contactPerson?: string;
  paymentPeriod?: number;
  invoicingIntervalId?: HsSoftInvoicingInterval;
  orderReportId?: number;
  correspondenceLanguage?: 'ENGLISH' | 'GERMAN' | 'FRENCH' | 'ITALIAN';
  subCompanyId?: number;
};

export type HsSoftWarning = { type: string; message: string };

export type HsSoftCreatedOrder = {
  id: number;
  orderNumber: number;
  /** Positions the rules dropped (min/max, lot size, splitting, days). */
  warnings: HsSoftWarning[];
};

/** Item of `GET /v1/orders`. */
export type HsSoftOrderSummary = {
  id: number;
  orderNumber: number;
  orderDate: string | null;
  orderTotal: number | null;
  orderType: string;
  customerId: number;
  isDeleted: boolean;
  invoiceNumber: number | null;
};

/** `GET /v1/order/{id}` (the fields shopkit reads). */
export type HsSoftOrder = HsSoftOrderSummary & {
  isEditable: boolean;
  referenceOrderNo: string | null;
  positions: {
    id: number;
    articleId: number | null;
    articleNumber: string | null;
    quantity: number | null;
    price: number | null;
    total: number | null;
  }[];
};

type ErrorItem = {
  type?: string;
  message?: string;
  ref?: { entity: string; id: number | string; location: 'body' | 'path' };
};

type Envelope<T> = {
  data?: T;
  meta?: { pagination?: { limit?: number; offset?: number } } | null;
  errors?: ErrorItem[] | null;
};

/**
 * Failed HS-Soft request. `HSSOFT_UNAVAILABLE`: try again later;
 * `HSSOFT_REJECTED`: fix the key, channel or content – HS-Soft will answer
 * the same again. `uncertain`: the answer did not say whether the request
 * was processed (gateway error, timeout) – check in WaWiAssist before an
 * order is sent again.
 */
export class HsSoftError extends ShopError {
  constructor(
    code: 'HSSOFT_REJECTED' | 'HSSOFT_UNAVAILABLE',
    message: string,
    readonly details: {
      /** HTTP status, `null` without an answer. */
      status: number | null;
      /** HS-Soft error type (`ORDER_DATE_LOCKED`, `CHANNEL_NOT_ALLOWED`, …). */
      type: string | null;
      /** Entity the error is about (`{ entity: 'article', id: 100010 }`). */
      ref: ErrorItem['ref'] | null;
      uncertain: boolean;
    },
    retryAfterSeconds?: number,
  ) {
    super(code, message, retryAfterSeconds);
    this.name = 'HsSoftError';
  }
}

export function isHsSoftError(error: unknown): error is HsSoftError {
  return error instanceof HsSoftError;
}

export type HsSoftClient = ReturnType<typeof hsSoftClient>;

export function hsSoftClient(options: HsSoftClientOptions) {
  const baseUrl = (
    options.baseUrl ?? 'https://api.hssoft.com/wawi/rest'
  ).replace(/\/+$/, '');
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const retries = options.retries ?? 2;

  if (!options.apiKey) throw new Error('hssoft: apiKey is required');

  async function request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    params: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    } = {},
  ): Promise<Envelope<T>> {
    const url = new URL(`${baseUrl}${path}`);

    for (const [key, value] of Object.entries(params.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; ; attempt++) {
      let response: Response;

      try {
        response = await doFetch(url, {
          method,
          headers: {
            accept: 'application/json',
            'accept-encoding': 'gzip',
            'x-api-key': options.apiKey,
            ...(params.body !== undefined
              ? { 'content-type': 'application/json' }
              : {}),
          },
          body:
            params.body !== undefined ? JSON.stringify(params.body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new HsSoftError(
          'HSSOFT_UNAVAILABLE',
          `hssoft: ${method} ${path} got no answer (${error instanceof Error ? error.message : String(error)})`,
          { status: null, type: null, ref: null, uncertain: method !== 'GET' },
        );
      }

      let envelope: Envelope<T> | null = null;

      try {
        envelope = (await response.json()) as Envelope<T>;
      } catch {
        envelope = null;
      }

      if (response.ok && envelope) return envelope;
      // a DELETE may answer 204 No Content
      if (response.ok && method === 'DELETE') return {};

      const item = envelope?.errors?.[0];
      const header = response.headers.get('retry-after');
      const retryAfter = header === null ? Number.NaN : Number(header);
      const retryAfterSeconds =
        Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : 1;

      if (response.status === 503 && item) {
        if (attempt < retries) {
          await sleep(Math.min(retryAfterSeconds, 10) * 1000);
          continue;
        }

        throw new HsSoftError(
          'HSSOFT_UNAVAILABLE',
          `hssoft: ${method} ${path} – ${item.message ?? 'service unavailable'}`,
          {
            status: 503,
            type: item.type ?? null,
            ref: item.ref ?? null,
            uncertain: false,
          },
          retryAfterSeconds,
        );
      }

      // a gateway answer without `errors` (CloudFront 504, bodyless 500):
      // the request may or may not have been processed
      if (!item && (response.status >= 500 || response.ok)) {
        throw new HsSoftError(
          'HSSOFT_UNAVAILABLE',
          `hssoft: ${method} ${path} – HTTP ${response.status} without an answer`,
          {
            status: response.status,
            type: null,
            ref: null,
            uncertain: method !== 'GET',
          },
        );
      }

      throw new HsSoftError(
        'HSSOFT_REJECTED',
        `hssoft: ${method} ${path} – HTTP ${response.status}${item?.type ? ` ${item.type}` : ''}${item?.message ? `: ${item.message}` : ''}`,
        {
          status: response.status,
          type: item?.type ?? null,
          ref: item?.ref ?? null,
          uncertain: false,
        },
      );
    }
  }

  /** `uncertain`: the request may have changed something (a POST). */
  function data<T>(envelope: Envelope<T>, what: string, uncertain = false): T {
    if (envelope.data === undefined || envelope.data === null) {
      throw new HsSoftError(
        'HSSOFT_UNAVAILABLE',
        `hssoft: ${what} – answer without data`,
        { status: 200, type: null, ref: null, uncertain },
      );
    }

    return envelope.data;
  }

  function page(query: { limit?: number; offset?: number }) {
    return {
      limit: Math.min(Math.max(query.limit ?? 100, 1), 100),
      offset: Math.max(query.offset ?? 0, 0),
    };
  }

  function created(
    envelope: Envelope<{
      id: number;
      orderNumber: number;
      warnings?: HsSoftWarning[] | null;
    }>,
  ): HsSoftCreatedOrder {
    const order = data(envelope, 'order', true);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      warnings: order.warnings ?? [],
    };
  }

  async function listArticles(query: HsSoftArticleQuery = {}) {
    return data(
      await request<HsSoftArticleSummary[]>('GET', '/v1/articles', {
        query: { ...query, ...page(query) },
      }),
      'articles',
    );
  }

  return {
    baseUrl,
    listArticles,

    /** Every article of the query, page by page. */
    async listAllArticles(
      query: Omit<HsSoftArticleQuery, 'limit' | 'offset'> = {},
    ) {
      const all: HsSoftArticleSummary[] = [];

      for (let offset = 0; ; offset += 100) {
        const items = await listArticles({ ...query, limit: 100, offset });

        all.push(...items);
        if (items.length < 100) return all;
      }
    },

    async getArticle(id: number) {
      return data(
        await request<HsSoftArticle>('GET', `/v1/article/${id}`),
        `article ${id}`,
      );
    },

    async getArticleImage(id: number) {
      return data(
        await request<HsSoftArticleImage>('GET', `/v1/article/${id}/image`),
        `article ${id} image`,
      );
    },

    async createOrder(body: HsSoftOrderBody & { customerId: number }) {
      return created(await request('POST', '/v1/orders', { body }));
    },

    /** Creates a one-time customer and the order for it. */
    async createOneTimeCustomerOrder(
      body: HsSoftOrderBody & { customer: HsSoftOneTimeCustomer },
    ) {
      return created(
        await request('POST', '/v1/one-time-customer-orders', { body }),
      );
    },

    /**
     * Ids of the articles the customer can order for `date` (`YYYY-MM-DD`):
     * WaWiAssist applies assortment, delivery days and lead times.
     */
    async listArticlesAvailableForOrder(query: {
      date: string;
      customerId: number;
    }) {
      const ids: number[] = [];

      for (let offset = 0; ; offset += 100) {
        const page = data(
          await request<{ items: { id: number; articleNumber: string }[] }>(
            'GET',
            '/v1/articles-available-for-order',
            {
              query: {
                date: `${query.date}T00:00:00.000Z`,
                customerId: query.customerId,
                limit: 100,
                offset,
              },
            },
          ),
          'available articles',
        );

        ids.push(...page.items.map((item) => item.id));
        if (page.items.length < 100) return ids;
      }
    },

    async getOrder(id: number) {
      return data(
        await request<HsSoftOrder>('GET', `/v1/order/${id}`),
        `order ${id}`,
      );
    },

    async listOrders(query: {
      dateFrom: string;
      dateTo: string;
      customerId?: number;
      orderType?: HsSoftOrderType;
      limit?: number;
      offset?: number;
    }) {
      return data(
        await request<HsSoftOrderSummary[]>('GET', '/v1/orders', {
          query: { ...query, ...page(query) },
        }),
        'orders',
      );
    },

    /** Soft-deletes an order (not possible once it is invoiced: 409). */
    async deleteOrder(id: number) {
      await request('DELETE', `/v1/order/${id}`);
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
