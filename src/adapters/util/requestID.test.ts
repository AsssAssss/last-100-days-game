import { describe, it, expect } from 'vitest';
import { newRequestID } from './requestID';

describe('newRequestID', () => {
  it('produces non-empty strings', () => {
    expect(newRequestID()).toMatch(/.+/);
  });

  it('produces unique ids on consecutive calls', () => {
    const a = newRequestID();
    const b = newRequestID();
    expect(a).not.toBe(b);
  });
});
