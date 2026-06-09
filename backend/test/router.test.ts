import { describe, it, expect, vi } from 'vitest';
import { signToken } from '../src/crypto';
import type { Env } from '../src/env';
import { handleRequest } from '../src/router';
import { createFakeDb } from './fakeDb';

function makeEnv(overrides: Partial<Env> = {}): Env {
  const db = createFakeDb();
  const env: Env = {
    DB: db as unknown as D1Database,
    ALLOWED_ORIGINS: 'http://localhost:5174',
    SESSION_SECRET: 'test-secret',
    LLM_API_KEY: 'test-llm-key',
    LLM_BASE_URL: 'https://upstream.example/claude',
    LLM_MODEL: 'claude-sonnet-4-6',
    ...overrides,
  };
  return env;
}

function jsonReq(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(`https://worker.example${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:5174',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function loginAndGetToken(env: Env, username = 'xiaoxue', pin = '1234') {
  const resp = await handleRequest(jsonReq('POST', '/auth/login', { username, pin }), env);
  const body = (await resp.json()) as { userId: string; token: string };
  return body;
}

describe('handleRequest — CORS & routing', () => {
  it('returns 204 for OPTIONS preflight with CORS headers', async () => {
    const env = makeEnv();
    const resp = await handleRequest(jsonReq('OPTIONS', '/anything'), env);
    expect(resp.status).toBe(204);
    expect(resp.headers.get('access-control-allow-origin')).toBe('http://localhost:5174');
    expect(resp.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('echoes origin when in allow list', async () => {
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://a.example,https://b.example' });
    const resp = await handleRequest(
      jsonReq('OPTIONS', '/x', undefined, { origin: 'https://b.example' }),
      env
    );
    expect(resp.headers.get('access-control-allow-origin')).toBe('https://b.example');
  });

  it('falls back to first allowed origin when request origin not in list', async () => {
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://a.example,https://b.example' });
    const resp = await handleRequest(
      jsonReq('OPTIONS', '/x', undefined, { origin: 'https://evil.example' }),
      env
    );
    expect(resp.headers.get('access-control-allow-origin')).toBe('https://a.example');
  });

  it('handles GET /health', async () => {
    const resp = await handleRequest(jsonReq('GET', '/health'), makeEnv());
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ ok: true });
  });

  it('returns 404 for unknown route', async () => {
    const resp = await handleRequest(jsonReq('GET', '/nope'), makeEnv());
    expect(resp.status).toBe(404);
  });

  it('falls back to "*" CORS when ALLOWED_ORIGINS is empty', async () => {
    const env = makeEnv({ ALLOWED_ORIGINS: '' });
    const resp = await handleRequest(jsonReq('OPTIONS', '/x'), env);
    expect(resp.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('catches non-Error throws as 500', async () => {
    const env = makeEnv({
      DB: {
        prepare: () => {
          throw 'plain string error';
        },
      } as unknown as D1Database,
    });
    const resp = await handleRequest(jsonReq('POST', '/auth/login', { username: 'a', pin: '1234' }), env);
    expect(resp.status).toBe(500);
    const body = (await resp.json()) as { message: string };
    expect(body.message).toBe('plain string error');
  });

  it('catches internal errors as 500', async () => {
    const env = makeEnv({
      DB: {
        prepare: () => {
          throw new Error('boom');
        },
      } as unknown as D1Database,
    });
    const resp = await handleRequest(jsonReq('POST', '/auth/login', { username: 'a', pin: '1234' }), env);
    expect(resp.status).toBe(500);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe('internal_error');
  });
});

describe('POST /auth/login', () => {
  it('creates user on first login', async () => {
    const resp = await handleRequest(
      jsonReq('POST', '/auth/login', { username: 'xiaoxue', pin: '1234' }),
      makeEnv()
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { created: boolean; token: string };
    expect(body.created).toBe(true);
    expect(body.token).toMatch(/^[^.]+\.[^.]+$/);
  });

  it('returns 400 on invalid input', async () => {
    const resp = await handleRequest(jsonReq('POST', '/auth/login', { pin: '12' }), makeEnv());
    expect(resp.status).toBe(400);
  });

  it('returns 400 when only username provided (pin missing)', async () => {
    const resp = await handleRequest(jsonReq('POST', '/auth/login', { username: 'x' }), makeEnv());
    expect(resp.status).toBe(400);
  });

  it('returns 400 on non-JSON body', async () => {
    const resp = await handleRequest(
      new Request('https://worker.example/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      }),
      makeEnv()
    );
    expect(resp.status).toBe(400);
  });

  it('returns 401 on wrong pin for existing user', async () => {
    const env = makeEnv();
    await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('POST', '/auth/login', { username: 'xiaoxue', pin: '9999' }),
      env
    );
    expect(resp.status).toBe(401);
  });
});

describe('Slots routes', () => {
  it('rejects without auth', async () => {
    const resp = await handleRequest(jsonReq('GET', '/slots'), makeEnv());
    expect(resp.status).toBe(401);
  });

  it('lists 5 empty slots for new user', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('GET', '/slots', undefined, { authorization: `Bearer ${token}` }),
      env
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { slots: { id: number; isEmpty: boolean }[] };
    expect(body.slots).toHaveLength(5);
    expect(body.slots.every((s) => s.isEmpty)).toBe(true);
  });

  it('saves, loads, and deletes a slot', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);

    const saveResp = await handleRequest(
      jsonReq('PUT', '/slots/1', { stateJson: '{"day":1}' }, { authorization: `Bearer ${token}` }),
      env
    );
    expect(saveResp.status).toBe(200);

    const loadResp = await handleRequest(
      jsonReq('GET', '/slots/1', undefined, { authorization: `Bearer ${token}` }),
      env
    );
    expect(loadResp.status).toBe(200);
    const loadBody = (await loadResp.json()) as { slot: { stateJson: string } };
    expect(loadBody.slot.stateJson).toBe('{"day":1}');

    const delResp = await handleRequest(
      jsonReq('DELETE', '/slots/1', undefined, { authorization: `Bearer ${token}` }),
      env
    );
    expect(delResp.status).toBe(200);

    const reload = await handleRequest(
      jsonReq('GET', '/slots/1', undefined, { authorization: `Bearer ${token}` }),
      env
    );
    const reloadBody = (await reload.json()) as { slot: { isEmpty: boolean } };
    expect(reloadBody.slot.isEmpty).toBe(true);
  });

  it('rejects PUT with invalid body', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('PUT', '/slots/1', { stateJson: 123 }, { authorization: `Bearer ${token}` }),
      env
    );
    expect(resp.status).toBe(400);
  });

  it('rejects PUT with non-JSON state', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('PUT', '/slots/1', { stateJson: 'not json' }, { authorization: `Bearer ${token}` }),
      env
    );
    expect(resp.status).toBe(400);
  });

  it('rejects PUT with bad JSON body', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      new Request('https://worker.example/slots/1', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: '{not json',
      }),
      env
    );
    expect(resp.status).toBe(400);
  });

  it('rejects DELETE on invalid slot id', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('DELETE', '/slots/99', undefined, { authorization: `Bearer ${token}` }),
      env
    );
    expect(resp.status).toBe(400);
  });

  it('rejects GET on invalid slot id', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('GET', '/slots/99', undefined, { authorization: `Bearer ${token}` }),
      env
    );
    expect(resp.status).toBe(400);
  });

  it('rejects unknown method on /slots/:id', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const resp = await handleRequest(
      jsonReq('POST', '/slots/1', {}, { authorization: `Bearer ${token}` }),
      env
    );
    expect(resp.status).toBe(404);
  });

  it('rejects forged token', async () => {
    const resp = await handleRequest(
      jsonReq('GET', '/slots', undefined, { authorization: 'Bearer not.a.real.token' }),
      makeEnv()
    );
    expect(resp.status).toBe(401);
  });

  it('rejects token for nonexistent user', async () => {
    const env = makeEnv();
    const ghost = await signToken('ghost', env.SESSION_SECRET);
    const resp = await handleRequest(
      jsonReq('GET', '/slots', undefined, { authorization: `Bearer ${ghost}` }),
      env
    );
    expect(resp.status).toBe(401);
  });
});

describe('POST /llm/messages', () => {
  it('rejects without auth', async () => {
    const resp = await handleRequest(jsonReq('POST', '/llm/messages', {}), makeEnv());
    expect(resp.status).toBe(401);
  });

  it('proxies to upstream when authed', async () => {
    const env = makeEnv();
    const { token } = await loginAndGetToken(env);
    const upstreamFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ content: [{ type: 'text', text: 'hi' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    try {
      const resp = await handleRequest(
        jsonReq('POST', '/llm/messages', { messages: [{ role: 'user', content: 'hi' }] }, {
          authorization: `Bearer ${token}`,
        }),
        env
      );
      expect(resp.status).toBe(200);
      expect(upstreamFetch).toHaveBeenCalledOnce();
      const [url] = upstreamFetch.mock.calls[0]!;
      expect(String(url)).toContain('/v1/messages');
    } finally {
      upstreamFetch.mockRestore();
    }
  });
});
