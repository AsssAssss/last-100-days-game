import { describe, it, expect, vi } from 'vitest';
import { AuthClient } from './AuthClient';

function makeFetch(response: { status?: number; body?: unknown; throwErr?: unknown }): typeof fetch {
  return vi.fn(async () => {
    if (response.throwErr !== undefined) throw response.throwErr;
    return new Response(
      response.body === undefined ? '' : JSON.stringify(response.body),
      { status: response.status ?? 200 }
    );
  }) as unknown as typeof fetch;
}

describe('AuthClient', () => {
  it('uses global fetch when fetchImpl is not provided', async () => {
    const stub = vi.fn(async () =>
      new Response(JSON.stringify({ userId: 'u', token: 't', created: false }), { status: 200 })
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stub as unknown as typeof fetch;
    try {
      const c = new AuthClient({ baseURL: 'https://api.example' });
      const r = await c.login('x', '1234');
      expect(r.ok).toBe(true);
      expect(stub).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns success on 200', async () => {
    const c = new AuthClient({
      baseURL: 'https://api.example',
      fetchImpl: makeFetch({
        status: 200,
        body: { userId: 'u', token: 't', created: true },
      }),
    });
    const r = await c.login('xiaoxue', '1234');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.userId).toBe('u');
      expect(r.token).toBe('t');
      expect(r.created).toBe(true);
    }
  });

  it('returns invalid_input on 400', async () => {
    const c = new AuthClient({
      baseURL: 'https://api.example',
      fetchImpl: makeFetch({ status: 400 }),
    });
    const r = await c.login('', '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_input');
  });

  it('returns wrong_pin on 401', async () => {
    const c = new AuthClient({
      baseURL: 'https://api.example',
      fetchImpl: makeFetch({ status: 401 }),
    });
    const r = await c.login('x', '1234');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('wrong_pin');
  });

  it('returns server error on 500', async () => {
    const c = new AuthClient({
      baseURL: 'https://api.example',
      fetchImpl: makeFetch({ status: 500, body: 'boom' }),
    });
    const r = await c.login('x', '1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('server');
      expect(r.message).toContain('500');
    }
  });

  it('returns network on fetch throw (Error)', async () => {
    const c = new AuthClient({
      baseURL: 'https://api.example',
      fetchImpl: makeFetch({ throwErr: new Error('offline') }),
    });
    const r = await c.login('x', '1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('network');
      expect(r.message).toBe('offline');
    }
  });

  it('returns network on fetch throw (non-Error)', async () => {
    const c = new AuthClient({
      baseURL: 'https://api.example/',
      fetchImpl: makeFetch({ throwErr: 'string err' }),
    });
    const r = await c.login('x', '1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('network');
      expect(r.message).toBe('string err');
    }
  });
});
