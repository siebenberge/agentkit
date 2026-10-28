# Storage adapters

shopkit stores everything through a `StorageAdapter`: five members, the
same contract as subkit's. `drizzleAdapter` (Postgres) and `memoryAdapter`
(tests) ship with the package; any other store works with your own adapter.
Prisma and Kysely adapters are planned, not built.

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzleAdapter } from '@agentkit.ch/shopkit/drizzle';

const db = drizzle(postgres(process.env.DATABASE_URL!));
export const shop = createShop({ database: drizzleAdapter(db) });
```

## The StorageAdapter contract

### Models

The engine works with seven models (`ModelMap`), plain objects with the
fields of their types in `@agentkit.ch/shopkit`:

| Model | Type | Drizzle table |
|---|---|---|
| `product` | `Product` | `shop_products` |
| `variant` | `Variant` | `shop_variants` |
| `cart` | `Cart` | `shop_carts` |
| `discount` | `Discount` | `shop_discounts` |
| `giftCard` | `GiftCard` | `shop_gift_cards` |
| `order` | `Order` | `shop_orders` |
| `paymentMethod` | `PaymentMethod` | `shop_payment_methods` |

Timestamps are `Date`s, amounts integers, nested data (`images`, `items`,
`lines`, `refunds`, addresses, `metadata` …) plain JSON values. Missing
values are `null`.

### Methods

```ts
interface StorageAdapter {
  id: string;
  create<M extends ModelName>(model: M, data: ModelMap[M]): Promise<ModelMap[M]>;
  findOne<M extends ModelName>(model: M, where: Where<M>[]): Promise<ModelMap[M] | null>;
  findMany<M extends ModelName>(model: M, options?: FindManyOptions<M>): Promise<ModelMap[M][]>;
  update<M extends ModelName>(
    model: M,
    where: Where<M>[],
    patch: Partial<ModelMap[M]>,
  ): Promise<ModelMap[M] | null>;
  transaction?<R>(fn: (adapter: StorageAdapter) => Promise<R>): Promise<R>;
}
```

| Member | Must |
|---|---|
| `id` | Name for logs (`drizzle-pg`, `memory`) |
| `create` | Store the row as given (the engine generates the ids) and return it. Reject duplicates of unique fields (see below) |
| `findOne` | Return the first row matching all conditions, or `null` |
| `findMany` | Return the matching rows, sorted by `sortBy`, then `offset` and `limit` |
| `update` | Apply `patch` to every row matching `where`, atomically per row, and return the first updated row – or `null` if nothing matched |
| `transaction` | Run `fn` with an adapter bound to one transaction; commit when it resolves, roll back when it throws |

There is no delete: rows change status (`archived`, `abandoned`,
`inactive`) and stay.

### Where and operators

```ts
type WhereOperator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in';
type Where<M> = { field: keyof ModelMap[M]; operator?: WhereOperator; value: … | … [] | null };
```

- All conditions of a `where` are AND-ed.
- `operator` defaults to `eq`.
- `eq` / `ne` with `null` mean IS NULL / IS NOT NULL.
- `in` takes an array.
- `lt`, `lte`, `gt`, `gte` compare numbers and `Date`s (by time).

```ts
// stock 5 → 4, only if nobody changed it meanwhile
await adapter.update(
  'variant',
  [
    { field: 'id', value: variantId },
    { field: 'stock', value: 5 },
  ],
  { stock: 4, updatedAt: new Date() },
);
```

### FindManyOptions

```ts
type FindManyOptions<M> = {
  where?: Where<M>[];
  limit?: number;
  offset?: number; // rows to skip, with sortBy
  sortBy?: { field: keyof ModelMap[M]; direction: 'asc' | 'desc' };
};
```

### Unique fields

`create` must fail when one of these exists already: `product.slug`,
`variant.sku`, `cart.token`, `discount.code`, `giftCard.code`,
`order.number`, `order.accessToken`, `paymentMethod.token` (and every `id`).
The engine recognizes the error by `code: '23505'` (Postgres) or a message
containing «unique» or «duplicate», also in `error.cause`, and turns it into
`DUPLICATE`.

### Locking semantics

The engine never reads with locks. It writes with compare-and-set: an
`update` whose `where` repeats the values it read (`stock`, `usageCount`,
`balance`, `status`, `updatedAt` …). `null` means someone else was faster;
the engine reads again (up to 10 times, then `BUSY`). For that:

- `update` must evaluate `where` at the time of the write, per row
  (`UPDATE … WHERE … RETURNING` does; a read followed by a separate write
  does not);
- inside `transaction`, writes must stay invisible to others until the
  commit and be undone on rollback; row locks held until the commit are fine
  (Postgres `READ COMMITTED` – the default – is enough).

`transaction` is optional in the type (the contract is shared with subkit)
but required by shopkit: `createShop()` throws without it, because stock,
discount usage, gift card balances and the order must be written together.
The engine does not nest transactions.

## Drizzle (Postgres)

### drizzleAdapter

```ts
drizzleAdapter(db: PgDatabase, tables?: typeof shopTables): StorageAdapter
```

- `db`: your Drizzle instance for Postgres (`drizzle-orm/postgres-js`,
  `drizzle-orm/node-postgres`, …). The driver must support
  `db.transaction()`.
- `tables`: the table objects, default `shopTables` of
  `@agentkit.ch/shopkit/drizzle/schema`.

Peer dependency `drizzle-orm` (>= 0.36). The adapter maps `Where` to
Drizzle conditions (`eq`, `ne`, `isNull`, `inArray` …), `update` to
`UPDATE … RETURNING` and `transaction` to `db.transaction()`.

### Migrations with drizzle-kit

The tables live in `@agentkit.ch/shopkit/drizzle/schema`. Re-export them
from your Drizzle schema so drizzle-kit creates them with your own tables:

```ts
// db/schema.ts
export * from '@agentkit.ch/shopkit/drizzle/schema';
export * from './app-schema'; // your tables
```

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

```bash
npx drizzle-kit generate   # SQL migration in ./drizzle
npx drizzle-kit migrate    # apply it
```

Generate a migration after every shopkit upgrade and check the SQL.

### Schema changes

Schema changes stay additive within minor versions: new tables, new
nullable columns, new indexes – nothing renamed or dropped, so the previous
deployment keeps running while the migration is applied. Example: 0.2 added
the table `shop_payment_methods` and the columns `fulfillment_date` /
`fulfillment_window` of `shop_carts` and `shop_orders`. Your app runs the
migration like its own.

Orders reference neither products nor your tables: an order is an
accounting record (its lines are a snapshot) and outlives the product and
the customer account.

## Tables

All ids and texts are `text`, amounts `integer` (Rappen), timestamps
`timestamp with time zone`, nested data `jsonb`. Column names are snake case
of the fields (`taxRateBps` → `tax_rate_bps`).

### shop_products

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `slug` | text, unique (`shop_products_slug_key`) | |
| `name`, `kind`, `status` | text | |
| `description` | text | yes |
| `tax_rate_bps` | integer | yes |
| `images`, `translations`, `metadata` | jsonb | |
| `sort_order` | integer | |
| `created_at`, `updated_at` | timestamptz | |

Index: `ix_shop_products_status` (`status`).

### shop_variants

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `product_id` | text, foreign key → `shop_products.id` (on delete cascade) | |
| `sku` | text, unique (`shop_variants_sku_key`) | |
| `name`, `status` | text | |
| `options` | jsonb | |
| `price`, `weight_grams`, `stock`, `sort_order` | integer | |
| `compare_at_price` | integer | yes |
| `track_stock`, `allow_backorder` | boolean | |
| `created_at`, `updated_at` | timestamptz | |

Index: `ix_shop_variants_product_id`.

### shop_carts

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `token` | text, unique (`shop_carts_token_key`) | |
| `customer_external_id` | text | yes |
| `status`, `locale` | text | |
| `items` | jsonb | |
| `discount_code`, `email`, `shipping_rate_id`, `fulfillment_date`, `fulfillment_window`, `note`, `order_id` | text | yes |
| `shipping_address`, `billing_address` | jsonb | yes |
| `expires_at`, `created_at`, `updated_at` | timestamptz | |

Indexes: `ix_shop_carts_customer` (`customer_external_id`, `status`),
`ix_shop_carts_status_expires_at`.

### shop_discounts

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `code` | text, unique (`shop_discounts_code_key`) | |
| `type` | text | |
| `value`, `usage_count` | integer | |
| `min_subtotal`, `usage_limit` | integer | yes |
| `product_ids` | jsonb | yes |
| `starts_at`, `ends_at` | timestamptz | yes |
| `active` | boolean | |
| `created_at`, `updated_at` | timestamptz | |

### shop_gift_cards

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `code` | text, unique (`shop_gift_cards_code_key`) | |
| `currency`, `status` | text | |
| `initial_amount`, `balance` | integer | |
| `expires_at` | timestamptz | yes |
| `order_id`, `recipient_email`, `note` | text | yes |
| `created_at`, `updated_at` | timestamptz | |

Index: `ix_shop_gift_cards_order_id`.

### shop_orders

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `number` | text, unique (`shop_orders_number_key`) | |
| `access_token` | text, unique (`shop_orders_access_token_key`) | |
| `cart_id`, `customer_external_id` | text | yes |
| `email`, `locale`, `status`, `payment_status`, `fulfillment_status`, `payment_method`, `currency` | text | |
| `tax_inclusive`, `gift_cards_released`, `reserved` | boolean | |
| `lines`, `tax_lines`, `gift_cards`, `refunds`, `metadata` | jsonb | |
| `shipping`, `shipping_address`, `billing_address` | jsonb | yes |
| `discount_code`, `fulfillment_date`, `fulfillment_window`, `note`, `payment_url`, `paid_via`, `provider_transaction_id`, `payment_reference`, `cancel_reason`, `carrier`, `tracking_number`, `tracking_url` | text | yes |
| `items_subtotal`, `discount_total`, `shipping_total`, `tax_total`, `rounding`, `total`, `gift_card_total`, `amount_due`, `refunded_total`, `payment_attempts`, `reminders_sent` | integer | |
| `expires_at`, `due_at`, `next_reminder_at`, `paid_at`, `canceled_at`, `shipped_at`, `delivered_at` | timestamptz | yes |
| `created_at`, `updated_at` | timestamptz | |

`fulfillment_date` is `YYYY-MM-DD` text (Zurich); it sorts and compares as
text. Indexes: `ix_shop_orders_customer` (`customer_external_id`,
`created_at`), `ix_shop_orders_status_expires_at`,
`ix_shop_orders_status_next_reminder`, `ix_shop_orders_created_at`,
`ix_shop_orders_fulfillment_date`.

### shop_payment_methods

| Column | Type | Null |
|---|---|---|
| `id` | text, primary key | |
| `customer_external_id`, `provider`, `status` | text | |
| `token` | text, unique (`shop_payment_methods_token_key`) | |
| `brand`, `last4`, `expiry` | text | yes |
| `created_at`, `updated_at` | timestamptz | |

Index: `ix_shop_payment_methods_customer` (`customer_external_id`,
`status`). `token` is the provider's secret – keep database dumps and
backups access-controlled.

## In memory

### memoryAdapter

```ts
import { memoryAdapter } from '@agentkit.ch/shopkit/memory';

