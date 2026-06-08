import { describe, it, expect } from 'vitest';
import { SLOT_COUNT, isValidSlotId } from './SaveSlot';

describe('SaveSlot', () => {
  describe('isValidSlotId', () => {
    it('accepts ids 1..SLOT_COUNT', () => {
      for (let i = 1; i <= SLOT_COUNT; i++) {
        expect(isValidSlotId(i)).toBe(true);
      }
    });

    it('rejects 0 and negative', () => {
      expect(isValidSlotId(0)).toBe(false);
      expect(isValidSlotId(-1)).toBe(false);
    });

    it('rejects values above SLOT_COUNT', () => {
      expect(isValidSlotId(SLOT_COUNT + 1)).toBe(false);
      expect(isValidSlotId(100)).toBe(false);
    });

    it('rejects non-integers', () => {
      expect(isValidSlotId(1.5)).toBe(false);
      expect(isValidSlotId(NaN)).toBe(false);
    });
  });
});
