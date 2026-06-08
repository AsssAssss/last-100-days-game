import type { GameState } from './GameState';

/** 总共多少个存档槽。 */
export const SLOT_COUNT = 5;

/** 槽位 id：1..SLOT_COUNT。 */
export type SlotId = number;

/** 一个 slot 的完整内容，写盘读盘的 JSON 形态。 */
export interface SavedSlot {
  readonly state: GameState;
  readonly updatedAt: number;
}

/** 给 UI 展示用的 slot 概要——空槽位用 isEmpty=true 表示。 */
export interface SlotSummary {
  readonly id: SlotId;
  readonly isEmpty: boolean;
  readonly day?: number;
  readonly updatedAt?: number;
  readonly isGameOver?: boolean;
  readonly gameOverReason?: string;
}

/** 合法的 slot id 范围。 */
export function isValidSlotId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= SLOT_COUNT;
}
