import type { GameState } from '../../domain/entities/GameState';

/** 判断游戏是否结束。无状态副作用，纯函数。 */
export function checkGameOver(state: GameState): boolean {
  return state.isGameOver;
}
