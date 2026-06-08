import { describe, it, expect } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { advanceDay } from './AdvanceDay';

describe('advanceDay', () => {
  const e = (dayPassed = true) => ({
    narrative: 'x',
    choices: ['a', 'b', 'c'],
    resourceDelta: {},
    inventoryAdd: [],
    inventoryRemove: [],
    memoryNote: '',
    isGameOver: false,
    dayPassed,
  });

  it('increments day when event.dayPassed is true', () => {
    const next = advanceDay(INITIAL_GAME_STATE, e(true));
    expect(next.day).toBe(INITIAL_GAME_STATE.day + 1);
  });

  it('keeps the same day when event.dayPassed is false (within-day turn)', () => {
    const next = advanceDay(INITIAL_GAME_STATE, e(false));
    expect(next.day).toBe(INITIAL_GAME_STATE.day);
  });

  it('forces no day increment on opening turn even when LLM said dayPassed=true', () => {
    const next = advanceDay(INITIAL_GAME_STATE, e(true), true);
    expect(next.day).toBe(INITIAL_GAME_STATE.day);
  });
});
