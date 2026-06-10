import { describe, it, expect, vi } from 'vitest';
import { buildContent, GOTO_DIRECTOR, type EventCard, type StoryNode } from '../../content/schema';
import {
  HUMANITY_INITIAL,
  INITIAL_GAME_STATE,
  type GameState,
  type ScriptState,
} from '../../domain/entities/GameState';
import type { ILogger } from '../../application/ports/ILogger';
import {
  DAILY_FOOD_UPKEEP,
  DAILY_WATER_UPKEEP,
  SYSTEM_REST_LABEL,
  SYSTEM_SLEEP_LABEL,
  ScriptedStoryAdapter,
} from './ScriptedStoryAdapter';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const NODES: StoryNode[] = [
  {
    id: 't/start',
    act: 1,
    dayAnchor: 1,
    narrative: '开场场景。',
    choices: [
      {
        label: '搜刮',
        effects: { resources: { food: 3 }, memoryNote: '搜刮了一把' },
        goto: 't/next',
      },
      {
        label: '休息一天',
        effects: { dayPassed: true },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '行善',
        effects: { humanityDelta: 10, setFlags: ['did-good'] },
        goto: 't/next',
      },
      {
        label: '作恶到底',
        effects: { humanityDelta: -200 },
        goto: 't/next',
      },
      {
        label: '冒险一搏',
        goto: [
          { to: 't/next', weight: 50 },
          { to: 't/dead', weight: 50 },
        ],
      },
      {
        label: '需要弹药的选项',
        requires: [{ kind: 'resource', resource: 'ammo', min: 99 }],
        goto: 't/next',
      },
      {
        label: '感染我',
        effects: { infection: { action: 'start', cause: '测试咬伤', turnsUntilDeath: 6 } },
        goto: 't/next',
      },
    ],
  },
  {
    id: 't/next',
    act: 1,
    narrative: '下一个场景。',
    choices: [{ label: '过一天', effects: { dayPassed: true }, goto: GOTO_DIRECTOR }],
  },
  {
    id: 't/anchor-d2',
    act: 1,
    dayAnchor: 2,
    narrative: '第二天的主线。',
    choices: [{ label: 'x', effects: { dayPassed: true }, goto: GOTO_DIRECTOR }],
  },
  {
    id: 't/dead',
    act: 1,
    narrative: '你死了。',
    choices: [],
    ending: { reason: '测试死亡' },
  },
];

const CARDS: EventCard[] = [
  {
    id: 'evt/t-card',
    pool: 'common',
    acts: [1, 10],
    narrative: '一张事件卡。',
    choices: [{ label: '好的', effects: { dayPassed: true }, goto: GOTO_DIRECTOR }],
  },
];

const CONTENT = buildContent('t/start', [NODES], CARDS);

function makeAdapter(seed = 42) {
  return new ScriptedStoryAdapter(CONTENT, makeLogger(), { newSeed: () => seed });
}

function stateWithScript(over: Partial<ScriptState> = {}, base: GameState = INITIAL_GAME_STATE): GameState {
  return {
    ...base,
    script: {
      nodeId: 't/start',
      humanity: HUMANITY_INITIAL,
      flags: ['visited:t/start'],
      seed: 42,
      drawnOnce: [],
      ...over,
    },
  };
}

async function turn(adapter: ScriptedStoryAdapter, state: GameState, input: string | null) {
  return adapter.nextTurn({ state, playerInput: input, requestID: 'rid' });
}

