import type { TurnEvent } from '../entities/Event';
import {
  AMPUTATION_WINDOW_TURNS,
  TOTAL_DAYS,
  hasReachedFinalDay,
  type GameState,
  type InfectionState,
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

function tick(infection: InfectionState): InfectionState {
  return { ...infection, turnsLeft: infection.turnsLeft - 1 };
}

/**
 * 推进感染状态机一回合：
 * - clear → 仅在截肢时间窗内（感染后前 AMPUTATION_WINDOW_TURNS 回合）解除感染；
 *   窗口已过则忽略指令、倒计时照常 -1（菌丝已入血，prompt 同步告知 LLM）
 * - start → 开启倒计时；已感染时忽略新参数（防 LLM 重置），但时间照常流逝 -1
 * - 无指令且已感染 → 倒计时 -1
 */
function nextInfection(
  current: InfectionState | null,
  event: TurnEvent
): InfectionState | null {
  if (event.infection?.action === 'clear') {
    if (!current) return null;
    const elapsed = current.turnsTotal - current.turnsLeft;
    if (elapsed < AMPUTATION_WINDOW_TURNS) return null;
    return tick(current);
  }
  if (event.infection?.action === 'start') {
    if (current) return tick(current);
    return {
      cause: event.infection.cause,
      turnsLeft: event.infection.turnsLeft,
      turnsTotal: event.infection.turnsLeft,
    };
  }
  if (current) {
    return tick(current);
  }
  return null;
}

/**
 * 给定当前游戏状态 + LLM 返回的回合事件，计算下一状态。
 * 这是纯函数，不调任何外部依赖。
 *
 * 规则（按优先级）：
 * - 资源、库存、记忆、感染状态按事件描述更新
 * - 若事件本身标记 isGameOver，则按事件给出的原因结束
 * - 否则若资源耗尽（HP/精神/食物/水任一为 0），按死因结束
 * - 否则若感染倒计时归零，菌变发作死亡
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
  const infection = nextInfection(state.infection ?? null, event);

  if (event.isGameOver) {
    return {
      ...state,
      resources,
      inventory,
      memory,
      infection,
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
      infection,
      lastNarrative: event.narrative,
      choices: [],
      isGameOver: true,
      gameOverReason: DEATH_REASONS[cause],
    };
  }

  if (infection && infection.turnsLeft <= 0) {
    return {
      ...state,
      resources,
      inventory,
      memory,
      infection,
      lastNarrative: event.narrative,
      choices: [],
      isGameOver: true,
      gameOverReason: '菌变发作',
    };
  }

  if (hasReachedFinalDay({ ...state, day: state.day })) {
    // 带菌撑到第 100 天也算通关——但结局文案如实记录这份苦涩
    const victoryReason = infection
      ? `成功活到第 ${TOTAL_DAYS} 天——但菌丝仍在你体内蔓延`
      : `成功活到第 ${TOTAL_DAYS} 天`;
    return {
      ...state,
      resources,
      inventory,
      memory,
      infection,
      lastNarrative: event.narrative,
      choices: [],
      isGameOver: true,
      gameOverReason: victoryReason,
    };
  }

  return {
    ...state,
    day: advance ? state.day + 1 : state.day,
    resources,
    inventory,
    memory,
    infection,
    lastNarrative: event.narrative,
    choices: event.choices,
    isGameOver: false,
  };
}
