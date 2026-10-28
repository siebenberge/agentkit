# Swiss Post

`@agentkit.ch/shopkit/swisspost`: address labels with barcode for the
orders – the tracking number and the Track & Trace link go into the shipping
email – and address autocomplete and check in the checkout, with the
address data of Swiss Post (Switzerland and Liechtenstein).

Needs a franking licence and a client of the [Digital Commerce
API](https://developer.post.ch/en/digital-commerce-api) of Swiss Post. The
items are billed to the franking licence – nothing to pay at the counter.

| Export | What it is |
|---|---|
| `createSwissPost()` | The plugin: labels, shipment per rate, address lookup and check |
| `swissPostLabels()` | The labels of an order (`order.metadata.swisspost`) |
| `SWISS_POST_SERVICES`, `SWISS_POST_ADDITIONAL_SERVICES`, `SWISS_POST_DELIVERY_INSTRUCTIONS` | The codes, with names |
| `formatIdentCode()`, `swissPostTrackingUrl()` | Barcode number → `99.60.012345.00000001`, Track & Trace link |
| `swissPostClient()`, `SwissPostError`, `isSwissPostError()` | The Digital Commerce API client |
| Types | `SwissPostOptions`, `SwissPostSender`, `SwissPostShipment`, `SwissPostLabelOptions`, `SwissPostNotification`, `SwissPostLabelInput`, `SwissPostLabelResult`, `SwissPostLabelFile`, `SwissPostLabelRecord`, `SwissPostOrderData`, `SwissPostServiceId`, `SwissPostAdditionalService`, `SwissPostDeliveryInstruction`, `SwissPost`, the API types |

## Setup

### API client and scopes

Register a client for the Digital Commerce API with these scopes:

| Scope | For |
|---|---|
| `DCAPI_BARCODE_READ` | Labels (`createLabel`) |
| `DCAPI_ADDRESS_VALIDATE` | Address check (`check`, `POST /address/check`) |
| `DCAPI_ADDRESS_AUTOCOMPLETE` | Suggestions (localities, streets, house numbers) |

A scope you do not use can be left out: its calls are refused
(`SWISSPOST_REJECTED`), suggestions and the check then stay empty /
`unavailable` and the checkout goes on.

```ts
// lib/swisspost.ts
import { createSwissPost } from '@agentkit.ch/shopkit/swisspost';
import { shop } from '@/lib/shop';

export const swisspost = createSwissPost({
  shop,
  clientId: process.env.SWISSPOST_CLIENT_ID!,
  clientSecret: process.env.SWISSPOST_CLIENT_SECRET!,
  frankingLicense: '60012345',
  sender: {
    name: 'Acme GmbH',
    street: 'Bahnhofstrasse 1',
    postalCode: '8001',
    city: 'Zürich',
    domicilePostOffice: '8001 Zürich',
  },
  // service per shipping rate id (others: defaultShipment, default ECO)
  rates: {
    post: 'ECO',
    priority: { service: 'PRI', additionalServices: ['SI'] },
    samstag: { service: 'PRI', additionalServices: ['SA'] },
    sperrgut: { service: 'PRI_BULKY', deliveryInstructions: ['ZAW3211'] },
  },
  label: {
    layout: 'A6',
    format: 'PDF',
    packagingGrams: 300,
    freeText: (order) => `Bestellung ${order.number}`,
  },
  notifications: ['posting'], // Swiss Post emails the customer too
  saveLabel: ({ fileName, file }) => uploadToBucket(`labels/${fileName}`, file), // optional
});
```

```ts
// storefront: suggestions and check in <Checkout>
createShopHandler({ shop, basePath: '/api/shop', addressLookup: swisspost.addressLookup, orderUrl });
// back office (<ShopAdminProvider swisspost>) and agents: labels
createShopAdminHandler({ shop, basePath: '/api/shop-admin', authorize, swisspost });
createShopMcpHandler({ shop, authorize, swisspost });
```

## Options

### `createSwissPost()`

| Option | Type | Default | Description |
|---|---|---|---|
| `shop` | `Shop` | – | From `createShop()`. |
| `clientId`, `clientSecret` | `string` | – | OAuth client of your Digital Commerce API registration (client credentials). |
| `frankingLicense` | `string` | – | Your franking licence, 1–8 digits (padded with zeros to 8). The items are billed to it. |
| `sender` | `SwissPostSender` | – | Your address on the label, below. |
| `rates` | `Record<string, SwissPostServiceId \| SwissPostShipment>` | – | Shipment per shipping rate id. |
| `defaultShipment` | `SwissPostServiceId \| SwissPostShipment` | `'ECO'` | Shipment of the other rates. |
| `label` | `SwissPostLabelOptions` | `{}` | Layout, format, packaging, text, logo – below. |
| `notifications` | `('posting' \| 'delivery' \| 'reminder')[]` | none | Emails Swiss Post sends the customer about the item, below. |
| `saveLabel` | `(label: SwissPostLabelFile & { order }) => Promise<string>` | – | Stores the label file (your bucket / CDN) and returns its URL, kept on the order. Without it the file is only returned. |
| `markShipped` | `boolean` | `true` | Mark the order shipped with the tracking number once the label exists – the customer gets the shipping email with the link. |
| `fullValidation` | `boolean` | `false` | Address check: the addressee must live there too (may need a contract with Swiss Post); default the address only. |
| `logger` | `{ info, error }` | – | Labels created, refused lookups. |
| `baseUrl` | `string` | `https://dcapi.apis.post.ch` | API base. |
| `tokenUrl` | `string` | `https://api.post.ch/OAuth/token` | OAuth token endpoint. |
| `timeoutMs` | `number` | `20000` | Per request. |
| `fetch` | `typeof fetch` | global `fetch` | – |
| `client` | `SwissPostClient` | – | Your own `swissPostClient()` (tests, proxy); replaces the client options. |

`createSwissPost()` checks the configuration at start and throws for a
franking licence that is not 1–8 digits, an unknown service, additional
service or delivery instruction in `rates` / `defaultShipment`, a sender
without name, street, postcode or city, and missing `clientId` /
`clientSecret`.

### `sender`

Printed on the label (each field max. 25 characters, longer text is cut).

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Company, or first name and surname. |
| `name2` | `string \| null` | Company suffix or department. |
| `street` | `string` | Street and number. |
| `poBox` | `string \| null` | P.O. box. |
| `postalCode` | `string` | Postcode. |
| `city` | `string` | Locality. |
| `country` | `'CH' \| 'LI'` | Default `CH`. |
| `domicilePostOffice` | `string \| null` | Post office of your franking licence (`8001 Zürich`, max. 35). |

### Shipment per rate

A rate maps to a service code, or to a `SwissPostShipment`:

| Field | Type | Description |
|---|---|---|
| `service` | `SwissPostServiceId` | Basic service, see [Services](#services). |
| `additionalServices` | `SwissPostAdditionalService[]` | E.g. `['SI']` (signature). |
| `deliveryInstructions` | `SwissPostDeliveryInstruction[]` | E.g. `['ZAW3211']` (upper floor). |
| `deliveryPlace` | `string \| null` | Where to deposit the item with `ZAW3219` (`Vor der Haustür`, max. 35). |

`swisspost.shipmentOf(order)` returns the shipment of an order's rate.

### `label`

| Option | Type | Default | Description |
|---|---|---|---|
| `layout` | `'A5' \| 'A6' \| 'A7' \| 'FE'` | `'A6'` | A6 = 105 × 148 mm; FE = window envelope (letters). |
| `format` | `'PDF' \| 'sPDF' \| 'PNG' \| 'GIF' \| 'JPG' \| 'EPS' \| 'ZPL2'` | `'PDF'` | ZPL2 for label printers. |
| `resolution` | `200 \| 300 \| 600` | `300` | Printer resolution in dpi. |
| `printAddresses` | `'NONE' \| 'ONLY_RECIPIENT' \| 'ONLY_CUSTOMER' \| 'RECIPIENT_AND_CUSTOMER'` | `'RECIPIENT_AND_CUSTOMER'` | Addresses printed on the label. |
| `freeText` | `(order) => string \| null` | – | Line above the recipient, max. 34 characters, e.g. the order number. |
| `logo` | `{ image: Uint8Array; format: 'GIF' \| 'PNG' \| 'JPG'; rotation?; aspectRatio?; horizontalAlign?; verticalAlign? }` | – | Your logo instead of the sender text (max. 50 KB). `rotation` 0 / 90 / 180 / 270, `aspectRatio` `EXPAND` / `KEEP`, `horizontalAlign` `WITH_CONTENT` / `LEFT`, `verticalAlign` `TOP` / `MIDDLE`. |
| `preview` | `boolean` | `false` | Labels with SPECIMEN – for tests. |
| `packagingGrams` | `number` | `0` | Added to the weight of the goods (box, filling). |

### `notifications`

| Value | Swiss Post emails the customer |
|---|---|
| `posting` | The item was handed over (with the expected delivery day) |
| `delivery` | The item is out for delivery |
| `reminder` | The item waits at the post office |

With notifications the customer's email goes to Swiss Post on the label
request; without, it does not.

## Labels

### `createLabel()`

```ts
const { order, label } = await swisspost.createLabel(orderId);
// label.file (Uint8Array), label.contentType, label.fileName,
// label.trackingNumber '99.60.012345.00000001', label.trackingUrl
```

For a confirmed order that is not delivered yet (unfulfilled or shipped),
shipped – not a pickup – to Switzerland or Liechtenstein:

1. The shipment of the order's rate, with the overrides of `input`.
2. Recipient from the shipping address: name, company (`name2`), address
   line 2 (`addressSuffix`), street and house number split (`Bahnhofstrasse
   12a`, `12 rue du Lac`), a P.O. box (`Postfach …`, `Case postale …`) as
   such, postcode, locality, country. The phone only with `ZAW3213`, the
   email only with `notifications`. Fields are cut to Swiss Post's lengths
   (35, house number 10, phone 20).
3. Weight: the physical goods' weight plus `packagingGrams` (none when the
   goods weigh nothing), or `input.weightGrams`; 1–99'999 g.
4. The order number as item id; `freeText`, `deliveryPlace`, the
   language of the order.
5. The label comes back with its barcode (`identCode`); `saveLabel` stores
   the file; the record goes to `order.metadata.swisspost.labels`.
6. With `markShipped` (default) the order is marked shipped: carrier `Swiss
   Post`, the tracking number, the Track & Trace link – the shipping email
   carries them.

One label per order: a second call answers `INVALID_STATE` unless
`force: true` (lost or wrong label) – the order then gets the new tracking
number. Two calls at the same time: the second gets `BUSY` (a label is
being created; after 2 minutes a hung attempt no longer blocks). When
Swiss Post refuses, the order is free again for the next attempt.

Refused before Swiss Post is asked: an unknown order (`ORDER_NOT_FOUND`),
not confirmed or delivered (`INVALID_STATE`), a pickup or nothing to ship
(`INVALID_STATE`), an address abroad (`SWISSPOST_REJECTED`), a weight
outside 1–99'999 g (`SWISSPOST_REJECTED`), an unknown code in the input
(`INVALID_INPUT`).

### `SwissPostLabelInput`

The second argument of `createLabel()`, the body of `POST
{admin}/orders/:id/swisspost-label` and the input of the MCP tool
`swisspost_create_label`.

| Field | Type | Default | Description |
|---|---|---|---|
| `service` | `SwissPostServiceId` | the rate's | Instead of the shipment of the order's rate. |
| `additionalServices` | `SwissPostAdditionalService[]` | the rate's | Replaces the rate's list. |
| `deliveryInstructions` | `SwissPostDeliveryInstruction[]` | the rate's | Replaces the rate's list. |
| `deliveryPlace` | `string \| null` | the rate's | For `ZAW3219`. |
| `weightGrams` | `number \| null` | goods + packaging | Integer grams, 1–99'999; `null` sends no weight. |
| `force` | `boolean` | `false` | Another label although the order has one. |
| `markShipped` | `boolean` | the option | Overrides `markShipped` for this label. |

### Result and stored labels

`createLabel()` returns `{ order, label }`:

| Field of `label` | Description |
|---|---|
| `identCode` | Barcode number, `996001234500000001` |
| `trackingNumber` | Formatted: `99.60.012345.00000001` |
| `trackingUrl` | Track & Trace of Swiss Post |
| `file`, `contentType`, `fileName` | The label (`application/pdf`, `image/png`, `application/zpl` …), named `<order number>-<identCode>.<ext>` |
| `url` | From `saveLabel`, else `null` |
| `warnings` | Swiss Post's warnings (`{ code, message }`, e.g. `W…`) |

`swissPostLabels(order)` returns every label of an order, the current one
last (`SwissPostLabelRecord`):

| Field | Description |
|---|---|
| `identCode` | Barcode number |
| `service` | Service id |
| `przl` | Service codes on the label (service, additional services, instructions) |
| `layout`, `format` | As printed |
| `weightGrams` | Weight sent, or `null` |
| `url` | Stored file (`saveLabel`), or `null` |
| `warnings` | Swiss Post's warnings |
| `createdAt` | ISO time |

The file itself is not stored by shopkit: without `saveLabel` keep what
`createLabel()` returns (the back office downloads it).

### Back office route

With `swisspost` on `createShopAdminHandler`: `POST
/orders/:id/swisspost-label` with a `SwissPostLabelInput` answers the label
file itself – `content-type` of the format, `content-disposition:
attachment; filename="…"`, the tracking number in `x-tracking-number`,
`cache-control: private, no-store`. `createShopAdminClient().swisspost
.createLabel()` reads it as a `Blob`; `<ShopAdminProvider swisspost>` shows
the [label part](back-office.md#swiss-post-label-part) of each order.

## Services

### `SWISS_POST_SERVICES`

Basic services for items within Switzerland and Liechtenstein, with the
service codes (PRZL) the label carries:

| Id | Name | PRZL | Group |
|---|---|---|---|
| `ECO` | PostPac Economy | `ECO` | parcel |
| `PRI` | PostPac Priority | `PRI` | parcel |
| `SMP` | SmallPac Economy | `SMP` | parcel |
| `SMPPRI` | SmallPac Priority | `SMPPRI` | parcel |
| `ECO_BULKY` | Bulky goods Economy | `SP`, `ECO` | parcel |
| `PRI_BULKY` | Bulky goods Priority | `SP`, `PRI` | parcel |
| `ECO_GAS` | PostPac Economy GAS (business reply) | `GAS`, `ECO` | parcel |
| `PRI_GAS` | PostPac Priority GAS (business reply) | `GAS`, `PRI` | parcel |
| `SEM` | Swiss-Express «Moon» | `SEM` | express |
| `SEM_BULKY` | Bulky goods «Moon» | `SEM`, `SP` | express |
| `VL` | VinoLog | `VL` | solutions |
| `VLPRI` | VinoLog Priority | `VLPRI`, `PRI` | solutions |
| `APLUS` | A Mail Plus (letter) | `APLUS` | letter |

### Additional services

`SWISS_POST_ADDITIONAL_SERVICES`:

| Code | Service |
|---|---|
| `FRA` | Fragile |
| `MAN` | Manual processing |
| `SI` | Signature |
| `AS` | Signature (insurance) |
| `RMP` | Personal delivery |
| `SA` | Saturday delivery (Priority) |

### Delivery instructions

`SWISS_POST_DELIVERY_INSTRUCTIONS`, printed on the label:

| Code | Instruction |
|---|---|
| `ZAW3211` | Direct delivery to an upper floor |
| `ZAW3213` | Notify delivery by telephone (prints the phone number of the shipping address) |
| `ZAW3214` | Place in letterbox or at front door |
| `ZAW3215` | Deliver contents; take back box |
| `ZAW3216` | Failed delivery; return item as priority on the same day |
| `ZAW3219` | Deposit item at `deliveryPlace` |
| `ZAW3220` | Follow delivery information in document pouch |
| `ZAW3232` | Collect empty containers or materials for recycling (contract) |
| `ZAW3234` | Do not deliver to mailbox or neighbour: do not leave anywhere |

shopkit checks that the codes exist; Swiss Post checks the combination
(service, options, instructions, your licence) and refuses what does not
fit with `SWISSPOST_REJECTED` and its `E…` code in `error.details.errors`.

## Address lookup and check

### Storefront routes

`createShopHandler({ addressLookup: swisspost.addressLookup })` serves, for
`<Checkout>` ([React](react.md#checkout)):

| Route | Answer |
|---|---|
| `GET /address/localities?q=` | `{ localities: [{ postalCode, city }] }` – by the start of the postcode or the locality |
| `GET /address/streets?q=&postalCode=` | `{ streets: string[] }` – by their start, optionally in one postcode |
| `GET /address/house-numbers?postalCode=&street=&q=` | `{ houseNumbers: string[] }` – of a street, by their start |
| `POST /address/check` `{ address }` | `{ status, address }` |

- Each request asks the rate limit with route `address` (e.g. per IP);
  the suggestions are cached by CDNs (`cache-control: public,
  max-age=86400`).
- At most 20 suggestions. Queries outside the limits answer an empty list:
  localities 2–40 characters, streets 2–60, a postcode of 4 digits.
- A failing Swiss Post (outage, credentials, scope) gives no suggestions –
  never an error in the checkout; refusals are logged.
- The cart has `addressLookup: true`; without the option the routes do
  not exist.

### `check()`

`swisspost.check(address)` (also `POST /address/check` and the MCP tool
`swisspost_check_address`):

| Status | When | `address` |
|---|---|---|
| `valid` | Swiss Post knows the address as entered (case and spaces do not count) | `null` |
| `corrected` | It exists with another spelling (`Bahnhofstr. 1` → `Bahnhofstrasse 1`) | The official spelling |
| `invalid` | Not found, or street, postcode or city missing | The closest match, if there is one |
| `unavailable` | Not checked: another country, a P.O. box, Swiss Post refused or not reachable | `null` |

The name is sent as first name and last name (the last word); with
`fullValidation: true` the addressee must live there.

`swisspost.localities(query)`, `streets({ name, postalCode? })` and
`houseNumbers({ postalCode, street, number? })` are the suggestion calls.
`swisspost.addressLookup` bundles the four for the handler – the
`AddressLookup` contract, which you can also implement for another
provider.

## API client

### `swissPostClient()`

The Digital Commerce API client the plugin uses. OAuth 2 client
credentials, one access token per scope, cached until 30 seconds before it
expires; a token refused early (401) is renewed once.

```ts
import { swissPostClient } from '@agentkit.ch/shopkit/swisspost';

const post = swissPostClient({
  clientId: process.env.SWISSPOST_CLIENT_ID!,
  clientSecret: process.env.SWISSPOST_CLIENT_SECRET!,
});
const zips = await post.zips({ zipCity: '800' });
```

| Option | Type | Default |
|---|---|---|
| `clientId`, `clientSecret` | `string` | – (required) |
| `baseUrl` | `string` | `https://dcapi.apis.post.ch` |
| `tokenUrl` | `string` | `https://api.post.ch/OAuth/token` |
| `timeoutMs` | `number` | `20000` |
| `fetch` | `typeof fetch` | global `fetch` |

| Method | API | Scope | Returns |
|---|---|---|---|
| `generateAddressLabel(body)` | `POST /barcode/v1/generateAddressLabel` | `DCAPI_BARCODE_READ` | `{ labelDefinition, item: { identCode, label (base64), warnings } }` |
| `validateAddress(address, { fullValidation? })` | `POST /address/v1/addresses/validation` | `DCAPI_ADDRESS_VALIDATE` | `{ quality, address }`; `null` when not found (400 / 404) |
| `zips({ zipCity, type? })` | `GET /address/v1/zips` | `DCAPI_ADDRESS_AUTOCOMPLETE` | `{ zip, city18, city27 }[]` (`type` `DOMICILE` default, or `POSTBOX`) |
| `streets({ name, zip? })` | `GET /address/v1/streets` | `DCAPI_ADDRESS_AUTOCOMPLETE` | `string[]` |
| `houses({ zip, streetname, number? })` | `GET /address/v1/houses` | `DCAPI_ADDRESS_AUTOCOMPLETE` | `string[]` |

The request and answer types (`SwissPostLabelRequest`,
`SwissPostLabelResponse`, `SwissPostValidationAddress`,
`SwissPostValidation`) are exported.

### Errors

Failed requests throw `SwissPostError` (a `ShopError`) with `details: {
status, errors }` – `errors` are Swiss Post's codes and texts (`{ code:
'E2001', message }`, in the language of the request).

| Code | Meaning |
|---|---|
| [`SWISSPOST_REJECTED`](https://agentkit.ch/errors#shopkit-SWISSPOST_REJECTED) | Fix the credentials, scope, licence, services or address – Swiss Post will answer the same again. Also the checks before sending (address abroad, weight); then `status` is `null` and `errors` empty. |
| [`SWISSPOST_UNAVAILABLE`](https://agentkit.ch/errors#shopkit-SWISSPOST_UNAVAILABLE) | No answer, 5xx, 429, a label answer without barcode, or only the barcode service's transient codes (`E9993`, `E9994`, `E9997`, `E9999`) – try again later. |

```ts
import { isSwissPostError } from '@agentkit.ch/shopkit/swisspost';

try {
  await swisspost.createLabel(orderId, { service: 'PRI', additionalServices: ['SA'] });
} catch (error) {
  if (isSwissPostError(error) && error.code === 'SWISSPOST_REJECTED') {
    console.log(error.details.errors); // [{ code: 'E…', message: '…' }]
  }
  throw error;
}
```

## Not possible yet

Next / planned (not built yet): labels for international items and live
tariffs of Swiss Post. Shipping prices come from the shop's own
`shipping.rates` ([Configuration](configuration.md)).