describe('ScriptedStoryAdapter — opening', () => {
  it('initializes script and presents the start node', async () => {
    const patch = await turn(makeAdapter(), INITIAL_GAME_STATE, null);
    expect(patch.narrative).toBe('开场场景。');
    expect(patch.statePatch.scriptPatch?.nodeId).toBe('t/start');
    expect(patch.statePatch.scriptPatch?.humanity).toBe(HUMANITY_INITIAL);
    expect(patch.statePatch.scriptPatch?.seed).toBe(42);
    expect(patch.statePatch.dayPassed).toBe(false);
    expect(patch.statePatch.isGameOver).toBe(false);
  });

  it('hides choices whose requires are not met', async () => {
    const patch = await turn(makeAdapter(), INITIAL_GAME_STATE, null);
    expect(patch.choices).not.toContain('需要弹药的选项');
    expect(patch.choices).toContain('搜刮');
  });

  it('re-presents current node when playerInput is null but script exists', async () => {
    const state = stateWithScript({ nodeId: 't/next' });
    const patch = await turn(makeAdapter(), state, null);
    expect(patch.narrative).toBe('下一个场景。');
    expect(patch.statePatch.resources).toEqual({});
  });
});

describe('ScriptedStoryAdapter — choices', () => {
  it('applies effects and moves to the goto target', async () => {
    const patch = await turn(makeAdapter(), stateWithScript(), '搜刮');
    expect(patch.narrative).toBe('下一个场景。');
    expect(patch.statePatch.resources).toEqual({ food: 3 });
    expect(patch.statePatch.memoryNote).toBe('搜刮了一把');
    expect(patch.statePatch.scriptPatch?.nodeId).toBe('t/next');
  });

  it('adds daily upkeep on dayPassed choices', async () => {
    const patch = await turn(makeAdapter(), stateWithScript(), '休息一天');
    expect(patch.statePatch.dayPassed).toBe(true);
    expect(patch.statePatch.resources.food).toBe(-DAILY_FOOD_UPKEEP);
    expect(patch.statePatch.resources.water).toBe(-DAILY_WATER_UPKEEP);
  });

  it('accumulates humanity and flags', async () => {
    const patch = await turn(makeAdapter(), stateWithScript(), '行善');
    expect(patch.statePatch.scriptPatch?.humanity).toBe(HUMANITY_INITIAL + 10);
    expect(patch.statePatch.scriptPatch?.flags).toContain('did-good');
  });

  it('clamps humanity to [0, 100]', async () => {
    const patch = await turn(makeAdapter(), stateWithScript(), '作恶到底');
    expect(patch.statePatch.scriptPatch?.humanity).toBe(0);
  });

  it('resolves weighted goto deterministically per seed', async () => {
    const a = await turn(makeAdapter(), stateWithScript({ seed: 1 }), '冒险一搏');
    const b = await turn(makeAdapter(), stateWithScript({ seed: 1 }), '冒险一搏');
    expect(a.narrative).toBe(b.narrative);
    expect(a.statePatch.scriptPatch?.seed).toBe(b.statePatch.scriptPatch?.seed);
    expect(a.statePatch.scriptPatch?.seed).not.toBe(1); // 消耗了随机数
  });

  it('maps infection effects through', async () => {
    const patch = await turn(makeAdapter(), stateWithScript(), '感染我');
    expect(patch.statePatch.infection).toEqual({
      action: 'start',
      cause: '测试咬伤',
      turnsUntilDeath: 6,
    });
  });

  it('reaches ending node with isGameOver and empty choices', async () => {
    // 找一个必死的 seed
    for (let seed = 0; seed < 50; seed++) {
      const patch = await turn(makeAdapter(), stateWithScript({ seed }), '冒险一搏');
      if (patch.statePatch.isGameOver) {
        expect(patch.narrative).toBe('你死了。');
        expect(patch.statePatch.gameOverReason).toBe('测试死亡');
        expect(patch.choices).toEqual([]);
        return;
      }
    }
    throw new Error('50 个种子里居然没死过一次——weighted goto 可能坏了');
  });

  it('re-presents current node on unknown choice label', async () => {
    const logger = makeLogger();
    const adapter = new ScriptedStoryAdapter(CONTENT, logger, { newSeed: () => 1 });
    const patch = await turn(adapter, stateWithScript(), '不存在的选项');
    expect(patch.narrative).toBe('开场场景。');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('treats requires-failing choice as not found', async () => {
    const patch = await turn(makeAdapter(), stateWithScript(), '需要弹药的选项');
    expect(patch.narrative).toBe('开场场景。'); // 弹药不足，留在原地
  });
});

describe('ScriptedStoryAdapter — director integration', () => {
  it('routes @director to a due anchor and marks it visited', async () => {
    // day 1 + dayPassed → effectiveDay 2 → t/anchor-d2 到期
    const patch = await turn(makeAdapter(), stateWithScript(), '休息一天');
    expect(patch.statePatch.scriptPatch?.nodeId).toBe('t/anchor-d2');
    expect(patch.statePatch.scriptPatch?.flags).toContain('visited:t/anchor-d2');
  });

  it('draws an event card when no anchor is due', async () => {
    const state = {
      ...stateWithScript({
        nodeId: 't/next',
        flags: ['visited:t/start', 'visited:t/anchor-d2'],
      }),
      day: 3,
    };
    const patch = await turn(makeAdapter(), state, '过一天');
    expect(patch.statePatch.scriptPatch?.nodeId).toBe('evt/t-card');
  });

  it('marks anchor visited when jumped to directly (non-director goto)', async () => {
    const directContent = buildContent(
      't/direct',
      [
        [
          {
            id: 't/direct',
            act: 1,
            narrative: 'x',
            choices: [{ label: 'go', goto: 't/anchor-d2' }],
          },
          ...NODES.filter((n) => n.id !== 't/start'),
        ],
      ],
      []
    );
    const adapter = new ScriptedStoryAdapter(directContent, makeLogger(), { newSeed: () => 1 });
    const state = stateWithScript({ nodeId: 't/direct', flags: [] });
    const patch = await turn(adapter, state, 'go');
    expect(patch.statePatch.scriptPatch?.flags).toContain('visited:t/anchor-d2');
  });
});

describe('ScriptedStoryAdapter — 昼夜与系统选项', () => {
  const DAY_CARD: EventCard = {
    id: 'evt/t-day-card',
    pool: 'common',
    acts: [1, 10],
    narrative: '白天的卡。',
    choices: [{ label: '继续', goto: GOTO_DIRECTOR }],
  };
  const NIGHT_CARD: EventCard = {
    id: 'evt/t-night-card',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative: '夜里的卡。',
    choices: [{ label: '硬闯', goto: GOTO_DIRECTOR }],
  };
  const PHASE_CONTENT = buildContent('t/start', [NODES], [DAY_CARD, NIGHT_CARD]);

  function phaseAdapter(seed = 9) {
    return new ScriptedStoryAdapter(PHASE_CONTENT, makeLogger(), { newSeed: () => seed });
  }

  it('每个行动回合递增 turnsInPhase', async () => {
    const patch = await turn(phaseAdapter(), stateWithScript({ turnsInPhase: 4 }), '搜刮');
    expect(patch.statePatch.scriptPatch?.turnsInPhase).toBe(5);
    expect(patch.statePatch.scriptPatch?.phase).toBe('day');
  });

  it('dayPassed 重置回合并回到白天', async () => {
    const patch = await turn(
      phaseAdapter(),
      stateWithScript({ phase: 'night', turnsInPhase: 7 }),
      '休息一天'
    );
    expect(patch.statePatch.scriptPatch?.phase).toBe('day');
    expect(patch.statePatch.scriptPatch?.turnsInPhase).toBe(0);
  });

  it('白天回合耗尽后回调度器得到黄昏节点', async () => {
    const state = stateWithScript({ nodeId: 'evt/t-day-card', turnsInPhase: 14 });
    const patch = await turn(phaseAdapter(), state, '继续');
    expect(patch.statePatch.scriptPatch?.nodeId).toMatch(/^night\/dusk-/);
    // 黄昏节点提供休整/夜行两个选项
    expect(patch.choices.length).toBe(2);
  });

  it('白天事件卡注入"收工过夜"系统选项，且可被选择', async () => {
    const state = stateWithScript({ nodeId: 't/next', turnsInPhase: 1 });
    // t/next 的"过一天"goto director；day=1 锚点 d2 到期……为避免锚点干扰直接呈现卡
    const opening = await turn(phaseAdapter(), { ...stateWithScript({ nodeId: 'evt/t-day-card' }) }, null);
    expect(opening.choices).toContain(SYSTEM_REST_LABEL);

    const rest = await turn(
      phaseAdapter(),
      stateWithScript({ nodeId: 'evt/t-day-card', turnsInPhase: 2 }),
      SYSTEM_REST_LABEL
    );
    expect(rest.statePatch.scriptPatch?.nodeId).toMatch(/^night\/dusk-/);
    void state;
  });

  it('主线节点不注入系统选项', async () => {
    const opening = await turn(phaseAdapter(), stateWithScript(), null);
    expect(opening.choices).not.toContain(SYSTEM_REST_LABEL);
    expect(opening.choices).not.toContain(SYSTEM_SLEEP_LABEL);
  });

  it('夜晚事件卡注入"睡到天亮"，选择后回到第二天白天', async () => {
    const opening = await turn(
      phaseAdapter(),
      { ...stateWithScript({ nodeId: 'evt/t-night-card', phase: 'night', turnsInPhase: 3 }) },
      null
    );
    expect(opening.choices).toContain(SYSTEM_SLEEP_LABEL);

    const sleep = await turn(
      phaseAdapter(),
      stateWithScript({ nodeId: 'evt/t-night-card', phase: 'night', turnsInPhase: 3 }),
      SYSTEM_SLEEP_LABEL
    );
    expect(sleep.statePatch.dayPassed).toBe(true);
    expect(sleep.statePatch.scriptPatch?.phase).toBe('day');
    expect(sleep.statePatch.scriptPatch?.turnsInPhase).toBe(0);
  });

  it('黄昏节点选择"夜行"进入夜晚（setPhase）并重置回合', async () => {
    // 直接站上 dusk-1 选夜行
    const dusk = await turn(
      phaseAdapter(),
      stateWithScript({ nodeId: 'night/dusk-1', turnsInPhase: 15 }),
      '黑夜是另一张地图——今晚出去行动'
    );
    expect(dusk.statePatch.scriptPatch?.phase).toBe('night');
    expect(dusk.statePatch.scriptPatch?.turnsInPhase).toBe(0);
    // 夜晚第一回合：抽到夜卡
    expect(dusk.statePatch.scriptPatch?.nodeId).toBe('evt/t-night-card');
  });

  it('夜晚回合耗尽后强制黎明，黎明唯一出口回到白天', async () => {
    const patch = await turn(
      phaseAdapter(),
      stateWithScript({ nodeId: 'evt/t-night-card', phase: 'night', turnsInPhase: 9 }),
      '硬闯'
    );
    expect(patch.statePatch.scriptPatch?.nodeId).toMatch(/^night\/dawn-/);
  });
});

describe('ScriptedStoryAdapter — compressMemory', () => {
  it('joins notes into a local summary without any network', async () => {
    const summary = await makeAdapter().compressMemory({
      notesToCompress: [
        { day: 1, note: '出逃' },
        { day: 2, note: '遇狗' },
      ],
      priorSummaries: [],
      requestID: 'rid',
    });
    expect(summary).toBe('Day 1-2：出逃；遇狗');
  });

  it('handles empty notes', async () => {
    const summary = await makeAdapter().compressMemory({
      notesToCompress: [],
      priorSummaries: [],
      requestID: 'rid',
    });
    expect(summary).toBe('Day 0-0：');
  });
});
