import { describe, it, expect } from 'vitest';
import {
  INITIAL_RESOURCES,
  MAX_RESOURCES,
  applyDelta,
  deathCause,
  isDead,
} from './Resources';

describe('Resources', () => {
  describe('applyDelta', () => {
    it('adds positive delta to current value', () => {
      const result = applyDelta(INITIAL_RESOURCES, { food: 5 });
      expect(result.food).toBe(35);
    });

    it('subtracts negative delta from current value', () => {
      const result = applyDelta(INITIAL_RESOURCES, { hp: -20 });
      expect(result.hp).toBe(80);
    });

    it('clamps values at 0 (no negative resources)', () => {
      const r = applyDelta(INITIAL_RESOURCES, { food: -1000 });
      expect(r.food).toBe(0);
    });

    it('clamps values at MAX_RESOURCES', () => {
      const r = applyDelta(INITIAL_RESOURCES, { hp: 1000 });
      expect(r.hp).toBe(MAX_RESOURCES.hp);
    });

    it('leaves untouched keys alone', () => {
      const r = applyDelta(INITIAL_RESOURCES, { hp: -10 });
      expect(r.sanity).toBe(INITIAL_RESOURCES.sanity);
      expect(r.food).toBe(INITIAL_RESOURCES.food);
    });

    it('handles empty delta', () => {
      const r = applyDelta(INITIAL_RESOURCES, {});
      expect(r).toEqual(INITIAL_RESOURCES);
    });

    it('does not mutate input', () => {
      const input = { ...INITIAL_RESOURCES };
      applyDelta(input, { hp: -50 });
      expect(input).toEqual(INITIAL_RESOURCES);
    });
  });

  describe('isDead', () => {
    it('returns false when all resources are above zero', () => {
      expect(isDead(INITIAL_RESOURCES)).toBe(false);
    });

    it.each([
      ['hp', { hp: 0 }],
      ['sanity', { sanity: 0 }],
      ['food', { food: 0 }],
      ['water', { water: 0 }],
    ] as const)('returns true when %s hits zero', (_label, override) => {
      expect(isDead({ ...INITIAL_RESOURCES, ...override })).toBe(true);
    });

    it('ignores ammo (running out of ammo is not death)', () => {
      expect(isDead({ ...INITIAL_RESOURCES, ammo: 0 })).toBe(false);
    });
  });

  describe('deathCause', () => {
    it('returns null when alive', () => {
      expect(deathCause(INITIAL_RESOURCES)).toBeNull();
    });

    it('returns hp when hp is zero', () => {
      expect(deathCause({ ...INITIAL_RESOURCES, hp: 0 })).toBe('hp');
    });

    it('prioritizes hp > sanity > food > water', () => {
      const r = { hp: 0, sanity: 0, food: 0, water: 0, ammo: 5 };
      expect(deathCause(r)).toBe('hp');
    });

    it('returns sanity when only sanity is zero', () => {
      expect(deathCause({ ...INITIAL_RESOURCES, sanity: 0 })).toBe('sanity');
    });

    it('returns food when only food is zero', () => {
      expect(deathCause({ ...INITIAL_RESOURCES, food: 0 })).toBe('food');
    });

    it('returns water when only water is zero', () => {
      expect(deathCause({ ...INITIAL_RESOURCES, water: 0 })).toBe('water');
    });
  });
});
