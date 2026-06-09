import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import type { ILLMPort } from '../application/ports/ILLMPort';
import type { ILogger } from '../application/ports/ILogger';
import { LocalStorageAdapter, type StorageLike } from '../adapters/storage/LocalStorageAdapter';
import type { AuthClient, LoginResult } from '../adapters/auth/AuthClient';
import { INITIAL_GAME_STATE } from '../domain/entities/GameState';
import { App } from './App';
import { createBrowserSessionStore } from './sessionStore';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeMem(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

function makeAuth(result: LoginResult = { ok: true, userId: 'u', token: 't', created: true }): AuthClient {
  return { login: vi.fn(async () => result) } as unknown as AuthClient;
}

function makeLLM(over: Partial<ILLMPort> = {}): ILLMPort {
  return {
    nextTurn: vi.fn(async () => ({
      narrative: '你在地下车库点燃了打火机。',
      choices: ['走出去', '蹲下', '熄灭打火机'],
      statePatch: {
        resources: { water: -1, food: -1 },
        inventoryAdd: [],
        inventoryRemove: [],
        memoryNote: '车库点火',
        isGameOver: false,
        dayPassed: false,
      },
    })),
    compressMemory: vi.fn(async () => ''),
    ...over,
  };
}

function makeDeps(
  over: {
    llm?: ILLMPort;
    storage?: LocalStorageAdapter;
    auth?: AuthClient;
    preloggedIn?: boolean;
  } = {}
) {
  const sessionMem = makeMem();
  const sessionStore = createBrowserSessionStore(sessionMem);
  if (over.preloggedIn) {
    sessionStore.set({ userId: 'u', token: 't', username: 'xiaoxue' });
  }
  return {
    llm: over.llm ?? makeLLM(),
    logger: makeLogger(),
    storage: over.storage ?? new LocalStorageAdapter(makeMem(), () => 1_700_000_000_000),
    auth: over.auth ?? makeAuth(),
    sessionStore,
    newRequestID: () => 'rid',
    _sessionMem: sessionMem,
  };
}

function renderApp(deps: ReturnType<typeof makeDeps>) {
  return render(<App deps={deps} disableIntroAnimation={true} />);
}

async function loginThrough(deps: ReturnType<typeof makeDeps>) {
  renderApp(deps);
  fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'xiaoxue' } });
  fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
  fireEvent.submit(screen.getByTestId('login-form'));
  await waitFor(() => screen.getByTestId('slot-select-screen'));
}

