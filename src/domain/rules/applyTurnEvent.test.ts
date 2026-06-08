import { describe, it, expect } from 'vitest';
import type { TurnEvent } from '../entities/Event';
import { INITIAL_GAME_STATE, TOTAL_DAYS } from '../entities/GameState';
import { applyTurnEvent } from './applyTurnEvent';

function event(overrides: Partial<TurnEvent> = {}): TurnEvent {
  return {
    narrative: '一切如常。',
    choices: ['继续', '休息', '探索'],
    resourceDelta: {},
    inventoryAdd: [],
    inventoryRemove: [],
    memoryNote: '',
    isGameOver: false,
    dayPassed: true,
    ...overrides,
  };
}

describe('applyTurnEvent', () => {
  it('advances day on a normal turn', () => {
    const next = applyTurnEvent(INITIAL_GAME_STATE, event());
    expect(next.day).toBe(INITIAL_GAME_STATE.day + 1);
    expect(next.isGameOver).toBe(false);
  });

  it('does not advance day when advanceDay option is false (opening turn override)', () => {
    const next = applyTurnEvent(INITIAL_GAME_STATE, event(), { advanceDay: false });
    expect(next.day).toBe(INITIAL_GAME_STATE.day);
    expect(next.lastNarrative).toBe('一切如常。');
    expect(next.choices).toEqual(['继续', '休息', '探索']);
  });

  it('does not advance day when event.dayPassed is false (LLM signals within-day)', () => {
    const next = applyTurnEvent(INITIAL_GAME_STATE, event({ dayPassed: false }));
    expect(next.day).toBe(INITIAL_GAME_STATE.day);
  });

  it('advances day when event.dayPassed is true (LLM signals end-of-day)', () => {
    const next = applyTurnEvent(INITIAL_GAME_STATE, event({ dayPassed: true }));
    expect(next.day).toBe(INITIAL_GAME_STATE.day + 1);
  });

  it('applies resource deltas', () => {
    const next = applyTurnEvent(
      INITIAL_GAME_STATE,
      event({ resourceDelta: { hp: -10, food: -2 } })
    );
    expect(next.resources.hp).toBe(INITIAL_GAME_STATE.resources.hp - 10);
    expect(next.resources.food).toBe(INITIAL_GAME_STATE.resources.food - 2);
  });

  it('adds and removes inventory items', () => {
    const stateWithItem = {
      ...INITIAL_GAME_STATE,
      inventory: ['手电筒'],
    };
    const next = applyTurnEvent(
      stateWithItem,
      event({ inventoryAdd: ['医药包'], inventoryRemove: ['手电筒'] })
    );
    expect(next.inventory).toEqual(['医药包']);
  });

  it('appends memory when memoryNote is non-empty', () => {
    const next = applyTurnEvent(
      INITIAL_GAME_STATE,
      event({ memoryNote: '遇见一个老人' })
    );
    expect(next.memory.recent).toHaveLength(1);
    expect(next.memory.recent[0]).toEqual({
      day: INITIAL_GAME_STATE.day,
      note: '遇见一个老人',
    });
  });

  it('stores the narrative and presents choices', () => {
    const next = applyTurnEvent(
      INITIAL_GAME_STATE,
      event({ narrative: '夜风刺骨。', choices: ['睡', '巡视'] })
    );
    expect(next.lastNarrative).toBe('夜风刺骨。');
    expect(next.choices).toEqual(['睡', '巡视']);
  });

  it('marks game over when event flags isGameOver=true', () => {
    const next = applyTurnEvent(
      INITIAL_GAME_STATE,
      event({ isGameOver: true, gameOverReason: '被狙击手射中' })
    );
    expect(next.isGameOver).toBe(true);
    expect(next.gameOverReason).toBe('被狙击手射中');
    expect(next.choices).toEqual([]);
  });

  it('uses default reason when event marks game over without reason', () => {
    const next = applyTurnEvent(INITIAL_GAME_STATE, event({ isGameOver: true }));
    expect(next.gameOverReason).toBe('剧情结束');
  });

  it.each([
    ['hp', { hp: -100 }, '伤重不治'],
    ['sanity', { sanity: -100 }, '精神彻底崩溃'],
    ['food', { food: -100 }, '饿死'],
    ['water', { water: -100 }, '渴死'],
  ] as const)(
    'detects death when %s reaches zero',
    (_label, delta, expectedReason) => {
      const next = applyTurnEvent(INITIAL_GAME_STATE, event({ resourceDelta: delta }));
      expect(next.isGameOver).toBe(true);
      expect(next.gameOverReason).toBe(expectedReason);
    }
  );

  it('marks victory when reaching TOTAL_DAYS without dying', () => {
    const lastDayState = { ...INITIAL_GAME_STATE, day: TOTAL_DAYS };
    const next = applyTurnEvent(lastDayState, event());
    expect(next.isGameOver).toBe(true);
    expect(next.gameOverReason).toBe(`成功活到第 ${TOTAL_DAYS} 天`);
    expect(next.day).toBe(TOTAL_DAYS);
  });

  it('death takes precedence over reaching final day', () => {
    const lastDayState = { ...INITIAL_GAME_STATE, day: TOTAL_DAYS };
    const next = applyTurnEvent(lastDayState, event({ resourceDelta: { hp: -100 } }));
    expect(next.gameOverReason).toBe('伤重不治');
  });
});
