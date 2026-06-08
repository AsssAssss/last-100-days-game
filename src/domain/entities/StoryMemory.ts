export interface DayMemory {
  readonly day: number;
  readonly note: string;
}

export interface StoryMemory {
  /** 最近 N 天的原文记忆 */
  readonly recent: readonly DayMemory[];
  /** 久远剧情压缩后的摘要（每段对应一段时间） */
  readonly summaries: readonly string[];
}

export const RECENT_WINDOW = 5;
export const COMPRESS_EVERY = 10;

export const EMPTY_STORY_MEMORY: StoryMemory = {
  recent: [],
  summaries: [],
};

export function appendMemory(mem: StoryMemory, entry: DayMemory): StoryMemory {
  if (!entry.note.trim()) return mem;
  return {
    ...mem,
    recent: [...mem.recent, entry],
  };
}

export function shouldCompress(mem: StoryMemory): boolean {
  return mem.recent.length >= COMPRESS_EVERY;
}

/** 把 recent 中较老的部分作为待压缩区间返回，并给出压缩后应该保留的 recent。 */
export function splitForCompression(mem: StoryMemory): {
  toCompress: readonly DayMemory[];
  keep: readonly DayMemory[];
} {
  const toCompress = mem.recent.slice(0, mem.recent.length - RECENT_WINDOW);
  const keep = mem.recent.slice(mem.recent.length - RECENT_WINDOW);
  return { toCompress, keep };
}

export function commitCompression(
  mem: StoryMemory,
  summary: string,
  keep: readonly DayMemory[]
): StoryMemory {
  return {
    summaries: [...mem.summaries, summary],
    recent: keep,
  };
}
