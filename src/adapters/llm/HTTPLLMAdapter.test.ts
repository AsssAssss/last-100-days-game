import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import type { ILogger } from '../../application/ports/ILogger';
import { HTTPLLMAdapter } from './HTTPLLMAdapter';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeFetch(response: { status?: number; body: unknown }): {
  fn: typeof fetch;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const SAMPLE_TOOL_USE = {
  content: [
    {
      type: 'tool_use',
      name: 'game_turn',
      id: 'tu1',
      input: {
        narrative: '你看见一个丧尸。',
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

describe('HTTPLLMAdapter', () => {
  it('uses global fetch when fetchImpl is not provided', async () => {
    const stub = vi.fn(async () =>
      new Response(JSON.stringify(SAMPLE_TOOL_USE), { status: 200 })
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stub as unknown as typeof fetch;
    try {
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN' },
        makeLogger()
      );
      await a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' });
      expect(stub).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  describe('nextTurn', () => {
    it('throws without token', async () => {
      const { fn } = makeFetch({ body: SAMPLE_TOOL_USE });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => null, fetchImpl: fn },
        makeLogger()
      );
      await expect(
        a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
      ).rejects.toThrow(/not_authenticated/);
    });

    it('POSTs to /llm/messages with bearer token', async () => {
      const { fn, calls } = makeFetch({ body: SAMPLE_TOOL_USE });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example/', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      await a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' });
      expect(calls[0]!.url).toBe('https://api.example/llm/messages');
      expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer TOKEN');
    });

    it('parses tool_use block', async () => {
      const { fn } = makeFetch({ body: SAMPLE_TOOL_USE });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      const r = await a.nextTurn({
        state: INITIAL_GAME_STATE,
        playerInput: null,
        requestID: 'r',
      });
      expect(r.narrative).toBe('你看见一个丧尸。');
    });

    it('throws when response lacks tool_use', async () => {
      const { fn } = makeFetch({
        body: { content: [{ type: 'text', text: 'no tool' }], stop_reason: 'end_turn' },
      });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
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
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      await expect(
        a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
      ).rejects.toThrow();
    });

    it('throws on non-2xx response', async () => {
      const { fn } = makeFetch({ status: 502, body: 'gateway' });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      await expect(
        a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
      ).rejects.toThrow(/502/);
    });

    it('handles missing content array gracefully', async () => {
      const { fn } = makeFetch({ body: {} });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      await expect(
        a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' })
      ).rejects.toThrow();
    });

    it('passes model + maxTokens overrides', async () => {
      const { fn, calls } = makeFetch({ body: SAMPLE_TOOL_USE });
      const a = new HTTPLLMAdapter(
        {
          baseURL: 'https://api.example',
          getToken: () => 'TOKEN',
          model: 'custom-model',
          maxTokens: 4096,
          fetchImpl: fn,
        },
        makeLogger()
      );
      await a.nextTurn({ state: INITIAL_GAME_STATE, playerInput: null, requestID: 'r' });
      const body = JSON.parse(calls[0]!.init.body as string);
      expect(body.model).toBe('custom-model');
      expect(body.max_tokens).toBe(4096);
    });
  });

  describe('compressMemory', () => {
    it('returns text from response', async () => {
      const { fn } = makeFetch({
        body: { content: [{ type: 'text', text: '前 10 天概要 ' }] },
      });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      const r = await a.compressMemory({
        notesToCompress: [{ day: 1, note: 'a' }],
        priorSummaries: ['前情'],
        requestID: 'r',
      });
      expect(r).toBe('前 10 天概要');
    });

    it('throws when no text block', async () => {
      const { fn } = makeFetch({
        body: { content: [{ type: 'tool_use', name: 'x', input: {} }] },
      });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
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

    it('skips priorSummaries section when empty', async () => {
      const { fn, calls } = makeFetch({
        body: { content: [{ type: 'text', text: 'ok' }] },
      });
      const a = new HTTPLLMAdapter(
        { baseURL: 'https://api.example', getToken: () => 'TOKEN', fetchImpl: fn },
        makeLogger()
      );
      await a.compressMemory({
        notesToCompress: [{ day: 1, note: 'a' }],
        priorSummaries: [],
        requestID: 'r',
      });
      const body = JSON.parse(calls[0]!.init.body as string);
      const text = body.messages[0].content;
      expect(text).not.toContain('已有摘要');
    });
  });
});
