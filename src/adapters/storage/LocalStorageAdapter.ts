import type { IStoragePort } from '../../application/ports/IStoragePort';
import type { GameState } from '../../domain/entities/GameState';
import {
  SLOT_COUNT,
  isValidSlotId,
  type SavedSlot,
  type SlotId,
  type SlotSummary,
} from '../../domain/entities/SaveSlot';

const SLOT_KEY_PREFIX = 'last-100-days:slot:';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function keyFor(id: SlotId): string {
  return `${SLOT_KEY_PREFIX}${id}`;
}

function assertValidId(id: SlotId): void {
  if (!isValidSlotId(id)) {
    throw new Error(`Invalid slot id ${id}; expected 1..${SLOT_COUNT}`);
  }
}

/**
 * 把 localStorage 当存档介质的 IStoragePort 实现。
 * 也是测试里常用的"内存版"载体——传入 fake Storage 即可。
 */
export class LocalStorageAdapter implements IStoragePort {
  private readonly storage: StorageLike;
  private readonly now: () => number;

  constructor(storage: StorageLike, now: () => number = Date.now) {
    this.storage = storage;
    this.now = now;
  }

  async saveSlot(id: SlotId, state: GameState): Promise<void> {
    assertValidId(id);
    const payload: SavedSlot = { state, updatedAt: this.now() };
    this.storage.setItem(keyFor(id), JSON.stringify(payload));
  }

  async loadSlot(id: SlotId): Promise<GameState | null> {
    assertValidId(id);
    const raw = this.storage.getItem(keyFor(id));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SavedSlot;
      return parsed.state;
    } catch {
      return null;
    }
  }

  async clearSlot(id: SlotId): Promise<void> {
    assertValidId(id);
    this.storage.removeItem(keyFor(id));
  }

  async listSlots(): Promise<SlotSummary[]> {
    const summaries: SlotSummary[] = [];
    for (let id = 1; id <= SLOT_COUNT; id++) {
      const raw = this.storage.getItem(keyFor(id));
      if (!raw) {
        summaries.push({ id, isEmpty: true });
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as SavedSlot;
        summaries.push({
          id,
          isEmpty: false,
          day: parsed.state.day,
          updatedAt: parsed.updatedAt,
          isGameOver: parsed.state.isGameOver,
          gameOverReason: parsed.state.gameOverReason,
        });
      } catch {
        summaries.push({ id, isEmpty: true });
      }
    }
    return summaries;
  }
}
