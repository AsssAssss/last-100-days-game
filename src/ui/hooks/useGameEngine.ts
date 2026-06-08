import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_GAME_STATE,
  type GameState,
} from '../../domain/entities/GameState';
import type { SlotId, SlotSummary } from '../../domain/entities/SaveSlot';
import type { ILLMPort } from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import { resolveChoice } from '../../application/usecases/ResolveChoice';
import type { LocalStorageAdapter } from '../../adapters/storage/LocalStorageAdapter';

export interface GameEngineDeps {
  llm: ILLMPort;
  logger: ILogger;
  storage: LocalStorageAdapter;
  newRequestID: () => string;
}

export interface GameEngine {
  state: GameState;
  loading: boolean;
  error: string | null;
  /** 用户是否已经从 slot 屏进入游戏。 */
  hasStarted: boolean;
  /** 当前选中的存档槽 id，未进入游戏时为 null。 */
  activeSlotId: SlotId | null;
  /** 全部 5 个 slot 的概要（实时反映存储状态）。 */
  slots: readonly SlotSummary[];
  /** 发起一回合：从选项里挑、自由输入、或开局（null）。 */
  play(input: string | null): void;
  /** 选择某个 slot 进入游戏：占用槽用其存档，空槽开新游戏。 */
  selectSlot(id: SlotId): void;
  /** 删除某个 slot 的存档（不影响当前 active slot 的 in-memory state）。 */
  deleteSlot(id: SlotId): void;
  /** 退出当前游戏，回到 slot 选择屏（存档保留）。 */
  exitToSlotMenu(): void;
  /** 清空当前 active slot，并回到 slot 屏。常见于 Game Over 后"从头再来"。 */
  restart(): void;
}

/**
 * 把 Use Case + Storage + LLM 串起来的 React hook。
 * 持有 GameState；每次 play 会异步推进；状态变化自动落盘到 active slot。
 */
export function useGameEngine(deps: GameEngineDeps): GameEngine {
  const [state, setState] = useState<GameState>(INITIAL_GAME_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<SlotId | null>(null);
  const [slots, setSlots] = useState<SlotSummary[]>(() => deps.storage.listSlots());

  const depsRef = useRef(deps);
  depsRef.current = deps;

  /**
   * 防止 play 被并发调用——StrictMode 会重复触发 useEffect，
   * 玩家也可能在 loading 状态外快速重复点击。一旦在飞，后续 play 调用直接丢弃。
   */
  const playingRef = useRef(false);

  const refreshSlots = useCallback(() => {
    setSlots(depsRef.current.storage.listSlots());
  }, []);

  // 把状态变化落盘到当前 active slot。开场屏 / 未选 slot 时不写。
  useEffect(() => {
    if (activeSlotId === null) return;
    if (state.lastNarrative === '' && state.day === INITIAL_GAME_STATE.day && !state.isGameOver) {
      return;
    }
    depsRef.current.storage.saveSlot(activeSlotId, state);
    refreshSlots();
  }, [state, activeSlotId, refreshSlots]);

  const play = useCallback((input: string | null) => {
    if (playingRef.current) return;
    playingRef.current = true;
    setLoading(true);
    setError(null);
    setState((current) => {
      void resolveChoice(current, input, depsRef.current)
        .then((next) => {
          setState(next);
          setLoading(false);
          playingRef.current = false;
        })
        .catch((err) => {
          depsRef.current.logger.error({
            requestID: depsRef.current.newRequestID(),
            feature: 'useGameEngine',
            action: 'play_failed',
            err: serialize(err),
          });
          setError(messageOf(err));
          setLoading(false);
          playingRef.current = false;
        });
      return current;
    });
  }, []);

  const selectSlot = useCallback(
    (id: SlotId) => {
      const loaded = depsRef.current.storage.loadSlot(id);
      setActiveSlotId(id);
      setState(loaded ?? INITIAL_GAME_STATE);
      setError(null);
      setLoading(false);
      setHasStarted(true);
    },
    []
  );

  const deleteSlot = useCallback(
    (id: SlotId) => {
      depsRef.current.storage.clearSlot(id);
      refreshSlots();
    },
    [refreshSlots]
  );

  const exitToSlotMenu = useCallback(() => {
    setHasStarted(false);
    setActiveSlotId(null);
    setState(INITIAL_GAME_STATE);
    setError(null);
    setLoading(false);
    playingRef.current = false;
    refreshSlots();
  }, [refreshSlots]);

  const restart = useCallback(() => {
    if (activeSlotId !== null) {
      depsRef.current.storage.clearSlot(activeSlotId);
    }
    setHasStarted(false);
    setActiveSlotId(null);
    setState(INITIAL_GAME_STATE);
    setError(null);
    setLoading(false);
    playingRef.current = false;
    refreshSlots();
  }, [activeSlotId, refreshSlots]);

  return {
    state,
    loading,
    error,
    hasStarted,
    activeSlotId,
    slots,
    play,
    selectSlot,
    deleteSlot,
    exitToSlotMenu,
    restart,
  };
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function serialize(err: unknown): unknown {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return err;
}
