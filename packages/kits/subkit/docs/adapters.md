# Storage adapters

The engine stores everything through a `StorageAdapter`: `drizzleAdapter`
for Postgres (`@agentkit.ch/subkit/drizzle`), `memoryAdapter` for tests and
demos (`@agentkit.ch/subkit/memory`), or your own. Prisma and Kysely
adapters are planned.

## The contract

### `StorageAdapter`

```ts
interface StorageAdapter {
  id: string;
  create<M extends ModelName>(model: M, data: ModelMap[M]): Promise<ModelMap[M]>;
  findOne<M extends ModelName>(model: M, where: Where<M>[]): Promise<ModelMap[M] | null>;
  findMany<M extends ModelName>(model: M, options?: FindManyOptions<M>): Promise<ModelMap[M][]>;
  update<M extends ModelName>(model: M, where: Where<M>[], patch: Partial<ModelMap[M]>):
    Promise<ModelMap[M] | null>;
  transaction?<R>(fn: (adapter: StorageAdapter) => Promise<R>): Promise<R>;
}
```

Models (`ModelName`): `customer`, `paymentMethod`, `subscription`,
`invoice`, `checkout` – the types `Customer`, `PaymentMethod`,
`Subscription`, `Invoice`, `Checkout` of `@agentkit.ch/subkit`. There is no
delete: the engine never deletes rows.

| Method | Must |
|---|---|
| `id` | Name of the adapter (`drizzle-pg`, `memory`) |
| `create` | Store the row as given (ids come from the engine) and return it. Reject a duplicate `customer.externalId`, `paymentMethod.token` or `invoice.billingKey` (throw) |
| `findOne` | Return the first row matching all conditions, or `null` |
| `findMany` | Return the matching rows, sorted and limited as asked |
| `update` | Apply `patch` to every row matching `where`, atomically per row; return the first updated row (after the update) or `null` when nothing matched |
| `transaction` | Optional. Run `fn` with an adapter bound to one transaction; commit when it resolves, roll back when it throws |

Rows come back with `Date` objects for dates, `null` (not `undefined`) for
empty fields, and `address` / `lines` as plain objects and arrays.

### `Where` and operators

```ts
type WhereOperator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in';

type Where<M> = { field: keyof ModelMap[M]; operator?: WhereOperator; value: … | null };
```

| Operator | Meaning |
|---|---|
| `eq` (default) | Equal; `value: null` → IS NULL |
| `ne` | Not equal; `value: null` → IS NOT NULL. A `null` field is not equal to a value |
| `lt`, `lte`, `gt`, `gte` | Compare numbers and dates; a `null` field never matches |
| `in` | Field is one of the array `value` |

All conditions of a `where` are AND-ed. Dates compare by time.

### `FindManyOptions`

```ts
type FindManyOptions<M> = {
  where?: Where<M>[];
  limit?: number;
  sortBy?: { field: keyof ModelMap[M]; direction: 'asc' | 'desc' };
};
```

One sort field. Without `sortBy` the order is up to the store.

### Compare-and-set and transactions

The engine's guarantees ([concepts](concepts.md#idempotency-and-concurrency))
rest on two things:

- `update` is a compare-and-set: the engine puts the expected state in
  `where` (`status = 'open'`, `attemptCount = 2`, `updatedAt = …`) and
  treats `null` as "someone else was faster". The match and the write must
  be one atomic step per row – `UPDATE … WHERE … RETURNING` in SQL.
- In `transaction`, the engine first writes the customer row to serialize
  `subscribe` and checkout activations of one customer. A write must keep
  the row locked until commit, and later reads in the same transaction must
  see what other transactions committed while it waited. Postgres in its
  default isolation (`READ COMMITTED`) does both.

Without `transaction` the engine runs the steps one by one; a crash in
between can leave a renewed subscription without its invoice.

## Drizzle (Postgres)

### `drizzleAdapter()`

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzleAdapter } from '@agentkit.ch/subkit/drizzle';

const db = drizzle(postgres(process.env.DATABASE_URL!));

createSubscriptions({ database: drizzleAdapter(db), /* … */ });
```

```ts
drizzleAdapter(db: PgDatabase, tables?: typeof subscriptionTables): StorageAdapter
```

| Parameter | Description |
|---|---|
| `db` | Your Drizzle Postgres database (any Postgres driver of Drizzle). Its `db.transaction()` is used for `transaction` |
| `tables` | The table objects (default `subscriptionTables` from `/drizzle/schema`) |

PostgreSQL only. Peer dependency `drizzle-orm` (0.36 or newer). The driver
must support transactions. The adapter also exports `subscriptionTables`.

### Migrations with drizzle-kit

The tables ship as Drizzle definitions in `@agentkit.ch/subkit/drizzle/schema`.
Re-export them from your schema, so drizzle-kit generates the migration
together with your own tables:

```ts
// db/schema.ts
export {
  billing_subscribers,
  billing_payment_methods,
  billing_subscriptions,
  billing_invoices,
  billing_checkouts,
} from '@agentkit.ch/subkit/drizzle/schema';

