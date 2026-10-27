import {
  type SQL,
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
} from 'drizzle-orm';
import type { PgColumn, PgDatabase, PgTable } from 'drizzle-orm/pg-core';

import type { StorageAdapter, Where } from '../../adapter';
import type { ModelName } from '../../types';
import { subscriptionTables } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgDatabase = PgDatabase<any, any, any>;

type Tables = typeof subscriptionTables;

/**
 * PostgreSQL storage through Drizzle. Pass your Drizzle instance; the tables
 * come from `@agentkit.ch/subkit/drizzle/schema` (add them to your schema so
 * drizzle-kit creates them).
 */
export function drizzleAdapter(
  db: AnyPgDatabase,
  tables: Tables = subscriptionTables,
): StorageAdapter {
  const table = (model: ModelName) => tables[model] as unknown as PgTable;

  const column = (model: ModelName, field: PropertyKey) => {
    const col = (tables[model] as unknown as Record<string, PgColumn>)[
      field as string
    ];

    if (!col) {
      throw new Error(
        `drizzleAdapter: unknown field ${model}.${String(field)}`,
      );
    }

    return col;
  };

  const toSql = <M extends ModelName>(model: M, where: Where<M>[] = []) => {
    const conditions: SQL[] = where.map((condition) => {
      const col = column(model, condition.field);
      const value = condition.value as unknown;

      switch (condition.operator ?? 'eq') {
        case 'eq':
          return value === null ? isNull(col) : eq(col, value);
        case 'ne':
          return value === null ? isNotNull(col) : ne(col, value);
        case 'lt':
          return lt(col, value);
        case 'lte':
          return lte(col, value);
        case 'gt':
          return gt(col, value);
        case 'gte':
          return gte(col, value);
        case 'in':
          return inArray(col, value as unknown[]);
      }
    });

    return conditions.length > 0 ? and(...conditions) : undefined;
  };

  const adapter: StorageAdapter = {
    id: 'drizzle-pg',

    async create(model, data) {
      const [row] = await db
        .insert(table(model))
        .values(data as never)
        .returning();

      return row as never;
    },

    async findOne(model, where) {
      const [row] = await db
        .select()
        .from(table(model))
        .where(toSql(model, where))
        .limit(1);

      return (row ?? null) as never;
    },

    async findMany(model, options = {}) {
      let query = db
        .select()
        .from(table(model))
        .where(toSql(model, options.where))
        .$dynamic();

      if (options.sortBy) {
        const col = column(model, options.sortBy.field);
        query = query.orderBy(
          options.sortBy.direction === 'asc' ? asc(col) : desc(col),
        );
      }

      if (options.limit !== undefined) {
        query = query.limit(options.limit);
      }

      return (await query) as never;
    },

    async update(model, where, patch) {
      const [row] = await db
        .update(table(model))
        .set(patch as never)
        .where(toSql(model, where))
        .returning();

      return (row ?? null) as never;
    },

    async transaction(fn) {
      return db.transaction(async (tx) =>
        fn(drizzleAdapter(tx as unknown as AnyPgDatabase, tables)),
      );
    },
  };

  return adapter;
}

export { subscriptionTables } from './schema';
