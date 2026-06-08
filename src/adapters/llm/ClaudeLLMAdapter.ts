import type Anthropic from '@anthropic-ai/sdk';
import type {
  ILLMPort,
  TurnRequest,
  CompressMemoryRequest,
} from '../../application/ports/ILLMPort';
import type { ILogger } from '../../application/ports/ILogger';
import type { RawTurnPatch } from '../../domain/rules/PatchValidation';
import { buildTurnMessage } from './prompts/buildTurnMessage';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';
import { GAME_TURN_TOOL, type GameTurnInput } from './prompts/turnToolSchema';

export interface ClaudeAdapterConfig {
  readonly model: string;
  readonly maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 2048;
const FEATURE = 'ClaudeLLMAdapter';

/**
 * 接口最小子集，用于解耦真实 Anthropic SDK 类型；测试可注入 fake。
 */
export interface AnthropicLike {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export class ClaudeLLMAdapter implements ILLMPort {
  constructor(
    private readonly client: AnthropicLike,
    private readonly config: ClaudeAdapterConfig,
    private readonly logger: ILogger
  ) {}

  async nextTurn(request: TurnRequest): Promise<RawTurnPatch> {
    const userText = buildTurnMessage(request.state, request.playerInput);

    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'messages_create',
      req: { model: this.config.model, day: request.state.day },
    });

    const resp = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [GAME_TURN_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: 'tool', name: GAME_TURN_TOOL.name },
      messages: [{ role: 'user', content: userText }],
    });

    const block = resp.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use' || block.name !== GAME_TURN_TOOL.name) {
      this.logger.error({
        requestID: request.requestID,
        feature: FEATURE,
        action: 'missing_tool_use',
        resp: { stop_reason: resp.stop_reason },
      });
      throw new Error('LLM did not return a game_turn tool_use block');
    }

    const input = block.input as GameTurnInput;
    return input as RawTurnPatch;
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

    this.logger.debug({
      requestID: request.requestID,
      feature: FEATURE,
      action: 'compress_messages_create',
      req: { count: request.notesToCompress.length },
    });

    const resp = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 512,
      messages: [{ role: 'user', content: lines.join('\n') }],
    });

    const textBlock = resp.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      this.logger.error({
        requestID: request.requestID,
        feature: FEATURE,
        action: 'compress_missing_text',
      });
      throw new Error('LLM did not return text for memory compression');
    }
    return textBlock.text.trim();
  }
}
