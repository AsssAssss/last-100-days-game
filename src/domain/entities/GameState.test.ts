import { describe, it, expect } from 'vitest';
import {
  INITIAL_GAME_STATE,
  TOTAL_DAYS,
  hasMeaningfulSave,
  hasReachedFinalDay,
} from './GameState';

describe('GameState', () => {
  describe('INITIAL_GAME_STATE', () => {
    it('starts at day 1', () => {
      expect(INITIAL_GAME_STATE.day).toBe(1);
    });

    it('is not game over', () => {
      expect(INITIAL_GAME_STATE.isGameOver).toBe(false);
    });

    it('has an empty choice list initially', () => {
      expect(INITIAL_GAME_STATE.choices).toEqual([]);
    });

    it('has no narrative yet', () => {
      expect(INITIAL_GAME_STATE.lastNarrative).toBe('');
    });

    it('has empty story memory', () => {
      expect(INITIAL_GAME_STATE.memory.recent).toEqual([]);
      expect(INITIAL_GAME_STATE.memory.summaries).toEqual([]);
    });

    it('starts uninfected', () => {
      expect(INITIAL_GAME_STATE.infection).toBeNull();
    });
  });

  describe('hasReachedFinalDay', () => {
    it('returns false before TOTAL_DAYS', () => {
      expect(hasReachedFinalDay({ ...INITIAL_GAME_STATE, day: TOTAL_DAYS - 1 })).toBe(false);
    });

    it('returns true at TOTAL_DAYS', () => {
      expect(hasReachedFinalDay({ ...INITIAL_GAME_STATE, day: TOTAL_DAYS })).toBe(true);
    });

    it('returns true past TOTAL_DAYS', () => {
      expect(hasReachedFinalDay({ ...INITIAL_GAME_STATE, day: TOTAL_DAYS + 5 })).toBe(true);
    });
  });

  describe('hasMeaningfulSave', () => {
    it('returns false for a pristine INITIAL_GAME_STATE', () => {
      expect(hasMeaningfulSave(INITIAL_GAME_STATE)).toBe(false);
    });

    it('returns true when lastNarrative is non-empty', () => {
      expect(
        hasMeaningfulSave({ ...INITIAL_GAME_STATE, lastNarrative: '你站在街上。' })
      ).toBe(true);
    });

    it('returns true when day has advanced', () => {
      expect(hasMeaningfulSave({ ...INITIAL_GAME_STATE, day: 5 })).toBe(true);
    });

    it('returns true when recent memory has entries', () => {
      expect(
        hasMeaningfulSave({
          ...INITIAL_GAME_STATE,
          memory: { recent: [{ day: 1, note: '事件' }], summaries: [] },
        })
      ).toBe(true);
    });

    it('returns true when game is over (final state worth showing)', () => {
      expect(
        hasMeaningfulSave({ ...INITIAL_GAME_STATE, isGameOver: true, gameOverReason: '伤重' })
      ).toBe(true);
    });
  });
});
