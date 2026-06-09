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

export interface HTTPLLMConfig {
  readonly baseURL: string;
  readonly getToken: () => string | null;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly fetchImpl?: typeof fetch;
}

const DEFAULT_MAX_TOKENS = 2048;
const FEATURE = 'HTTPLLMAdapter';

/**
 * 走后端 /llm/messages 中转的 LLM 实现。
 * key 在后端，前端只发 messages/tools/tool_choice 等业务参数。
 */
export class HTTPLLMAdapter implements ILLMPort {
  private readonly baseURL: string;
  private readonly getToken: () => string | null;
  private readonly model: string | undefined;
  private readonly maxTokens: number;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: ILogger;

  constructor(config: HTTPLLMConfig, logger: ILogger) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.model = config.model;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));
    this.logger = logger;
  }

  async nextTurn(request: TurnRequest): Promise<RawTurnPatch> {
    const userText = buildTurnMessage(request.state, request.playerInput);
    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'llm_proxy_start',
      req: { day: request.state.day },
    });

    const body = {
      ...(this.model ? { model: this.model } : {}),
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

    const resp = await this.callBackend(body);
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
      ...(this.model ? { model: this.model } : {}),
      max_tokens: 512,
      messages: [{ role: 'user', content: lines.join('\n') }],
    };

    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'compress_proxy_start',
      req: { count: request.notesToCompress.length },
    });

    const resp = await this.callBackend(body);
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

  private async callBackend(body: unknown): Promise<{
    content?: Array<{ type: string; name?: string; text?: string; input?: unknown }>;
    stop_reason?: string;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('not_authenticated');
    const resp = await this.fetchImpl(`${this.baseURL}/llm/messages`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
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