export const teams = pgTable('teams', { /* your tables */ });
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
npx drizzle-kit migrate    # or your own migration runner
```

After a subkit update, run `drizzle-kit generate` again: new columns or
indexes come as a migration of your product. Schema changes stay additive
in minor versions (new columns, indexes and tables – nothing renamed or
dropped), so you
can run the migration while the previous deployment is still live. The
tables have no foreign keys to your own tables; link them by `external_id`.

## Tables

All ids are `text` (the engine's ids), dates `timestamptz`, amounts
`integer` in minor units.

### `billing_subscribers` (customer)

| Column | Type | Meaning |
|---|---|---|
| `id` | text, PK | |
| `external_id` | text, unique | Your id of the billed entity |
| `email` | text | |
| `name` | text | |
| `address` | jsonb, null | `{ line1, line2, postalCode, city, country }` |
| `created_at`, `updated_at` | timestamptz | `updated_at` is also written to lock the row |

### `billing_payment_methods` (paymentMethod)

| Column | Type | Meaning |
|---|---|---|
| `id` | text, PK | |
| `customer_id` | text, FK → subscribers (cascade), indexed | |
| `provider` | text | Provider id, e.g. `zahls` |
| `token` | text, unique | Provider token for merchant-initiated charges |
| `status` | text | `active` (one per customer) or `inactive` |
| `brand` | text, null | `visa`, `mastercard`, `twint` … |
| `last4` | text, null | |
| `expiry` | text, null | `MM/YY` |
| `created_at`, `updated_at` | timestamptz | |

### `billing_subscriptions` (subscription)

| Column | Type | Meaning |
|---|---|---|
| `id` | text, PK | |
| `customer_id` | text, FK → subscribers (cascade), indexed | |
| `plan_id` | text | Id of a plan in your config |
| `interval` | text | `month` / `year` |
| `status` | text | [Status](concepts.md#statuses); index with `current_period_end` |
| `collection_method` | text | `charge_automatically` / `send_invoice` |
| `currency` | text | |
| `unit_amount` | integer | Price of a period, as bought |
| `payment_method_id` | text, null, FK → payment methods (set null) | |
| `billing_anchor` | timestamptz | Periods are counted from here |
| `current_period_start`, `current_period_end` | timestamptz | |
| `trial_end` | timestamptz, null | |
| `cancel_at_period_end` | boolean | |
| `canceled_at`, `ended_at`, `locked_at` | timestamptz, null | Cancellation, end, dunning lock |
| `scheduled_plan_id`, `scheduled_interval` | text, null | Change at the period end |
| `created_at`, `updated_at` | timestamptz | `updated_at` is the compare-and-set version |

### `billing_invoices` (invoice)

| Column | Type | Meaning |
|---|---|---|
| `id` | text, PK | |
| `number` | text, unique | Invoice number |
| `customer_id` | text, FK → subscribers (restrict), indexed | Invoices outlive the customer's account |
| `subscription_id` | text, null, FK → subscriptions (set null), indexed | |
| `status` | text | `open`, `paid`, `void`, `uncollectible`; index with `next_attempt_at` |
| `reason` | text | `subscription_create`, `subscription_cycle`, `subscription_update` |
| `collection_method` | text | |
| `currency` | text | |
| `subtotal`, `tax`, `total` | integer | Net, VAT, gross |
| `tax_rate_bps` | integer | `810` = 8.1 % |
| `lines` | jsonb | `InvoiceLine[]` |
| `billing_key` | text, unique | Idempotency key of the invoice |
| `period_start`, `period_end` | timestamptz | |
| `due_at` | timestamptz | |
| `paid_at` | timestamptz, null | |
| `attempt_count` | integer | Charge attempts / dunning steps |
| `next_attempt_at` | timestamptz, null | When `runDue` looks at it next |
| `last_error` | text, null | Last charge error |
| `payment_url` | text, null | Online payment link |
| `provider_transaction_id` | text, null | Paying or pending transaction (`bank:<id>` for bank files) |
| `created_at`, `updated_at` | timestamptz | |

### `billing_checkouts` (checkout)

| Column | Type | Meaning |
|---|---|---|
| `id` | text, PK | Provider reference `ck_<id>` |
| `customer_id` | text, FK → subscribers (cascade) | |
| `purpose` | text | `subscribe` / `payment_method` |
| `status` | text | `open`, `completed`, `failed`, `expired`; index with `expires_at` |
| `subscription_id` | text, null, FK → subscriptions (cascade), indexed | |
| `invoice_id` | text, null, FK → invoices (cascade), indexed | Invoice paid by this checkout |
| `provider_reference` | text, null | The provider's id of the payment page |
| `url` | text | Payment page |
| `expires_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

## In memory

### `memoryAdapter()`

```ts
import { memoryAdapter } from '@agentkit.ch/subkit/memory';

const database = memoryAdapter();
database.tables.invoice; // Invoice[] – the stored rows, for assertions
```

Keeps the rows in the process (gone on restart) – for tests, prototypes and
demos (sub.agentkit.ch runs on it in the browser). Returns copies, enforces
the unique fields of the contract (`invoice.number` is not checked), and
runs transactions one at a time: a throwing transaction undoes only its own
writes. `tables` exposes the rows by model. Not for production.

## Your own adapter

### Writing your own adapter

Implement the five members for your store (SQL, document DB, KV …). Map
the camelCase fields of the model types to your columns, translate `Where`
to your query language and keep the [contract](#compare-and-set-and-transactions):

```ts
import type { StorageAdapter } from '@agentkit.ch/subkit';

export function myAdapter(client: MyClient): StorageAdapter {
  return {
    id: 'my-store',
    create: (model, data) => client.insert(model, data),        // unique constraints!
    findOne: (model, where) => client.first(model, toQuery(where)),
    findMany: (model, options) => client.select(model, toQuery(options?.where), options),
    update: (model, where, patch) => client.updateReturning(model, toQuery(where), patch),
    transaction: (fn) => client.transaction((tx) => fn(myAdapter(tx))),
  };
}
```

For stores that filter in the process, `matchesWhere(row, where)` from
`@agentkit.ch/subkit` checks a row with the contract's semantics. Run the
engine's scenarios against it (subscribe, webhook, `runDue`, concurrent
calls) – the Postgres tests of subkit (`src/adapters/drizzle/drizzle.test.ts`)
show the races worth testing.
