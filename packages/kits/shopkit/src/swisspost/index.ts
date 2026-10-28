import {
  type AddressCheck,
  type AddressLookup,
  type PostalLocality,
  isDomesticAddress,
  splitStreet,
} from '../address';
import type { Logger, Shop } from '../engine';
import { ShopError } from '../errors';
import type { Address, Order } from '../types';
import {
  type SwissPostClient,
  type SwissPostClientOptions,
  SwissPostError,
  type SwissPostImageFileType,
  type SwissPostLabelLayout,
  type SwissPostLabelRequest,
  type SwissPostLanguage,
  type SwissPostMessage,
  type SwissPostPrintAddresses,
  isSwissPostError,
  swissPostClient,
} from './client';

export * from './client';

/**
 * Basic services of Swiss Post for items within Switzerland and
 * Liechtenstein, with the service codes (PRZL) the label carries.
 */
export const SWISS_POST_SERVICES = {
  ECO: { przl: ['ECO'], name: 'PostPac Economy', group: 'parcel' },
  PRI: { przl: ['PRI'], name: 'PostPac Priority', group: 'parcel' },
  SMP: { przl: ['SMP'], name: 'SmallPac Economy', group: 'parcel' },
  SMPPRI: { przl: ['SMPPRI'], name: 'SmallPac Priority', group: 'parcel' },
  ECO_BULKY: {
    przl: ['SP', 'ECO'],
    name: 'Bulky goods Economy',
    group: 'parcel',
  },
  PRI_BULKY: {
    przl: ['SP', 'PRI'],
    name: 'Bulky goods Priority',
    group: 'parcel',
  },
  ECO_GAS: {
    przl: ['GAS', 'ECO'],
    name: 'PostPac Economy GAS (business reply)',
    group: 'parcel',
  },
  PRI_GAS: {
    przl: ['GAS', 'PRI'],
    name: 'PostPac Priority GAS (business reply)',
    group: 'parcel',
  },
  SEM: { przl: ['SEM'], name: 'Swiss-Express «Moon»', group: 'express' },
  SEM_BULKY: {
    przl: ['SEM', 'SP'],
    name: 'Bulky goods «Moon»',
    group: 'express',
  },
  VL: { przl: ['VL'], name: 'VinoLog', group: 'solutions' },
  VLPRI: {
    przl: ['VLPRI', 'PRI'],
    name: 'VinoLog Priority',
    group: 'solutions',
  },
  APLUS: { przl: ['APLUS'], name: 'A Mail Plus (letter)', group: 'letter' },
} as const satisfies Record<
  string,
  {
    przl: readonly string[];
    name: string;
    group: 'parcel' | 'express' | 'solutions' | 'letter';
  }
>;

export type SwissPostServiceId = keyof typeof SWISS_POST_SERVICES;

/** Additional services ("options"). */
export const SWISS_POST_ADDITIONAL_SERVICES = {
  FRA: 'Fragile',
  MAN: 'Manual processing',
  SI: 'Signature',
  AS: 'Signature (insurance)',
  RMP: 'Personal delivery',
  SA: 'Saturday delivery (Priority)',
} as const;

export type SwissPostAdditionalService =
  keyof typeof SWISS_POST_ADDITIONAL_SERVICES;

/** Delivery instructions (handling) printed on the label. */
export const SWISS_POST_DELIVERY_INSTRUCTIONS = {
  ZAW3211: 'Direct delivery to an upper floor',
  ZAW3213: 'Notify delivery by telephone (needs the phone number)',
  ZAW3214: 'Place in letterbox or at front door',
  ZAW3215: 'Deliver contents; take back box',
  ZAW3216: 'Failed delivery; return item as priority on the same day',
  ZAW3219: 'Deposit item (at `deliveryPlace`)',
  ZAW3220: 'Follow delivery information in document pouch',
  ZAW3232: 'Collect empty containers or materials for recycling (contract)',
  ZAW3234: 'Do not deliver to mailbox or neighbour: do not leave anywhere',
} as const;

export type SwissPostDeliveryInstruction =
  keyof typeof SWISS_POST_DELIVERY_INSTRUCTIONS;

