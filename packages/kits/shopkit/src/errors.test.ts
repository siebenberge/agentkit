import { describe, expect, it } from 'vitest';

import { ShopError, errorDocsUrl } from './errors';

describe('ShopError', () => {
  it('links the code to its explanation', () => {
    const error = new ShopError('ORDER_NOT_FOUND', 'Unknown order');

    expect(error.code).toBe('ORDER_NOT_FOUND');
    expect(error.docsUrl).toBe(
      'https://agentkit.ch/errors#shopkit-ORDER_NOT_FOUND',
    );
    expect(error.message).toBe('Unknown order');
    expect(errorDocsUrl('UNAUTHORIZED')).toBe(
      'https://agentkit.ch/errors#shopkit-UNAUTHORIZED',
    );
  });
});
