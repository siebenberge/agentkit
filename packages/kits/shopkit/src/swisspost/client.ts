import { ShopError } from '../errors';

/**
 * Client of the Digital Commerce API of Swiss Post
 * (https://developer.post.ch/en/digital-commerce-api): address labels with
 * barcode, address validation and address autocomplete. OAuth 2 client
 * credentials; one access token per scope, cached until it expires.
 */

export type SwissPostClientOptions = {
  /** OAuth client of your Digital Commerce API registration. */
  clientId: string;
  clientSecret: string;
  /** Default `https://dcapi.apis.post.ch`. */
  baseUrl?: string;
  /** Default `https://api.post.ch/OAuth/token`. */
  tokenUrl?: string;
  /** Per request (default 20 s). */
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export type SwissPostScope =
  | 'DCAPI_BARCODE_READ'
  | 'DCAPI_ADDRESS_VALIDATE'
  | 'DCAPI_ADDRESS_AUTOCOMPLETE';

export type SwissPostLanguage = 'DE' | 'FR' | 'IT' | 'EN';

/** `E2001` / `W2022` with its text in the request's language. */
export type SwissPostMessage = { code: string; message: string };

export type SwissPostLabelLayout = 'A5' | 'A6' | 'A7' | 'FE';

export type SwissPostImageFileType =
  'PDF' | 'sPDF' | 'PNG' | 'GIF' | 'JPG' | 'EPS' | 'ZPL2';

export type SwissPostPrintAddresses =
  'NONE' | 'ONLY_RECIPIENT' | 'ONLY_CUSTOMER' | 'RECIPIENT_AND_CUSTOMER';

/** `POST /barcode/v1/generateAddressLabel` (the fields shopkit sends). */
export type SwissPostLabelRequest = {
  language: SwissPostLanguage;
  /** Franking licence, left-padded with zeros to 8 digits. */
  frankingLicense: string;
  ppFranking?: boolean;
  /** Sender (max. 25 characters per field). */
  customer: {
    name1: string;
    name2?: string;
    street: string;
    pobox?: string;
    zip: string;
    city: string;
    country?: string;
    domicilePostOffice?: string;
    /** Base64 GIF, PNG or JPG, max. 50 KB. */
    logo?: string;
    logoFormat?: 'GIF' | 'PNG' | 'JPG';
    logoRotation?: 0 | 90 | 180 | 270;
    logoAspectRatio?: 'EXPAND' | 'KEEP';
    logoHorizontalAlign?: 'WITH_CONTENT' | 'LEFT';
    logoVerticalAlign?: 'TOP' | 'MIDDLE';
  };
  customerSystem?: string;
  labelDefinition: {
    labelLayout: SwissPostLabelLayout;
    printAddresses: SwissPostPrintAddresses;
    imageFileType: SwissPostImageFileType;
    imageResolution: 200 | 300 | 600;
    /** SPECIMEN on the label. */
    printPreview?: boolean;
  };
  sendingID?: string;
  item: {
    /** Returned unchanged: A–Z, a–z, 0–9, `_`, `-`, `+`. */
    itemID?: string;
    /** Max. 35 characters per field (house number 10, phone 20). */
    recipient: {
      title?: string;
      personallyAddressed?: boolean;
      firstName?: string;
      name1: string;
      name2?: string;
      name3?: string;
      addressSuffix?: string;
      street?: string;
      houseNo?: string;
      pobox?: string;
      zip?: string;
      city: string;
      country?: string;
      phone?: string;
      mobile?: string;
      email?: string;
    };
    attributes: {
      /** Basic and additional services, delivery instructions (`PRI`, `SI`, `ZAW3213`). */
      przl: string[];
      /** Printed above the address, max. 34 characters. */
      freeText?: string;
      /** Drop point for `ZAW3219`. */
      deliveryPlace?: string;
      /** Grams, 1–99'999. */
      weight?: number;
    };
    notification?: {
      type: 'EMAIL' | 'SMS';
      service: string;
      language: SwissPostLanguage;
      communication: { email?: string; mobile?: string };
      freeText1?: string;
    }[];
  };
};

export type SwissPostLabelResponse = {
  labelDefinition: {
    labelLayout: string;
    imageFileType: string;
    imageResolution: number;
    printPreview?: boolean;
    colorPrintRequired?: boolean;
  };
  item: {
    itemID?: string;
    /** Barcode number of the item (`996004872400000002`). */
    identCode: string;
    /** The label, base64. */
    label: string[];
    warnings: SwissPostMessage[];
  };
};

/** Address of `POST /address/v1/addresses/validation`. */
export type SwissPostValidationAddress = {
  addressee?: { firstName?: string; lastName?: string };
  geographicLocation: {
    house: { street: string; houseNumber: string; additionalAddress?: string };
    zip: { zip: string; city: string };
  };
  logisticLocation?: { postBoxNumber?: string };
};

export type SwissPostValidation = {
  /** `CERTIFIED`: the address exists. */
  quality: string;
  address: {
    type?: string;
    geographicLocation?: {
      house?: {
        street?: string;
        houseNumber?: string;
        additionalAddress?: string;
        houseKey?: string;
      };
      zip?: { zip?: string; city?: string };
    };
  } | null;
};

/**
 * Failed Swiss Post request. `SWISSPOST_UNAVAILABLE`: try again later;
 * `SWISSPOST_REJECTED`: fix the credentials, licence, services or address –
 * Swiss Post will answer the same again (`details.errors` says why).
 */
export class SwissPostError extends ShopError {
  constructor(
    code: 'SWISSPOST_REJECTED' | 'SWISSPOST_UNAVAILABLE',
    message: string,
    readonly details: {
      /** HTTP status, `null` without an answer (or checked before sending). */
      status: number | null;
      /** Swiss Post error codes and texts (`E2001`, …). */
      errors: SwissPostMessage[];
    },
  ) {
    super(code, message);
    this.name = 'SwissPostError';
  }
}

export function isSwissPostError(error: unknown): error is SwissPostError {
  return error instanceof SwissPostError;
}

/** Codes of the barcode service that mean "not now", not "not like this". */
const TRANSIENT_CODES = new Set(['E9993', 'E9994', 'E9997', 'E9999']);

export type SwissPostClient = ReturnType<typeof swissPostClient>;

export function swissPostClient(options: SwissPostClientOptions) {
  const baseUrl = (options.baseUrl ?? 'https://dcapi.apis.post.ch').replace(
    /\/+$/,
    '',
  );
  const tokenUrl = options.tokenUrl ?? 'https://api.post.ch/OAuth/token';
  const doFetch = options.fetch ?? ((...args) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? 20_000;
  const tokens = new Map<
    SwissPostScope,
    Promise<{ token: string; expiresAt: number }>
  >();

  if (!options.clientId || !options.clientSecret) {
    throw new Error('swisspost: clientId and clientSecret are required');
  }

  async function send(url: string, init: RequestInit, what: string) {
    try {
      return await doFetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new SwissPostError(
        'SWISSPOST_UNAVAILABLE',
        `swisspost: ${what} got no answer (${error instanceof Error ? error.message : String(error)})`,
        { status: null, errors: [] },
      );
    }
  }

  async function fetchToken(scope: SwissPostScope) {
    const response = await send(
      tokenUrl,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: options.clientId,
          client_secret: options.clientSecret,
          scope,
        }).toString(),
      },
      'token',
    );
    const body = (await response.json().catch(() => null)) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } | null;

    if (!response.ok || !body?.access_token) {
      throw new SwissPostError(
        response.status >= 500 || response.status === 429
          ? 'SWISSPOST_UNAVAILABLE'
          : 'SWISSPOST_REJECTED',
        `swisspost: token for ${scope} – HTTP ${response.status}${body?.error ? ` ${body.error}` : ''}${body?.error_description ? `: ${body.error_description}` : ''}`,
        { status: response.status, errors: [] },
      );
    }

    // renew 30 s early: a token must not expire on its way
    const seconds = Math.max((body.expires_in ?? 300) - 30, 0);

    return { token: body.access_token, expiresAt: Date.now() + seconds * 1000 };
  }

  async function token(scope: SwissPostScope) {
    const cached = tokens.get(scope);

    if (cached) {
      const current = await cached.catch(() => null);

      if (current && current.expiresAt > Date.now()) return current.token;
      // a renewal started meanwhile
      if (tokens.get(scope) !== cached) return token(scope);
    }

    const pending = fetchToken(scope);

    tokens.set(scope, pending);
    pending.catch(() => {
      if (tokens.get(scope) === pending) tokens.delete(scope);
    });

    return (await pending).token;
  }

  async function request<T>(
    scope: SwissPostScope,
    method: 'GET' | 'POST',
    path: string,
    params: {
      query?: Record<string, string | undefined>;
      body?: unknown;
      /** Statuses that mean "nothing found" rather than an error. */
      empty?: number[];
    } = {},
  ): Promise<T | null> {
    const url = new URL(`${baseUrl}${path}`);

    for (const [key, value] of Object.entries(params.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    for (let attempt = 0; ; attempt++) {
      const response = await send(
        url.toString(),
        {
          method,
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${await token(scope)}`,
            ...(params.body !== undefined
              ? { 'content-type': 'application/json' }
              : {}),
          },
          body:
            params.body !== undefined ? JSON.stringify(params.body) : undefined,
        },
        `${method} ${path}`,
      );

      // a token revoked before its time: once with a new one
      if (response.status === 401 && attempt === 0) {
        tokens.delete(scope);
        continue;
      }

      const body = (await response.json().catch(() => null)) as T | null;

      if (response.ok) return body;
      if (params.empty?.includes(response.status)) return null;

      const errors = messages(body, 'errors');

      throw new SwissPostError(
        response.status >= 500 || response.status === 429
          ? 'SWISSPOST_UNAVAILABLE'
          : 'SWISSPOST_REJECTED',
        `swisspost: ${method} ${path} – HTTP ${response.status}${errors.length > 0 ? `: ${describe(errors)}` : ''}`,
        { status: response.status, errors },
      );
    }
  }

  return {
    baseUrl,

    /** Address label with barcode (scope `DCAPI_BARCODE_READ`). */
    async generateAddressLabel(
      body: SwissPostLabelRequest,
    ): Promise<SwissPostLabelResponse> {
      const answer = await request<{
        labelDefinition?: SwissPostLabelResponse['labelDefinition'];
        item?: {
          itemID?: string;
          identCode?: string;
          label?: string[];
          errors?: unknown;
          warnings?: unknown;
        };
      }>('DCAPI_BARCODE_READ', 'POST', '/barcode/v1/generateAddressLabel', {
        body,
      });
      const item = answer?.item;
      const errors = messages(item, 'errors');

      if (errors.length > 0) {
        throw new SwissPostError(
          errors.every((error) => TRANSIENT_CODES.has(error.code))
            ? 'SWISSPOST_UNAVAILABLE'
            : 'SWISSPOST_REJECTED',
          `swisspost: label refused – ${describe(errors)}`,
          { status: 200, errors },
        );
      }

      if (!answer?.labelDefinition || !item?.identCode || !item.label?.[0]) {
        throw new SwissPostError(
          'SWISSPOST_UNAVAILABLE',
          'swisspost: label answer without barcode or image',
          { status: 200, errors: [] },
        );
      }

      return {
        labelDefinition: answer.labelDefinition,
        item: {
          itemID: item.itemID,
          identCode: item.identCode,
          label: item.label,
          warnings: messages(item, 'warnings'),
        },
      };
    },

    /** Checks an address (scope `DCAPI_ADDRESS_VALIDATE`). */
    async validateAddress(
      address: SwissPostValidationAddress,
      options: { fullValidation?: boolean } = {},
    ): Promise<SwissPostValidation | null> {
      const answer = await request<{
        quality?: string;
        address?: SwissPostValidation['address'];
      }>('DCAPI_ADDRESS_VALIDATE', 'POST', '/address/v1/addresses/validation', {
        body: { ...address, fullValidation: options.fullValidation ?? false },
        // 400: "invalid address parameter", 404: not found
        empty: [400, 404],
      });

      if (!answer) return null;

      return { quality: answer.quality ?? '', address: answer.address ?? null };
    },

    /**
     * Localities by the start of the postcode or name (scope
     * `DCAPI_ADDRESS_AUTOCOMPLETE`). `city18` is the short name for labels.
     */
    async zips(query: { zipCity: string; type?: 'DOMICILE' | 'POSTBOX' }) {
      const answer = await request<{
        zips?: { zip: string; city18: string; city27: string }[];
      }>('DCAPI_ADDRESS_AUTOCOMPLETE', 'GET', '/address/v1/zips', {
        query: { zipCity: query.zipCity, type: query.type ?? 'DOMICILE' },
        empty: [404],
      });

      return answer?.zips ?? [];
    },

    /** Street names by their start (scope `DCAPI_ADDRESS_AUTOCOMPLETE`). */
    async streets(query: { name: string; zip?: string }) {
      const answer = await request<{ streets?: string[] }>(
        'DCAPI_ADDRESS_AUTOCOMPLETE',
        'GET',
        '/address/v1/streets',
        { query: { name: query.name, zip: query.zip }, empty: [404] },
      );

      return answer?.streets ?? [];
    },

    /** House numbers of a street (scope `DCAPI_ADDRESS_AUTOCOMPLETE`). */
    async houses(query: { zip: string; streetname: string; number?: string }) {
      const answer = await request<{ houses?: string[] }>(
        'DCAPI_ADDRESS_AUTOCOMPLETE',
        'GET',
        '/address/v1/houses',
        {
          query: {
            zip: query.zip,
            streetname: query.streetname,
            number: query.number,
          },
          empty: [404],
        },
      );

      return answer?.houses ?? [];
    },
  };
}

/** Errors / warnings of an answer: a list, or `{ error: [...] }`. */
function messages(value: unknown, key: 'errors' | 'warnings') {
  const raw = (value as Record<string, unknown> | null | undefined)?.[key];
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw).flat()
      : [];

  return list.flatMap((entry): SwissPostMessage[] => {
    if (!entry || typeof entry !== 'object') return [];

    const { code, message } = entry as { code?: unknown; message?: unknown };
    const text = (value: unknown) =>
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';

    return code === undefined && message === undefined
      ? []
      : [{ code: text(code), message: text(message) }];
  });
}

function describe(errors: SwissPostMessage[]) {
  return errors
    .map((error) => [error.code, error.message].filter(Boolean).join(' '))
    .join('; ');
}
