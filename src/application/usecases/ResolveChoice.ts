import type { GameState } from '../../domain/entities/GameState';
import type { ILLMPort, PlayerInput } from '../ports/ILLMPort';
import type { ILogger } from '../ports/ILogger';
import { advanceDay } from './AdvanceDay';
import { checkGameOver } from './CheckGameOver';
import { compressMemoryIfNeeded } from './CompressMemory';
import { generateEvent } from './GenerateEvent';

export interface ResolveChoiceDeps {
  readonly llm: ILLMPort;
  readonly logger: ILogger;
  readonly newRequestID: () => string;
}

const FEATURE = 'ResolveChoice';

/**
 * 玩家选择/输入 → LLM → 校验 → 应用 → 必要时压缩剧情记忆 → 返回下一状态。
 * 若当前已是 game over，原样返回。
 */
export async function resolveChoice(
  state: GameState,
  playerInput: PlayerInput | null,
  deps: ResolveChoiceDeps
): Promise<GameState> {
  if (checkGameOver(state)) {
    deps.logger.warn({
      requestID: deps.newRequestID(),
      feature: FEATURE,
      action: 'resolve_after_game_over',
      req: { day: state.day },
    });
    return state;
  }

  const event = await generateEvent(state, playerInput, deps);
  const isOpening = playerInput === null;
  const advanced = advanceDay(state, event, isOpening);
  const final = await compressMemoryIfNeeded(advanced, deps);
  return final;
}
