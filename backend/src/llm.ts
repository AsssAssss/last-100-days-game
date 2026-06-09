/**
 * LLM 代理：把前端传来的 messages/tools 等参数 + 后端的 api key
 * 一起转发到 one-hub（或任意 Anthropic 兼容端点）。
 * key 永远不离开 Worker。
 */

const DEFAULT_BASE_URL = 'https://onehub.akacm.com/claude';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const RETRY_ON_STATUS = new Set([502, 503, 504, 522, 524]);
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

export interface LLMProxyConfig {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly defaultModel?: string;
}

export interface LLMProxyDeps {
  /** 注入 fetch，便于测试。 */
  readonly fetchImpl?: typeof fetch;
}

const FORWARD_HEADERS_TO_LLM: readonly string[] = ['content-type', 'anthropic-version'];
const STRIP_FROM_LLM_RESPONSE: readonly string[] = [
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'content-type', // 我们统一强制为 application/json
];

/**
 * 把前端的请求体转发到 Anthropic messages 接口。
 * 默认补一个 model（前端可覆盖）。
 */
export async function proxyMessages(
  request: Request,
  config: LLMProxyConfig,
  deps: LLMProxyDeps = {}
): Promise<Response> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const base = (config.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (typeof body.model !== 'string') {
    body.model = config.defaultModel ?? DEFAULT_MODEL;
  }

  const headers: Record<string, string> = {
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  for (const name of FORWARD_HEADERS_TO_LLM) {
    const v = request.headers.get(name);
    if (v) headers[name] = v;
  }
  headers['x-api-key'] = config.apiKey; // 强制覆盖，前端不能伪造

  const upstream = await fetchWithRetry(
    fetchFn,
    `${base}/v1/messages`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );

  const respHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIP_FROM_LLM_RESPONSE.includes(key.toLowerCase())) {
      respHeaders.set(key, value);
    }
  });
  respHeaders.set('content-type', 'application/json');

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: respHeaders,
  });
}

/**
 * 对 5xx 自动重试，指数退避（800ms → 1600ms）。
 * 网络错误同样重试。
 */
async function fetchWithRetry(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetchFn(url, init);
      if (!RETRY_ON_STATUS.has(resp.status) || attempt === MAX_RETRIES) {
        return resp;
      }
      lastError = new Error(`upstream returned ${resp.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) throw err;
    }
    await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
  }
  // unreachable but TS needs a return
  throw lastError ?? new Error('fetchWithRetry exhausted retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
