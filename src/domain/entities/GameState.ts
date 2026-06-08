import { EMPTY_STORY_MEMORY, type StoryMemory } from './StoryMemory';
import { INITIAL_INVENTORY, type Inventory } from './Inventory';
import { INITIAL_RESOURCES, type Resources } from './Resources';

export interface GameState {
  readonly day: number;
  readonly resources: Resources;
  readonly inventory: Inventory;
  readonly memory: StoryMemory;
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