const database = memoryAdapter();
const shop = createShop({ database });
database.tables.order; // the rows, for assertions
```

For tests, prototypes and demos: data lives as long as the process. It
enforces the unique fields, copies rows in and out (`structuredClone`), and
runs one transaction at a time; a rollback undoes the transaction's own
writes. `tables` exposes the rows per model. Not for production – see
[testing](testing.md).

## Your own adapter

### Writing an adapter

Implement the five members for your store and run the engine's flows
against it (checkout, expiry, refunds) – ideally with two concurrent
checkouts of the last unit. Map each model to a table or collection; field
names are those of the types.

```ts
import type { StorageAdapter } from '@agentkit.ch/shopkit';

export function myAdapter(client: MyClient): StorageAdapter {
  const adapter: StorageAdapter = {
    id: 'my-store',
    create: (model, data) => client.insert(model, data), // must reject duplicates
    findOne: (model, where) => client.first(model, toQuery(where)),
    findMany: (model, options = {}) => client.query(model, toQuery(options.where), options),
    // atomic per row: the condition is checked by the store at write time
    update: (model, where, patch) => client.updateWhere(model, toQuery(where), patch),
    transaction: (fn) => client.transaction((tx) => fn(myAdapter(tx))),
  };

  return adapter;
}
```

Dates must come back as `Date` objects and JSON fields as the values that
were stored.

### matchesWhere

`matchesWhere(row, where)` of `@agentkit.ch/shopkit` checks one row against
`Where` conditions with the exact semantics above (`null`, `in`, `Date`s) –
for stores that filter in JavaScript (key-value stores, a cache).

```ts
import { matchesWhere } from '@agentkit.ch/shopkit';

const rows = (await kv.list(model)).filter((row) => matchesWhere(row, where));
```
