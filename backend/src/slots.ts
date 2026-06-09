import {
  deleteSlot as dbDeleteSlot,
  getSlot,
  listSlotsByUser,
  upsertSlot,
  type D1Like,
} from './db';

export const SLOT_COUNT = 5;

export function isValidSlotId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= SLOT_COUNT;
}

export interface SlotSummary {
  readonly id: number;
  readonly isEmpty: boolean;
  readonly stateJson?: string;
  readonly updatedAt?: number;
}

export interface SlotsDeps {
  readonly db: D1Like;
  readonly now?: () => number;
}

/**
 * 列出 5 个槽，包含空槽（isEmpty=true）。
 */
export async function listAllSlots(
  userId: string,
  deps: SlotsDeps
): Promise<SlotSummary[]> {
  const rows = await listSlotsByUser(deps.db, userId);
  const byId = new Map(rows.map((r) => [r.slot_id, r]));
  const summaries: SlotSummary[] = [];
  for (let id = 1; id <= SLOT_COUNT; id++) {
    const row = byId.get(id);
    if (!row) {
      summaries.push({ id, isEmpty: true });
    } else {
      summaries.push({
        id,
        isEmpty: false,
        stateJson: row.state_json,
        updatedAt: row.updated_at,
      });
    }
  }
  return summaries;
}

export async function loadSlot(
  userId: string,
  slotId: number,
  deps: SlotsDeps
): Promise<SlotSummary | null> {
  if (!isValidSlotId(slotId)) return null;
  const row = await getSlot(deps.db, userId, slotId);
  if (!row) return { id: slotId, isEmpty: true };
  return {
    id: slotId,
    isEmpty: false,
    stateJson: row.state_json,
    updatedAt: row.updated_at,
  };
}

export async function saveSlot(
  userId: string,
  slotId: number,
  stateJson: string,
  deps: SlotsDeps
): Promise<{ ok: true; updatedAt: number } | { ok: false; error: string }> {
  if (!isValidSlotId(slotId)) {
    return { ok: false, error: 'invalid_slot_id' };
  }
  if (typeof stateJson !== 'string' || stateJson.length === 0) {
    return { ok: false, error: 'invalid_state' };
  }
  // 防呆：要求 stateJson 是合法 JSON
  try {
    JSON.parse(stateJson);
  } catch {
    return { ok: false, error: 'invalid_state' };
  }
  const updatedAt = Math.floor((deps.now ?? Date.now)() / 1000);
  await upsertSlot(deps.db, {
    user_id: userId,
    slot_id: slotId,
    state_json: stateJson,
    updated_at: updatedAt,
  });
  return { ok: true, updatedAt };
}

export async function clearSlot(
  userId: string,
  slotId: number,
  deps: SlotsDeps
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidSlotId(slotId)) {
    return { ok: false, error: 'invalid_slot_id' };
  }
  await dbDeleteSlot(deps.db, userId, slotId);
  return { ok: true };
}
