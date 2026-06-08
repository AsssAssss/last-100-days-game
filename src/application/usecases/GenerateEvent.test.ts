import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import type { ILLMPort } from '../ports/ILLMPort';
import type { ILogger } from '../ports/ILogger';
import { generateEvent } from './GenerateEvent';

function mockLogger(): ILogger & { calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = [];
  return {
    calls,
    debug: (p) => calls.push(['debug', p]),
    info: (p) => calls.push(['info', p]),
    warn: (p) => calls.push(['warn', p]),
    error: (p) => calls.push(['error', p]),
  };
}

function mockLLM(overrides: Partial<ILLMPort> = {}): ILLMPort {
  return {
    nextTurn: vi.fn(async () => ({
      narrative: '一阵风刮过。',
      choices: ['留下', '离开', '查看'],
      statePatch: {
        resources: { food: -1, water: -1 },
        inventoryAdd: [],
        inventoryRemove: [],
        memoryNote: 'Day 1 平静',
        isGameOver: false,
        dayPassed: false,
      },
    })),
    compressMemory: vi.fn(async () => ''),
    ...overrides,
  };
}

describe('generateEvent', () => {
  it('calls the LLM and returns a validated TurnEvent', async () => {
    const llm = mockLLM();
    const logger = mockLogger();
    const ev = await generateEvent(INITIAL_GAME_STATE, null, {
      llm,
      logger,
      newRequestID: () => 'rid-1',
    });
    expect(ev.narrative).toBe('一阵风刮过。');
    expect(ev.choices).toEqual(['留下', '离开', '查看']);
    expect(ev.resourceDelta).toEqual({ food: -1, water: -1 });
    expect(llm.nextTurn).toHaveBeenCalledOnce();
  });

  it('logs debug events for start and done', async () => {
    const llm = mockLLM();
    const logger = mockLogger();
    await generateEvent(INITIAL_GAME_STATE, '探索', {
      llm,
      logger,
      newRequestID: () => 'rid-2',
    });
    const actions = logger.calls.map(([, p]) => (p as { action: string }).action);
    expect(actions).toContain('llm_call_start');
    expect(actions).toContain('llm_call_done');
  });

  it('warns when validation clamps a patch', async () => {
    const llm = mockLLM({
      nextTurn: vi.fn(async () => ({
        narrative: '神迹降临',
        choices: [],
        statePatch: {
          resources: { hp: 999 },
          inventoryAdd: [],
          inventoryRemove: [],
          memoryNote: '',
          isGameOver: false,
          dayPassed: false,
        },
      })),
    });
    const logger = mockLogger();
    const ev = await generateEvent(INITIAL_GAME_STATE, null, {
      llm,
      logger,
      newRequestID: () => 'rid-3',
    });
    expect(ev.resourceDelta.hp).toBe(10);
    expect(logger.calls.some(([level, p]) => level === 'warn' && (p as { action: string }).action === 'patch_clamped')).toBe(true);
  });
});
