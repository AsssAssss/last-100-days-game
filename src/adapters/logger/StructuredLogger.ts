import type { ILogger, LogPayload } from '../../application/ports/ILogger';

export interface ConsoleLike {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * 把日志统一打到 console（JSON 结构化）。前端环境下可以在浏览器 DevTools 直接看。
 * 注入 console 便于测试。
 */
export class StructuredLogger implements ILogger {
  constructor(private readonly out: ConsoleLike = console) {}

  debug(p: LogPayload): void {
    this.out.debug(JSON.stringify({ level: 'debug', ...p }));
  }
  info(p: LogPayload): void {
    this.out.info(JSON.stringify({ level: 'info', ...p }));
  }
  warn(p: LogPayload): void {
    this.out.warn(JSON.stringify({ level: 'warn', ...p }));
  }
  error(p: LogPayload): void {
    this.out.error(JSON.stringify({ level: 'error', ...p }));
  }
}
