import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { HTTPStorageAdapter } from './HTTPStorageAdapter';

function makeFetch(handlers: Array<{
  match: (url: string, init: RequestInit) => boolean;
  respond: () => Response | Promise<Response>;
}>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    for (const h of handlers) {
      if (h.match(url, init ?? {})) return h.respond();
    }
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('HTTPStorageAdapter', () => {
  it('uses global fetch when fetchImpl is not provided', async () => {
    const stub = vi.fn(async () =>
      new Response(JSON.stringify({ slots: [] }), { status: 200 })
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stub as unknown as typeof fetch;
    try {
      const a = new HTTPStorageAdapter({ baseURL: 'https://api.example', getToken: () => 'tok' });
      await a.listSlots();
      expect(stub).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles slot summary with no updatedAt gracefully', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () =>
          new Response(
            JSON.stringify({
              slots: [
                {
                  id: 1,
                  isEmpty: false,
                  stateJson: JSON.stringify({ ...INITIAL_GAME_STATE, day: 4 }),
                },
              ],
            }),
            { status: 200 }
          ),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    const slots = await a.listSlots();
    expect(slots[0]?.day).toBe(4);
    expect(slots[0]?.updatedAt).toBeUndefined();
  });

  it('throws when no token', async () => {
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => null,
      fetchImpl: makeFetch([]),
    });
    await expect(a.listSlots()).rejects.toThrow(/not_authenticated/);
  });

  it('listSlots maps backend payload to SlotSummary', async () => {
    const fetchImpl = makeFetch([
      {
        match: (u) => u.endsWith('/slots'),
        respond: () =>
          new Response(
            JSON.stringify({
              slots: [
                { id: 1, isEmpty: true },
                {
                  id: 2,
                  isEmpty: false,
                  stateJson: JSON.stringify({
                    ...INITIAL_GAME_STATE,
                    day: 8,
                    isGameOver: true,
                    gameOverReason: '伤重',
                  }),
                  updatedAt: 1_700_000_000,
                },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          ),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    const slots = await a.listSlots();
    expect(slots[0]).toEqual({ id: 1, isEmpty: true });
    expect(slots[1]?.isEmpty).toBe(false);
    expect(slots[1]?.day).toBe(8);
    expect(slots[1]?.isGameOver).toBe(true);
    expect(slots[1]?.gameOverReason).toBe('伤重');
    expect(slots[1]?.updatedAt).toBe(1_700_000_000 * 1000);
  });

  it('listSlots marks corrupted stateJson as empty', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () =>
          new Response(
            JSON.stringify({
              slots: [{ id: 1, isEmpty: false, stateJson: '{not json', updatedAt: 1 }],
            }),
            { status: 200 }
          ),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    const slots = await a.listSlots();
    expect(slots[0]?.isEmpty).toBe(true);
  });

  it('listSlots marks missing stateJson as empty even when isEmpty=false', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () =>
          new Response(JSON.stringify({ slots: [{ id: 1, isEmpty: false }] }), {
            status: 200,
          }),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    const slots = await a.listSlots();
    expect(slots[0]?.isEmpty).toBe(true);
  });

  it('loadSlot returns null when slot empty', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () =>
          new Response(JSON.stringify({ slot: { id: 1, isEmpty: true } }), { status: 200 }),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    expect(await a.loadSlot(1)).toBeNull();
  });

  it('loadSlot returns null when stateJson missing', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () =>
          new Response(JSON.stringify({ slot: { id: 1, isEmpty: false } }), { status: 200 }),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    expect(await a.loadSlot(1)).toBeNull();
  });

  it('loadSlot parses state', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () =>
          new Response(
            JSON.stringify({
              slot: {
                id: 1,
                isEmpty: false,
                stateJson: JSON.stringify({ ...INITIAL_GAME_STATE, day: 42 }),
              },
            }),
            { status: 200 }
          ),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    const state = await a.loadSlot(1);
    expect(state?.day).toBe(42);
  });

  it('saveSlot sends PUT with stateJson body', async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const tracking = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), init: init ?? {} };
      return new Response(JSON.stringify({ ok: true, updatedAt: 1 }), { status: 200 });
    }) as unknown as typeof fetch;
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl: tracking,
    });
    await a.saveSlot(2, { ...INITIAL_GAME_STATE, day: 3 });
    expect(captured!.url).toBe('https://api.example/slots/2');
    expect(captured!.init.method).toBe('PUT');
    const body = JSON.parse(captured!.init.body as string);
    expect(JSON.parse(body.stateJson).day).toBe(3);
  });

  it('clearSlot sends DELETE', async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const tracking = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), init: init ?? {} };
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example/',
      getToken: () => 'tok',
      fetchImpl: tracking,
    });
    await a.clearSlot(3);
    expect(captured!.url).toBe('https://api.example/slots/3');
    expect(captured!.init.method).toBe('DELETE');
  });

  it('throws on non-2xx response', async () => {
    const fetchImpl = makeFetch([
      {
        match: () => true,
        respond: () => new Response('boom', { status: 500 }),
      },
    ]);
    const a = new HTTPStorageAdapter({
      baseURL: 'https://api.example',
      getToken: () => 'tok',
      fetchImpl,
    });
    await expect(a.listSlots()).rejects.toThrow(/500/);
  });
});
