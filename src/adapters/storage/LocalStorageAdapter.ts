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

export class LocalStorageAdapter {
  private readonly storage: StorageLike;
  private readonly now: () => number;

  constructor(storage: StorageLike, now: () => number = Date.now) {
    this.storage = storage;
    this.now = now;
  }

  /** 把当前状态写入指定槽位。覆盖原有内容。 */
  saveSlot(id: SlotId, state: GameState): void {
    assertValidId(id);
    const payload: SavedSlot = { state, updatedAt: this.now() };
    this.storage.setItem(keyFor(id), JSON.stringify(payload));
  }

  /** 读取指定槽位的状态；空槽位或 JSON 损坏返回 null。 */
  loadSlot(id: SlotId): GameState | null {
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

  /** 清空指定槽位。 */
  clearSlot(id: SlotId): void {
    assertValidId(id);
    this.storage.removeItem(keyFor(id));
  }

  /** 列出全部 SLOT_COUNT 个槽位的概要（含空槽位）。 */
  listSlots(): SlotSummary[] {
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
