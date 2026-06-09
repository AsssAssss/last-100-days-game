import type { GameState } from '../../domain/entities/GameState';
import type { SlotId, SlotSummary } from '../../domain/entities/SaveSlot';

/**
 * 存档端口。adapters/storage/* 实现此接口。
 * 所有方法都是 async——可以是本地（直接 localStorage）也可以是远端（HTTP）。
 */
export interface IStoragePort {
  listSlots(): Promise<readonly SlotSummary[]>;
  loadSlot(id: SlotId): Promise<GameState | null>;
  saveSlot(id: SlotId, state: GameState): Promise<void>;
  clearSlot(id: SlotId): Promise<void>;
}