/**
 * E-mails Swiss Post sends the customer about the item:
 * - `posting`: the item was handed over (with the expected delivery day)
 * - `delivery`: the item is out for delivery
 * - `reminder`: the item waits at the post office
 */
export type SwissPostNotification = 'posting' | 'delivery' | 'reminder';

const NOTIFICATION_CODES: Record<SwissPostNotification, string> = {
  posting: '1',
  delivery: '2',
  reminder: '32',
};

/** How the items of a shipping rate are sent. */
export type SwissPostShipment = {
  service: SwissPostServiceId;
  additionalServices?: SwissPostAdditionalService[];
  deliveryInstructions?: SwissPostDeliveryInstruction[];
  /** Where to deposit the item (`ZAW3219`, `Vor der Haustür`). */
  deliveryPlace?: string | null;
};

/** Your address on the label (max. 25 characters per field). */
export type SwissPostSender = {
  /** Company or first name and surname. */
  name: string;
  /** Company suffix or department. */
  name2?: string | null;
  /** Street and number. */
  street: string;
  poBox?: string | null;
  postalCode: string;
  city: string;
  country?: 'CH' | 'LI';
  /** Post office of your franking licence (`3011 Bern`). */
  domicilePostOffice?: string | null;
};

export type SwissPostLabelOptions = {
  /** A6 (105 × 148 mm, default), A5, A7 or FE (window envelope, letters). */
  layout?: SwissPostLabelLayout;
  /** PDF (default), sPDF, PNG, GIF, JPG, EPS or ZPL2 (label printers). */
  format?: SwissPostImageFileType;
  /** Printer resolution in dpi (default 300). */
  resolution?: 200 | 300 | 600;
  /** Addresses printed on the label (default sender and recipient). */
  printAddresses?: SwissPostPrintAddresses;
  /** Line above the recipient (max. 34 characters), e.g. the order number. */
  freeText?: (order: Order) => string | null;
  /** Your logo instead of the sender text (GIF, PNG or JPG, max. 50 KB). */
  logo?: {
    image: Uint8Array;
    format: 'GIF' | 'PNG' | 'JPG';
    rotation?: 0 | 90 | 180 | 270;
    aspectRatio?: 'EXPAND' | 'KEEP';
    horizontalAlign?: 'WITH_CONTENT' | 'LEFT';
    verticalAlign?: 'TOP' | 'MIDDLE';
  };
  /** Labels with SPECIMEN – for tests (default `false`). */
  preview?: boolean;
  /** Added to the weight of the goods (box, filling; default 0). */
  packagingGrams?: number;
};

export type SwissPostLabelFile = {
  identCode: string;
  /** The label: PDF, image or ZPL2. */
  file: Uint8Array;
  contentType: string;
  /** `260415-K3M9P-996004872400000002.pdf`. */
  fileName: string;
};

export type SwissPostOptions = Pick<
  SwissPostClientOptions,
  'clientId' | 'clientSecret' | 'baseUrl' | 'tokenUrl' | 'timeoutMs' | 'fetch'
> & {
  shop: Shop;
  /** Your franking licence (from Swiss Post); the items are billed to it. */
  frankingLicense: string;
  sender: SwissPostSender;
  /** Shipment per shipping rate id; other rates use `defaultShipment`. */
  rates?: Record<string, SwissPostServiceId | SwissPostShipment>;
  /** Default `{ service: 'ECO' }` (PostPac Economy). */
  defaultShipment?: SwissPostServiceId | SwissPostShipment;
  label?: SwissPostLabelOptions;
  /** Swiss Post e-mails the customer about the item (default none). */
  notifications?: SwissPostNotification[];
  /**
   * Keep the label: store the file (your bucket / CDN) and return its URL,
   * kept in the order's metadata. Without it the file is only returned.
   */
  saveLabel?: (label: SwissPostLabelFile & { order: Order }) => Promise<string>;
  /**
   * Mark the order shipped with the tracking number once the label exists
   * (default `true`): the customer gets the shipping e-mail with the link.
   */
  markShipped?: boolean;
  /**
   * `fullValidation` of the address check: the addressee must live there
   * too (default `false`: the address only; may need a contract).
   */
  fullValidation?: boolean;
  logger?: Logger;
  /** Your own client (tests, proxy); replaces the options above. */
  client?: SwissPostClient;
};

