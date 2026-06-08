import { describe, it, expect } from 'vitest';
import { INITIAL_INVENTORY, addItems, removeItems } from './Inventory';

describe('Inventory', () => {
  describe('addItems', () => {
    it('appends items to inventory', () => {
      const result = addItems(INITIAL_INVENTORY, ['手电筒']);
      expect(result).toEqual([...INITIAL_INVENTORY, '手电筒']);
    });

    it('handles empty additions', () => {
      const result = addItems(INITIAL_INVENTORY, []);
      expect(result).toEqual([...INITIAL_INVENTORY]);
    });

    it('does not mutate input', () => {
      const before = [...INITIAL_INVENTORY];
      addItems(INITIAL_INVENTORY, ['x']);
      expect(INITIAL_INVENTORY).toEqual(before);
    });
  });

  describe('removeItems', () => {
    it('removes one occurrence of each named item', () => {
      const inv = ['a', 'b', 'a', 'c'];
      const result = removeItems(inv, ['a']);
      expect(result).toEqual(['b', 'a', 'c']);
    });

    it('silently ignores missing items', () => {
      const result = removeItems(['a', 'b'], ['z']);
      expect(result).toEqual(['a', 'b']);
    });

    it('handles empty removal list', () => {
      const result = removeItems(['a'], []);
      expect(result).toEqual(['a']);
    });

    it('does not mutate input', () => {
      const inv = ['a', 'b'];
      removeItems(inv, ['a']);
      expect(inv).toEqual(['a', 'b']);
    });
  });
});
