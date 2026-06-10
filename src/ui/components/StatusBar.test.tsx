import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { INITIAL_GAME_STATE } from '../../domain/entities/GameState';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders the day counter', () => {
    render(<StatusBar state={INITIAL_GAME_STATE} />);
    const dayLine = screen.getByText(/DAY/);
    expect(dayLine).toHaveTextContent('DAY 1');
    expect(dayLine).toHaveTextContent('/ 100');
  });

  it('renders all five resource rows', () => {
    render(<StatusBar state={INITIAL_GAME_STATE} />);
    for (const key of ['hp', 'sanity', 'food', 'water', 'ammo']) {
      expect(screen.getByTestId(`resource-${key}`)).toBeInTheDocument();
    }
  });

  it('renders resource values', () => {
    render(<StatusBar state={INITIAL_GAME_STATE} />);
    const hpRow = screen.getByTestId('resource-hp');
    expect(within(hpRow).getByText(/100 \/ 100/)).toBeInTheDocument();
  });

  it('renders empty-inventory hint when inventory is empty', () => {
    render(<StatusBar state={{ ...INITIAL_GAME_STATE, inventory: [] }} />);
    expect(screen.getByText('（空）')).toBeInTheDocument();
  });

  it('renders inventory items when present', () => {
    render(
      <StatusBar
        state={{ ...INITIAL_GAME_STATE, inventory: ['手电筒', '医药包', '手电筒'] }}
      />
    );
    const list = screen.getByTestId('inventory-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('手电筒');
    expect(items[1]).toHaveTextContent('医药包');
  });

  it.each([
    [10, 'bg-red-500'],
    [40, 'bg-amber-500'],
    [80, 'bg-emerald-500'],
  ])('uses appropriate color for hp=%i', (hp, expectedClass) => {
    const { container } = render(
      <StatusBar
        state={{ ...INITIAL_GAME_STATE, resources: { ...INITIAL_GAME_STATE.resources, hp } }}
      />
    );
    const hpRow = screen.getByTestId('resource-hp');
    const bar = hpRow.querySelector(`.${expectedClass}`);
    expect(bar).toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it.each([
    [10, 'bg-red-500'],
    [40, 'bg-amber-500'],
    [80, 'bg-sky-500'],
  ])('uses appropriate color for food=%i (non-vital resource)', (food, expectedClass) => {
    render(
      <StatusBar
        state={{ ...INITIAL_GAME_STATE, resources: { ...INITIAL_GAME_STATE.resources, food } }}
      />
    );
    const row = screen.getByTestId('resource-food');
    expect(row.querySelector(`.${expectedClass}`)).toBeInTheDocument();
  });

  describe('humanity indicator', () => {
    it('is hidden when no script state (legacy/non-scripted save)', () => {
      render(<StatusBar state={INITIAL_GAME_STATE} />);
      expect(screen.queryByTestId('humanity-indicator')).not.toBeInTheDocument();
    });

    it.each([
      [85, '圣人'],
      [70, '善良'],
      [50, '摇摆'],
      [30, '冷酷'],
      [10, '恶徒'],
    ])('humanity=%i shows tier %s', (humanity, label) => {
      render(
        <StatusBar
          state={{
            ...INITIAL_GAME_STATE,
            script: { nodeId: 'x', humanity, flags: [], seed: 1, drawnOnce: [] },
          }}
        />
      );
      expect(screen.getByTestId('humanity-indicator')).toHaveTextContent(label);
    });
  });

  describe('infection banner', () => {
    it('is hidden when not infected', () => {
      render(<StatusBar state={INITIAL_GAME_STATE} />);
      expect(screen.queryByTestId('infection-banner')).not.toBeInTheDocument();
    });

    it('shows cause and countdown when infected', () => {
      render(
        <StatusBar
          state={{
            ...INITIAL_GAME_STATE,
            infection: { cause: '被奔跑者咬伤左臂', turnsLeft: 5, turnsTotal: 8 },
          }}
        />
      );
      const banner = screen.getByTestId('infection-banner');
      expect(banner).toHaveTextContent('已感染');
      expect(banner).toHaveTextContent('被奔跑者咬伤左臂');
      expect(banner).toHaveTextContent('约 5 回合');
    });
  });
});
