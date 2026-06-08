import { describe, it, expect, vi } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { COMPRESS_EVERY } from '../../domain/entities/StoryMemory';
import type { ILLMPort } from '../ports/ILLMPort';
import type { ILogger } from '../ports/ILogger';
import { compressMemoryIfNeeded } from './CompressMemory';

function mockLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function mockLLM(summary = '老剧情摘要'): ILLMPort {
  return {
    nextTurn: vi.fn(),
    compressMemory: vi.fn(async () => summary),
  };
}

describe('compressMemoryIfNeeded', () => {
  it('returns state unchanged when memory is below threshold', async () => {
    const llm = mockLLM();
    const result = await compressMemoryIfNeeded(INITIAL_GAME_STATE, {
      llm,
      logger: mockLogger(),
      newRequestID: () => 'rid',
    });
    expect(result).toBe(INITIAL_GAME_STATE);
    expect(llm.compressMemory).not.toHaveBeenCalled();
  });

  it('compresses old entries and appends summary when threshold reached', async () => {
    const recent = Array.from({ length: COMPRESS_EVERY }, (_, i) => ({
      day: i + 1,
      note: `事件 ${i + 1}`,
    }));
    const state = {
      ...INITIAL_GAME_STATE,
      memory: { recent, summaries: [] },
    };
    const llm = mockLLM('压缩后的剧情');
    const result = await compressMemoryIfNeeded(state, {
      llm,
      logger: mockLogger(),
      newRequestID: () => 'rid',
    });
    expect(result.memory.summaries).toEqual(['压缩后的剧情']);
    expect(result.memory.recent.length).toBeLessThan(COMPRESS_EVERY);
    expect(llm.compressMemory).toHaveBeenCalledOnce();
  });
});