/** A label of the order, kept in `order.metadata.swisspost.labels`. */
export type SwissPostLabelRecord = {
  /** Barcode number (`996004872400000002`). */
  identCode: string;
  service: SwissPostServiceId;
  /** Service codes on the label. */
  przl: string[];
  layout: SwissPostLabelLayout;
  format: SwissPostImageFileType;
  weightGrams: number | null;
  /** Stored file (`saveLabel`), else `null`. */
  url: string | null;
  warnings: SwissPostMessage[];
  createdAt: string;
};

export type SwissPostOrderData = {
  /** Every label created for the order; the last one is current. */
  labels: SwissPostLabelRecord[];
  /** A label is being created since (ISO). */
  pending: string | null;
};

export type SwissPostLabelInput = {
  /** Instead of the shipment of the order's rate. */
  service?: SwissPostServiceId;
  additionalServices?: SwissPostAdditionalService[];
  deliveryInstructions?: SwissPostDeliveryInstruction[];
  deliveryPlace?: string | null;
  /** Instead of the weight of the goods plus `packagingGrams`. */
  weightGrams?: number | null;
  /** Another label although the order has one (lost, wrong service). */
  force?: boolean;
  /** Overrides the option of the same name. */
  markShipped?: boolean;
};

export type SwissPostLabelResult = {
  order: Order;
  label: SwissPostLabelFile & {
    /** `99.60.048724.00000002`. */
    trackingNumber: string;
    trackingUrl: string;
    /** From `saveLabel`. */
    url: string | null;
    warnings: SwissPostMessage[];
  };
};

export type SwissPost = ReturnType<typeof createSwissPost>;

const CARRIER = 'Swiss Post';
/** A label being created longer than this has failed without cleaning up. */
const PENDING_MS = 2 * 60_000;
const SUGGESTIONS = 20;

const CONTENT_TYPES: Record<
  SwissPostImageFileType,
  { type: string; extension: string }
> = {
  PDF: { type: 'application/pdf', extension: 'pdf' },
  sPDF: { type: 'application/pdf', extension: 'pdf' },
  PNG: { type: 'image/png', extension: 'png' },
  GIF: { type: 'image/gif', extension: 'gif' },
  JPG: { type: 'image/jpeg', extension: 'jpg' },
  EPS: { type: 'application/postscript', extension: 'eps' },
  ZPL2: { type: 'application/zpl', extension: 'zpl' },
};

const PO_BOX = /^(postfach|case postale|casella postale|p\.?\s?o\.? box)\b/i;

/**
 * Swiss Post for the shop: address labels with barcode and tracking for
 * orders, and address autocomplete and check for the checkout (pass it as
 * `addressLookup` to `createShopHandler`). Needs a franking licence and a
 * Digital Commerce API client of Swiss Post (scopes `DCAPI_BARCODE_READ`,
 * `DCAPI_ADDRESS_VALIDATE`, `DCAPI_ADDRESS_AUTOCOMPLETE`).
 */
