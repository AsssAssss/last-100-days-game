import { describe, it, expect, vi } from 'vitest';
import { StructuredLogger, type ConsoleLike } from './StructuredLogger';

function makeFakeConsole(): ConsoleLike & {
  calls: Array<{ level: string; arg: string }>;
} {
  const calls: Array<{ level: string; arg: string }> = [];
  return {
    calls,
    debug: vi.fn((arg: unknown) => calls.push({ level: 'debug', arg: String(arg) })),
    info: vi.fn((arg: unknown) => calls.push({ level: 'info', arg: String(arg) })),
    warn: vi.fn((arg: unknown) => calls.push({ level: 'warn', arg: String(arg) })),
    error: vi.fn((arg: unknown) => calls.push({ level: 'error', arg: String(arg) })),
  };
}

describe('StructuredLogger', () => {
  it.each(['debug', 'info', 'warn', 'error'] as const)(
    'emits %s as structured JSON',
    (level) => {
      const c = makeFakeConsole();
      const logger = new StructuredLogger(c);
      logger[level]({
        requestID: 'rid-1',
        feature: 'TestFeature',
        action: 'do_something',
        req: { foo: 1 },
      });
      expect(c.calls).toHaveLength(1);
      const parsed = JSON.parse(c.calls[0].arg);
      expect(parsed.level).toBe(level);
      expect(parsed.requestID).toBe('rid-1');
      expect(parsed.feature).toBe('TestFeature');
      expect(parsed.action).toBe('do_something');
      expect(parsed.req).toEqual({ foo: 1 });
    }
  );

  it('defaults to global console when no console is injected', () => {
    const logger = new StructuredLogger();
    expect(() => logger.debug({ requestID: 'r', feature: 'f', action: 'a' })).not.toThrow();
  });
});
