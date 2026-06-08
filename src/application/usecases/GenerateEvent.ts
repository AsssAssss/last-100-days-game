import type { TurnEvent } from '../../domain/entities/Event';
import type { GameState } from '../../domain/entities/GameState';
import { validateAndClamp } from '../../domain/rules/PatchValidation';
import type { ILLMPort, PlayerInput } from '../ports/ILLMPort';
import type { ILogger } from '../ports/ILogger';

export interface GenerateEventDeps {
  readonly llm: ILLMPort;
  readonly logger: ILogger;
  readonly newRequestID: () => string;
}

const FEATURE = 'GenerateEvent';

/**
 * 调用 LLM 生成下一回合事件，并把 raw patch 校验为 TurnEvent。
 * 不修改 state；返回的事件交给 advanceDay 应用。
 */
export async function generateEvent(
  state: GameState,
  playerInput: PlayerInput | null,
  deps: GenerateEventDeps
): Promise<TurnEvent> {
  const requestID = deps.newRequestID();
  deps.logger.debug({
    requestID,
    feature: FEATURE,
    action: 'llm_call_start',
    req: { day: state.day, playerInput, resources: state.resources },
  });

  const raw = await deps.llm.nextTurn({ state, playerInput, requestID });
  const { event, issues } = validateAndClamp(raw);

  if (issues.length > 0) {
    deps.logger.warn({
      requestID,
      feature: FEATURE,
      action: 'patch_clamped',
      resp: { issues },
    });
  }

  deps.logger.debug({
    requestID,
    feature: FEATURE,
    action: 'llm_call_done',
    resp: {
      narrative: event.narrative.slice(0, 60) + '…',
      choices: event.choices,
      delta: event.resourceDelta,
      isGameOver: event.isGameOver,
    },
  });

  return event;
}
