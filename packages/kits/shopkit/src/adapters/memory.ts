import { type StorageAdapter, type Where, matchesWhere } from '../adapter';
import type { ModelMap, ModelName } from '../types';

const UNIQUE: { [M in ModelName]?: (keyof ModelMap[M])[] } = {
  product: ['id', 'slug'],
  variant: ['id', 'sku'],
  cart: ['id', 'token'],
  discount: ['id', 'code'],
  giftCard: ['id', 'code'],
  order: ['id', 'number', 'accessToken'],
  paymentMethod: ['id', 'token'],
};

type Tables = { [M in ModelName]: ModelMap[M][] };

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * In-memory storage for tests, prototypes and the engine's own test suite.
 * Data lives as long as the process.
 */
export function memoryAdapter(): StorageAdapter & { tables: Tables } {
  const tables: Tables = {
    product: [],
    variant: [],
    cart: [],
    discount: [],
    giftCard: [],
    order: [],
    paymentMethod: [],
  };

  const clone = <T>(value: T): T => structuredClone(value);
  let queue: Promise<void> = Promise.resolve();

  function create<M extends ModelName>(
    model: M,
    data: ModelMap[M],
    undo?: (() => void)[],
  ) {
    const rows = tables[model] as Record<string, unknown>[];

    for (const field of (UNIQUE[model] ?? []) as string[]) {
      const value = (data as Record<string, unknown>)[field];

      if (rows.some((row) => row[field] === value)) {
        return Promise.reject(
          new Error(`Unique constraint violated: ${model}.${field}`),
        );
      }
    }

    const row = clone(data) as Record<string, unknown>;

    rows.push(row);
    undo?.push(() => {
      const index = rows.indexOf(row);

      if (index !== -1) rows.splice(index, 1);
    });

    return Promise.resolve(clone(data));
  }

  function update<M extends ModelName>(
    model: M,
    where: Where<M>[],
    patch: Partial<ModelMap[M]>,
    undo?: (() => void)[],
  ) {
    let first: Record<string, unknown> | null = null;

    for (const row of tables[model] as Record<string, unknown>[]) {
      if (!matchesWhere(row, where)) continue;

      const written = clone(patch) as Record<string, unknown>;
      const previous = Object.fromEntries(
        Object.keys(written).map((key) => [key, clone(row[key])]),
      );

      Object.assign(row, clone(written));
      // only the fields this write changed, and only while they still hold
      // its value: what another writer stored meanwhile stays (a database
      // would apply that write after the rollback, once the lock is free)
      undo?.push(() => {
        for (const [key, value] of Object.entries(previous)) {
          if (sameValue(row[key], written[key])) row[key] = value;
        }
      });
      first ??= row;
    }

    return Promise.resolve(first ? (clone(first) as never) : null);
  }

  const adapter: StorageAdapter & { tables: Tables } = {
    id: 'memory',
    tables,

    create: (model, data) => create(model, data),

    findOne(model, where) {
      const row = (tables[model] as Record<string, unknown>[]).find((row) =>
        matchesWhere(row, where),
      );

      return Promise.resolve(row ? (clone(row) as never) : null);
    },

    findMany(model, options = {}) {
      let rows = (tables[model] as Record<string, unknown>[]).filter((row) =>
        matchesWhere(row, options.where ?? []),
      );

      if (options.sortBy) {
        const { field, direction } = options.sortBy;
        const key = field as string;
        const factor = direction === 'asc' ? 1 : -1;

        const sortValue = (value: unknown) =>
          value instanceof Date ? value.getTime() : value;

        rows = [...rows].sort((a, b) => {
          const left = sortValue(a[key]);
          const right = sortValue(b[key]);

          if (left === right) return 0;
          if (left === null || left === undefined) return 1;
          if (right === null || right === undefined) return -1;

          return (left as number) < (right as number) ? -factor : factor;
        });
      }

      if (options.offset !== undefined || options.limit !== undefined) {
        const start = options.offset ?? 0;

        rows = rows.slice(
          start,
          options.limit === undefined ? undefined : start + options.limit,
        );
      }

      return Promise.resolve(rows.map((row) => clone(row)) as never);
    },

    update: (model, where, patch) => update(model, where, patch),

    // one transaction at a time (like the row locks of a real database): a
    // rollback undoes the transaction's own writes, not another writer's
    transaction(fn) {
      const run = queue.then(async () => {
        const undo: (() => void)[] = [];
        const tx: StorageAdapter = {
          ...adapter,
          create: (model, data) => create(model, data, undo),
          update: (model, where, patch) => update(model, where, patch, undo),
          transaction: (inner) => inner(tx),
        };

        try {
          return await fn(tx);
        } catch (error) {
          for (const step of undo.reverse()) step();

          throw error;
        }
      });

      queue = run.then(
        () => undefined,
        () => undefined,
      );

      return run;
    },
  };

  return adapter;
}
