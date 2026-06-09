import { describe, it, expect } from 'vitest';
import {
  SLOT_COUNT,
  clearSlot,
  isValidSlotId,
  listAllSlots,
  loadSlot,
  saveSlot,
} from '../src/slots';
import { createFakeDb } from './fakeDb';

const USER = 'user-1';

describe('isValidSlotId', () => {
  it('accepts 1..SLOT_COUNT', () => {
    for (let i = 1; i <= SLOT_COUNT; i++) expect(isValidSlotId(i)).toBe(true);
  });
  it.each([0, -1, SLOT_COUNT + 1, 1.5, NaN])('rejects %s', (id) => {
    expect(isValidSlotId(id)).toBe(false);
  });
});

describe('listAllSlots', () => {
  it('returns 5 entries all empty for a new user', async () => {
    const db = createFakeDb();
    const slots = await listAllSlots(USER, { db });
    expect(slots).toHaveLength(5);
    expect(slots.every((s) => s.isEmpty)).toBe(true);
  });

  it('returns the saved state for occupied slots', async () => {
    const db = createFakeDb();
    const NOW = 1_700_000_000_000;
    await saveSlot(USER, 2, '{"day":5}', { db, now: () => NOW });
    const slots = await listAllSlots(USER, { db });
    const s2 = slots.find((s) => s.id === 2)!;
    expect(s2.isEmpty).toBe(false);
    expect(s2.stateJson).toBe('{"day":5}');
    expect(s2.updatedAt).toBe(Math.floor(NOW / 1000));
  });

  it('isolates slots between users', async () => {
    const db = createFakeDb();
    await saveSlot('alice', 1, '{"a":1}', { db });
    await saveSlot('bob', 1, '{"b":1}', { db });
    const aliceSlots = await listAllSlots('alice', { db });
    expect(aliceSlots[0]!.stateJson).toBe('{"a":1}');
    const bobSlots = await listAllSlots('bob', { db });
    expect(bobSlots[0]!.stateJson).toBe('{"b":1}');
  });
});

describe('loadSlot', () => {
  it('returns empty marker when slot is empty', async () => {
    const db = createFakeDb();
    const r = await loadSlot(USER, 1, { db });
    expect(r).toEqual({ id: 1, isEmpty: true });
  });

  it('returns content when slot has data', async () => {
    const db = createFakeDb();
    await saveSlot(USER, 3, '{"x":1}', { db });
    const r = await loadSlot(USER, 3, { db });
    expect(r?.isEmpty).toBe(false);
    expect(r?.stateJson).toBe('{"x":1}');
  });

  it('returns null for invalid slot id', async () => {
    const db = createFakeDb();
    expect(await loadSlot(USER, 99, { db })).toBeNull();
  });
});

describe('saveSlot', () => {
  it('saves and overwrites existing content', async () => {
    const db = createFakeDb();
    await saveSlot(USER, 1, '{"v":1}', { db });
    const ok = await saveSlot(USER, 1, '{"v":2}', { db });
    expect(ok.ok).toBe(true);
    const r = await loadSlot(USER, 1, { db });
    expect(r?.stateJson).toBe('{"v":2}');
  });

  it('rejects invalid slot id', async () => {
    const db = createFakeDb();
    const r = await saveSlot(USER, 99, '{}', { db });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_slot_id');
  });

  it.each(['', '{not json'])('rejects invalid state json %j', async (bad) => {
    const db = createFakeDb();
    const r = await saveSlot(USER, 1, bad, { db });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_state');
  });

  it('rejects non-string state', async () => {
    const db = createFakeDb();
    const r = await saveSlot(USER, 1, 123 as unknown as string, { db });
    expect(r.ok).toBe(false);
  });
});

describe('clearSlot', () => {
  it('removes a saved slot', async () => {
    const db = createFakeDb();
    await saveSlot(USER, 1, '{"v":1}', { db });
    const r = await clearSlot(USER, 1, { db });
    expect(r.ok).toBe(true);
    const loaded = await loadSlot(USER, 1, { db });
    expect(loaded?.isEmpty).toBe(true);
  });

  it('is a no-op for empty slot', async () => {
    const db = createFakeDb();
    const r = await clearSlot(USER, 1, { db });
    expect(r.ok).toBe(true);
  });

  it('rejects invalid slot id', async () => {
    const db = createFakeDb();
    const r = await clearSlot(USER, 99, { db });
    expect(r.ok).toBe(false);
  });
});
