import type { GameState } from '../../domain/entities/GameState';
import {
  commitCompression,
  shouldCompress,
  splitForCompression,
} from '../../domain/entities/StoryMemory';
import type { ILLMPort } from '../ports/ILLMPort';
import type { ILogger } from '../ports/ILogger';

export interface CompressMemoryDeps {
  readonly llm: ILLMPort;
  readonly logger: ILogger;
  readonly newRequestID: () => string;
}

const FEATURE = 'CompressMemory';

/**
 * 若 StoryMemory 达到压缩阈值，调用 LLM 把较老的 recent 摘要为一段文字，
 * 并合并入 summaries。否则返回原 state（无副作用）。
 */
export async function compressMemoryIfNeeded(
  state: GameState,
  deps: CompressMemoryDeps
): Promise<GameState> {
  if (!shouldCompress(state.memory)) {
    return state;
  }

  const requestID = deps.newRequestID();
  const { toCompress, keep } = splitForCompression(state.memory);

  deps.logger.debug({
    requestID,
    feature: FEATURE,
    action: 'compress_start',
    req: { compressCount: toCompress.length, priorSummaries: state.memory.summaries.length },
  });

  const summary = await deps.llm.compressMemory({
    notesToCompress: toCompress,
    priorSummaries: state.memory.summaries,
    requestID,
  });

  deps.logger.debug({
    requestID,
    feature: FEATURE,
    action: 'compress_done',
    resp: { summaryLength: summary.length },
  });

  return {
    ...state,
    memory: commitCompression(state.memory, summary, keep),
  };
}
