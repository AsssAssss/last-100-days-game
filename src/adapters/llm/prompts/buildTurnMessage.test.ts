import { describe, it, expect } from 'vitest';
import { INITIAL_GAME_STATE } from '../../../domain/entities/GameState';
import { buildTurnMessage } from './buildTurnMessage';

describe('buildTurnMessage', () => {
  it('includes the day counter, resources and inventory', () => {
    const msg = buildTurnMessage(INITIAL_GAME_STATE, null);
    expect(msg).toContain('Day 1 / 100');
    expect(msg).toContain('不是末日的绝对日期');
    expect(msg).toContain(`HP ${INITIAL_GAME_STATE.resources.hp}`);
    expect(msg).toContain(`食物 ${INITIAL_GAME_STATE.resources.food}`);
    expect(msg).toContain(INITIAL_GAME_STATE.inventory.join('、'));
  });

  it('omits memory sections when both summaries and recent are empty', () => {
    const msg = buildTurnMessage(INITIAL_GAME_STATE, null);
    expect(msg).not.toContain('# 远期剧情摘要');
    expect(msg).not.toContain('# 最近');
  });

  it('renders an opening prompt when playerInput is null', () => {
    const msg = buildTurnMessage(INITIAL_GAME_STATE, null);
    expect(msg).toContain('开场');
  });

  it('renders the player action when playerInput is provided', () => {
    const msg = buildTurnMessage(INITIAL_GAME_STATE, '冲出去');
    expect(msg).toContain('"冲出去"');
    expect(msg).toContain('玩家本回合的动作');
  });

  it('renders prior narrative when present', () => {
    const msg = buildTurnMessage(
      { ...INITIAL_GAME_STATE, lastNarrative: '昨夜风雪大作。' },
      '继续等待'
    );
    expect(msg).toContain('昨夜风雪大作。');
  });

  it('renders summaries and recent memory when present', () => {
    const msg = buildTurnMessage(
      {
        ...INITIAL_GAME_STATE,
        memory: {
          summaries: ['头十天惊魂'],
          recent: [{ day: 11, note: '遇见医生' }],
        },
      },
      '感谢医生'
    );
    expect(msg).toContain('头十天惊魂');
    expect(msg).toContain('遇见医生');
  });

  it('shows empty inventory note when inventory is empty', () => {
    const msg = buildTurnMessage({ ...INITIAL_GAME_STATE, inventory: [] }, null);
    expect(msg).toContain('库存：空');
  });

  it('caps recent memory shown to 3 entries', () => {
    const recent = Array.from({ length: 10 }, (_, i) => ({
      day: i + 1,
      note: `第 ${i + 1} 天事件`,
    }));
    const msg = buildTurnMessage(
      { ...INITIAL_GAME_STATE, memory: { summaries: [], recent } },
      '继续'
    );
    expect(msg).toContain('# 最近 3 天发生');
    expect(msg).toContain('第 8 天事件');
    expect(msg).toContain('第 10 天事件');
    expect(msg).not.toContain('第 7 天事件');
  });
});
