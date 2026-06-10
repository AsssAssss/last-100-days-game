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

export interface GameState {
  readonly day: number;
  readonly resources: Resources;
  readonly inventory: Inventory;
  readonly memory: StoryMemory;
  /** 当前感染状态；null = 未感染。旧存档无此字段，按未感染处理。 */
  readonly infection?: InfectionState | null;
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
