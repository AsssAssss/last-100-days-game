import { describe, it, expect } from 'vitest';
import {
  COMPRESS_EVERY,
  EMPTY_STORY_MEMORY,
  RECENT_WINDOW,
  appendMemory,
  commitCompression,
  shouldCompress,
  splitForCompression,
} from './StoryMemory';

describe('StoryMemory', () => {
  describe('appendMemory', () => {
    it('appends an entry with a non-empty note', () => {
      const m = appendMemory(EMPTY_STORY_MEMORY, { day: 1, note: '遇见一只猫' });
      expect(m.recent).toHaveLength(1);
      expect(m.recent[0]).toEqual({ day: 1, note: '遇见一只猫' });
    });

    it('skips entries with empty or whitespace-only notes', () => {
      const m = appendMemory(EMPTY_STORY_MEMORY, { day: 1, note: '' });
      const m2 = appendMemory(EMPTY_STORY_MEMORY, { day: 1, note: '   ' });
      expect(m.recent).toHaveLength(0);
      expect(m2.recent).toHaveLength(0);
    });

    it('preserves prior summaries unchanged', () => {
      const seeded = { recent: [], summaries: ['第一周摘要'] };
      const m = appendMemory(seeded, { day: 8, note: '新事件' });
      expect(m.summaries).toEqual(['第一周摘要']);
    });
  });

  describe('shouldCompress', () => {
    it('returns false when recent count is below COMPRESS_EVERY', () => {
      const mem = {
        recent: Array.from({ length: COMPRESS_EVERY - 1 }, (_, i) => ({
          day: i + 1,
          note: `day ${i + 1}`,
        })),
        summaries: [],
      };
      expect(shouldCompress(mem)).toBe(false);
    });

    it('returns true when recent count hits COMPRESS_EVERY', () => {
      const mem = {
        recent: Array.from({ length: COMPRESS_EVERY }, (_, i) => ({
          day: i + 1,
          note: `day ${i + 1}`,
        })),
        summaries: [],
      };
      expect(shouldCompress(mem)).toBe(true);
    });
  });

  describe('splitForCompression', () => {
    it('keeps last RECENT_WINDOW entries and marks the rest for compression', () => {
      const recent = Array.from({ length: COMPRESS_EVERY }, (_, i) => ({
        day: i + 1,
        note: `day ${i + 1}`,
      }));
      const mem = { recent, summaries: [] };
      const { toCompress, keep } = splitForCompression(mem);
      expect(keep).toHaveLength(RECENT_WINDOW);
      expect(toCompress).toHaveLength(COMPRESS_EVERY - RECENT_WINDOW);
      expect(keep[keep.length - 1].day).toBe(COMPRESS_EVERY);
    });
  });

  describe('commitCompression', () => {
    it('appends summary and replaces recent with kept entries', () => {
      const mem = {
        recent: [{ day: 1, note: 'a' }],
        summaries: ['previous'],
      };
      const keep = [{ day: 6, note: 'kept' }];
      const next = commitCompression(mem, 'summary for days 1-5', keep);
      expect(next.summaries).toEqual(['previous', 'summary for days 1-5']);
      expect(next.recent).toEqual(keep);
    });
  });
});
