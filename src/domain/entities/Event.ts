import type { Inventory } from './Inventory';
import type { ResourceDelta } from './Resources';

/**
 * 感染指令（经校验后的规范形态）。
 * start：本回合玩家被咬/吸入孢子，开启倒计时；
 * clear：奇迹般解除（如及时截肢）——代价由 resourceDelta 体现。
 */
export type InfectionCommand =
  | { readonly action: 'start'; readonly cause: string; readonly turnsLeft: number }
  | { readonly action: 'clear' };

/** LLM 返回的回合事件结构（已经过 schema 与领域规则校验）。 */
export interface TurnEvent {
  /** 本回合叙事文本。 */
  readonly narrative: string;
  /** 下一回合玩家可选项。结局回合返回空数组。 */
  readonly choices: readonly string[];
  /** 本回合资源变化（delta）。 */
  readonly resourceDelta: ResourceDelta;
  /** 本回合获得的物品。 */
  readonly inventoryAdd: Inventory;
  /** 本回合失去的物品。 */
  readonly inventoryRemove: Inventory;
  /** 本回合关键事件摘要，加入 StoryMemory.recent。 */
  readonly memoryNote: string;
  /** 本回合是否触发结局（死亡或胜利）。 */
  readonly isGameOver: boolean;
  /** 结局原因，若 isGameOver=true。 */
  readonly gameOverReason?: string;
  /** 本回合是否消耗了完整的一天（由 LLM 根据叙事决定）。 */
  readonly dayPassed: boolean;
  /** 感染状态变更；undefined = 本回合感染状态无操作（倒计时仍由引擎自动递减）。 */
  readonly infection?: InfectionCommand;
}
