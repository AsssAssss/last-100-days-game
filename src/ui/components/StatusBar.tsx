import type { GameState } from '../../domain/entities/GameState';
import { MAX_RESOURCES } from '../../domain/entities/Resources';

interface StatusBarProps {
  state: GameState;
}

const RESOURCE_LABELS: Record<string, string> = {
  hp: 'HP',
  sanity: '精神',
  food: '食物',
  water: '水',
  ammo: '弹药',
};

export function StatusBar({ state }: StatusBarProps) {
  return (
    <aside
      data-testid="status-bar"
      className="border-r border-neutral-800 bg-neutral-950 p-6 flex flex-col gap-4 w-72 shrink-0"
    >
      <div className="text-amber-400 font-bold tracking-wider">
        DAY {state.day} <span className="text-neutral-600">/ 100</span>
      </div>

      {state.script && (
        <div data-testid="humanity-indicator" className="text-xs text-neutral-500">
          人性：
          <span className={humanityTier(state.script.humanity).color}>
            {humanityTier(state.script.humanity).label}
          </span>
        </div>
      )}

      {state.infection && (
        <div
          data-testid="infection-banner"
          className="border border-red-900 bg-red-950/40 rounded p-2"
        >
          <div className="text-red-400 text-xs font-bold tracking-wider animate-pulse">
            ⚠ 已感染
          </div>
          <div className="text-red-300/80 text-xs mt-1">{state.infection.cause}</div>
          <div className="text-red-300/80 text-xs">
            发作倒计时：约 {state.infection.turnsLeft} 回合
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(Object.keys(RESOURCE_LABELS) as Array<keyof typeof RESOURCE_LABELS>).map((key) => {
          const value = state.resources[key as keyof typeof state.resources];
          const max = MAX_RESOURCES[key as keyof typeof MAX_RESOURCES];
          const pct = Math.max(0, Math.min(100, (value / max) * 100));
          const bar = barColor(key, value, max);
          return (
            <div key={key} data-testid={`resource-${key}`}>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{RESOURCE_LABELS[key]}</span>
                <span>
                  {value} / {max}
                </span>
              </div>
              <div className="h-1.5 bg-neutral-800 rounded overflow-hidden mt-0.5">
                <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-800 pt-4">
        <div className="text-xs text-neutral-500 mb-2">背包</div>
        {state.inventory.length === 0 ? (
          <div className="text-xs text-neutral-600">（空）</div>
        ) : (
          <ul className="text-xs text-neutral-300 flex flex-col gap-1" data-testid="inventory-list">
            {state.inventory.map((item, i) => (
              <li key={`${item}-${i}`}>· {item}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function humanityTier(humanity: number): { label: string; color: string } {
  if (humanity >= 80) return { label: '圣人', color: 'text-emerald-400' };
  if (humanity >= 65) return { label: '善良', color: 'text-emerald-500' };
  if (humanity > 35) return { label: '摇摆', color: 'text-neutral-300' };
  if (humanity > 20) return { label: '冷酷', color: 'text-orange-400' };
  return { label: '恶徒', color: 'text-red-500' };
}

function barColor(key: string, value: number, max: number): string {
  const pct = value / max;
  if (key === 'hp' || key === 'sanity') {
    if (pct < 0.25) return 'bg-red-500';
    if (pct < 0.5) return 'bg-amber-500';
    return 'bg-emerald-500';
  }
  if (pct < 0.2) return 'bg-red-500';
  if (pct < 0.5) return 'bg-amber-500';
  return 'bg-sky-500';
}
