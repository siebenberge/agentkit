import { describe, expect, it } from 'vitest';

import { SubscriptionError, errorDocsUrl } from './errors';

describe('SubscriptionError', () => {
  it('links the code to its explanation', () => {
    const error = new SubscriptionError('PLAN_NOT_FOUND', 'Unknown plan "x"');

    expect(error.code).toBe('PLAN_NOT_FOUND');
    expect(error.docsUrl).toBe(
      'https://agentkit.ch/errors#subkit-PLAN_NOT_FOUND',
    );
    expect(error.message).toBe('Unknown plan "x"');
    expect(errorDocsUrl('UNAUTHORIZED')).toBe(
      'https://agentkit.ch/errors#subkit-UNAUTHORIZED',
    );
  });
});
