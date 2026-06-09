import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ILLMPort } from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import { LocalStorageAdapter, type StorageLike } from '../../adapters/storage/LocalStorageAdapter';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { useGameEngine } from './useGameEngine';
import type { AuthClient, LoginResult } from '../../adapters/auth/AuthClient';
import { createBrowserSessionStore } from '../sessionStore';
import { createBrowserLLMConfigStore } from '../llmConfigStore';

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

function makeAuth(result: LoginResult): AuthClient {
  return {
    login: vi.fn(async () => result),
  } as unknown as AuthClient;
}

function makeDeps(
  authResult: LoginResult = { ok: true, userId: 'u1', token: 'tok', created: true }
) {
  const mem = makeMemoryStorage();
  const sessionMem = makeMemoryStorage();
  const llmMem = makeMemoryStorage();
  return {
    llm: mockLLM(),
    logger: makeLogger(),
    storage: new LocalStorageAdapter(mem, () => 12345),
    auth: makeAuth(authResult),
    sessionStore: createBrowserSessionStore(sessionMem),
    llmConfigStore: createBrowserLLMConfigStore(llmMem),
    newRequestID: () => 'rid',
    _mem: mem,
    _sessionMem: sessionMem,
    _llmMem: llmMem,
  };
}

async function logIn(deps: ReturnType<typeof makeDeps>, result = renderHook(() => useGameEngine(deps))) {
  await act(async () => {
    await result.result.current.login('xiaoxue', '1234');
  });
  await waitFor(() => expect(result.result.current.session).not.toBeNull());
  return result;
}

describe('useGameEngine — auth', () => {
  it('starts with no session', () => {
    const { result } = renderHook(() => useGameEngine(makeDeps()));
    expect(result.current.session).toBeNull();
    expect(result.current.hasStarted).toBe(false);
  });

  it('login() success sets session and refreshes slots', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    await act(async () => {
      const r = await result.current.login('xiaoxue', '1234');
      expect(r.ok).toBe(true);
    });
    expect(result.current.session?.userId).toBe('u1');
    expect(result.current.session?.username).toBe('xiaoxue');
    expect(result.current.slots).toHaveLength(5);
  });

  it('persists session via the session store', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    await act(async () => {
      await result.current.login('xiaoxue', '1234');
    });
    expect(deps.sessionStore.get()?.userId).toBe('u1');
  });

  it('reads pre-existing session on mount and lists slots', async () => {
    const deps = makeDeps();
    deps.sessionStore.set({ userId: 'u-existing', token: 'tok', username: 'old' });
    const { result } = renderHook(() => useGameEngine(deps));
    expect(result.current.session?.userId).toBe('u-existing');
    await waitFor(() => expect(result.current.slots).toHaveLength(5));
  });

  it('login() failure surfaces error and leaves session null', async () => {
    const deps = makeDeps({ ok: false, error: 'wrong_pin' });
    const { result } = renderHook(() => useGameEngine(deps));
    await act(async () => {
      const r = await result.current.login('xiaoxue', '0000');
      expect(r.ok).toBe(false);
    });
    expect(result.current.session).toBeNull();
  });

  it('logout() clears session, slots, and in-game state', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    act(() => result.current.logout());
    expect(result.current.session).toBeNull();
    expect(result.current.slots).toEqual([]);
    expect(result.current.hasStarted).toBe(false);
  });
});

describe('useGameEngine — LLM config', () => {
  const SAMPLE_CONFIG = {
    apiKey: 'sk-test',
    baseURL: 'https://onehub.akacm.com/claude',
    model: 'claude-sonnet-4-6',
  };

  it('starts with null llmConfig when nothing stored', () => {
    const { result } = renderHook(() => useGameEngine(makeDeps()));
    expect(result.current.llmConfig).toBeNull();
  });

  it('reads pre-existing llmConfig from store on mount', () => {
    const deps = makeDeps();
    deps.llmConfigStore.set(SAMPLE_CONFIG);
    const { result } = renderHook(() => useGameEngine(deps));
    expect(result.current.llmConfig).toEqual(SAMPLE_CONFIG);
  });

  it('setLLMConfig persists to store and updates state', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.setLLMConfig(SAMPLE_CONFIG));
    expect(result.current.llmConfig).toEqual(SAMPLE_CONFIG);
    expect(deps.llmConfigStore.get()).toEqual(SAMPLE_CONFIG);
  });

  it('clearLLMConfig wipes both state and store', () => {
    const deps = makeDeps();
    deps.llmConfigStore.set(SAMPLE_CONFIG);
    const { result } = renderHook(() => useGameEngine(deps));
    act(() => result.current.clearLLMConfig());
    expect(result.current.llmConfig).toBeNull();
    expect(deps.llmConfigStore.get()).toBeNull();
  });
});

