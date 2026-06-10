import {
  GOTO_DIRECTOR,
  type EventCard,
  type StoryContent,
  type StoryNode,
} from '../../content/schema';
import { DAWN_NODES, DUSK_NODES, NIGHT_QUIET_NODE } from '../../content/nights';
import {
  DAY_TURN_LIMIT,
  HUMANITY_EVIL_THRESHOLD,
  HUMANITY_GOOD_THRESHOLD,
  NIGHT_TURN_LIMIT,
  type GameState,
  type ScriptState,
} from '../../domain/entities/GameState';
import { evalConditions } from './conditions';
import { nextRandom, pickWeighted } from './rng';

/** 白天卡池抽空时的兜底：直接消磨过整天。 */
export const QUIET_DAY_NODE: StoryNode = {
  id: '@quiet-day',
  act: 0,
  narrative:
    '这一天什么也没有发生。\n\n你换了一处藏身点——不是因为旧的不安全，只是规矩如此：不在同一个地方连续待太久。新的房间在三楼，朝南，窗台上有一盆早就枯死的绿萝，土都板结了，你不知道为什么没把它扔出去。\n\n你把装备摊在地上清点了一遍。刀在一块从工地捡来的磨石上来回蹭了几十下，蹭到刀刃能在指甲上挂住。背包的破口用鞋线缝了两针。水按今天和明天分成了两份，分的时候你犹豫了一下，又从明天那份里拨回来一点——你总是高估自己明天的运气。\n\n然后就没有事可做了。\n\n你坐在窗边，看楼下那条空了很久的街。一只塑料袋被风推着从街这头走到那头，认真得像在赶路。你在墙上新划了一道——和之前那些道并排在一起，整整齐齐。\n\n末日里最难熬的从来不是危险。是危险与危险之间这些漫长的、空荡荡的下午，它们给你时间想起那些你拼命不去想的人和事。',
  choices: [
    {
      label: '把这一天熬过去',
      effects: { dayPassed: true },
      goto: GOTO_DIRECTOR,
    },
  ],
};

export interface DirectorPick {
  /** 选中的节点（主线锚点 / 事件卡 / 过场 / 兜底）。 */
  readonly node: StoryNode | EventCard;
  /** 演化后的种子。 */
  readonly nextSeed: number;
  /** 若抽中 once 卡，其 id（调用方记入 drawnOnce）。 */
  readonly drawnOnceId?: string;
  /** 若选中主线锚点，其 id（调用方记 visited 旗标）。 */
  readonly anchorId?: string;
}

/** day → 幕（1-10）。 */
export function actOfDay(day: number): number {
  return Math.min(10, Math.floor((day - 1) / 10) + 1);
}

function visitedFlag(nodeId: string): string {
  return `visited:${nodeId}`;
}

function pickVariant(
  variants: readonly StoryNode[],
  seed: number
): { node: StoryNode; nextSeed: number } {
  const { value, nextSeed } = nextRandom(seed);
  return { node: variants[Math.floor(value * variants.length)] ?? variants[0], nextSeed };
}

/**
 * 调度器：goto='@director' 时决定下一个节点。
 *
 * 白天（phase='day'）：
 *   1. 回合数 ≥ DAY_TURN_LIMIT → 强制黄昏抉择（休整一晚 / 夜间行动）
 *   2. 到期主线锚点（dayAnchor ≤ effectiveDay，未访问，门控满足）取最早者
 *   3. 白天事件卡（time ≠ 'night'）
 *   4. 兜底：平静的一天
 *
 * 夜晚（phase='night'）：
 *   1. 回合数 ≥ NIGHT_TURN_LIMIT → 强制黎明（睡到天亮）
 *   2. 夜晚事件卡（time = 'night'，高危）
 *   3. 兜底：无事的夜
 */
export function directNext(
  content: StoryContent,
  state: GameState,
  script: ScriptState,
  effectiveDay: number
): DirectorPick {
  const phase = script.phase ?? 'day';
  const turns = script.turnsInPhase ?? 0;

  if (phase === 'night') {
    if (turns >= NIGHT_TURN_LIMIT) {
      const { node, nextSeed } = pickVariant(DAWN_NODES, script.seed);
      return { node, nextSeed };
    }
    const card = drawCard(content, state, script, effectiveDay, 'night');
    if (card) return card;
    return { node: NIGHT_QUIET_NODE, nextSeed: script.seed };
  }

  // —— 白天 ——
  if (turns >= DAY_TURN_LIMIT) {
    const { node, nextSeed } = pickVariant(DUSK_NODES, script.seed);
    return { node, nextSeed };
  }

  const pendingAnchors: StoryNode[] = [];
  for (const node of content.nodes.values()) {
    if (node.dayAnchor === undefined) continue;
    if (node.dayAnchor > effectiveDay) continue;
    if (script.flags.includes(visitedFlag(node.id))) continue;
    if (!evalConditions(node.requires, state, script)) continue;
    pendingAnchors.push(node);
  }
  if (pendingAnchors.length > 0) {
    pendingAnchors.sort(
      (a, b) => (a.dayAnchor! - b.dayAnchor!) || a.id.localeCompare(b.id)
    );
    return { node: pendingAnchors[0], nextSeed: script.seed, anchorId: pendingAnchors[0].id };
  }

  const card = drawCard(content, state, script, effectiveDay, 'day');
  if (card) return card;
  return { node: QUIET_DAY_NODE, nextSeed: script.seed };
}

function drawCard(
  content: StoryContent,
  state: GameState,
  script: ScriptState,
  effectiveDay: number,
  time: 'day' | 'night'
): DirectorPick | null {
  const act = actOfDay(effectiveDay);
  const eligible = content.events.filter((card) => {
    if ((card.time ?? 'day') !== time) return false;
    if (act < card.acts[0] || act > card.acts[1]) return false;
    if (card.pool === 'good' && script.humanity < HUMANITY_GOOD_THRESHOLD) return false;
    if (card.pool === 'evil' && script.humanity > HUMANITY_EVIL_THRESHOLD) return false;
    if (card.once && script.drawnOnce.includes(card.id)) return false;
    if (!evalConditions(card.requires, state, script)) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  const { picked, nextSeed } = pickWeighted(eligible, () => 1, script.seed);
  return {
    node: picked,
    nextSeed,
    drawnOnceId: picked.once ? picked.id : undefined,
  };
}

/** 引擎内置的系统节点（不依赖内容包）：兜底日 + 黄昏/黎明/无事的夜。 */
const BUILTIN_NODES: ReadonlyMap<string, StoryNode> = new Map(
  [QUIET_DAY_NODE, ...DUSK_NODES, ...DAWN_NODES, NIGHT_QUIET_NODE].map((n) => [n.id, n])
);

/** 按 id 解析节点：内置系统节点 → 主线节点 → 事件卡。找不到抛错（内容缺陷尽早暴露）。 */
export function resolveNode(content: StoryContent, id: string): StoryNode | EventCard {
  const builtin = BUILTIN_NODES.get(id);
  if (builtin) return builtin;
  const node = content.nodes.get(id);
  if (node) return node;
  const card = content.events.find((e) => e.id === id);
  if (card) return card;
  throw new Error(`story node not found: ${id}`);
}
