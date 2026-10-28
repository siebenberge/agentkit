/**
 * Services of Swiss Post and Track & Trace – plain data without
 * dependencies, also for the browser (the back office components).
 */

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
