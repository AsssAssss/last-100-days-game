import type {
  CompressMemoryRequest,
  ILLMPort,
  TurnRequest,
} from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import type { RawTurnPatch } from '../../domain/rules/PatchValidation';
import { buildTurnMessage } from './prompts/buildTurnMessage';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';
import { GAME_TURN_TOOL, type GameTurnInput } from './prompts/turnToolSchema';

export interface BrowserLLMConfig {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
}

export interface BrowserLLMAdapterDeps {
  readonly getConfig: () => BrowserLLMConfig | null;
  readonly fetchImpl?: typeof fetch;
  readonly maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 2048;
const FEATURE = 'BrowserLLMAdapter';

/**
 * 浏览器直连 Anthropic 兼容端点（onehub / 其他渠道）的 LLM 实现。
 * 配置来自用户在 UI 里填的 LLM 设置（localStorage）。
 * 用 fetch 而非官方 SDK——更轻，且能精准控制 headers。
 */
export class BrowserLLMAdapter implements ILLMPort {
  private readonly getConfig: () => BrowserLLMConfig | null;
  private readonly fetchImpl: typeof fetch;
  private readonly maxTokens: number;
  private readonly logger: ILogger;

  constructor(deps: BrowserLLMAdapterDeps, logger: ILogger) {
    this.getConfig = deps.getConfig;
    this.fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
    this.maxTokens = deps.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.logger = logger;
  }

  async nextTurn(request: TurnRequest): Promise<RawTurnPatch> {
    const cfg = this.requireConfig();
    const userText = buildTurnMessage(request.state, request.playerInput);

    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'llm_call_start',
      req: { day: request.state.day, model: cfg.model },
    });

    const body = {
      model: cfg.model,
      max_tokens: this.maxTokens,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [GAME_TURN_TOOL],
      tool_choice: { type: 'tool', name: GAME_TURN_TOOL.name },
      messages: [{ role: 'user', content: userText }],
    };

    const resp = await this.callUpstream(cfg, body);
    const block = (resp.content ?? []).find(
      (b: { type: string; name?: string }) => b.type === 'tool_use'
    );
    if (!block || block.type !== 'tool_use' || block.name !== GAME_TURN_TOOL.name) {
      this.logger.error({
        requestID: request.requestID,
        feature: FEATURE,
        action: 'missing_tool_use',
        resp: { stop_reason: resp.stop_reason },
      });
      throw new Error('LLM did not return a game_turn tool_use block');
    }
    return (block as { input: GameTurnInput }).input as RawTurnPatch;
  }

  async compressMemory(request: CompressMemoryRequest): Promise<string> {
    const cfg = this.requireConfig();
    const lines: string[] = [];
    lines.push('请把下面这些天的事件压缩成 3-5 句中文摘要，保留对未来叙事可能有用的人物、地点、伤亡、承诺等关键信息。');
    if (request.priorSummaries.length > 0) {
      lines.push('');
      lines.push('已有摘要（你的输出应是新增段落，不要重复这些）：');
      for (const s of request.priorSummaries) lines.push(`- ${s}`);
    }
    lines.push('');
    lines.push('待压缩事件：');
    for (const n of request.notesToCompress) {
      lines.push(`- Day ${n.day}：${n.note}`);
    }

    const body = {
      model: cfg.model,
      max_tokens: 512,
      messages: [{ role: 'user', content: lines.join('\n') }],
    };

    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'compress_start',
      req: { count: request.notesToCompress.length },
    });

    const resp = await this.callUpstream(cfg, body);
    const textBlock = (resp.content ?? []).find(
      (b: { type: string }) => b.type === 'text'
    );
    if (!textBlock || textBlock.type !== 'text') {
      this.logger.error({
        requestID: request.requestID,
        feature: FEATURE,
        action: 'compress_missing_text',
      });
      throw new Error('LLM did not return text for memory compression');
    }
    return (textBlock as { text: string }).text.trim();
  }

  private requireConfig(): BrowserLLMConfig {
    const cfg = this.getConfig();
    if (!cfg || !cfg.apiKey || !cfg.baseURL || !cfg.model) {
      throw new Error('llm_not_configured');
    }
    return cfg;
  }

  private async callUpstream(
    cfg: BrowserLLMConfig,
    body: unknown
  ): Promise<{
    content?: Array<{ type: string; name?: string; text?: string; input?: unknown }>;
    stop_reason?: string;
  }> {
    const url = cfg.baseURL.replace(/\/$/, '') + '/v1/messages';
    const resp = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`LLM ${resp.status} ${text}`);
    }
    return resp.json();
  }
}
