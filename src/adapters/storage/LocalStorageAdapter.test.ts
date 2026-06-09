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
    it('saves and loads game state in a slot', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 1234);
      await adapter.saveSlot(1, INITIAL_GAME_STATE);
      expect(await adapter.loadSlot(1)).toEqual(INITIAL_GAME_STATE);
    });

    it('returns null when slot is empty', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage());
      expect(await adapter.loadSlot(2)).toBeNull();
    });

    it('returns null when stored value is corrupt JSON', async () => {
      const mem = makeMemoryStorage();
      mem.store.set('last-100-days:slot:1', '{not valid');
      const adapter = new LocalStorageAdapter(mem);
      expect(await adapter.loadSlot(1)).toBeNull();
    });

    it('keeps slots independent', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 1);
      await adapter.saveSlot(1, { ...INITIAL_GAME_STATE, day: 10 });
      await adapter.saveSlot(2, { ...INITIAL_GAME_STATE, day: 50 });
      expect((await adapter.loadSlot(1))?.day).toBe(10);
      expect((await adapter.loadSlot(2))?.day).toBe(50);
    });

    it.each([0, -1, SLOT_COUNT + 1, 1.5, NaN])(
      'throws on invalid slot id %s',
      async (id) => {
        const adapter = new LocalStorageAdapter(makeMemoryStorage());
        await expect(adapter.loadSlot(id)).rejects.toThrow(/Invalid slot id/);
      }
    );
  });

  describe('clearSlot', () => {
    it('removes the slot content', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 1);
      await adapter.saveSlot(3, INITIAL_GAME_STATE);
      await adapter.clearSlot(3);
      expect(await adapter.loadSlot(3)).toBeNull();
    });

    it('rejects invalid slot id', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage());
      await expect(adapter.clearSlot(99)).rejects.toThrow();
    });
  });

  describe('listSlots', () => {
    it('returns SLOT_COUNT entries with all empty initially', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage());
      const slots = await adapter.listSlots();
      expect(slots).toHaveLength(SLOT_COUNT);
      expect(slots.every((s) => s.isEmpty)).toBe(true);
      expect(slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it('includes day, updatedAt, isGameOver, gameOverReason for occupied slots', async () => {
      const adapter = new LocalStorageAdapter(makeMemoryStorage(), () => 9999);
      await adapter.saveSlot(2, {
        ...INITIAL_GAME_STATE,
        day: 17,
        isGameOver: true,
        gameOverReason: '饿死',
      });
      const slot2 = (await adapter.listSlots()).find((s) => s.id === 2)!;
      expect(slot2.isEmpty).toBe(false);
      expect(slot2.day).toBe(17);
      expect(slot2.updatedAt).toBe(9999);
      expect(slot2.isGameOver).toBe(true);
      expect(slot2.gameOverReason).toBe('饿死');
    });

    it('marks corrupted slots as empty in the summary', async () => {
      const mem = makeMemoryStorage();
      mem.store.set('last-100-days:slot:4', 'not json');
      const adapter = new LocalStorageAdapter(mem);
      const slot4 = (await adapter.listSlots()).find((s) => s.id === 4)!;
      expect(slot4.isEmpty).toBe(true);
    });
  });

  describe('saveSlot validation', () => {
    it.each([0, -1, SLOT_COUNT + 1, 1.5])(
      'throws on invalid slot id %s when saving',
      async (id) => {
        const adapter = new LocalStorageAdapter(makeMemoryStorage());
        await expect(adapter.saveSlot(id, INITIAL_GAME_STATE)).rejects.toThrow();
      }
    );
  });
});
