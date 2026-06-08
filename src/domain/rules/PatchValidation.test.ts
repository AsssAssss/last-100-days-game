import { describe, it, expect } from 'vitest';
import {
  narrativeImpliesDayPassed,
  validateAndClamp,
  type RawTurnPatch,
} from './PatchValidation';

function basePatch(overrides: Partial<RawTurnPatch['statePatch']> = {}): RawTurnPatch {
  return {
    narrative: '你走在街上。',
    choices: ['继续走', '躲起来', '返回'],
    statePatch: {
      resources: {},
      inventoryAdd: [],
      inventoryRemove: [],
      memoryNote: '',
      isGameOver: false,
      dayPassed: false,
      ...overrides,
    },
  };
}

describe('PatchValidation', () => {
  it('passes through legitimate deltas', () => {
    const raw = basePatch({ resources: { hp: -10, food: -2, water: -1, sanity: -3, ammo: -1 } });
    const { event, issues } = validateAndClamp(raw);
    expect(issues).toHaveLength(0);
    expect(event.resourceDelta).toEqual({ hp: -10, food: -2, water: -1, sanity: -3, ammo: -1 });
  });

  it('clamps hp gain above cap and records an issue', () => {
    const { event, issues } = validateAndClamp(basePatch({ resources: { hp: 50 } }));
    expect(event.resourceDelta.hp).toBe(10);
    expect(issues.some((i) => i.field === 'resources.hp')).toBe(true);
  });

  it('clamps sanity gain above cap', () => {
    const { event, issues } = validateAndClamp(basePatch({ resources: { sanity: 80 } }));
    expect(event.resourceDelta.sanity).toBe(10);
    expect(issues.some((i) => i.field === 'resources.sanity')).toBe(true);
  });

  it('clamps food gain above cap', () => {
    const { event, issues } = validateAndClamp(basePatch({ resources: { food: 99 } }));
    expect(event.resourceDelta.food).toBe(30);
    expect(issues.some((i) => i.field === 'resources.food')).toBe(true);
  });

  it('clamps water gain above cap', () => {
    const { event, issues } = validateAndClamp(basePatch({ resources: { water: 99 } }));
    expect(event.resourceDelta.water).toBe(30);
    expect(issues.some((i) => i.field === 'resources.water')).toBe(true);
  });

  it('clamps ammo gain above cap', () => {
    const { event, issues } = validateAndClamp(basePatch({ resources: { ammo: 99 } }));
    expect(event.resourceDelta.ammo).toBe(20);
    expect(issues.some((i) => i.field === 'resources.ammo')).toBe(true);
  });

  it('allows arbitrarily negative deltas (penalties are not clamped)', () => {
    const { event, issues } = validateAndClamp(
      basePatch({ resources: { hp: -100, sanity: -50, food: -40, water: -40, ammo: -30 } })
    );
    expect(issues).toHaveLength(0);
    expect(event.resourceDelta).toEqual({
      hp: -100,
      sanity: -50,
      food: -40,
      water: -40,
      ammo: -30,
    });
  });

  it('forwards dayPassed through to event when narrative is within-day', () => {
    const { event: e1 } = validateAndClamp(basePatch({ dayPassed: true }));
    expect(e1.dayPassed).toBe(true);
    const { event: e2 } = validateAndClamp(basePatch({ dayPassed: false }));
    expect(e2.dayPassed).toBe(false);
  });

  describe('day transition coercion (engine safety net)', () => {
    function patchWithNarrative(narrative: string, dayPassed = false): RawTurnPatch {
      return { ...basePatch({ dayPassed }), narrative };
    }

    it.each([
      ['第二天清晨，你睁开眼睛。'],
      ['第三天来了，没人知道还能撑多久。'],
      ['次日，你听见远处的枪声。'],
      ['翌日清晨，雪还在下。'],
      ['你醒来时，身边的人已经不见了。'],
      ['一觉醒来，你嘴里全是血腥味。'],
      ['你从昏迷中醒来。'],
      ['一夜过去，外面安静了一些。'],
      ['挨过这一夜，你浑身僵硬。'],
      ['几天过后，你已经习惯了这种安静。'],
    ])('coerces dayPassed=true when narrative says "%s"', (narrative) => {
      const { event, issues } = validateAndClamp(patchWithNarrative(narrative, false));
      expect(event.dayPassed).toBe(true);
      expect(issues.some((i) => i.field === 'statePatch.dayPassed')).toBe(true);
    });

    it('does not change dayPassed when narrative stays within the day', () => {
      const { event, issues } = validateAndClamp(
        patchWithNarrative('你转过身，朝走廊深处走去。', false)
      );
      expect(event.dayPassed).toBe(false);
      expect(issues.some((i) => i.field === 'statePatch.dayPassed')).toBe(false);
    });

    it('does not duplicate issue when LLM already set dayPassed=true', () => {
      const { event, issues } = validateAndClamp(
        patchWithNarrative('第二天清晨。', true)
      );
      expect(event.dayPassed).toBe(true);
      expect(issues.some((i) => i.field === 'statePatch.dayPassed')).toBe(false);
    });
  });

  describe('narrativeImpliesDayPassed', () => {
    it('returns false for ordinary within-day narrative', () => {
      expect(narrativeImpliesDayPassed('你蹲在墙角不敢动。')).toBe(false);
    });

    it('returns true for explicit day-N expression', () => {
      expect(narrativeImpliesDayPassed('第二天，你出发了。')).toBe(true);
    });

    it('returns true for "你醒来"', () => {
      expect(narrativeImpliesDayPassed('你醒来，房间里很冷。')).toBe(true);
    });
  });

  it('forwards narrative, choices, inventory deltas, memoryNote and game over fields', () => {
    const base = basePatch({
      inventoryAdd: ['手电筒'],
      inventoryRemove: ['压缩饼干'],
      memoryNote: '在便利店遇到一个老人',
      isGameOver: true,
      gameOverReason: '感染',
    });
    const raw: RawTurnPatch = {
      ...base,
      narrative: '黑暗中你听见呼吸声。',
      choices: [],
    };
    const { event } = validateAndClamp(raw);
    expect(event.narrative).toBe('黑暗中你听见呼吸声。');
    expect(event.choices).toEqual([]);
    expect(event.inventoryAdd).toEqual(['手电筒']);
    expect(event.inventoryRemove).toEqual(['压缩饼干']);
    expect(event.memoryNote).toBe('在便利店遇到一个老人');
    expect(event.isGameOver).toBe(true);
    expect(event.gameOverReason).toBe('感染');
  });
});
