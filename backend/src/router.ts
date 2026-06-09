/**
 * 简单的方法 + 路径路由器。
 * 不引第三方库——Worker 冷启动越小越好。
 */
import { authGuard, loginOrRegister, type AuthGuardResult } from './auth';
import type { Env } from './env';
import { proxyMessages } from './llm';
import { clearSlot, listAllSlots, loadSlot, saveSlot } from './slots';

const JSON_HEADERS = { 'content-type': 'application/json' };

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });
}

function corsHeaders(origin: string | null, allowed: string): Record<string, string> {
  const allowedList = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  const fallback = allowedList[0] ?? '*';
  const matched = origin && allowedList.includes(origin) ? origin : fallback;
  return {
    'access-control-allow-origin': matched,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const resp = await route(request, env);
    Object.entries(cors).forEach(([k, v]) => resp.headers.set(k, v));
    return resp;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const resp = json({ error: 'internal_error', message }, { status: 500 });
    Object.entries(cors).forEach(([k, v]) => resp.headers.set(k, v));
    return resp;
  }
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // —— unauthed routes ——
  if (method === 'GET' && path === '/health') {
    return json({ ok: true });
  }
  if (method === 'POST' && path === '/auth/login') {
    return handleLogin(request, env);
  }

  // —— authed routes ——
  if (method === 'GET' && path === '/slots') {
    return withAuth(request, env, (userId) => handleListSlots(userId, env));
  }

  const slotMatch = /^\/slots\/(\d+)$/.exec(path);
  if (slotMatch && slotMatch[1]) {
    const slotId = parseInt(slotMatch[1], 10);
    if (method === 'GET') {
      return withAuth(request, env, (userId) => handleGetSlot(userId, slotId, env));
    }
    if (method === 'PUT') {
      return withAuth(request, env, (userId) => handlePutSlot(userId, slotId, request, env));
    }
    if (method === 'DELETE') {
      return withAuth(request, env, (userId) => handleDeleteSlot(userId, slotId, env));
    }
  }

  if (method === 'POST' && path === '/llm/messages') {
    return withAuth(request, env, () =>
      proxyMessages(request, {
        apiKey: env.LLM_API_KEY,
        baseURL: env.LLM_BASE_URL,
        defaultModel: env.LLM_MODEL,
      })
    );
  }

  return json({ error: 'not_found' }, { status: 404 });
}

async function withAuth(
  request: Request,
  env: Env,
  fn: (userId: string) => Promise<Response>
): Promise<Response> {
  const auth: AuthGuardResult = await authGuard(request.headers.get('authorization'), {
    db: env.DB,
    secret: env.SESSION_SECRET,
  });
  if (!auth.ok) {
    return json({ error: 'unauthorized', reason: auth.reason }, { status: 401 });
  }
  return fn(auth.userId);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    pin?: string;
  } | null;
  if (!body) return json({ error: 'invalid_json' }, { status: 400 });
  const outcome = await loginOrRegister(
    { username: body.username ?? '', pin: body.pin ?? '' },
    { db: env.DB, secret: env.SESSION_SECRET }
  );
  if (!outcome.ok) {
    const status = outcome.error === 'invalid_input' ? 400 : 401;
    return json({ error: outcome.error }, { status });
  }
  return json({
    userId: outcome.userId,
    token: outcome.token,
    created: outcome.created,
  });
}

async function handleListSlots(userId: string, env: Env): Promise<Response> {
  const slots = await listAllSlots(userId, { db: env.DB });
  return json({ slots });
}

async function handleGetSlot(userId: string, slotId: number, env: Env): Promise<Response> {
  const slot = await loadSlot(userId, slotId, { db: env.DB });
  if (!slot) return json({ error: 'invalid_slot_id' }, { status: 400 });
  return json({ slot });
}

async function handlePutSlot(
  userId: string,
  slotId: number,
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    stateJson?: string;
  } | null;
  if (!body || typeof body.stateJson !== 'string') {
    return json({ error: 'invalid_state' }, { status: 400 });
  }
  const r = await saveSlot(userId, slotId, body.stateJson, { db: env.DB });
  if (!r.ok) return json({ error: r.error }, { status: 400 });
  return json({ ok: true, updatedAt: r.updatedAt });
}

async function handleDeleteSlot(userId: string, slotId: number, env: Env): Promise<Response> {
  const r = await clearSlot(userId, slotId, { db: env.DB });
  if (!r.ok) return json({ error: r.error }, { status: 400 });
  return json({ ok: true });
}
