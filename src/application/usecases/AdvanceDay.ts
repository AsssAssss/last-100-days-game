import type { TurnEvent } from '../../domain/entities/Event';
import type { GameState } from '../../domain/entities/GameState';
import { applyTurnEvent } from '../../domain/rules/applyTurnEvent';

/**
 * 把校验后的回合事件套用到状态上。
 * 默认让 event.dayPassed（LLM 决定）决定是否推进天数。
 * isOpening=true 时强制不推进（无视 LLM 信号），作为开场的安全网。
 */
export function advanceDay(
  state: GameState,
  event: TurnEvent,
  isOpening = false
): GameState {
  if (isOpening) {
    return applyTurnEvent(state, event, { advanceDay: false });
  }
  return applyTurnEvent(state, event);
}