describe('App — login flow', () => {
  it('shows login screen on mount when not logged in', () => {
    renderApp(makeDeps());
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
  });

  it('logging in transitions to slot select screen', async () => {
    await loginThrough(makeDeps());
    expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument();
  });

  it('shows username and logout button on slot screen', async () => {
    await loginThrough(makeDeps());
    expect(screen.getByText('xiaoxue')).toBeInTheDocument();
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  it('clicking logout returns to login screen', async () => {
    await loginThrough(makeDeps());
    fireEvent.click(screen.getByTestId('logout-button'));
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
  });

  it('shows slot screen directly when session already exists', () => {
    renderApp(makeDeps({ preloggedIn: true }));
    expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument();
  });
});

describe('App — gameplay (after login)', () => {
  it('clicking empty slot enters game and auto-fetches first turn', async () => {
    const deps = makeDeps({ preloggedIn: true });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    await waitFor(() =>
      expect(screen.getByTestId('narrative-text').textContent).toContain(
        '你在地下车库点燃了打火机。'
      )
    );
    expect(deps.llm.nextTurn).toHaveBeenCalledOnce();
  });

  it('clicking continue on occupied slot resumes without re-fetching', async () => {
    const deps = makeDeps({ preloggedIn: true });
    await deps.storage.saveSlot(3, {
      ...INITIAL_GAME_STATE,
      day: 5,
      lastNarrative: '你蜷在角落。',
      choices: ['逃', '躲', '战'],
    });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-3-continue'));
    fireEvent.click(screen.getByTestId('slot-3-continue'));
    await waitFor(() => expect(screen.getByText('DAY 5')).toBeInTheDocument());
    expect(deps.llm.nextTurn).not.toHaveBeenCalled();
  });

  it('clicking delete wipes that slot', async () => {
    const deps = makeDeps({ preloggedIn: true });
    await deps.storage.saveSlot(4, { ...INITIAL_GAME_STATE, day: 7, lastNarrative: 'x' });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-4-delete'));
    fireEvent.click(screen.getByTestId('slot-4-delete'));
    await waitFor(() =>
      expect(screen.getByTestId('slot-4').getAttribute('data-empty')).toBe('true')
    );
  });

  it('advances state when a choice is clicked', async () => {
    const deps = makeDeps({ preloggedIn: true });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    await waitFor(() => screen.getByTestId('choice-0'));
    fireEvent.click(screen.getByTestId('choice-0'));
    await waitFor(() => expect(deps.llm.nextTurn).toHaveBeenCalledTimes(2));
  });

  it('advances state on free input submission', async () => {
    const deps = makeDeps({ preloggedIn: true });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    // 等第一回合 LLM 跑完，否则 FreeInputBox 还是 disabled 状态，submit 会被吞
    await waitFor(() => screen.getByTestId('choice-0'));
    fireEvent.change(screen.getByTestId('free-input'), { target: { value: '砸碎车窗' } });
    fireEvent.submit(screen.getByTestId('free-input-form'));
    await waitFor(() => expect(deps.llm.nextTurn).toHaveBeenCalledTimes(2));
  });

  it('exit-to-menu returns to slot screen without wiping save', async () => {
    const deps = makeDeps({ preloggedIn: true });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    await waitFor(() => screen.getByTestId('choice-0'));
    fireEvent.click(screen.getByTestId('exit-to-menu'));
    await waitFor(() => expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId('slot-1').getAttribute('data-empty')).toBe('false')
    );
  });

  it('shows game over pane when state.isGameOver becomes true', async () => {
    const llm = makeLLM({
      nextTurn: vi.fn(async () => ({
        narrative: '你倒下了。',
        choices: [],
        statePatch: {
          resources: { hp: -200 },
          inventoryAdd: [],
          inventoryRemove: [],
          memoryNote: '死亡',
          isGameOver: false,
          dayPassed: true,
        },
      })),
    });
    const deps = makeDeps({ preloggedIn: true, llm });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    await waitFor(() => expect(screen.getByTestId('game-over')).toBeInTheDocument());
  });

  it('shows error banner when LLM call fails', async () => {
    const llm = makeLLM({
      nextTurn: vi.fn(async () => {
        throw new Error('API 限流');
      }),
    });
    renderApp(makeDeps({ preloggedIn: true, llm }));
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    await waitFor(() =>
      expect(screen.getByTestId('engine-error')).toHaveTextContent('API 限流')
    );
  });

  it('restart after game over clears slot and returns to slot screen', async () => {
    const llm = makeLLM({
      nextTurn: vi.fn(async () => ({
        narrative: '你倒下了。',
        choices: [],
        statePatch: {
          resources: { hp: -200 },
          inventoryAdd: [],
          inventoryRemove: [],
          memoryNote: '',
          isGameOver: false,
          dayPassed: true,
        },
      })),
    });
    const deps = makeDeps({ preloggedIn: true, llm });
    renderApp(deps);
    await waitFor(() => screen.getByTestId('slot-1'));
    fireEvent.click(screen.getByTestId('slot-1'));
    await waitFor(() => screen.getByTestId('game-over'));
    act(() => fireEvent.click(screen.getByTestId('restart-button')));
    await waitFor(() =>
      expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByTestId('slot-1').getAttribute('data-empty')).toBe('true')
    );
  });
});
