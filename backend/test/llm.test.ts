import { describe, it, expect, vi } from 'vitest';
import { proxyMessages } from '../src/llm';

function makeFetch(opts: {
  status?: number;
  body?: unknown;
  contentType?: string;
  capture?: (url: string, init: RequestInit) => void;
}): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    opts.capture?.(String(input), init ?? {});
    return new Response(JSON.stringify(opts.body ?? { ok: true }), {
      status: opts.status ?? 200,
      headers: { 'content-type': opts.contentType ?? 'application/json' },
    });
  }) as unknown as typeof fetch;
}

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://worker.example/llm/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('proxyMessages', () => {
  it('forwards to base URL + /v1/messages with x-api-key from config', async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = makeFetch({
      capture: (url, init) => {
        captured = { url, init };
      },
    });
    await proxyMessages(
      makeReq({ messages: [], model: 'claude-sonnet-4-6' }),
      { apiKey: 'sk-test', baseURL: 'https://onehub.akacm.com/claude' },
      { fetchImpl }
    );
    expect(captured).not.toBeNull();
    expect(captured!.url).toBe('https://onehub.akacm.com/claude/v1/messages');
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
  });

  it('falls back to default base URL when not provided', async () => {
    let url = '';
    const fetchImpl = makeFetch({ capture: (u) => (url = u) });
    await proxyMessages(makeReq({ messages: [] }), { apiKey: 'k' }, { fetchImpl });
    expect(url).toContain('onehub.akacm.com/claude/v1/messages');
  });

  it('strips trailing slash from base URL', async () => {
    let url = '';
    const fetchImpl = makeFetch({ capture: (u) => (url = u) });
    await proxyMessages(
      makeReq({ messages: [] }),
      { apiKey: 'k', baseURL: 'https://onehub.akacm.com/claude/' },
      { fetchImpl }
    );
    expect(url).toBe('https://onehub.akacm.com/claude/v1/messages');
  });

  it('injects default model when client did not specify', async () => {
    let body: unknown = null;
    const fetchImpl = makeFetch({
      capture: (_u, init) => {
        body = JSON.parse(init.body as string);
      },
    });
    await proxyMessages(
      makeReq({ messages: [] }),
      { apiKey: 'k', defaultModel: 'claude-some-model' },
      { fetchImpl }
    );
    expect((body as { model: string }).model).toBe('claude-some-model');
  });

  it('does not overwrite model if client supplied one', async () => {
    let body: unknown = null;
    const fetchImpl = makeFetch({
      capture: (_u, init) => {
        body = JSON.parse(init.body as string);
      },
    });
    await proxyMessages(
      makeReq({ messages: [], model: 'override-me' }),
      { apiKey: 'k', defaultModel: 'default' },
      { fetchImpl }
    );
    expect((body as { model: string }).model).toBe('override-me');
  });

  it('returns 400 when request body is not valid JSON', async () => {
    const fetchImpl = makeFetch({});
    const resp = await proxyMessages(
      new Request('https://worker.example/llm/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      }),
      { apiKey: 'k' },
      { fetchImpl }
    );
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe('invalid_json');
  });

  it('passes through upstream status code', async () => {
    const fetchImpl = makeFetch({ status: 429, body: { error: 'rate_limited' } });
    const resp = await proxyMessages(
      makeReq({ messages: [] }),
      { apiKey: 'k' },
      { fetchImpl }
    );
    expect(resp.status).toBe(429);
  });

  it('strips hop-by-hop response headers', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
          'content-encoding': 'gzip',
        },
      });
    }) as unknown as typeof fetch;
    const resp = await proxyMessages(makeReq({ messages: [] }), { apiKey: 'k' }, { fetchImpl });
    expect(resp.headers.get('transfer-encoding')).toBeNull();
    expect(resp.headers.get('content-encoding')).toBeNull();
    expect(resp.headers.get('content-type')).toBe('application/json');
  });

  it('overwrites client-supplied x-api-key with server key', async () => {
    let headers: Record<string, string> = {};
    const fetchImpl = makeFetch({
      capture: (_u, init) => {
        headers = init.headers as Record<string, string>;
      },
    });
    await proxyMessages(
      makeReq({ messages: [] }, { 'x-api-key': 'sneaky-client-key' }),
      { apiKey: 'real-server-key' },
      { fetchImpl }
    );
    expect(headers['x-api-key']).toBe('real-server-key');
  });

  it('forces response content-type to application/json', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      new Response('{}', { headers: { 'content-type': 'text/html' } })
    ) as unknown as typeof fetch;
    const resp = await proxyMessages(makeReq({ messages: [] }), { apiKey: 'k' }, { fetchImpl });
    expect(resp.headers.get('content-type')).toBe('application/json');
  });

  it('retries on 522 and succeeds on retry', async () => {
    let attempts = 0;
    const fetchImpl = vi.fn(async () => {
      attempts += 1;
      if (attempts < 2) return new Response('timeout', { status: 522 });
      return new Response(JSON.stringify({ content: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    const resp = await proxyMessages(
      makeReq({ messages: [] }),
      { apiKey: 'k' },
      { fetchImpl }
    );
    expect(resp.status).toBe(200);
    expect(attempts).toBe(2);
  }, 15000);

  it('gives up after MAX_RETRIES and returns last 5xx', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response('still down', { status: 522 })
    ) as unknown as typeof fetch;
    const resp = await proxyMessages(
      makeReq({ messages: [] }),
      { apiKey: 'k' },
      { fetchImpl }
    );
    expect(resp.status).toBe(522);
    expect((fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(3);
  }, 15000);

  it('retries on network error and surfaces last error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(
      proxyMessages(makeReq({ messages: [] }), { apiKey: 'k' }, { fetchImpl })
    ).rejects.toThrow(/network down/);
  }, 15000);

  it('preserves non-hop-by-hop upstream headers', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      new Response('{}', {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req-123',
        },
      })
    ) as unknown as typeof fetch;
    const resp = await proxyMessages(makeReq({ messages: [] }), { apiKey: 'k' }, { fetchImpl });
    expect(resp.headers.get('x-request-id')).toBe('req-123');
  });
});
