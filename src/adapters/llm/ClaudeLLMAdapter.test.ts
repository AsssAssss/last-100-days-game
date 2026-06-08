import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import type { ILogger } from '../../application/ports/ILogger';
import { ClaudeLLMAdapter, type AnthropicLike } from './ClaudeLLMAdapter';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeClient(message: unknown): AnthropicLike & { create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => message);
  return { messages: { create } as unknown as AnthropicLike['messages'], create };
}

const turnInputFromLLM = {
  narrative: '你看见一只丧尸。',
  choices: ['攻击', '潜行', '后退'],
  statePatch: {
    resources: { food: -1, water: -1 },
    inventoryAdd: [],
    inventoryRemove: [],
    memoryNote: '遇到丧尸',
    isGameOver: false,
    dayPassed: false,
  },
};

describe('ClaudeLLMAdapter', () => {
  describe('nextTurn', () => {
    it('parses tool_use block and returns RawTurnPatch', async () => {
      const client = makeClient({
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', name: 'game_turn', id: 'tu1', input: turnInputFromLLM },
        ],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6' },
        makeLogger()
      );
      const result = await adapter.nextTurn({
        state: INITIAL_GAME_STATE,
        playerInput: null,
        requestID: 'rid-1',
      });
      expect(result).toEqual(turnInputFromLLM);
      expect(client.create).toHaveBeenCalledOnce();
      const callArg = client.create.mock.calls[0][0];
      expect(callArg.model).toBe('claude-sonnet-4-6');
      expect(callArg.tool_choice).toEqual({ type: 'tool', name: 'game_turn' });
    });

    it('throws when response lacks a game_turn tool_use block', async () => {
      const client = makeClient({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'no tool here' }],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6' },
        makeLogger()
      );
      await expect(
        adapter.nextTurn({
          state: INITIAL_GAME_STATE,
          playerInput: null,
          requestID: 'rid-2',
        })
      ).rejects.toThrow('game_turn');
    });

    it('throws when tool_use block has wrong name', async () => {
      const client = makeClient({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', name: 'something_else', id: 'x', input: {} }],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6' },
        makeLogger()
      );
      await expect(
        adapter.nextTurn({
          state: INITIAL_GAME_STATE,
          playerInput: null,
          requestID: 'rid-3',
        })
      ).rejects.toThrow();
    });

    it('honors maxTokens from config', async () => {
      const client = makeClient({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', name: 'game_turn', id: 'tu1', input: turnInputFromLLM }],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6', maxTokens: 4096 },
        makeLogger()
      );
      await adapter.nextTurn({
        state: INITIAL_GAME_STATE,
        playerInput: null,
        requestID: 'rid-4',
      });
      expect(client.create.mock.calls[0][0].max_tokens).toBe(4096);
    });
  });

  describe('compressMemory', () => {
    it('returns text content from LLM response', async () => {
      const client = makeClient({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: '前 10 天平静地度过，遇见一只猫并取名小黑。' }],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6' },
        makeLogger()
      );
      const summary = await adapter.compressMemory({
        notesToCompress: [{ day: 1, note: '遇到小黑' }],
        priorSummaries: [],
        requestID: 'rid-c1',
      });
      expect(summary).toBe('前 10 天平静地度过，遇见一只猫并取名小黑。');
    });

    it('throws when response has no text block', async () => {
      const client = makeClient({
        stop_reason: 'end_turn',
        content: [{ type: 'tool_use', name: 'x', id: 'y', input: {} }],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6' },
        makeLogger()
      );
      await expect(
        adapter.compressMemory({
          notesToCompress: [{ day: 1, note: 'a' }],
          priorSummaries: ['前情'],
          requestID: 'rid-c2',
        })
      ).rejects.toThrow();
    });

    it('includes prior summaries in the prompt when provided', async () => {
      const client = makeClient({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'ok' }],
      });
      const adapter = new ClaudeLLMAdapter(
        client,
        { model: 'claude-sonnet-4-6' },
        makeLogger()
      );
      await adapter.compressMemory({
        notesToCompress: [{ day: 11, note: '抢劫' }],
        priorSummaries: ['前面 10 天概要'],
        requestID: 'rid-c3',
      });
      const callArg = client.create.mock.calls[0][0];
      const userMsg = callArg.messages[0].content;
      expect(userMsg).toContain('前面 10 天概要');
      expect(userMsg).toContain('抢劫');
    });
  });
});
