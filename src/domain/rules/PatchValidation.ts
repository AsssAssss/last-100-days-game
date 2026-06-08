import type { TurnEvent } from '../entities/Event';
import type { ResourceDelta } from '../entities/Resources';

/**
 * LLM 回合输出的领域形态。
 * adapter 层负责把外部 SDK 的输出映射成这个形态后传入校验。
 */
export interface RawTurnPatch {
  readonly narrative: string;
  readonly choices: readonly string[];
  readonly statePatch: {
    readonly resources: Partial<{
      readonly hp: number;
      readonly sanity: number;
      readonly food: number;
      readonly water: number;
      readonly ammo: number;
    }>;
    readonly inventoryAdd: readonly string[];
    readonly inventoryRemove: readonly string[];
    readonly memoryNote: string;
    readonly isGameOver: boolean;
    readonly gameOverReason?: string;
    readonly dayPassed: boolean;
  };
}

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly event: TurnEvent;
  readonly issues: readonly ValidationIssue[];
}

const HP_GAIN_CAP = 10;
const SANITY_GAIN_CAP = 10;
const RESOURCE_GAIN_CAP = 30;
const AMMO_GAIN_CAP = 20;

/**
 * 强信号——叙事里出现这些表达就意味着至少跨过了一天的边界。
 * 引擎会在 dayPassed=false 时强制改成 true，保证 UI 计数和叙事不脱节。
 * 故意只收"明确跨日"的词，避免误伤"清晨的薄雾"这种当下氛围。
 */
const DAY_TRANSITION_PATTERNS: readonly RegExp[] = [
  /第[二三四五六七八九十百]+天/,
  /次日|翌日/,
  /你醒来|你睡醒|你从.{0,8}醒来|一觉醒来/,
  /一夜过去|一夜之后|熬过.{0,4}一夜|挨过.{0,4}一夜/,
  /几天[过后之]/,
  /\b第\s*\d+\s*天\b/,
];

export function narrativeImpliesDayPassed(narrative: string): boolean {
  return DAY_TRANSITION_PATTERNS.some((p) => p.test(narrative));
}

/**
 * 校验 LLM 返回的 patch，并裁剪到合法范围。
 * 不抛错：违规字段会被裁剪并附加到 issues 中以供日志记录。
 */
export function validateAndClamp(raw: RawTurnPatch): ValidationResult {
  const issues: ValidationIssue[] = [];
  const resources: ResourceDelta = {};
  const src = raw.statePatch.resources;

  if (src.hp !== undefined) {
    if (src.hp > HP_GAIN_CAP) {
      issues.push({ field: 'resources.hp', message: `hp gain ${src.hp} exceeds cap ${HP_GAIN_CAP}` });
      resources.hp = HP_GAIN_CAP;
    } else {
      resources.hp = src.hp;
    }
  }

  if (src.sanity !== undefined) {
    if (src.sanity > SANITY_GAIN_CAP) {
      issues.push({
        field: 'resources.sanity',
        message: `sanity gain ${src.sanity} exceeds cap ${SANITY_GAIN_CAP}`,
      });
      resources.sanity = SANITY_GAIN_CAP;
    } else {
      resources.sanity = src.sanity;
    }
  }

  if (src.food !== undefined) {
    if (src.food > RESOURCE_GAIN_CAP) {
      issues.push({
        field: 'resources.food',
        message: `food gain ${src.food} exceeds cap ${RESOURCE_GAIN_CAP}`,
      });
      resources.food = RESOURCE_GAIN_CAP;
    } else {
      resources.food = src.food;
    }
  }

  if (src.water !== undefined) {
    if (src.water > RESOURCE_GAIN_CAP) {
      issues.push({
        field: 'resources.water',
        message: `water gain ${src.water} exceeds cap ${RESOURCE_GAIN_CAP}`,
      });
      resources.water = RESOURCE_GAIN_CAP;
    } else {
      resources.water = src.water;
    }
  }

  if (src.ammo !== undefined) {
    if (src.ammo > AMMO_GAIN_CAP) {
      issues.push({
        field: 'resources.ammo',
        message: `ammo gain ${src.ammo} exceeds cap ${AMMO_GAIN_CAP}`,
      });
      resources.ammo = AMMO_GAIN_CAP;
    } else {
      resources.ammo = src.ammo;
    }
  }

  let dayPassed = raw.statePatch.dayPassed;
  if (!dayPassed && narrativeImpliesDayPassed(raw.narrative)) {
    issues.push({
      field: 'statePatch.dayPassed',
      message: 'narrative implies a day transition but dayPassed=false; coerced to true',
    });
    dayPassed = true;
  }

  const event: TurnEvent = {
    narrative: raw.narrative,
    choices: raw.choices,
    resourceDelta: resources,
    inventoryAdd: raw.statePatch.inventoryAdd,
    inventoryRemove: raw.statePatch.inventoryRemove,
    memoryNote: raw.statePatch.memoryNote,
    isGameOver: raw.statePatch.isGameOver,
    gameOverReason: raw.statePatch.gameOverReason,
    dayPassed,
  };

  return { event, issues };
}
