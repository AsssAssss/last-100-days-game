import { describe, it, expect } from 'vitest';
import { buildContent, GOTO_DIRECTOR, type EventCard, type StoryNode } from '../../content/schema';
import { INITIAL_GAME_STATE, type ScriptState } from '../../domain/entities/GameState';
import { actOfDay, directNext, QUIET_DAY_NODE, resolveNode } from './StoryDirector';

function script(over: Partial<ScriptState> = {}): ScriptState {
  return { nodeId: 'n/start', humanity: 50, flags: [], seed: 7, drawnOnce: [], ...over };
}

const NODES: StoryNode[] = [
  {
    id: 'n/start',
    act: 1,
    narrative: 'start',
    choices: [{ label: 'go', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'n/anchor-d3',
    act: 1,
    dayAnchor: 3,
    narrative: 'anchor day 3',
    choices: [{ label: 'x', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'n/anchor-d5',
    act: 1,
    dayAnchor: 5,
    narrative: 'anchor day 5',
    choices: [{ label: 'x', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'n/anchor-evil',
    act: 1,
    dayAnchor: 4,
    requires: [{ kind: 'humanity', max: 35 }],
    narrative: 'evil only anchor',
    choices: [{ label: 'x', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
];

const CARDS: EventCard[] = [
  {
    id: 'evt/test-a',
    pool: 'common',
    acts: [1, 2],
    narrative: 'card a',
    choices: [{ label: 'ok', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'evt/test-once',
    pool: 'common',
    acts: [1, 1],
    once: true,
    narrative: 'once card',
    choices: [{ label: 'ok', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'evt/test-good',
    pool: 'good',
    acts: [1, 10],
    narrative: 'good only',
    choices: [{ label: 'ok', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'evt/test-evil',
    pool: 'evil',
    acts: [1, 10],
    narrative: 'evil only',
    choices: [{ label: 'ok', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
  {
    id: 'evt/test-act9',
    pool: 'common',
    acts: [9, 10],
    narrative: 'late game card',
    choices: [{ label: 'ok', goto: GOTO_DIRECTOR, effects: { dayPassed: true } }],
  },
];

const CONTENT = buildContent('n/start', [NODES], CARDS);

describe('actOfDay', () => {
  it.each([
    [1, 1],
    [10, 1],
    [11, 2],
    [50, 5],
    [91, 10],
    [100, 10],
    [150, 10],
  ])('day %i → act %i', (day, act) => {
    expect(actOfDay(day)).toBe(act);
  });
});

describe('directNext — anchors', () => {
  it('picks due anchor with the smallest dayAnchor', () => {
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, script(), 5);
    expect(pick.node.id).toBe('n/anchor-d3');
    expect(pick.anchorId).toBe('n/anchor-d3');
  });

  it('skips visited anchors', () => {
    const s = script({ flags: ['visited:n/anchor-d3'] });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 5);
    expect(pick.node.id).toBe('n/anchor-d5');
  });

  it('does not pick anchors not yet due', () => {
    const s = script({ flags: ['visited:n/anchor-d3'] });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 3);
    // d5 未到期、evil 锚点 humanity 不满足 → 抽卡
    expect(pick.node.id).toMatch(/^evt\//);
  });

  it('respects anchor requires (evil gate)', () => {
    const flags = ['visited:n/anchor-d3'];
    const neutral = directNext(CONTENT, INITIAL_GAME_STATE, script({ flags }), 4);
    expect(neutral.node.id).toMatch(/^evt\//); // 中立玩家进不了恶人锚点
    const evil = directNext(
      CONTENT,
      INITIAL_GAME_STATE,
      script({ flags, humanity: 20 }),
      4
    );
    expect(evil.node.id).toBe('n/anchor-evil');
  });
});

describe('directNext — event cards', () => {
  const VISITED_ALL = [
    'visited:n/anchor-d3',
    'visited:n/anchor-d5',
    'visited:n/anchor-evil',
  ];

  it('draws only act-eligible, pool-eligible cards', () => {
    const s = script({ flags: VISITED_ALL });
    for (let i = 0; i < 20; i++) {
      const pick = directNext(CONTENT, INITIAL_GAME_STATE, { ...s, seed: i }, 12); // act 2
      expect(pick.node.id).toBe('evt/test-a'); // 其他卡：act1 only / good / evil / act9
    }
  });

  it('good pool requires humanity >= 65, evil pool <= 35', () => {
    const s = script({ flags: VISITED_ALL, humanity: 80 });
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(directNext(CONTENT, INITIAL_GAME_STATE, { ...s, seed: i }, 15).node.id);
    }
    expect(ids.has('evt/test-good')).toBe(true);
    expect(ids.has('evt/test-evil')).toBe(false);
  });

  it('excludes once cards already drawn', () => {
    const s = script({ flags: VISITED_ALL, drawnOnce: ['evt/test-once'] });
    for (let i = 0; i < 30; i++) {
      const pick = directNext(CONTENT, INITIAL_GAME_STATE, { ...s, seed: i }, 6); // act 1
      expect(pick.node.id).not.toBe('evt/test-once');
    }
  });

  it('reports drawnOnceId when a once card is picked', () => {
    const s = script({ flags: VISITED_ALL });
    let found = false;
    for (let i = 0; i < 60 && !found; i++) {
      const pick = directNext(CONTENT, INITIAL_GAME_STATE, { ...s, seed: i }, 6);
      if (pick.node.id === 'evt/test-once') {
        expect(pick.drawnOnceId).toBe('evt/test-once');
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('falls back to quiet day when no anchor and no card eligible', () => {
    // act 5（day 45）：没有任何锚点/卡符合
    const s = script({ flags: VISITED_ALL });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 45);
    expect(pick.node.id).toBe(QUIET_DAY_NODE.id);
  });
});

describe('directNext — 昼夜节奏', () => {
  const VISITED_ALL = [
    'visited:n/anchor-d3',
    'visited:n/anchor-d5',
    'visited:n/anchor-evil',
  ];

  it('白天回合数达到 DAY_TURN_LIMIT 时强制给黄昏节点', () => {
    const s = script({ phase: 'day', turnsInPhase: 15 });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 2);
    expect(pick.node.id).toMatch(/^night\/dusk-/);
  });

  it('白天回合未满时不给黄昏（正常给锚点）', () => {
    const s = script({ phase: 'day', turnsInPhase: 14 });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 5);
    expect(pick.node.id).toBe('n/anchor-d3');
  });

  it('夜晚回合数达到 NIGHT_TURN_LIMIT 时强制天亮', () => {
    const s = script({ phase: 'night', turnsInPhase: 10, flags: VISITED_ALL });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 2);
    expect(pick.node.id).toMatch(/^night\/dawn-/);
  });

  it('夜晚不触发主线锚点、只抽 night 卡；卡池无 night 卡时兜底无事的夜', () => {
    // 合成内容里没有 time:night 卡 → night/quiet
    const s = script({ phase: 'night', turnsInPhase: 0 });
    const pick = directNext(CONTENT, INITIAL_GAME_STATE, s, 5); // 锚点 d3 到期但不应触发
    expect(pick.node.id).toBe('night/quiet');
  });

  it('夜晚抽到 time=night 的卡', () => {
    const nightCard: EventCard = {
      id: 'evt/n-test',
      pool: 'common',
      time: 'night',
      acts: [1, 10],
      narrative: '夜测试',
      choices: [{ label: 'x', goto: GOTO_DIRECTOR }],
    };
    const content = buildContent('n/start', [NODES], [...CARDS, nightCard]);
    const s = script({ phase: 'night', turnsInPhase: 3 });
    const pick = directNext(content, INITIAL_GAME_STATE, s, 5);
    expect(pick.node.id).toBe('evt/n-test');
  });

  it('白天不抽 night 卡', () => {
    const nightOnly = buildContent('n/start', [NODES], [
      {
        id: 'evt/n-only',
        pool: 'common',
        time: 'night',
        acts: [1, 10],
        narrative: '夜专属',
        choices: [{ label: 'x', goto: GOTO_DIRECTOR }],
      },
    ]);
    const s = script({ phase: 'day', turnsInPhase: 0, flags: VISITED_ALL });
    const pick = directNext(nightOnly, INITIAL_GAME_STATE, s, 6);
    expect(pick.node.id).toBe('@quiet-day');
  });
});

describe('resolveNode', () => {
  it('resolves builtin quiet day', () => {
    expect(resolveNode(CONTENT, QUIET_DAY_NODE.id).id).toBe(QUIET_DAY_NODE.id);
  });
  it('resolves story nodes and event cards', () => {
    expect(resolveNode(CONTENT, 'n/start').id).toBe('n/start');
    expect(resolveNode(CONTENT, 'evt/test-a').id).toBe('evt/test-a');
  });
  it('throws on unknown id', () => {
    expect(() => resolveNode(CONTENT, 'nope/nothing')).toThrow(/not found/);
  });
});
