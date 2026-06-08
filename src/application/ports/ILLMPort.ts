import type { GameState } from '../../domain/entities/GameState';
import type { RawTurnPatch } from '../../domain/rules/PatchValidation';

/**
 * 玩家输入：要么是从 LLM 上回合给的 choices 里选了一个，要么是自由输入。
 * 引擎不区分两者——都是字符串。
 */
export type PlayerInput = string;

export interface TurnRequest {
  readonly state: GameState;
  readonly playerInput: PlayerInput | null;
  /** 链路追踪 id，供日志使用。 */
  readonly requestID: string;
}

export interface CompressMemoryRequest {
  readonly notesToCompress: ReadonlyArray<{ day: number; note: string }>;
  readonly priorSummaries: readonly string[];
  readonly requestID: string;
}

/**
 * LLM 端口。adapters/llm/* 实现此接口。
 * application 与 domain 仅依赖这个抽象，不感知 SDK。
 */
export interface ILLMPort {
  /** 生成下一回合的叙事 + 选项 + statePatch。 */
  nextTurn(request: TurnRequest): Promise<RawTurnPatch>;

  /** 把若干天的细节压缩为一段摘要文本。 */
  compressMemory(request: CompressMemoryRequest): Promise<string>;
}
