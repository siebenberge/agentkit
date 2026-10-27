import { describe, expect, it } from 'vitest';

import { memoryAdapter } from './memory';

const customer = (id: string, name: string) => ({
  id,
  externalId: `ext_${id}`,
  email: `${id}@b.ch`,
  name,
  address: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe('memory adapter', () => {
  it('rolls back only the writes of the failed transaction', async () => {
    const db = memoryAdapter();
    await db.create('customer', customer('c', 'old'));

    let release: () => void = () => undefined;
    const paused = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: () => void = () => undefined;
    const inside = new Promise<void>((resolve) => {
      started = resolve;
    });

    const failing = db.transaction!(async (tx) => {
      await tx.update('customer', [{ field: 'id', value: 'c' }], {
        email: 'tx@b.ch',
      });
      await tx.create('customer', customer('d', 'created in tx'));
      started();
      await paused;
      throw new Error('rollback');
    });

    // a plain write while the transaction is waiting
    await inside;
    await db.update('customer', [{ field: 'id', value: 'c' }], { name: 'new' });
    release();

    await expect(failing).rejects.toThrow('rollback');
    expect(db.tables.customer).toEqual([
      expect.objectContaining({ id: 'c', name: 'new', email: 'c@b.ch' }),
    ]);
  });

  it('keeps a value another writer stored in a field the transaction wrote', async () => {
    const db = memoryAdapter();
    await db.create('customer', customer('c', 'old'));

    let release: () => void = () => undefined;
    const paused = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: () => void = () => undefined;
    const inside = new Promise<void>((resolve) => {
      started = resolve;
    });

    const failing = db.transaction!(async (tx) => {
      await tx.update('customer', [{ field: 'id', value: 'c' }], {
        name: 'tx',
      });
      started();
      await paused;
      throw new Error('rollback');
    });

    await inside;
    await db.update('customer', [{ field: 'id', value: 'c' }], {
      name: 'other',
    });
    release();

    await expect(failing).rejects.toThrow('rollback');
    expect(db.tables.customer[0]?.name).toBe('other');
  });

  it('restores the original value after two writes in one transaction', async () => {
    const db = memoryAdapter();
    await db.create('customer', customer('c', 'old'));

    await expect(
      db.transaction!(async (tx) => {
        await tx.update('customer', [{ field: 'id', value: 'c' }], {
          name: 'first',
        });
        await tx.update('customer', [{ field: 'id', value: 'c' }], {
          name: 'second',
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(db.tables.customer[0]?.name).toBe('old');
  });
});
