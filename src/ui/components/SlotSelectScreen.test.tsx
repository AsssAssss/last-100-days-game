import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import type { SlotSummary } from '../../domain/entities/SaveSlot';
import { SlotSelectScreen, formatRelativeTime } from './SlotSelectScreen';

function emptySlots(): SlotSummary[] {
  return [1, 2, 3, 4, 5].map((id) => ({ id, isEmpty: true }));
}

describe('SlotSelectScreen', () => {
  it('renders the title and atmosphere copy', () => {
    render(
      <SlotSelectScreen
        slots={emptySlots()}
        onSelect={() => {}}
        onDelete={() => {}}
        animate={false}
      />
    );
    expect(screen.getByText('末日 100 天')).toBeInTheDocument();
    expect(screen.getByText(/LAST · 100 · DAYS/)).toBeInTheDocument();
  });

  it('renders 5 slot cards, all empty by default', () => {
    render(
      <SlotSelectScreen
        slots={emptySlots()}
        onSelect={() => {}}
        onDelete={() => {}}
        animate={false}
      />
    );
    for (let id = 1; id <= 5; id++) {
      const card = screen.getByTestId(`slot-${id}`);
      expect(card.getAttribute('data-empty')).toBe('true');
      expect(card).toHaveTextContent(`槽位 ${id}`);
      expect(card).toHaveTextContent('＋ 新游戏');
    }
  });

  it('renders occupied slot with day and continue/delete buttons', () => {
    const slots: SlotSummary[] = [
      { id: 1, isEmpty: false, day: 7, updatedAt: 1000 },
      ...emptySlots().slice(1),
    ];
    render(
      <SlotSelectScreen
        slots={slots}
        onSelect={() => {}}
        onDelete={() => {}}
        animate={false}
        now={() => 1000}
      />
    );
    expect(screen.getByTestId('slot-1-continue')).toHaveTextContent('DAY 7');
    expect(screen.getByTestId('slot-1-delete')).toBeInTheDocument();
  });

  it('shows "已结束" tag when saved game has isGameOver=true', () => {
    const slots: SlotSummary[] = [
      { id: 1, isEmpty: false, day: 30, updatedAt: 1000, isGameOver: true, gameOverReason: '伤重' },
      ...emptySlots().slice(1),
    ];
    render(
      <SlotSelectScreen
        slots={slots}
        onSelect={() => {}}
        onDelete={() => {}}
        animate={false}
        now={() => 1000}
      />
    );
    expect(screen.getByTestId('slot-1-continue')).toHaveTextContent('已结束');
    expect(screen.getByTestId('slot-1-continue')).toHaveTextContent('伤重');
  });

  it('invokes onSelect with slot id when empty slot is clicked', () => {
    const onSelect = vi.fn();
    render(
      <SlotSelectScreen
        slots={emptySlots()}
        onSelect={onSelect}
        onDelete={() => {}}
        animate={false}
      />
    );
    fireEvent.click(screen.getByTestId('slot-3'));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('invokes onSelect when continue (occupied slot) is clicked', () => {
    const onSelect = vi.fn();
    const slots: SlotSummary[] = [
      { id: 2, isEmpty: false, day: 5, updatedAt: 100 },
      ...emptySlots().filter((s) => s.id !== 2),
    ];
    render(
      <SlotSelectScreen
        slots={slots}
        onSelect={onSelect}
        onDelete={() => {}}
        animate={false}
        now={() => 100}
      />
    );
    fireEvent.click(screen.getByTestId('slot-2-continue'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('invokes onDelete when delete is clicked', () => {
    const onDelete = vi.fn();
    const slots: SlotSummary[] = [
      { id: 4, isEmpty: false, day: 10, updatedAt: 0 },
      ...emptySlots().filter((s) => s.id !== 4),
    ];
    render(
      <SlotSelectScreen
        slots={slots}
        onSelect={() => {}}
        onDelete={onDelete}
        animate={false}
        now={() => 0}
      />
    );
    fireEvent.click(screen.getByTestId('slot-4-delete'));
    expect(onDelete).toHaveBeenCalledWith(4);
  });

  it('animates title into view (initial frame hidden, then revealed)', () => {
    vi.useFakeTimers();
    try {
      render(
        <SlotSelectScreen
          slots={emptySlots()}
          onSelect={() => {}}
          onDelete={() => {}}
          animate={true}
        />
      );
      expect(screen.getByTestId('slot-title').className).toContain('opacity-0');
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByTestId('slot-title').className).toContain('opacity-100');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears animation timer on unmount', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(
        <SlotSelectScreen
          slots={emptySlots()}
          onSelect={() => {}}
          onDelete={() => {}}
          animate={true}
        />
      );
      unmount();
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('formatRelativeTime', () => {
  const NOW = 1_700_000_000_000;
  it('returns "刚才" within a minute', () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('刚才');
  });
  it('returns "N 分钟前" within an hour', () => {
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe('5 分钟前');
  });
  it('returns "N 小时前" within a day', () => {
    expect(formatRelativeTime(NOW - 3 * 60 * 60_000, NOW)).toBe('3 小时前');
  });
  it('returns "N 天前" within a month', () => {
    expect(formatRelativeTime(NOW - 10 * 24 * 60 * 60_000, NOW)).toBe('10 天前');
  });
  it('falls back to localized date for older timestamps', () => {
    const result = formatRelativeTime(NOW - 365 * 24 * 60 * 60_000, NOW);
    expect(result).toMatch(/\d/);
  });
  it('clamps negative diffs (clock skew) to "刚才"', () => {
    expect(formatRelativeTime(NOW + 5_000, NOW)).toBe('刚才');
  });
});
