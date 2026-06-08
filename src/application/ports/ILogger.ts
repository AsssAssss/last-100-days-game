/**
 * 结构化日志端口。
 * 字段约束见 CLAUDE.md：requestID / feature / user / action / req / resp。
 */
export interface LogPayload {
  readonly requestID: string;
  readonly feature: string;
  readonly user?: string;
  readonly action: string;
  readonly req?: unknown;
  readonly resp?: unknown;
  readonly err?: unknown;
  readonly [extra: string]: unknown;
}

export interface ILogger {
  debug(payload: LogPayload): void;
  info(payload: LogPayload): void;
  warn(payload: LogPayload): void;
  error(payload: LogPayload): void;
}
