import {
  AMPUTATION_WINDOW_TURNS,
  type GameState,
} from '../../../domain/entities/GameState';

const RECENT_FOR_PROMPT = 3;

/** 把当前 GameState + 玩家本回合输入转成给 LLM 的 user 消息文本。 */
export function buildTurnMessage(state: GameState, playerInput: string | null): string {
  const lines: string[] = [];

  lines.push(`# 当前状态`);
  lines.push(`- 玩家挑战进度：Day ${state.day} / 100（这是玩家的倒计时第 ${state.day} 天，**不是末日的绝对日期**；叙事里不要直接写出这个数字）`);
  lines.push(`- 资源 (0-100)：HP ${state.resources.hp} · 精神 ${state.resources.sanity} · 食物 ${state.resources.food} · 水 ${state.resources.water} · 弹药 ${state.resources.ammo}`);
  lines.push(`- 库存：${state.inventory.length === 0 ? '空' : state.inventory.join('、')}`);
  if (state.infection) {
    const elapsed = state.infection.turnsTotal - state.infection.turnsLeft;
    const windowOpen = elapsed < AMPUTATION_WINDOW_TURNS;
    lines.push(
      `- ⚠️ **玩家已感染**（${state.infection.cause}），距离菌变发作还剩 ${state.infection.turnsLeft} 回合。叙事中必须体现恶化症状（剩余回合越少越剧烈）。倒计时由引擎管理，你不要在 statePatch 里再 start。${
        windowOpen
          ? '现在仍在截肢时间窗内——若伤在四肢且玩家选择立刻截肢，可用 infection.clear 解除（代价：HP -30~-50 + 永久残肢）。'
          : '截肢时间窗已关闭（菌丝已入血）——引擎将拒绝任何 clear 指令，不要再给玩家虚假希望。'
      }`
    );
  }

  if (state.memory.summaries.length > 0) {
    lines.push('');
    lines.push(`# 远期剧情摘要`);
    for (const s of state.memory.summaries) {
      lines.push(`- ${s}`);
    }
  }

  const recent = state.memory.recent.slice(-RECENT_FOR_PROMPT);
  if (recent.length > 0) {
    lines.push('');
    lines.push(`# 最近 ${recent.length} 天发生`);
    for (const r of recent) {
      lines.push(`- Day ${r.day}：${r.note}`);
    }
  }

  if (state.lastNarrative) {
    lines.push('');
    lines.push(`# 上一回合的场景`);
    lines.push(state.lastNarrative);
  }

  lines.push('');
  if (playerInput === null) {
    lines.push(`# 任务`);
    lines.push(`这是 Day ${state.day} 的开场。请生成一段开场叙事，给玩家 3 个行动选项。statePatch 反映本回合产生的资源变化（应当较小，因为只是开场）。`);
  } else {
    lines.push(`# 玩家本回合的动作`);
    lines.push(`"${playerInput}"`);
    lines.push('');
    lines.push(`# 任务`);
    lines.push(`根据玩家动作 + 当前状态，生成本回合的叙事 + 状态变更补丁 + 下一回合 3 个选项。遵守 System Prompt 中的所有硬规则。`);
  }

  return lines.join('\n');
}
