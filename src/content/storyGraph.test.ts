import { describe, it, expect } from 'vitest';
import { STORY_CONTENT } from './index';
import { GOTO_DIRECTOR, type ScriptedChoice, type StoryNode } from './schema';
import { QUIET_DAY_NODE } from '../adapters/scripted/StoryDirector';

/**
 * 剧情图静态校验——内容作者的安全网。
 * 任何一条失败都意味着玩家会在游戏里撞死链/卡死/被静默削血。
 */

const ALL_UNITS = [
  ...STORY_CONTENT.nodes.values(),
  ...STORY_CONTENT.events,
  QUIET_DAY_NODE,
];

function gotoTargets(choice: ScriptedChoice): string[] {
  if (typeof choice.goto === 'string') return [choice.goto];
  return choice.goto.map((g) => g.to);
}

function isResolvable(id: string): boolean {
  if (id === GOTO_DIRECTOR || id === QUIET_DAY_NODE.id) return true;
  if (STORY_CONTENT.nodes.has(id)) return true;
  return STORY_CONTENT.events.some((e) => e.id === id);
}

describe('storyGraph — 结构完整性', () => {
  it('起点节点存在', () => {
    expect(STORY_CONTENT.nodes.has(STORY_CONTENT.startNodeId)).toBe(true);
  });

  it('所有 goto 目标都可解析（无死链）', () => {
    const broken: string[] = [];
    for (const unit of ALL_UNITS) {
      for (const choice of unit.choices) {
        for (const target of gotoTargets(choice)) {
          if (!isResolvable(target)) {
            broken.push(`${unit.id} -[${choice.label}]-> ${target}`);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('非结局节点至少 1 个选项；结局节点 0 个选项', () => {
    const offenders: string[] = [];
    for (const node of STORY_CONTENT.nodes.values()) {
      const isEnding = !!node.ending;
      if (isEnding && node.choices.length > 0) offenders.push(`${node.id}: ending 但有选项`);
      if (!isEnding && node.choices.length === 0) offenders.push(`${node.id}: 无选项死胡同`);
    }
    expect(offenders).toEqual([]);
  });

  it('每个节点最多 3 个同时可见的选项（UI 约束：requires 互斥的不算）', () => {
    const offenders: string[] = [];
    for (const unit of ALL_UNITS) {
      const unconditional = unit.choices.filter((c) => !c.requires || c.requires.length === 0);
      if (unconditional.length > 3) {
        offenders.push(`${unit.id}: ${unconditional.length} 个无条件选项`);
      }
    }
    // 测试用合成内容不在此列——这里校验的是真实剧本
    expect(offenders).toEqual([]);
  });

  it('所有回到调度器的选项必须 dayPassed=true（防同日死循环）', () => {
    const offenders: string[] = [];
    for (const unit of ALL_UNITS) {
      for (const choice of unit.choices) {
        const targets = gotoTargets(choice);
        if (targets.includes(GOTO_DIRECTOR) && !choice.effects?.dayPassed) {
          offenders.push(`${unit.id} -[${choice.label}]`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('非调度器跳转构成的子图无环（场景内部链必须有限）', () => {
    // DFS 染色法找环；@director 边不算（它由"必推进一天"规则保证收敛）
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const cycle: string[] = [];

    function edgesOf(id: string): string[] {
      const unit = ALL_UNITS.find((u) => u.id === id);
      if (!unit) return [];
      return unit.choices
        .flatMap((c) => gotoTargets(c))
        .filter((t) => t !== GOTO_DIRECTOR);
    }

    function dfs(id: string): boolean {
      color.set(id, GRAY);
      for (const next of edgesOf(id)) {
        const c = color.get(next) ?? WHITE;
        if (c === GRAY) {
          cycle.push(`${id} -> ${next}`);
          return true;
        }
        if (c === WHITE && dfs(next)) return true;
      }
      color.set(id, BLACK);
      return false;
    }

    for (const unit of ALL_UNITS) {
      if ((color.get(unit.id) ?? WHITE) === WHITE) {
        dfs(unit.id);
      }
    }
    expect(cycle).toEqual([]);
  });

  it('从起点可达至少一个结局', () => {
    const queue = [STORY_CONTENT.startNodeId];
    const seen = new Set(queue);
    let endingReachable = false;
    while (queue.length > 0) {
      const id = queue.shift()!;
      const unit = ALL_UNITS.find((u) => u.id === id);
      if (!unit) continue;
      if ((unit as StoryNode).ending) {
        endingReachable = true;
        break;
      }
      const nexts = unit.choices.flatMap((c) => gotoTargets(c));
      for (const n of nexts) {
        // @director 可达所有锚点和事件卡
        const expanded =
          n === GOTO_DIRECTOR
            ? [
                ...[...STORY_CONTENT.nodes.values()]
                  .filter((x) => x.dayAnchor !== undefined)
                  .map((x) => x.id),
                ...STORY_CONTENT.events.map((x) => x.id),
                QUIET_DAY_NODE.id,
              ]
            : [n];
        for (const e of expanded) {
          if (!seen.has(e)) {
            seen.add(e);
            queue.push(e);
          }
        }
      }
    }
    expect(endingReachable).toBe(true);
  });
});

describe('storyGraph — 数值与文案约束', () => {
  it('资源增益不超过引擎 clamp 上限（防静默削减）', () => {
    const CAPS = { hp: 10, sanity: 10, food: 30, water: 30, ammo: 20 } as const;
    const offenders: string[] = [];
    for (const unit of ALL_UNITS) {
      for (const choice of unit.choices) {
        const res = choice.effects?.resources ?? {};
        for (const [key, value] of Object.entries(res)) {
          const cap = CAPS[key as keyof typeof CAPS];
          if (value !== undefined && value > cap) {
            offenders.push(`${unit.id} -[${choice.label}] ${key}+${value} > cap ${cap}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('叙事不为空且长度合理', () => {
    const offenders: string[] = [];
    for (const unit of ALL_UNITS) {
      if (unit.narrative.trim().length < 20) {
        offenders.push(`${unit.id}: 叙事过短`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('感染指令的 turnsUntilDeath 在引擎允许范围 [3,12] 内', () => {
    const offenders: string[] = [];
    for (const unit of ALL_UNITS) {
      for (const choice of unit.choices) {
        const inf = choice.effects?.infection;
        if (inf?.action === 'start' && inf.turnsUntilDeath !== undefined) {
          if (inf.turnsUntilDeath < 3 || inf.turnsUntilDeath > 12) {
            offenders.push(`${unit.id} -[${choice.label}]`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('事件卡 acts 区间合法且与卡池一致', () => {
    for (const card of STORY_CONTENT.events) {
      expect(card.acts[0]).toBeGreaterThanOrEqual(1);
      expect(card.acts[1]).toBeLessThanOrEqual(10);
      expect(card.acts[0]).toBeLessThanOrEqual(card.acts[1]);
      expect(['common', 'good', 'evil']).toContain(card.pool);
    }
  });
});
