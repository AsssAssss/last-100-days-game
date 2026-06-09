import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import type { ILogger } from '../../application/ports/ILogger';
import {
  BrowserLLMAdapter,
  type BrowserLLMConfig,
} from './BrowserLLMAdapter';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const VALID_CONFIG: BrowserLLMConfig = {
  apiKey: 'sk-test',
  baseURL: 'https://onehub.akacm.com/claude',
  model: 'claude-sonnet-4-6',
};

const SAMPLE_TOOL_USE = {
  content: [
    {
      type: 'tool_use',
      name: 'game_turn',
      id: 'tu1',
      input: {
        narrative: '你看见丧尸。',
        choices: ['攻击', '逃', '躲'],
        statePatch: {
          resources: { sanity: -5 },
          inventoryAdd: [],
          inventoryRemove: [],
          memoryNote: '碰到丧尸',
          isGameOver: false,
          dayPassed: false,
        },
      },
    },
  ],
  stop_reason: 'tool_use',
};

function makeFetch(response: { status?: number; body: unknown; throwErr?: unknown }): {
  fn: typeof fetch;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    if (response.throwErr !== undefined) throw response.throwErr;
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('BrowserLLMAdapter', () => {
  it('throws llm_not_configured when getConfig returns null', async () => {
    const a = new BrowserLLMAdapter({ getConfig: () => null, fetchImpl: makeFetch({ body: {} }).fn }, makeLogger());
    await expect(
      a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
    ).rejects.toThrow(/not_configured/);
  });

  it.each([
    { apiKey: '', baseURL: 'x', model: 'y' },
    { apiKey: 'x', baseURL: '', model: 'y' },
    { apiKey: 'x', baseURL: 'y', model: '' },
  ])('throws llm_not_configured for incomplete config %j', async (cfg) => {
    const a = new BrowserLLMAdapter(
      { getConfig: () => cfg as BrowserLLMConfig, fetchImpl: makeFetch({ body: {} }).fn },
      makeLogger()
    );
    await expect(
      a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
    ).rejects.toThrow(/not_configured/);
  });

  it('POSTs to baseURL/v1/messages with x-api-key', async () => {
    const { fn, calls } = makeFetch({ body: SAMPLE_TOOL_USE });
    const a = new BrowserLLMAdapter(
      { getConfig: () => VALID_CONFIG, fetchImpl: fn },
      makeLogger()
    );
    await a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' });
    expect(calls[0]!.url).toBe('https://onehub.akacm.com/claude/v1/messages');
    expect((calls[0]!.init.headers as Record<string, string>)['x-api-key']).toBe('sk-test');
  });

  it('strips trailing slash from baseURL', async () => {
    const { fn, calls } = makeFetch({ body: SAMPLE_TOOL_USE });
    const a = new BrowserLLMAdapter(
      {
        getConfig: () => ({ ...VALID_CONFIG, baseURL: 'https://onehub.akacm.com/claude/' }),
        fetchImpl: fn,
      },
      makeLogger()
    );
    await a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' });
    expect(calls[0]!.url).toBe('https://onehub.akacm.com/claude/v1/messages');
  });

  it('parses tool_use', async () => {
    const { fn } = makeFetch({ body: SAMPLE_TOOL_USE });
    const a = new BrowserLLMAdapter(
      { getConfig: () => VALID_CONFIG, fetchImpl: fn },
      makeLogger()
    );
    const r = await a.nextTurn({
      state: INITIAL_GAME_STATE,
      playerInput: null,
      requestID: 'r',
    });
    expect(r.narrative).toBe('你看见丧尸。');
  });

  it('throws when no tool_use in response', async () => {
    const { fn } = makeFetch({
      body: { content: [{ type: 'text', text: 'no tool' }] },
    });
    const a = new BrowserLLMAdapter(
      { getConfig: () => VALID_CONFIG, fetchImpl: fn },
      makeLogger()
    );
    await expect(
      a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
    ).rejects.toThrow(/game_turn/);
  });

  it('throws when tool name is wrong', async () => {
    const { fn } = makeFetch({
      body: { content: [{ type: 'tool_use', name: 'other', input: {} }] },
    });
    const a = new BrowserLLMAdapter(
      { getConfig: () => VALID_CONFIG, fetchImpl: fn },
      makeLogger()
    );
    await expect(
      a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
    ).rejects.toThrow();
  });

  it('throws on non-2xx', async () => {
    const { fn } = makeFetch({ status: 401, body: { error: 'unauthorized' } });
    const a = new BrowserLLMAdapter(
      { getConfig: () => VALID_CONFIG, fetchImpl: fn },
      makeLogger()
    );
    await expect(
      a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
    ).rejects.toThrow(/401/);
  });

  it('handles missing content array', async () => {
    const { fn } = makeFetch({ body: {} });
    const a = new BrowserLLMAdapter(
      { getConfig: () => VALID_CONFIG, fetchImpl: fn },
      makeLogger()
    );
    await expect(
      a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
    ).rejects.toThrow();
  });

  it('uses global fetch when fetchImpl is not provided', async () => {
    const stub = vi.fn(async () => new Response(JSON.stringify(SAMPLE_TOOL_USE), { status: 200 }));
    const original = globalThis.fetch;
    globalThis.fetch = stub as unknown as typeof fetch;
    try {
      const a = new BrowserLLMAdapter({ getConfig: () => VALID_CONFIG }, makeLogger());
      await a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' });
      expect(stub).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = original;
    }
  });

  describe('compressMemory', () => {
    it('returns text', async () => {
      const { fn } = makeFetch({
        body: { content: [{ type: 'text', text: '摘要 ' }] },
      });
      const a = new BrowserLLMAdapter(
        { getConfig: () => VALID_CONFIG, fetchImpl: fn },
        makeLogger()
      );
      const r = await a.compressMemory({
        notesToCompress: [{ day: 1, note: 'a' }],
        priorSummaries: ['前情'],
        requestID: 'r',
      });
      expect(r).toBe('摘要');
    });

    it('skips priorSummaries section when empty', async () => {
      const { fn, calls } = makeFetch({
        body: { content: [{ type: 'text', text: 'ok' }] },
      });
      const a = new BrowserLLMAdapter(
        { getConfig: () => VALID_CONFIG, fetchImpl: fn },
        makeLogger()
      );
      await a.compressMemory({
        notesToCompress: [{ day: 1, note: 'a' }],
        priorSummaries: [],
        requestID: 'r',
      });
      const body = JSON.parse(calls[0]!.init.body as string);
      expect(body.messages[0].content).not.toContain('已有摘要');
    });

    it('throws when no text block', async () => {
      const { fn } = makeFetch({
        body: { content: [{ type: 'tool_use', name: 'x', input: {} }] },
      });
      const a = new BrowserLLMAdapter(
        { getConfig: () => VALID_CONFIG, fetchImpl: fn },
        makeLogger()
      );
      await expect(
        a.compressMemory({
          notesToCompress: [{ day: 1, note: 'a' }],
          priorSummaries: [],
          requestID: 'r',
        })
      ).rejects.toThrow();
    });

    it('throws not_configured when no config', async () => {
      const a = new BrowserLLMAdapter(
        { getConfig: () => null, fetchImpl: makeFetch({ body: {} }).fn },
        makeLogger()
      );
      await expect(
        a.compressMemory({
          notesToCompress: [{ day: 1, note: 'a' }],
          priorSummaries: [],
          requestID: 'r',
        })
      ).rejects.toThrow(/not_configured/);
    });
  });
});
