import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_GAME_STATE,
  type GameState,
} from '../../domain/entities/GameState';
import type { SlotId, SlotSummary } from '../../domain/entities/SaveSlot';
import type { ILLMPort } from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import type { IStoragePort } from '../../application/ports/IStoragePort';
import { resolveChoice } from '../../application/usecases/ResolveChoice';
import type { AuthClient, LoginResult } from '../../adapters/auth/AuthClient';
import type { BrowserLLMConfig } from '../../adapters/llm/BrowserLLMAdapter';
import type { Session, SessionStore } from '../sessionStore';
import type { LLMConfigStore } from '../llmConfigStore';

export interface GameEngineDeps {
  llm: ILLMPort;
  logger: ILogger;
  storage: IStoragePort;
  auth: AuthClient;
  sessionStore: SessionStore;
  llmConfigStore: LLMConfigStore;
  newRequestID: () => string;
}

export interface GameEngine {
  state: GameState;
  loading: boolean;
  slotsLoading: boolean;
  error: string | null;
  hasStarted: boolean;
  activeSlotId: SlotId | null;
  slots: readonly SlotSummary[];
  session: Session | null;
  llmConfig: BrowserLLMConfig | null;

  login(username: string, pin: string): Promise<LoginResult>;
  logout(): void;
  setLLMConfig(config: BrowserLLMConfig): void;
  clearLLMConfig(): void;

  play(input: string | null): void;
  selectSlot(id: SlotId): Promise<void>;
  deleteSlot(id: SlotId): Promise<void>;
  exitToSlotMenu(): Promise<void>;
  restart(): Promise<void>;
}

export function useGameEngine(deps: GameEngineDeps): GameEngine {
  const [state, setState] = useState<GameState>(INITIAL_GAME_STATE);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<SlotId | null>(null);
  const [slots, setSlots] = useState<SlotSummary[]>([]);
  const [session, setSessionState] = useState<Session | null>(() =>
    deps.sessionStore.get()
  );
  const [llmConfig, setLLMConfigState] = useState<BrowserLLMConfig | null>(() =>
    deps.llmConfigStore.get()
  );

  const depsRef = useRef(deps);
  depsRef.current = deps;

  const playingRef = useRef(false);
  const saveSeqRef = useRef(0); // 用于丢弃过期的存盘请求

  const refreshSlots = useCallback(async (): Promise<void> => {
    if (!depsRef.current.sessionStore.get()) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const list = await depsRef.current.storage.listSlots();
      setSlots([...list]);
    } catch (err) {
      depsRef.current.logger.error({
        requestID: depsRef.current.newRequestID(),
        feature: 'useGameEngine',
        action: 'refresh_slots_failed',
        err: serialize(err),
      });
      setError(messageOf(err));
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // 首次挂载：如果已有会话，自动拉一次 slot 列表
  useEffect(() => {
    if (session) {
      void refreshSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 状态变更落盘到当前 active slot（异步、可中断）
  useEffect(() => {
    if (activeSlotId === null) return;
    if (state.lastNarrative === '' && state.day === INITIAL_GAME_STATE.day && !state.isGameOver) {
      return;
    }
    const seq = ++saveSeqRef.current;
    void depsRef.current.storage.saveSlot(activeSlotId, state).then(
      () => {
        if (seq !== saveSeqRef.current) return;
        void refreshSlots();
      },
      (err) => {
        depsRef.current.logger.error({
          requestID: depsRef.current.newRequestID(),
          feature: 'useGameEngine',
          action: 'save_failed',
          err: serialize(err),
        });
        setError(messageOf(err));
      }
    );
  }, [state, activeSlotId, refreshSlots]);

  const setSession = useCallback((s: Session | null) => {
    depsRef.current.sessionStore.set(s);
    setSessionState(s);
  }, []);

  const login = useCallback(
    async (username: string, pin: string): Promise<LoginResult> => {
      const result = await depsRef.current.auth.login(username, pin);
      if (result.ok) {
        setSession({ userId: result.userId, token: result.token, username });
        await refreshSlots();
      }
      return result;
    },
    [refreshSlots, setSession]
  );

  const logout = useCallback(() => {
    setSession(null);
    setHasStarted(false);
    setActiveSlotId(null);
    setState(INITIAL_GAME_STATE);
    setError(null);
    setLoading(false);
    setSlots([]);
    playingRef.current = false;
  }, [setSession]);

  const setLLMConfig = useCallback((config: BrowserLLMConfig) => {
    depsRef.current.llmConfigStore.set(config);
    setLLMConfigState(config);
  }, []);

  const clearLLMConfig = useCallback(() => {
    depsRef.current.llmConfigStore.set(null);
    setLLMConfigState(null);
  }, []);

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

  const selectSlot = useCallback(async (id: SlotId): Promise<void> => {
    setError(null);
    setLoading(false);
    try {
      const loaded = await depsRef.current.storage.loadSlot(id);
      setActiveSlotId(id);
      setState(loaded ?? INITIAL_GAME_STATE);
      setHasStarted(true);
    } catch (err) {
      depsRef.current.logger.error({
        requestID: depsRef.current.newRequestID(),
        feature: 'useGameEngine',
        action: 'select_slot_failed',
        err: serialize(err),
      });
      setError(messageOf(err));
    }
  }, []);

  const deleteSlot = useCallback(async (id: SlotId): Promise<void> => {
    try {
      await depsRef.current.storage.clearSlot(id);
      await refreshSlots();
    } catch (err) {
      depsRef.current.logger.error({
        requestID: depsRef.current.newRequestID(),
        feature: 'useGameEngine',
        action: 'delete_slot_failed',
        err: serialize(err),
      });
      setError(messageOf(err));
    }
  }, [refreshSlots]);

  const exitToSlotMenu = useCallback(async (): Promise<void> => {
    setHasStarted(false);
    setActiveSlotId(null);
    setState(INITIAL_GAME_STATE);
    setError(null);
    setLoading(false);
    playingRef.current = false;
    await refreshSlots();
  }, [refreshSlots]);

  const restart = useCallback(async (): Promise<void> => {
    const slotToClear = activeSlotId;
    setHasStarted(false);
    setActiveSlotId(null);
    setState(INITIAL_GAME_STATE);
    setError(null);
    setLoading(false);
    playingRef.current = false;
    if (slotToClear !== null) {
      try {
        await depsRef.current.storage.clearSlot(slotToClear);
      } catch (err) {
        depsRef.current.logger.error({
          requestID: depsRef.current.newRequestID(),
          feature: 'useGameEngine',
          action: 'restart_clear_failed',
          err: serialize(err),
        });
      }
    }
    await refreshSlots();
  }, [activeSlotId, refreshSlots]);

  return {
    state,
    loading,
    slotsLoading,
    error,
    hasStarted,
    activeSlotId,
    slots,
    session,
    llmConfig,
    login,
    logout,
    setLLMConfig,
    clearLLMConfig,
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
