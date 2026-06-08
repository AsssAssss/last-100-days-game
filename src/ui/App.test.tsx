import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import type { ILLMPort } from '../application/ports/ILLMPort';
import type { ILogger } from '../application/ports/ILogger';
import { LocalStorageAdapter, type StorageLike } from '../adapters/storage/LocalStorageAdapter';
import { INITIAL_GAME_STATE } from '../domain/entities/GameState';
import { App } from './App';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeStorage(): { adapter: LocalStorageAdapter; mem: StorageLike } {
  const store = new Map<string, string>();
  const mem: StorageLike = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
  return { adapter: new LocalStorageAdapter(mem, () => 1_700_000_000_000), mem };
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

function makeDeps(over: { llm?: ILLMPort; storage?: LocalStorageAdapter } = {}) {
  return {
    llm: over.llm ?? makeLLM(),
    logger: makeLogger(),
    storage: over.storage ?? makeStorage().adapter,
    newRequestID: () => 'rid',
  };
}

function renderApp(deps: ReturnType<typeof makeDeps>) {
  return render(<App deps={deps} disableIntroAnimation={true} />);
}

describe('App', () => {
  describe('slot select screen', () => {
    it('shows the slot select screen on mount with 5 empty slots', () => {
      renderApp(makeDeps());
      expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument();
      for (let id = 1; id <= 5; id++) {
        expect(screen.getByTestId(`slot-${id}`)).toBeInTheDocument();
      }
    });

    it('shows day and continue/delete for occupied slots', () => {
      const { adapter } = makeStorage();
      adapter.saveSlot(2, { ...INITIAL_GAME_STATE, day: 5, lastNarrative: '昨夜风雪。' });
      renderApp(makeDeps({ storage: adapter }));
      expect(screen.getByTestId('slot-2-continue')).toHaveTextContent('DAY 5');
      expect(screen.getByTestId('slot-2-delete')).toBeInTheDocument();
    });

    it('clicking empty slot enters game and auto-fetches first turn', async () => {
      const deps = makeDeps();
      renderApp(deps);
      fireEvent.click(screen.getByTestId('slot-1'));
      await waitFor(() =>
        expect(screen.getByTestId('narrative-text').textContent).toContain(
          '你在地下车库点燃了打火机。'
        )
      );
      expect(deps.llm.nextTurn).toHaveBeenCalledOnce();
    });

    it('clicking continue on occupied slot resumes without fetching', () => {
      const { adapter } = makeStorage();
      adapter.saveSlot(3, {
        ...INITIAL_GAME_STATE,
        day: 5,
        lastNarrative: '你蜷在角落。',
        choices: ['逃', '躲', '战'],
      });
      const deps = makeDeps({ storage: adapter });
      renderApp(deps);
      fireEvent.click(screen.getByTestId('slot-3-continue'));
      expect(screen.getByText('DAY 5')).toBeInTheDocument();
      expect(deps.llm.nextTurn).not.toHaveBeenCalled();
    });

    it('clicking delete wipes that slot and keeps user on slot screen', () => {
      const { adapter } = makeStorage();
      adapter.saveSlot(4, { ...INITIAL_GAME_STATE, day: 7, lastNarrative: 'x' });
      const deps = makeDeps({ storage: adapter });
      renderApp(deps);
      expect(screen.getByTestId('slot-4-delete')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('slot-4-delete'));
      const slot4 = screen.getByTestId('slot-4');
      expect(slot4.getAttribute('data-empty')).toBe('true');
      expect(deps.llm.nextTurn).not.toHaveBeenCalled();
    });
  });

  describe('in-game', () => {
    function enterGame(deps: ReturnType<typeof makeDeps>) {
      const utils = renderApp(deps);
      fireEvent.click(screen.getByTestId('slot-1'));
      return utils;
    }

    it('shows status bar with day counter once entered', () => {
      enterGame(makeDeps());
      expect(screen.getByText('DAY 1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-hp')).toBeInTheDocument();
    });

    it('renders choices after the first turn', async () => {
      enterGame(makeDeps());
      await waitFor(() => {
        expect(screen.getByTestId('choice-0')).toHaveTextContent('走出去');
      });
    });

    it('advances state when a choice is clicked', async () => {
      const deps = makeDeps();
      enterGame(deps);
      await waitFor(() => screen.getByTestId('choice-0'));
      fireEvent.click(screen.getByTestId('choice-0'));
      await waitFor(() => expect(deps.llm.nextTurn).toHaveBeenCalledTimes(2));
    });

    it('advances state when free input is submitted', async () => {
      const deps = makeDeps();
      enterGame(deps);
      await waitFor(() => screen.getByTestId('free-input'));
      fireEvent.change(screen.getByTestId('free-input'), {
        target: { value: '砸碎车窗' },
      });
      fireEvent.submit(screen.getByTestId('free-input-form'));
      await waitFor(() => expect(deps.llm.nextTurn).toHaveBeenCalledTimes(2));
    });

    it('exit-to-menu button returns to slot screen without wiping save', async () => {
      const deps = makeDeps();
      enterGame(deps);
      await waitFor(() => screen.getByTestId('choice-0'));
      fireEvent.click(screen.getByTestId('exit-to-menu'));
      expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument();
      // slot 1 still has the saved (day 1 with narrative) state
      const slot1 = screen.getByTestId('slot-1');
      expect(slot1.getAttribute('data-empty')).toBe('false');
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
      enterGame(makeDeps({ llm }));
      await waitFor(() => expect(screen.getByTestId('game-over')).toBeInTheDocument());
    });

    it('shows error banner when LLM call fails', async () => {
      const llm = makeLLM({
        nextTurn: vi.fn(async () => {
          throw new Error('API 限流');
        }),
      });
      enterGame(makeDeps({ llm }));
      await waitFor(() =>
        expect(screen.getByTestId('engine-error')).toHaveTextContent('API 限流')
      );
    });

    it('restart after game over clears the slot and returns to slot screen', async () => {
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
      const deps = makeDeps({ llm });
      enterGame(deps);
      await waitFor(() => screen.getByTestId('game-over'));
      act(() => fireEvent.click(screen.getByTestId('restart-button')));
      expect(screen.getByTestId('slot-select-screen')).toBeInTheDocument();
      expect(screen.getByTestId('slot-1').getAttribute('data-empty')).toBe('true');
    });
  });
});
