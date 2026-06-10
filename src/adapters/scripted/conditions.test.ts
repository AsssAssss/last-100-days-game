import { describe, it, expect } from 'vitest';
import { INITIAL_GAME_STATE, type ScriptState } from '../../domain/entities/GameState';
import { evalCondition, evalConditions } from './conditions';

const SCRIPT: ScriptState = {
  nodeId: 'x',
  humanity: 50,
  flags: ['saved-chenbo'],
  seed: 1,
  drawnOnce: [],
};

const STATE = {
  ...INITIAL_GAME_STATE,
  inventory: ['陈伯的手绘地图'],
  resources: { ...INITIAL_GAME_STATE.resources, ammo: 6 },
};

describe('evalCondition', () => {
  it('humanity min/max bounds', () => {
    expect(evalCondition({ kind: 'humanity', min: 40 }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'humanity', min: 51 }, STATE, SCRIPT)).toBe(false);
    expect(evalCondition({ kind: 'humanity', max: 50 }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'humanity', max: 49 }, STATE, SCRIPT)).toBe(false);
    expect(evalCondition({ kind: 'humanity', min: 50, max: 50 }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'humanity' }, STATE, SCRIPT)).toBe(true);
  });

  it('flag present/absent', () => {
    expect(evalCondition({ kind: 'flag', flag: 'saved-chenbo', present: true }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'flag', flag: 'saved-chenbo', present: false }, STATE, SCRIPT)).toBe(false);
    expect(evalCondition({ kind: 'flag', flag: 'nope', present: false }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'flag', flag: 'nope', present: true }, STATE, SCRIPT)).toBe(false);
  });

  it('item present/absent', () => {
    expect(evalCondition({ kind: 'item', item: '陈伯的手绘地图', present: true }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'item', item: '防毒面具', present: true }, STATE, SCRIPT)).toBe(false);
    expect(evalCondition({ kind: 'item', item: '防毒面具', present: false }, STATE, SCRIPT)).toBe(true);
  });

  it('resource minimum', () => {
    expect(evalCondition({ kind: 'resource', resource: 'ammo', min: 6 }, STATE, SCRIPT)).toBe(true);
    expect(evalCondition({ kind: 'resource', resource: 'ammo', min: 7 }, STATE, SCRIPT)).toBe(false);
  });
});

describe('evalConditions', () => {
  it('undefined or empty = satisfied', () => {
    expect(evalConditions(undefined, STATE, SCRIPT)).toBe(true);
    expect(evalConditions([], STATE, SCRIPT)).toBe(true);
  });

  it('requires all conditions to hold', () => {
    expect(
      evalConditions(
        [
          { kind: 'humanity', min: 40 },
          { kind: 'flag', flag: 'saved-chenbo', present: true },
        ],
        STATE,
        SCRIPT
      )
    ).toBe(true);
    expect(
      evalConditions(
        [
          { kind: 'humanity', min: 40 },
          { kind: 'flag', flag: 'saved-chenbo', present: false },
        ],
        STATE,
        SCRIPT
      )
    ).toBe(false);
  });
});