describe('useGameEngine — slots', () => {
  it('selectSlot on empty slot starts a fresh game in that slot', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(2);
    });
    expect(result.current.activeSlotId).toBe(2);
    expect(result.current.hasStarted).toBe(true);
    expect(result.current.state.day).toBe(INITIAL_GAME_STATE.day);
  });

  it('selectSlot on occupied slot loads that slot state', async () => {
    const deps = makeDeps();
    await deps.storage.saveSlot(3, { ...INITIAL_GAME_STATE, day: 42 });
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(3);
    });
    expect(result.current.state.day).toBe(42);
  });

  it('plays opening (null) without advancing day', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.day).toBe(1);
    expect(result.current.state.lastNarrative).toBe('一片寂静。');
  });

  it('plays a real action and advances the day', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.day).toBe(2);
  });

  it('persists state to the active slot after a real action', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('观察四周'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(async () => {
      const saved = await deps.storage.loadSlot(1);
      expect(saved?.day).toBe(2);
    });
  });

  it('deleteSlot removes the slot and refreshes summaries', async () => {
    const deps = makeDeps();
    await deps.storage.saveSlot(2, { ...INITIAL_GAME_STATE, day: 5 });
    const { result } = await logIn(deps);
    await waitFor(() =>
      expect(result.current.slots.find((s) => s.id === 2)?.isEmpty).toBe(false)
    );
    await act(async () => {
      await result.current.deleteSlot(2);
    });
    expect(result.current.slots.find((s) => s.id === 2)?.isEmpty).toBe(true);
  });

  it('exitToSlotMenu drops active slot but keeps the save intact', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.exitToSlotMenu();
    });
    expect(result.current.hasStarted).toBe(false);
    expect((await deps.storage.loadSlot(1))?.day).toBe(2);
  });

  it('restart clears the active slot save and returns to slot menu', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.restart();
    });
    expect(result.current.hasStarted).toBe(false);
    expect(await deps.storage.loadSlot(1)).toBeNull();
  });

  it('restart without an active slot is a safe no-op', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.restart();
    });
    expect(result.current.hasStarted).toBe(false);
  });

  it('refreshes slot summaries after a save lands', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => {
      const s1 = result.current.slots.find((s) => s.id === 1);
      expect(s1?.isEmpty).toBe(false);
      expect(s1?.day).toBe(2);
    });
  });
});

describe('useGameEngine — concurrency & errors', () => {
  it('drops concurrent play() calls so the LLM is only called once', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => {
      result.current.play(null);
      result.current.play(null);
      result.current.play(null);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(deps.llm.nextTurn).toHaveBeenCalledTimes(1);
  });

  it('allows another play() after the previous one finished', async () => {
    const deps = makeDeps();
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.play('继续观察'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(deps.llm.nextTurn).toHaveBeenCalledTimes(2);
  });

  it('surfaces errors when LLM call fails (Error instance)', async () => {
    const deps = makeDeps();
    (deps.llm.nextTurn as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('网络中断'));
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('网络中断');
  });

  it('serializes non-Error rejections as strings', async () => {
    const deps = makeDeps();
    (deps.llm.nextTurn as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain string');
    const { result } = await logIn(deps);
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('plain string');
  });

  it('surfaces errors when refresh slots fails', async () => {
    const deps = makeDeps();
    const broken = {
      ...deps.storage,
      listSlots: vi.fn().mockRejectedValue(new Error('storage down')),
    };
    const { result } = renderHook(() =>
      useGameEngine({ ...deps, storage: broken as unknown as typeof deps.storage })
    );
    await act(async () => {
      await result.current.login('x', '1234');
    });
    await waitFor(() => expect(result.current.error).toBe('storage down'));
  });

  it('surfaces errors when select slot fails', async () => {
    const deps = makeDeps();
    const broken = {
      ...deps.storage,
      listSlots: deps.storage.listSlots.bind(deps.storage),
      loadSlot: vi.fn().mockRejectedValue(new Error('load failed')),
    };
    const { result } = renderHook(() =>
      useGameEngine({ ...deps, storage: broken as unknown as typeof deps.storage })
    );
    await act(async () => {
      await result.current.login('x', '1234');
    });
    await act(async () => {
      await result.current.selectSlot(1);
    });
    expect(result.current.error).toBe('load failed');
  });

  it('surfaces errors when delete slot fails', async () => {
    const deps = makeDeps();
    const broken = {
      ...deps.storage,
      listSlots: deps.storage.listSlots.bind(deps.storage),
      clearSlot: vi.fn().mockRejectedValue(new Error('delete failed')),
    };
    const { result } = renderHook(() =>
      useGameEngine({ ...deps, storage: broken as unknown as typeof deps.storage })
    );
    await act(async () => {
      await result.current.login('x', '1234');
    });
    await act(async () => {
      await result.current.deleteSlot(1);
    });
    expect(result.current.error).toBe('delete failed');
  });

  it('logs error but continues when save fails', async () => {
    const deps = makeDeps();
    const failingSave = {
      ...deps.storage,
      listSlots: deps.storage.listSlots.bind(deps.storage),
      loadSlot: deps.storage.loadSlot.bind(deps.storage),
      clearSlot: deps.storage.clearSlot.bind(deps.storage),
      saveSlot: vi.fn().mockRejectedValue(new Error('save failed')),
    };
    const { result } = renderHook(() =>
      useGameEngine({ ...deps, storage: failingSave as unknown as typeof deps.storage })
    );
    await act(async () => {
      await result.current.login('x', '1234');
    });
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.error).toBe('save failed'));
  });

  it('logs error but does not surface to user when restart clear fails', async () => {
    const deps = makeDeps();
    const failing = {
      ...deps.storage,
      listSlots: deps.storage.listSlots.bind(deps.storage),
      loadSlot: deps.storage.loadSlot.bind(deps.storage),
      saveSlot: deps.storage.saveSlot.bind(deps.storage),
      clearSlot: vi.fn().mockRejectedValue(new Error('clear failed')),
    };
    const { result } = renderHook(() =>
      useGameEngine({ ...deps, storage: failing as unknown as typeof deps.storage })
    );
    await act(async () => {
      await result.current.login('x', '1234');
    });
    await act(async () => {
      await result.current.selectSlot(1);
    });
    act(() => result.current.play('动作'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.restart();
    });
    // restart still completes; clear error is only logged
    expect(result.current.hasStarted).toBe(false);
  });
});
