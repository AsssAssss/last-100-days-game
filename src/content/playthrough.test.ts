import { describe, it, expect, vi } from 'vitest';
import { resolveChoice } from '../application/usecases/ResolveChoice';
import type { ILogger } from '../application/ports/ILogger';
import { INITIAL_GAME_STATE, type GameState } from '../domain/entities/GameState';
import { ScriptedStoryAdapter } from '../adapters/scripted/ScriptedStoryAdapter';
import { nextRandom } from '../adapters/scripted/rng';
import { STORY_CONTENT } from './index';

/**
 * 全自动通关冒烟测试：用真实引擎 + 真实剧本随机游玩。
 * 目标不是赢，而是证明任何随机路径都不会让引擎崩溃/卡死。
 */

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

async function autoPlay(seed: number, maxTurns = 400): Promise<GameState> {
  const adapter = new ScriptedStoryAdapter(STORY_CONTENT, makeLogger(), {
    newSeed: () => seed,
  });
  const deps = { llm: adapter, logger: makeLogger(), newRequestID: () => 'rid' };

  let state = await resolveChoice(INITIAL_GAME_STATE, null, deps); // 开场
  let pickSeed = seed * 7 + 1;

  for (let turn = 0; turn < maxTurns; turn++) {
    if (state.isGameOver) return state;
    expect(state.choices.length).toBeGreaterThan(0); // 不允许"活着却无路可走"
    const { value, nextSeed } = nextRandom(pickSeed);
    pickSeed = nextSeed;
    const choice = state.choices[Math.floor(value * state.choices.length)];
    state = await resolveChoice(state, choice, deps);
  }
  return state;
}

describe('全自动随机通关（真实剧本）', () => {
  it.each([1, 2, 3, 7, 13, 42, 99, 1234])(
    '种子 %i：随机游玩直到结局或 400 回合，引擎不崩溃',
    async (seed) => {
      const final = await autoPlay(seed);
      // 要么到达结局，要么还活着（天数推进正常、人性值在界内）
      expect(final.day).toBeGreaterThanOrEqual(1);
      expect(final.day).toBeLessThanOrEqual(100);
      if (final.script) {
        expect(final.script.humanity).toBeGreaterThanOrEqual(0);
        expect(final.script.humanity).toBeLessThanOrEqual(100);
      }
    }
  );

  it('至少一个种子能到达第一幕结局（act01-complete 或死亡）', async () => {
    let reachedEnding = false;
    for (const seed of [1, 2, 3, 7, 13, 42, 99, 1234]) {
      const final = await autoPlay(seed);
      if (final.isGameOver) {
        reachedEnding = true;
        expect(final.gameOverReason).toBeTruthy();
        break;
      }
    }
    expect(reachedEnding).toBe(true);
  });

  it('善线一周目：永远选第一个选项也能玩到结局或撑满回合', async () => {
    const adapter = new ScriptedStoryAdapter(STORY_CONTENT, makeLogger(), {
      newSeed: () => 5,
    });
    const deps = { llm: adapter, logger: makeLogger(), newRequestID: () => 'rid' };
    let state = await resolveChoice(INITIAL_GAME_STATE, null, deps);
    for (let i = 0; i < 400 && !state.isGameOver; i++) {
      expect(state.choices.length).toBeGreaterThan(0);
      state = await resolveChoice(state, state.choices[0], deps);
    }
    expect(state.day).toBeLessThanOrEqual(100);
  });
});
