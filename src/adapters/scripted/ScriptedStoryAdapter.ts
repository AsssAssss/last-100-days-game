import type {
  CompressMemoryRequest,
  ILLMPort,
  TurnRequest,
} from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import type { RawTurnPatch } from '../../domain/rules/PatchValidation';
import {
  HUMANITY_INITIAL,
  HUMANITY_MAX,
  HUMANITY_MIN,
  type GameState,
  type ScriptState,
} from '../../domain/entities/GameState';
import {
  GOTO_DIRECTOR,
  type Effects,
  type EventCard,
  type ScriptedChoice,
  type StoryContent,
  type StoryNode,
} from '../../content/schema';
import { evalConditions } from './conditions';
import { directNext, resolveNode } from './StoryDirector';
import { pickWeighted } from './rng';

const FEATURE = 'ScriptedStoryAdapter';

/** 每个 dayPassed 回合自动扣除的生存消耗（叠加在内容作者声明的 effects 之上）。 */
export const DAILY_FOOD_UPKEEP = 1;
export const DAILY_WATER_UPKEEP = 1;

/** 系统注入选项：白天事件卡上随时可收工过夜。 */
export const SYSTEM_REST_LABEL = '🌙 收工，找地方过夜';
/** 系统注入选项：夜晚事件卡上随时可结束冒险睡觉。 */
export const SYSTEM_SLEEP_LABEL = '🛌 不再冒险，睡到天亮';

const SYSTEM_REST_CHOICE: ScriptedChoice = {
  label: SYSTEM_REST_LABEL,
  goto: [
    { to: 'night/dusk-1', weight: 1 },
    { to: 'night/dusk-2', weight: 1 },
    { to: 'night/dusk-3', weight: 1 },
  ],
};

const SYSTEM_SLEEP_CHOICE: ScriptedChoice = {
  label: SYSTEM_SLEEP_LABEL,
  effects: {
    resources: { hp: 2, sanity: 3 },
    dayPassed: true,
    memoryNote: '夜半收手，睡到天亮',
  },
  goto: GOTO_DIRECTOR,
};

export interface ScriptedAdapterDeps {
  /** 新开局的随机种子来源；测试注入固定值。 */
  readonly newSeed?: () => number;
}

function clampHumanity(value: number): number {
  return Math.max(HUMANITY_MIN, Math.min(HUMANITY_MAX, value));
}

function visitedFlag(nodeId: string): string {
  return `visited:${nodeId}`;
}

/** 是否在该节点上注入系统时段选项（只在事件卡上注入，不打断主线场景与过场节点）。 */
function systemChoiceFor(nodeId: string, phase: 'day' | 'night'): ScriptedChoice | null {
  if (!nodeId.startsWith('evt/')) return null;
  return phase === 'night' ? SYSTEM_SLEEP_CHOICE : SYSTEM_REST_CHOICE;
}

/**
 * 固定剧本引擎——实现 ILLMPort，零网络、零 token。
 * 剧情进度（nodeId/humanity/flags/seed/drawnOnce/phase/turnsInPhase）放在
 * GameState.script，经 statePatch.scriptPatch 整体替换写回。
 *
 * 昼夜节奏：白天最多 DAY_TURN_LIMIT 个行动回合（满了强制黄昏抉择），
 * 夜晚最多 NIGHT_TURN_LIMIT 个（满了强制天亮）；
 * 事件卡上始终注入"收工过夜 / 睡到天亮"系统选项。
 */
export class ScriptedStoryAdapter implements ILLMPort {
  private readonly content: StoryContent;
  private readonly logger: ILogger;
  private readonly newSeed: () => number;

  constructor(content: StoryContent, logger: ILogger, deps: ScriptedAdapterDeps = {}) {
    this.content = content;
    this.logger = logger;
    this.newSeed = deps.newSeed ?? (() => Math.floor(Math.random() * 0x7fffffff));
  }

  async nextTurn(request: TurnRequest): Promise<RawTurnPatch> {
    const { state, playerInput, requestID } = request;

    this.logger.debug({
      requestID,
      feature: FEATURE,
      action: 'turn_start',
      req: {
        day: state.day,
        nodeId: state.script?.nodeId,
        phase: state.script?.phase ?? 'day',
        turnsInPhase: state.script?.turnsInPhase ?? 0,
        playerInput,
      },
    });

    if (!state.script || playerInput === null) {
      return this.openingTurn(state, requestID);
    }
    return this.choiceTurn(state, state.script, playerInput, requestID);
  }

  /** 开场（或读档后异常的兜底重展示）：呈现当前节点，不应用任何效果。 */
  private openingTurn(state: GameState, requestID: string): RawTurnPatch {
    const script: ScriptState = state.script ?? {
      nodeId: this.content.startNodeId,
      humanity: HUMANITY_INITIAL,
      flags: [visitedFlag(this.content.startNodeId)],
      seed: this.newSeed(),
      drawnOnce: [],
      phase: 'day',
      turnsInPhase: 0,
    };
    const node = resolveNode(this.content, script.nodeId);
    this.logger.debug({
      requestID,
      feature: FEATURE,
      action: 'opening',
      resp: { nodeId: node.id },
    });
    return this.present(node, state, script, {}, /*应用效果*/ false);
  }

