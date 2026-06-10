/**
 * mulberry32 —— 极简 seeded PRNG。
 * 种子存进存档，每次抽取后演化，保证"读档重抽结果一致"。
 */

/** 返回 [0, 1) 的伪随机数和演化后的下一个种子。 */
export function nextRandom(seed: number): { value: number; nextSeed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, nextSeed: t };
}

/** 按权重抽一项。weights 全部 ≤0 时取第一项（容错）。 */
export function pickWeighted<T>(
  items: ReadonlyArray<T>,
  weightOf: (item: T) => number,
  seed: number
): { picked: T; nextSeed: number } {
  if (items.length === 0) {
    throw new Error('pickWeighted: empty items');
  }
  const total = items.reduce((sum, it) => sum + Math.max(0, weightOf(it)), 0);
  const { value, nextSeed } = nextRandom(seed);
  if (total <= 0) {
    return { picked: items[0], nextSeed };
  }
  let cursor = value * total;
  for (const it of items) {
    cursor -= Math.max(0, weightOf(it));
    if (cursor < 0) {
      return { picked: it, nextSeed };
    }
  }
  return { picked: items[items.length - 1], nextSeed };
}
