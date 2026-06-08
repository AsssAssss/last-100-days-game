import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ILLMPort } from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import { LocalStorageAdapter, type StorageLike } from '../../adapters/storage/LocalStorageAdapter';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { useGameEngine } from './useGameEngine';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeMemoryStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

function mockLLM(): ILLMPort {
  return {
    nextTurn: vi.fn(async () => ({
      narrative: '一片寂静。',
      choices: ['一', '二', '三'],
      statePatch: {
        resources: { food: -1 },
        inventoryAdd: [],
        inventoryRemove: [],
        memoryNote: '寂静',
        isGameOver: false,
        dayPassed: true,
      },
    })),
    compressMemory: vi.fn(async () => ''),
  };
}

function makeDeps() {
  const mem = makeMemoryStorage();
  return {
    llm: mockLLM(),
    logger: makeLogger(),
    storage: new LocalStorageAdapter(mem, () => 12345),
    newRequestID: () => 'rid',
    _mem: mem,
  };
}

describe('useGameEngine', () => {
  it('starts with INITIAL_GAME_STATE and no slot selected', () => {
    const { result } = renderHook(() => useGameEngine(makeDeps()));
    expect(result.current.state.day).toBe(INITIAL_GAME_STATE.day);
    expect(result.current.activeSlotId).toBeNull();
    expect(result.current.hasStarted).toBe(false);
  });

  it('lists 5 empty slots initially', () => {
    const { result } = renderHook(() => useGameEngine(makeDeps()));
    expect(result.current.slots).toHaveLength(5);
    expect(result.current.slots.every((s) => s.isEmpty)).toBe(true);
  });

  it('selectSlot on empty slot starts a fresh game in that slot', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(2));
    expect(result.current.activeSlotId).toBe(2);
    expect(result.current.hasStarted).toBe(true);
    expect(result.current.state.day).toBe(INITIAL_GAME_STATE.day);
  });

  it('selectSlot on occupied slot loads that slot state', () => {
    const deps = makeDeps();
    deps.storage.saveSlot(3, { ...INITIAL_GAME_STATE, day: 42 });
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(3));
    expect(result.current.state.day).toBe(42);
    expect(result.current.activeSlotId).toBe(3);
  });

  it('plays the opening (null input) without advancing the day', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.day).toBe(1);
    expect(result.current.state.lastNarrative).toBe('一片寂静。');
  });

  it('plays a real action and advances the day', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.day).toBe(2);
  });

  it('persists state to the active slot after a real action', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(deps.storage.loadSlot(1)?.day).toBe(2);
  });

  it('refreshes slot summaries after a save lands', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const slot1 = result.current.slots.find((s) => s.id === 1)!;
    expect(slot1.isEmpty).toBe(false);
    expect(slot1.day).toBe(2);
  });

  it('deleteSlot removes the slot and refreshes summaries', () => {
    const deps = makeDeps();
    deps.storage.saveSlot(2, { ...INITIAL_GAME_STATE, day: 5 });
    const { result } = renderHook(() => useGameEngine(deps));
    expect(result.current.slots.find((s) => s.id === 2)?.isEmpty).toBe(false);
    act(() => result.current.deleteSlot(2));
    expect(result.current.slots.find((s) => s.id === 2)?.isEmpty).toBe(true);
    expect(deps.storage.loadSlot(2)).toBeNull();
  });

  it('exitToSlotMenu drops active slot but keeps the save intact', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.exitToSlotMenu());
    expect(result.current.hasStarted).toBe(false);
    expect(result.current.activeSlotId).toBeNull();
    expect(deps.storage.loadSlot(1)?.day).toBe(2);
  });

  it('restart clears the active slot save and exits to slot menu', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.restart());
    expect(result.current.hasStarted).toBe(false);
    expect(result.current.activeSlotId).toBeNull();
    expect(deps.storage.loadSlot(1)).toBeNull();
  });

  it('restart without an active slot still resets engine UI state safely', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.restart());
    expect(result.current.hasStarted).toBe(false);
    expect(result.current.activeSlotId).toBeNull();
  });

  it('surfaces errors when LLM call fails (Error instance)', async () => {
    const deps = makeDeps();
    (deps.llm.nextTurn as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('网络中断'));
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('网络中断');
  });

  it('drops concurrent play() calls so the LLM is only called once', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => {
      // simulate StrictMode-style double invocation
      result.current.play(null);
      result.current.play(null);
      result.current.play(null);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(deps.llm.nextTurn).toHaveBeenCalledTimes(1);
  });

  it('allows another play() after the previous one finished', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.play('继续观察'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(deps.llm.nextTurn).toHaveBeenCalledTimes(2);
  });

  it('serializes non-Error rejections as strings', async () => {
    const deps = makeDeps();
    (deps.llm.nextTurn as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain string');
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.selectSlot(1));
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('plain string');
  });
});