export function createSwissPost(options: SwissPostOptions) {
  const { shop } = options;
  const client =
    options.client ??
    swissPostClient({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      baseUrl: options.baseUrl,
      tokenUrl: options.tokenUrl,
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
    });
  const label = options.label ?? {};
  const layout = label.layout ?? 'A6';
  const format = label.format ?? 'PDF';
  const frankingLicense = options.frankingLicense.trim().padStart(8, '0');

  if (!/^[0-9]{8}$/.test(frankingLicense)) {
    throw new Error('swisspost: frankingLicense must be 1–8 digits');
  }

  for (const shipment of [
    options.defaultShipment,
    ...Object.values(options.rates ?? {}),
  ]) {
    if (shipment !== undefined) resolveShipment(shipment);
  }

  const sender = senderFields(options.sender);
  const logo = label.logo
    ? {
        logo: base64(label.logo.image),
        logoFormat: label.logo.format,
        logoRotation: label.logo.rotation,
        logoAspectRatio: label.logo.aspectRatio,
        logoHorizontalAlign: label.logo.horizontalAlign,
        logoVerticalAlign: label.logo.verticalAlign,
      }
    : {};

  function shipmentOf(order: Order): SwissPostShipment {
    const configured =
      (order.shipping ? options.rates?.[order.shipping.rateId] : undefined) ??
      options.defaultShipment ??
      'ECO';

    return resolveShipment(configured);
  }

  /** The goods' weight plus packaging, `null` for none. */
  function weightOf(order: Order) {
    const goods = order.lines
      .filter((line) => line.kind === 'physical')
      .reduce((acc, line) => acc + line.weightGrams * line.quantity, 0);
    const total = goods + (goods > 0 ? (label.packagingGrams ?? 0) : 0);

    return total > 0 ? total : null;
  }

  function labelRequest(
    order: Order,
    shipment: SwissPostShipment,
    weightGrams: number | null,
  ): SwissPostLabelRequest {
    const address = order.shippingAddress!;
    const language = order.locale.toUpperCase() as SwissPostLanguage;
    const instructions = shipment.deliveryInstructions ?? [];
    const freeText = label.freeText?.(order);

    return {
      language,
      frankingLicense,
      customer: { ...sender, ...logo },
      customerSystem: 'agentkit shopkit',
      labelDefinition: {
        labelLayout: layout,
        printAddresses: label.printAddresses ?? 'RECIPIENT_AND_CUSTOMER',
        imageFileType: format,
        imageResolution: label.resolution ?? 300,
        ...(label.preview ? { printPreview: true } : {}),
      },
      item: {
        itemID: order.number.replace(/[^A-Za-z0-9_+-]/g, '-').slice(0, 200),
        recipient: recipientFields(
          address,
          order.email,
          // the phone is printed for "notify by telephone" only
          instructions.includes('ZAW3213'),
          (options.notifications ?? []).length > 0,
        ),
        attributes: {
          przl: [
            ...SWISS_POST_SERVICES[shipment.service].przl,
            ...(shipment.additionalServices ?? []),
            ...instructions,
          ],
          ...(freeText ? { freeText: clip(freeText, 34) } : {}),
          ...(shipment.deliveryPlace
            ? { deliveryPlace: clip(shipment.deliveryPlace, 35) }
            : {}),
          ...(weightGrams !== null ? { weight: weightGrams } : {}),
        },
        ...((options.notifications ?? []).length > 0
          ? {
              notification: [...new Set(options.notifications)].map(
                (notification) => ({
                  type: 'EMAIL' as const,
                  service: NOTIFICATION_CODES[notification],
                  language,
                  communication: { email: order.email },
                }),
              ),
            }
          : {}),
      },
    };
  }

  /** Marks the order: a label is being created (two clicks make one). */
  async function claim(orderId: string, force: boolean) {
    const startedAt = new Date();

    await shop.updateOrderMetadata(orderId, (metadata) => {
      const data = swissPostData(metadata);

      if (
        data.pending &&
        startedAt.getTime() - new Date(data.pending).getTime() < PENDING_MS
      ) {
        throw new ShopError('BUSY', 'A label for this order is being created');
      }

      if (data.labels.length > 0 && !force) {
        throw new ShopError(
          'INVALID_STATE',
          'The order has a label already (force: true creates another one)',
        );
      }

      return {
        ...metadata,
        swisspost: { ...data, pending: startedAt.toISOString() },
      };
    });
  }

  async function release(orderId: string, record?: SwissPostLabelRecord) {
    return shop.updateOrderMetadata(orderId, (metadata) => {
      const data = swissPostData(metadata);

      return {
        ...metadata,
        swisspost: {
          labels: record ? [...data.labels, record] : data.labels,
          pending: null,
        } satisfies SwissPostOrderData,
      };
    });
  }

  /**
   * Creates the address label of a confirmed order that is shipped within
   * Switzerland or Liechtenstein, keeps its barcode in
   * `order.metadata.swisspost` and marks the order shipped with the
   * tracking link. One label per order: `force` creates another one.
   */
  async function createLabel(
    orderId: string,
    input: SwissPostLabelInput = {},
  ): Promise<SwissPostLabelResult> {
    const order = await shop.getOrder(orderId);

    if (!order) throw new ShopError('ORDER_NOT_FOUND', 'Unknown order');

    if (
      order.status !== 'confirmed' ||
      (order.fulfillmentStatus !== 'unfulfilled' &&
        order.fulfillmentStatus !== 'shipped')
    ) {
      throw new ShopError(
        'INVALID_STATE',
        'Only confirmed orders that are not delivered get a label',
      );
    }

    if (!order.shipping || order.shipping.pickup || !order.shippingAddress) {
      throw new ShopError(
        'INVALID_STATE',
        'The order is not shipped (pickup or nothing to ship)',
      );
    }

    if (!isDomesticAddress(order.shippingAddress)) {
      throw new SwissPostError(
        'SWISSPOST_REJECTED',
        'swisspost: labels are for items within Switzerland and Liechtenstein',
        { status: null, errors: [] },
      );
    }

    const configured = shipmentOf(order);
    let shipment: SwissPostShipment;

    try {
      shipment = resolveShipment({
        service: input.service ?? configured.service,
        additionalServices:
          input.additionalServices ?? configured.additionalServices,
        deliveryInstructions:
          input.deliveryInstructions ?? configured.deliveryInstructions,
        deliveryPlace:
          input.deliveryPlace !== undefined
            ? input.deliveryPlace
            : configured.deliveryPlace,
      });
    } catch (error) {
      throw new ShopError('INVALID_INPUT', (error as Error).message);
    }
    const weightGrams =
      input.weightGrams !== undefined ? input.weightGrams : weightOf(order);

    if (
      weightGrams !== null &&
      (!Number.isInteger(weightGrams) ||
        weightGrams < 1 ||
        weightGrams > 99_999)
    ) {
      throw new SwissPostError(
        'SWISSPOST_REJECTED',
        'swisspost: the weight must be 1–99999 grams',
        { status: null, errors: [] },
      );
    }

    await claim(order.id, input.force === true);

    let record: SwissPostLabelRecord;
    let file: SwissPostLabelFile;
    let warnings: SwissPostMessage[];

    const request = labelRequest(order, shipment, weightGrams);

    try {
      const answer = await client.generateAddressLabel(request);
      const kind = CONTENT_TYPES[format];

      warnings = answer.item.warnings;
      file = {
        identCode: answer.item.identCode,
        file: fromBase64(answer.item.label[0]!),
        contentType: kind.type,
        fileName:
          `${order.number}-${answer.item.identCode}.${kind.extension}`.replace(
            /[^A-Za-z0-9._+-]/g,
            '-',
          ),
      };

      const url = options.saveLabel
        ? await options.saveLabel({ ...file, order })
        : null;

      record = {
        identCode: file.identCode,
        service: shipment.service,
        przl: request.item.attributes.przl,
        layout,
        format,
        weightGrams,
        url,
        warnings,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      await release(order.id).catch(() => undefined);
      throw error;
    }

    let updated = (await release(order.id, record)) ?? order;
    const trackingNumber = formatIdentCode(record.identCode);
    const trackingUrl = swissPostTrackingUrl(record.identCode);

    options.logger?.info(
      { orderId: order.id, identCode: record.identCode, warnings },
      'swisspost: label created',
    );

    if (input.markShipped ?? options.markShipped ?? true) {
      updated = await shop.markShipped({
        orderId: order.id,
        carrier: CARRIER,
        trackingNumber,
        trackingUrl,
      });
    }

    return {
      order: updated,
      label: {
        ...file,
        trackingNumber,
        trackingUrl,
        url: record.url,
        warnings,
      },
    };
  }

  /** Autocomplete must not break the checkout: failures give no hints. */
  async function quietly<T>(what: string, run: () => Promise<T>, fallback: T) {
    try {
      return await run();
    } catch (error) {
      if (isSwissPostError(error) && error.code === 'SWISSPOST_REJECTED') {
        // credentials or scope: worth a look, the customer cannot fix it
        options.logger?.error({ err: error }, `swisspost: ${what} refused`);
      }

      return fallback;
    }
  }

  async function localities(query: string): Promise<PostalLocality[]> {
    const value = query.trim();

    if (value.length < 2 || value.length > 40) return [];

    const zips = await quietly(
      'localities',
      () => client.zips({ zipCity: value }),
      [],
    );
    const seen = new Set<string>();

    return zips
      .map((zip) => ({ postalCode: zip.zip, city: zip.city27 || zip.city18 }))
      .filter((locality) => {
        const key = `${locality.postalCode} ${locality.city}`;

        if (seen.has(key)) return false;
        seen.add(key);

        return true;
      })
      .slice(0, SUGGESTIONS);
  }

  async function streets(query: {
    name: string;
    postalCode?: string | null;
  }): Promise<string[]> {
    const name = query.name.trim();
    const zip = query.postalCode?.trim() ? query.postalCode.trim() : undefined;

    if (name.length < 2 || name.length > 60) return [];
    if (zip !== undefined && !/^\d{4}$/.test(zip)) return [];

    const found = await quietly(
      'streets',
      () => client.streets({ name, zip }),
      [],
    );

    return [...new Set(found)].slice(0, SUGGESTIONS);
  }

  async function houseNumbers(query: {
    postalCode: string;
    street: string;
    number?: string | null;
  }): Promise<string[]> {
    const zip = query.postalCode.trim();
    const street = query.street.trim();

    if (!/^\d{4}$/.test(zip) || street.length < 2 || street.length > 60) {
      return [];
    }

    const found = await quietly(
      'house numbers',
      () =>
        client.houses({
          zip,
          streetname: street,
          number: query.number?.trim() ? query.number.trim() : undefined,
        }),
      [],
    );

    return found.slice(0, SUGGESTIONS);
  }

  /**
   * Checks a Swiss / Liechtenstein address with Swiss Post. Other countries
   * and failures answer `unavailable`: the checkout goes on.
   */
  async function check(address: Address): Promise<AddressCheck> {
    if (!isDomesticAddress(address))
      return { status: 'unavailable', address: null };

    const { street, houseNumber } = splitStreet(address.line1 ?? '');

    if (!street || !address.postalCode?.trim() || !address.city?.trim()) {
      return { status: 'invalid', address: null };
    }

    // a P.O. box has no house to check
    if (PO_BOX.test(street)) return { status: 'unavailable', address: null };

    const names = address.name.trim().split(/\s+/).filter(Boolean);
    const lastName = names.pop() ?? '';
    let result;

    try {
      result = await client.validateAddress(
        {
          addressee: { firstName: names.join(' '), lastName },
          geographicLocation: {
            house: {
              street,
              houseNumber: houseNumber ?? '',
              additionalAddress: '',
            },
            zip: {
              zip: address.postalCode.trim(),
              city: address.city.trim(),
            },
          },
          logisticLocation: { postBoxNumber: '' },
        },
        { fullValidation: options.fullValidation ?? false },
      );
    } catch (error) {
      if (isSwissPostError(error) && error.code === 'SWISSPOST_REJECTED') {
        options.logger?.error(
          { err: error },
          'swisspost: address check refused',
        );
      }

      return { status: 'unavailable', address: null };
    }

    if (!result) return { status: 'invalid', address: null };

    const house = result.address?.geographicLocation?.house;
    const zip = result.address?.geographicLocation?.zip;
    const suggestion: Address | null =
      house?.street && zip?.zip && zip.city
        ? {
            ...address,
            line1: [house.street, house.houseNumber].filter(Boolean).join(' '),
            postalCode: zip.zip,
            city: zip.city,
          }
        : null;
    const same =
      suggestion !== null &&
      comparable(suggestion.line1) === comparable(address.line1) &&
      comparable(suggestion.postalCode) === comparable(address.postalCode) &&
      comparable(suggestion.city) === comparable(address.city);

    if (result.quality.toUpperCase() === 'CERTIFIED') {
      return same || !suggestion
        ? { status: 'valid', address: null }
        : { status: 'corrected', address: suggestion };
    }

    return { status: 'invalid', address: same ? null : suggestion };
  }

  const lookup: AddressLookup = { localities, streets, houseNumbers, check };

  return {
    client,
    createLabel,
    /** The shipment of the order's rate (service, options, instructions). */
    shipmentOf,
    ...lookup,
    /** For `createShopHandler({ addressLookup })`. */
    addressLookup: lookup,
  };
}

/** Labels of an order (`order.metadata.swisspost`), the current one last. */
export function swissPostLabels(order: Pick<Order, 'metadata'>) {
  return swissPostData(order.metadata).labels;
}

/** `996004872400000002` → `99.60.048724.00000002` (domestic items). */
export function formatIdentCode(identCode: string) {
  const digits = identCode.replace(/\D/g, '');

  return digits.length === 18 && digits === identCode
    ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 10)}.${digits.slice(10)}`
    : identCode;
}

/** The item on Swiss Post's Track & Trace. */
export function swissPostTrackingUrl(identCode: string) {
  return `https://www.post.ch/swisspost-tracking?formattedParcelCodes=${encodeURIComponent(formatIdentCode(identCode))}`;
}

