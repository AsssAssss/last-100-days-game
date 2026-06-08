import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import type { ILLMPort } from '../ports/ILLMPort';
import type { ILogger } from '../ports/ILogger';
import { resolveChoice } from './ResolveChoice';

function mockLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeLLM(): ILLMPort {
  return {
    nextTurn: vi.fn(async () => ({
      narrative: '你来到一片废墟。',
      choices: ['搜索', '撤退', '隐蔽'],
      statePatch: {
        resources: { food: -2, water: -1 },
        inventoryAdd: ['一盒罐头'],
        inventoryRemove: [],
        memoryNote: '废墟搜寻',
        isGameOver: false,
        dayPassed: true,
      },
    })),
    compressMemory: vi.fn(async () => 'irrelevant'),
  };
}

describe('resolveChoice', () => {
  it('advances state when player input is provided', async () => {
    const llm = makeLLM();
    const next = await resolveChoice(INITIAL_GAME_STATE, '搜索附近的便利店', {
      llm,
      logger: mockLogger(),
      newRequestID: () => 'rid',
    });
    expect(next.day).toBe(INITIAL_GAME_STATE.day + 1);
    expect(next.inventory).toContain('一盒罐头');
    expect(next.lastNarrative).toBe('你来到一片废墟。');
  });

  it('returns the same state when game is already over', async () => {
    const llm = makeLLM();
    const dead = { ...INITIAL_GAME_STATE, isGameOver: true };
    const next = await resolveChoice(dead, '随便', {
      llm,
      logger: mockLogger(),
      newRequestID: () => 'rid',
    });
    expect(next).toBe(dead);
    expect(llm.nextTurn).not.toHaveBeenCalled();
  });

  it('handles initial turn with null player input without advancing the day', async () => {
    const llm = makeLLM();
    const next = await resolveChoice(INITIAL_GAME_STATE, null, {
      llm,
      logger: mockLogger(),
      newRequestID: () => 'rid',
    });
    expect(llm.nextTurn).toHaveBeenCalledOnce();
    expect(next.choices).toEqual(['搜索', '撤退', '隐蔽']);
    expect(next.day).toBe(INITIAL_GAME_STATE.day);
  });
});
