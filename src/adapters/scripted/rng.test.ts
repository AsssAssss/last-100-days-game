import { describe, it, expect } from 'vitest';
import { nextRandom, pickWeighted } from './rng';

describe('nextRandom', () => {
  it('is deterministic for the same seed', () => {
    const a = nextRandom(12345);
    const b = nextRandom(12345);
    expect(a.value).toBe(b.value);
    expect(a.nextSeed).toBe(b.nextSeed);
  });

  it('produces values in [0, 1)', () => {
    let seed = 1;
    for (let i = 0; i < 100; i++) {
      const { value, nextSeed } = nextRandom(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      seed = nextSeed;
    }
  });

  it('evolves the seed', () => {
    const { nextSeed } = nextRandom(42);
    expect(nextSeed).not.toBe(42);
  });
});

describe('pickWeighted', () => {
  it('throws on empty items', () => {
    expect(() => pickWeighted([], () => 1, 1)).toThrow(/empty/);
  });

  it('always picks the only item', () => {
    const { picked } = pickWeighted(['a'], () => 1, 7);
    expect(picked).toBe('a');
  });

  it('is deterministic for same seed', () => {
    const items = ['a', 'b', 'c'];
    const r1 = pickWeighted(items, () => 1, 99);
    const r2 = pickWeighted(items, () => 1, 99);
    expect(r1.picked).toBe(r2.picked);
    expect(r1.nextSeed).toBe(r2.nextSeed);
  });

  it('never picks zero-weight items when others available', () => {
    const items = [
      { id: 'never', w: 0 },
      { id: 'always', w: 10 },
    ];
    let seed = 3;
    for (let i = 0; i < 50; i++) {
      const { picked, nextSeed } = pickWeighted(items, (it) => it.w, seed);
      expect(picked.id).toBe('always');
      seed = nextSeed;
    }
  });

  it('falls back to first item when all weights are zero', () => {
    const { picked } = pickWeighted(['x', 'y'], () => 0, 5);
    expect(picked).toBe('x');
  });

  it('roughly respects weights over many draws', () => {
    const items = [
      { id: 'rare', w: 1 },
      { id: 'common', w: 9 },
    ];
    let seed = 1;
    let commonCount = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const { picked, nextSeed } = pickWeighted(items, (it) => it.w, seed);
      if (picked.id === 'common') commonCount++;
      seed = nextSeed;
    }
    expect(commonCount / N).toBeGreaterThan(0.75);
    expect(commonCount / N).toBeLessThan(0.99);
  });
});