function swissPostData(metadata: Record<string, unknown>): SwissPostOrderData {
  const data = metadata.swisspost as Partial<SwissPostOrderData> | undefined;

  return {
    labels: Array.isArray(data?.labels) ? data.labels : [],
    pending: typeof data?.pending === 'string' ? data.pending : null,
  };
}

function resolveShipment(
  shipment: SwissPostServiceId | SwissPostShipment,
): SwissPostShipment {
  const resolved =
    typeof shipment === 'string' ? { service: shipment } : shipment;

  if (!(resolved.service in SWISS_POST_SERVICES)) {
    throw new Error(`swisspost: unknown service ${String(resolved.service)}`);
  }

  for (const code of resolved.additionalServices ?? []) {
    if (!(code in SWISS_POST_ADDITIONAL_SERVICES)) {
      throw new Error(`swisspost: unknown additional service ${code}`);
    }
  }

  for (const code of resolved.deliveryInstructions ?? []) {
    if (!(code in SWISS_POST_DELIVERY_INSTRUCTIONS)) {
      throw new Error(`swisspost: unknown delivery instruction ${code}`);
    }
  }

  return resolved;
}

function senderFields(sender: SwissPostSender) {
  if (!sender.name || !sender.street || !sender.postalCode || !sender.city) {
    throw new Error(
      'swisspost: sender needs name, street, postalCode and city',
    );
  }

  return {
    name1: clip(sender.name, 25),
    ...(sender.name2 ? { name2: clip(sender.name2, 25) } : {}),
    street: clip(sender.street, 25),
    ...(sender.poBox ? { pobox: clip(sender.poBox, 25) } : {}),
    zip: sender.postalCode.trim(),
    city: clip(sender.city, 25),
    country: sender.country ?? 'CH',
    ...(sender.domicilePostOffice
      ? { domicilePostOffice: clip(sender.domicilePostOffice, 35) }
      : {}),
  };
}

