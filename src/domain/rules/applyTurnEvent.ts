import type { TurnEvent } from '../entities/Event';
import {
  TOTAL_DAYS,
  hasReachedFinalDay,
  type GameState,
} from '../entities/GameState';
import { addItems, removeItems } from '../entities/Inventory';
import { applyDelta, deathCause, isDead } from '../entities/Resources';
import { appendMemory } from '../entities/StoryMemory';

const DEATH_REASONS = {
  hp: '伤重不治',
  sanity: '精神彻底崩溃',
  food: '饿死',
  water: '渴死',
} as const;

type DeathCause = keyof typeof DEATH_REASONS;

export interface ApplyTurnOptions {
  /**
   * 强制覆盖天数是否推进。不传则跟随 event.dayPassed（LLM 决定）。
   * 用例：ResolveChoice 在"开场回合"强行设为 false 作为安全网。
   */
  readonly advanceDay?: boolean;
}

/**
 * 给定当前游戏状态 + LLM 返回的回合事件，计算下一状态。
 * 这是纯函数，不调任何外部依赖。
 *
 * 规则：
 * - 资源、库存、记忆按事件描述更新
 * - 若事件本身标记 isGameOver，则按事件给出的原因结束
 * - 否则若资源耗尽（HP/精神/食物/水任一为 0），按死因结束
 * - 否则若当前天数已达 TOTAL_DAYS，正常通关
 * - 否则按 options.advanceDay（若提供）或 event.dayPassed 决定是否推进一天
 */
export function applyTurnEvent(
  state: GameState,
  event: TurnEvent,
  options: ApplyTurnOptions = {}
): GameState {
  const advance = options.advanceDay ?? event.dayPassed;
  const resources = applyDelta(state.resources, event.resourceDelta);
  const inventoryAfterRemove = removeItems(state.inventory, event.inventoryRemove);
  const inventory = addItems(inventoryAfterRemove, event.inventoryAdd);
  const memory = appendMemory(state.memory, {
    day: state.day,
    note: event.memoryNote,
  });

  if (event.isGameOver) {
    return {
      ...state,
      resources,
      inventory,
      memory,
      lastNarrative: event.narrative,
      choices: [],
      isGameOver: true,
      gameOverReason: event.gameOverReason ?? '剧情结束',
    };
  }

  if (isDead(resources)) {
    // isDead 为真时 deathCause 必然返回 hp/sanity/food/water 其中之一
    const cause = deathCause(resources) as DeathCause;
    return {
      ...state,
      resources,
      inventory,
      memory,
      lastNarrative: event.narrative,
      choices: [],
      isGameOver: true,
      gameOverReason: DEATH_REASONS[cause],
    };
  }

  if (hasReachedFinalDay({ ...state, day: state.day })) {
    return {
      ...state,
      resources,
      inventory,
      memory,
      lastNarrative: event.narrative,
      choices: [],
      isGameOver: true,
      gameOverReason: `成功活到第 ${TOTAL_DAYS} 天`,
    };
  }

  return {
    ...state,
    day: advance ? state.day + 1 : state.day,
    resources,
    inventory,
    memory,
    lastNarrative: event.narrative,
    choices: event.choices,
    isGameOver: false,
  };
}

