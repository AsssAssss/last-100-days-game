import { useEffect, useState } from 'react';
import type { SlotId, SlotSummary } from '../../domain/entities/SaveSlot';

interface SlotSelectScreenProps {
  slots: readonly SlotSummary[];
  onSelect: (id: SlotId) => void;
  onDelete: (id: SlotId) => void;
  /** 测试关掉动画。 */
  animate?: boolean;
  /** 用于格式化"X 分钟前"等相对时间；测试中注入固定值。 */
  now?: () => number;
  /** 标题下方额外内容（如登录信息 + 退出按钮）。 */
  extraHeader?: React.ReactNode;
}

export function SlotSelectScreen({
  slots,
  onSelect,
  onDelete,
  animate = true,
  now = Date.now,
  extraHeader,
}: SlotSelectScreenProps) {
  const [revealed, setRevealed] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const id = setTimeout(() => setRevealed(true), 50);
    return () => clearTimeout(id);
  }, [animate]);

  const fade = revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2';

  return (
    <div
      data-testid="slot-select-screen"
      className="min-h-screen flex flex-col items-center justify-center bg-black text-neutral-200 gap-10 px-8 py-12"
    >
      <div
        data-testid="slot-title"
        className={`text-center transition-all duration-1000 ease-out ${fade}`}
      >
        <h1 className="text-amber-500 text-5xl tracking-[0.4em] font-bold mb-3">
          末日 100 天
        </h1>
        <p className="text-neutral-500 text-sm tracking-widest">
          LAST · 100 · DAYS
        </p>
        <p className="text-neutral-600 text-xs mt-6 max-w-md mx-auto leading-relaxed">
          末日已经持续了一段时间。城市沦陷，秩序崩坏。<br />
          你是一名普通幸存者。活到 Day 100。
        </p>
        {extraHeader}
      </div>

      <div
        data-testid="slot-list"
        className={`w-full max-w-lg flex flex-col gap-3 transition-all duration-1000 delay-300 ease-out ${fade}`}
      >
        <div className="text-neutral-500 text-xs tracking-widest mb-1">选择存档槽</div>
        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            now={now}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="text-neutral-700 text-xs">
        每局都不一样 · 由 Claude 即兴叙事
      </div>
    </div>
  );
}

interface SlotCardProps {
  slot: SlotSummary;
  now: () => number;
  onSelect: (id: SlotId) => void;
  onDelete: (id: SlotId) => void;
}

function SlotCard({ slot, now, onSelect, onDelete }: SlotCardProps) {
  if (slot.isEmpty) {
    return (
      <button
        type="button"
        data-testid={`slot-${slot.id}`}
        data-empty="true"
        onClick={() => onSelect(slot.id)}
        className="flex items-center justify-between px-5 py-4 border border-neutral-800 hover:border-amber-700 hover:bg-amber-950/20 rounded transition-colors text-left"
      >
        <span className="text-neutral-500 text-sm tracking-wider">槽位 {slot.id}</span>
        <span className="text-amber-500 text-sm tracking-wider">＋ 新游戏</span>
      </button>
    );
  }

  return (
    <div
      data-testid={`slot-${slot.id}`}
      data-empty="false"
      className="flex items-center px-5 py-4 border border-amber-900 bg-amber-950/10 rounded gap-4"
    >
      <button
        type="button"
        data-testid={`slot-${slot.id}-continue`}
        onClick={() => onSelect(slot.id)}
        className="flex-1 text-left hover:opacity-80 transition-opacity"
      >
        <div className="text-amber-400 text-sm tracking-wider">
          槽位 {slot.id} · DAY {slot.day}{' '}
          {slot.isGameOver ? (
            <span className="text-red-400">（已结束）</span>
          ) : null}
        </div>
        <div className="text-neutral-500 text-xs mt-1">
          {formatRelativeTime(slot.updatedAt!, now())}
          {slot.gameOverReason ? ` · ${slot.gameOverReason}` : ''}
        </div>
      </button>
      <button
        type="button"
        data-testid={`slot-${slot.id}-delete`}
        onClick={() => onDelete(slot.id)}
        aria-label={`删除槽位 ${slot.id}`}
        className="text-neutral-600 hover:text-red-400 text-xs tracking-wider px-2 py-1 transition-colors"
      >
        删除
      </button>
    </div>
  );
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(then: number, now: number): string {
  const diff = Math.max(0, now - then);
  if (diff < MINUTE) return '刚才';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} 天前`;
  return new Date(then).toLocaleDateString('zh-CN');
}