function recipientFields(
  address: Address,
  email: string,
  withPhone: boolean,
  withEmail: boolean,
): SwissPostLabelRequest['item']['recipient'] {
  const line1 = address.line1.trim();
  const poBox = PO_BOX.test(line1);
  const { street, houseNumber } = poBox
    ? { street: '', houseNumber: null }
    : splitStreet(line1);

  return {
    name1: clip(address.name, 35),
    ...(address.company ? { name2: clip(address.company, 35) } : {}),
    ...(address.line2 ? { addressSuffix: clip(address.line2, 35) } : {}),
    ...(poBox ? { pobox: clip(line1, 35) } : {}),
    ...(street ? { street: clip(street, 35) } : {}),
    ...(houseNumber ? { houseNo: clip(houseNumber, 10) } : {}),
    zip: address.postalCode.trim(),
    city: clip(address.city, 35),
    country: (address.country ?? 'CH').toUpperCase(),
    ...(withPhone && address.phone ? { phone: clip(address.phone, 20) } : {}),
    ...(withEmail ? { email: clip(email, 160) } : {}),
  };
}

function clip(value: string, max: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
}

/** Spelling-insensitive: `Bahnhofstr. 1` stays different, case does not. */
function comparable(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function base64(bytes: Uint8Array) {
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
