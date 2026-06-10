import type { Condition } from '../../content/schema';
import type { GameState, ScriptState } from '../../domain/entities/GameState';

/** 求值单个条件。 */
export function evalCondition(
  cond: Condition,
  state: GameState,
  script: ScriptState
): boolean {
  switch (cond.kind) {
    case 'humanity': {
      if (cond.min !== undefined && script.humanity < cond.min) return false;
      if (cond.max !== undefined && script.humanity > cond.max) return false;
      return true;
    }
    case 'flag':
      return script.flags.includes(cond.flag) === cond.present;
    case 'item':
      return state.inventory.includes(cond.item) === cond.present;
    case 'resource':
      return state.resources[cond.resource] >= cond.min;
  }
}

/** 全部条件满足（无条件 = 满足）。 */
export function evalConditions(
  conds: readonly Condition[] | undefined,
  state: GameState,
  script: ScriptState
): boolean {
  if (!conds || conds.length === 0) return true;
  return conds.every((c) => evalCondition(c, state, script));
}
