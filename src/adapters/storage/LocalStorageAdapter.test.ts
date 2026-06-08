import { describe, it, expect } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { SLOT_COUNT } from '../../domain/entities/SaveSlot';
import { LocalStorageAdapter, type StorageLike } from './LocalStorageAdapter';

function makeMemoryStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

describe('LocalStorageAdapter', () => {
  describe('saveSlot / loadSlot', () => {
    it('saves and loads game state in a slot', () => {
      const mem = makeMemoryStorage();
      const adapter = new LocalStorageAdapter(mem, () => 1234);
      adapter.saveSlot(1, INITIAL_GAME_STATE);
      expect(adapter.loadSlot(1)).toEqual(INITIAL_GAME_STATE);
    });

    it('returns null when slot is empty', () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage());
      expect(adapter.loadSlot(2)).toBeNull();
    });

    it('returns null when stored value is corrupt JSON', () => {
      const mem = makeMemoryStorage();
      mem.store.set('last-100-days:slot:1', '{not valid');
      const adapter = new LocalStorageAdapter(mem);
      expect(adapter.loadSlot(1)).toBeNull();
    });

    it('keeps slots independent', () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 1);
      adapter.saveSlot(1, { ...INITIAL_GAME_STATE, day: 10 });
      adapter.saveSlot(2, { ...INITIAL_GAME_STATE, day: 50 });
      expect(adapter.loadSlot(1)?.day).toBe(10);
      expect(adapter.loadSlot(2)?.day).toBe(50);
    });

    it.each([0, -1, SLOT_COUNT + 1, 1.5, NaN])(
      'throws on invalid slot id %s',
      (id) => {
        const adapter = new LocalStorageAdapter(makeMemoryStorage());
        expect(() => adapter.loadSlot(id)).toThrow(/Invalid slot id/);
      }
    );
  });

  describe('clearSlot', () => {
    it('removes the slot content', () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 1);
      adapter.saveSlot(3, INITIAL_GAME_STATE);
      adapter.clearSlot(3);
      expect(adapter.loadSlot(3)).toBeNull();
    });

    it('rejects invalid slot id', () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage());
      expect(() => adapter.clearSlot(99)).toThrow();
    });
  });

  describe('listSlots', () => {
    it('returns SLOT_COUNT entries with all empty initially', () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage());
      const slots = adapter.listSlots();
      expect(slots).toHaveLength(SLOT_COUNT);
      expect(slots.every((s) => s.isEmpty)).toBe(true);
      expect(slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it('includes day, updatedAt, isGameOver, gameOverReason for occupied slots', () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 9999);
      adapter.saveSlot(2, {
        ...INITIAL_GAME_STATE,
        day: 17,
        isGameOver: true,
        gameOverReason: '饿死',
      });
      const slot2 = adapter.listSlots().find((s) => s.id === 2)!;
      expect(slot2.isEmpty).toBe(false);
      expect(slot2.day).toBe(17);
      expect(slot2.updatedAt).toBe(9999);
      expect(slot2.isGameOver).toBe(true);
      expect(slot2.gameOverReason).toBe('饿死');
    });

    it('marks corrupted slots as empty in the summary', () => {
      const mem = makeMemoryStorage();
      mem.store.set('last-100-days:slot:4', 'not json');
      const adapter = new LocalStorageAdapter(mem);
      const slot4 = adapter.listSlots().find((s) => s.id === 4)!;
      expect(slot4.isEmpty).toBe(true);
    });
  });

  describe('saveSlot validation', () => {
    it.each([0, -1, SLOT_COUNT + 1, 1.5])(
      'throws on invalid slot id %s when saving',
      (id) => {
        const adapter = new LocalStorageAdapter(makeMemoryStorage());
        expect(() => adapter.saveSlot(id, INITIAL_GAME_STATE)).toThrow();
      }
    );
  });
});
