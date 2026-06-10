import type { ResourceKey } from '../domain/entities/Resources';

/**
 * 剧本内容的数据模型。
 * 内容文件（acts/events）是纯 TS 字面量，引擎在 adapters/scripted 中解释执行。
 */

/** 条件：节点/选项的门控。全部满足才可用。 */
export type Condition =
  | { readonly kind: 'humanity'; readonly min?: number; readonly max?: number }
  | { readonly kind: 'flag'; readonly flag: string; readonly present: boolean }
  | { readonly kind: 'item'; readonly item: string; readonly present: boolean }
  | { readonly kind: 'resource'; readonly resource: ResourceKey; readonly min: number };

/** 选项生效后的状态变化。全部可选。 */
export interface Effects {
  readonly resources?: Partial<Record<ResourceKey, number>>;
  readonly addItems?: readonly string[];
  readonly removeItems?: readonly string[];
  readonly humanityDelta?: number;
  readonly setFlags?: readonly string[];
  readonly clearFlags?: readonly string[];
  readonly infection?: {
    readonly action: 'start' | 'clear';
    readonly cause?: string;
    readonly turnsUntilDeath?: number;
  };
  /** 本选项结束当天（睡到第二天白天）。隐含回到白天时段并重置回合计数。 */
  readonly dayPassed?: boolean;
  /** 切换时段（黄昏抉择"夜间行动"用 setPhase: 'night'）。重置时段回合计数。 */
  readonly setPhase?: 'day' | 'night';
  /** 写入剧情记忆（StatusBar 之外的存档摘要）。 */
  readonly memoryNote?: string;
}

/** 概率跳转分支（风险判定）。权重相对值，由 seeded RNG 抽取。 */
export interface WeightedGoto {
  readonly to: string;
  readonly weight: number;
}

/** goto 特殊值：交还调度器（进主线锚点或抽事件卡）。 */
export const GOTO_DIRECTOR = '@director';

export interface ScriptedChoice {
  readonly label: string;
  readonly requires?: readonly Condition[];
  readonly effects?: Effects;
  readonly goto: string | readonly WeightedGoto[];
}

export interface StoryNode {
  /** 全局唯一 id，约定 'act01/escape-corridor'。 */
  readonly id: string;
  /** 所属幕 1-10（事件卡不用此字段语义，仅归档）。 */
  readonly act: number;
  /** 150-250 字叙事。 */
  readonly narrative: string;
  /** 1-3 个选项；ending 节点为空数组。 */
  readonly choices: readonly ScriptedChoice[];
  /**
   * 主线锚点：在第几天（state.day ≥ dayAnchor）激活。
   * 仅锚点节点设置；场景内部节点经 goto 串联，无需此字段。
   */
  readonly dayAnchor?: number;
  /** 锚点门控（如恶人线锚点 requires humanity ≤ 35）。 */
  readonly requires?: readonly Condition[];
  /** 结局/死亡节点：到达即游戏结束。 */
  readonly ending?: { readonly reason: string };
}

export type EventPool = 'common' | 'good' | 'evil';

/** 随机事件卡：在没有主线锚点的回合由调度器抽取。 */
export interface EventCard {
  readonly id: string;
  readonly pool: EventPool;
  /** 可出现的幕区间 [from, to]（含端点）。 */
  readonly acts: readonly [number, number];
  /** 出现时段；缺省 'day'。夜晚只抽 'night' 卡（更危险）。 */
  readonly time?: 'day' | 'night';
  /** 一局限抽一次。 */
  readonly once?: boolean;
  readonly narrative: string;
  readonly choices: readonly ScriptedChoice[];
  readonly requires?: readonly Condition[];
}

export interface StoryContent {
  /** 开局节点 id。 */
  readonly startNodeId: string;
  /** 全部主线/场景/结局节点，按 id 索引。 */
  readonly nodes: ReadonlyMap<string, StoryNode>;
  /** 全部事件卡。 */
  readonly events: readonly EventCard[];
}

/** 把节点数组建成索引；重复 id 直接抛错（内容作者错误尽早暴露）。 */
export function buildContent(
  startNodeId: string,
  nodeArrays: ReadonlyArray<readonly StoryNode[]>,
  events: readonly EventCard[]
): StoryContent {
  const nodes = new Map<string, StoryNode>();
  for (const arr of nodeArrays) {
    for (const node of arr) {
      if (nodes.has(node.id)) {
        throw new Error(`duplicate story node id: ${node.id}`);
      }
      nodes.set(node.id, node);
    }
  }
  const seen = new Set<string>();
  for (const card of events) {
    if (seen.has(card.id) || nodes.has(card.id)) {
      throw new Error(`duplicate event card id: ${card.id}`);
    }
    seen.add(card.id);
  }
  return { startNodeId, nodes, events };
}
