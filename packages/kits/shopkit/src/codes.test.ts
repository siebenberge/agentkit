import { describe, expect, it } from 'vitest';

import { defaultOrderNumber } from './codes';

describe('defaultOrderNumber', () => {
  it('dates the number in Zurich, not in UTC', () => {
    // 00:30 on 15 October in Zurich
    expect(defaultOrderNumber(new Date('2026-10-14T22:30:00Z'))).toMatch(
      /^261015-[0-9A-Z]{5}$/,
    );
  });
});
