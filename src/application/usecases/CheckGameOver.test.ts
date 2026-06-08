import { describe, it, expect } from 'vitest';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { checkGameOver } from './CheckGameOver';

describe('checkGameOver', () => {
  it('returns false when state.isGameOver is false', () => {
    expect(checkGameOver(INITIAL_GAME_STATE)).toBe(false);
  });

  it('returns true when state.isGameOver is true', () => {
    expect(checkGameOver({ ...INITIAL_GAME_STATE, isGameOver: true })).toBe(true);
  });
});