  /** 玩家选择回合：应用所选选项的效果，跳到目标节点并呈现。 */
  private choiceTurn(
    state: GameState,
    script: ScriptState,
    playerInput: string,
    requestID: string
  ): RawTurnPatch {
    const current = resolveNode(this.content, script.nodeId);
    const phaseNow: 'day' | 'night' = script.phase ?? 'day';

    let choice = current.choices.find(
      (c) => c.label === playerInput && evalConditions(c.requires, state, script)
    );
    if (!choice) {
      const system = systemChoiceFor(current.id, phaseNow);
      if (system && system.label === playerInput) {
        choice = system;
      }
    }

    if (!choice) {
      // UI 与存档不同步的极端情况：重新呈现当前节点而不是崩溃
      this.logger.warn({
        requestID,
        feature: FEATURE,
        action: 'choice_not_found',
        req: { nodeId: current.id, playerInput },
      });
      return this.present(current, state, script, {}, false);
    }

    const effects = choice.effects ?? {};

    // 时段与回合计数：每个行动消耗 1 回合；dayPassed 回到第二天白天；setPhase 切时段
    let phase: 'day' | 'night' = phaseNow;
    let turnsInPhase = (script.turnsInPhase ?? 0) + 1;
    if (effects.dayPassed) {
      phase = 'day';
      turnsInPhase = 0;
    } else if (effects.setPhase) {
      phase = effects.setPhase;
      turnsInPhase = 0;
    }

    // 解析跳转（可能消耗随机数）
    let seed = script.seed;
    let targetId: string;
    if (typeof choice.goto === 'string') {
      targetId = choice.goto;
    } else {
      const { picked, nextSeed } = pickWeighted(choice.goto, (g) => g.weight, seed);
      seed = nextSeed;
      targetId = picked.to;
    }

    // 中间剧本状态（director 需要看到本回合的 humanity/flags/时段变化）
    let flags = applyFlagChanges(script.flags, effects);
    let drawnOnce = script.drawnOnce;
    const humanity = clampHumanity(script.humanity + (effects.humanityDelta ?? 0));

    let target: StoryNode | EventCard;
    if (targetId === GOTO_DIRECTOR) {
      const effectiveDay = state.day + (effects.dayPassed ? 1 : 0);
      const interim: ScriptState = {
        nodeId: current.id,
        humanity,
        flags,
        seed,
        drawnOnce,
        phase,
        turnsInPhase,
      };
      const pick = directNext(this.content, state, interim, effectiveDay);
      target = pick.node;
      seed = pick.nextSeed;
      if (pick.drawnOnceId) drawnOnce = [...drawnOnce, pick.drawnOnceId];
      if (pick.anchorId) flags = [...flags, visitedFlag(pick.anchorId)];
    } else {
      target = resolveNode(this.content, targetId);
      if ((target as StoryNode).dayAnchor !== undefined && !flags.includes(visitedFlag(target.id))) {
        flags = [...flags, visitedFlag(target.id)];
      }
    }

    const nextScript: ScriptState = {
      nodeId: target.id,
      humanity,
      flags,
      seed,
      drawnOnce,
      phase,
      turnsInPhase,
    };

    this.logger.debug({
      requestID,
      feature: FEATURE,
      action: 'choice_resolved',
      resp: {
        from: current.id,
        choice: choice.label,
        to: target.id,
        humanity,
        phase,
        turnsInPhase,
        dayPassed: !!effects.dayPassed,
      },
    });

    return this.present(target, state, nextScript, effects, true);
  }

  /** 把目标节点 + 本回合效果打包成 RawTurnPatch。 */
  private present(
    node: StoryNode | EventCard,
    state: GameState,
    script: ScriptState,
    effects: Effects,
    applyEffects: boolean
  ): RawTurnPatch {
    const ending = (node as StoryNode).ending;
    const resources: Record<string, number> = applyEffects
      ? { ...(effects.resources ?? {}) }
      : {};
    if (applyEffects && effects.dayPassed) {
      resources.food = (resources.food ?? 0) - DAILY_FOOD_UPKEEP;
      resources.water = (resources.water ?? 0) - DAILY_WATER_UPKEEP;
    }

    let choices: string[] = [];
    if (!ending) {
      choices = visibleChoices(node.choices, state, script).map((c) => c.label);
      const system = systemChoiceFor(node.id, script.phase ?? 'day');
      if (system) choices.push(system.label);
    }

    return {
      narrative: node.narrative,
      choices,
      statePatch: {
        resources,
        inventoryAdd: applyEffects ? [...(effects.addItems ?? [])] : [],
        inventoryRemove: applyEffects ? [...(effects.removeItems ?? [])] : [],
        memoryNote: (applyEffects ? effects.memoryNote : undefined) ?? '',
        isGameOver: !!ending,
        gameOverReason: ending?.reason,
        dayPassed: applyEffects ? !!effects.dayPassed : false,
        infection:
          applyEffects && effects.infection
            ? {
                action: effects.infection.action,
                cause: effects.infection.cause,
                turnsUntilDeath: effects.infection.turnsUntilDeath,
              }
            : undefined,
        scriptPatch: script,
      },
    };
  }

  /** 固定剧本不需要记忆压缩；返回固定占位，引擎照常工作。 */
  async compressMemory(request: CompressMemoryRequest): Promise<string> {
    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'compress_noop',
      req: { count: request.notesToCompress.length },
    });
    const days = request.notesToCompress;
    const first = days[0]?.day ?? 0;
    const last = days[days.length - 1]?.day ?? 0;
    return `Day ${first}-${last}：${days.map((d) => d.note).join('；')}`;
  }
}

function applyFlagChanges(
  flags: readonly string[],
  effects: Effects
): readonly string[] {
  let result = flags;
  if (effects.setFlags && effects.setFlags.length > 0) {
    result = [...new Set([...result, ...effects.setFlags])];
  }
  if (effects.clearFlags && effects.clearFlags.length > 0) {
    result = result.filter((f) => !effects.clearFlags!.includes(f));
  }
  return result;
}

function visibleChoices(
  choices: readonly ScriptedChoice[],
  state: GameState,
  script: ScriptState
): readonly ScriptedChoice[] {
  return choices.filter((c) => evalConditions(c.requires, state, script));
}
