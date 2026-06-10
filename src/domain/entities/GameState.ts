import { EMPTY_STORY_MEMORY, type StoryMemory } from './StoryMemory';
import { INITIAL_INVENTORY, type Inventory } from './Inventory';
import { INITIAL_RESOURCES, type Resources } from './Resources';

/**
 * 感染状态（被咬 / 吸入孢子后的死亡倒计时）。
 * 引擎每回合递减 turnsLeft，归零即死。LLM 只负责触发 start/clear，不管理倒计时。
 */
export interface InfectionState {
  /** 感染原因，叙事用："被奔跑者咬伤左臂"、"在地铁站吸入孢子"。 */
  readonly cause: string;
  /** 距离发作的剩余回合数。 */
  readonly turnsLeft: number;
  /** 感染开始时的总倒计时，用于计算已经过的回合数（截肢时间窗判定）。 */
  readonly turnsTotal: number;
}

/** 被咬后允许截肢自救（clear 指令生效）的回合窗口；超过后引擎拒绝 clear。 */
export const AMPUTATION_WINDOW_TURNS = 2;

/** 人性值范围与初始值（0=彻底恶徒，100=圣人）。 */
export const HUMANITY_MIN = 0;
export const HUMANITY_MAX = 100;
export const HUMANITY_INITIAL = 50;
/** ≥ 此值解锁好人线分支。 */
export const HUMANITY_GOOD_THRESHOLD = 65;
/** ≤ 此值解锁恶人线分支。 */
export const HUMANITY_EVIL_THRESHOLD = 35;

/**
 * 固定剧本模式的进度状态。
 * 由 ScriptedStoryAdapter 全权计算，经 scriptPatch 整体替换写回。
 */
export interface ScriptState {
  /** 当前所在剧本节点 id。 */
  readonly nodeId: string;
  /** 人性值 0-100。 */
  readonly humanity: number;
  /** 剧情旗标（'saved-chenbo'、'visited:act01/xxx' 等）。 */
  readonly flags: readonly string[];
  /** seeded RNG 当前种子（每次随机判定后演化），保证存档可复现。 */
  readonly seed: number;
  /** 已抽过的 once 事件卡 id。 */
  readonly drawnOnce: readonly string[];
  /** 当前时段；旧存档无此字段按白天处理。 */
  readonly phase?: 'day' | 'night';
  /**
   * 当前时段已消耗的行动回合数。
   * 白天满 DAY_TURN_LIMIT 强制入夜；夜晚满 NIGHT_TURN_LIMIT 强制天亮。
   * dayPassed / 进入夜晚时归零。旧存档无此字段按 0 处理。
   */
  readonly turnsInPhase?: number;
}

/** 白天行动回合上限，满了强制进入黄昏抉择。 */
export const DAY_TURN_LIMIT = 15;
/** 夜晚行动回合上限，满了强制天亮。 */
export const NIGHT_TURN_LIMIT = 10;

export interface GameState {
  readonly day: number;
  readonly resources: Resources;
  readonly inventory: Inventory;
  readonly memory: StoryMemory;
  /** 当前感染状态；null = 未感染。旧存档无此字段，按未感染处理。 */
  readonly infection?: InfectionState | null;
  /** 固定剧本进度；undefined = 尚未开始（开场回合由剧本适配器初始化）。 */
  readonly script?: ScriptState;
  /** 最近一次叙事文本，用于在玩家选择时再次展示给 LLM。 */
  readonly lastNarrative: string;
  /** 当前可选项；空数组表示游戏结束或开局。 */
  readonly choices: readonly string[];
  readonly isGameOver: boolean;
  readonly gameOverReason?: string;
}

export const TOTAL_DAYS = 100;

export const INITIAL_GAME_STATE: GameState = {
  day: 1,
  resources: INITIAL_RESOURCES,
  inventory: INITIAL_INVENTORY,
  memory: EMPTY_STORY_MEMORY,
  infection: null,
  lastNarrative: '',
  choices: [],
  isGameOver: false,
};

export function hasReachedFinalDay(state: GameState): boolean {
  return state.day >= TOTAL_DAYS;
}

/**
 * 判断一份 GameState 是否值得"继续"——即玩家之前真的玩过几步。
 * 用来在启动页决定显示"继续 / 新开存档"还是"开始游戏"。
 */
export function hasMeaningfulSave(state: GameState): boolean {
  return (
    state.lastNarrative !== '' ||
    state.day > INITIAL_GAME_STATE.day ||
    state.memory.recent.length > 0 ||
    state.isGameOver
  );
}
